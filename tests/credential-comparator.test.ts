import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
// @ts-expect-error Node test loads the JavaScript-only evaluator helper.
import {compareReplacement} from '../harness/evaluation/credential-comparator.mjs';

const load=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const candidatePins={inbox:'984448b6cfaed4e4e7aaa9693f25b0bf37d9e91a',scorer:'6617c5627bb87cc35245ec8941e3908b984f3318'};
const archive=(name:string)=>{const r=load('../docs/evidence/dev-1009-wordpair/wordpair-'+name+'/report.json');r.identities.candidate.pins={...candidatePins};return r;};
const authoredIds: string[]=load('../harness/evaluation/wordpair-legitimate-controls.json').records
  .flatMap((c:{id:string})=>['plain','html'].map(kind=>'legitimate_'+c.id+'_'+kind));
const frozenFifth=load('../harness/evaluation/recall-eighth-holdout-manifest.json');
type Row={label:string;quarantined:boolean;group:string;htmlOnly:boolean};
function metrics(rows:Row[]){
 const TP=rows.filter(r=>r.label==='spam'&&r.quarantined).length;
 const FP=rows.filter(r=>r.label==='ham'&&r.quarantined).length;
 const spam=rows.filter(r=>r.label==='spam').length,ham=rows.length-spam;
 return {TP,FP,TN:ham-FP,FN:spam-TP,spam,ham,total:rows.length};
}
function variant(rows:Row[]){
 return {rows,metrics:metrics(rows),byPartition:{holdout:{
  metrics:metrics(rows),hardHam:metrics(rows.filter(r=>r.group==='hard_ham')),
  htmlOnly:metrics(rows.filter(r=>r.htmlOnly)),other:metrics(rows.filter(r=>!r.htmlOnly)),
 }}};
}
// Opaque frozen manifest labels are used only to fabricate validation fixtures. No scorer/MIME imports.
function fabricated(before:number,after:number,hamBefore=0,hamAfter=0){
 const r=archive('fourth');
 function rows(tp:number,fp:number){
  let ham=0,spam=0;
  return frozenFifth.records.map((m:{id:string;label:string;group:string;htmlOnly:boolean})=>({
   id:m.id,label:m.label,group:m.group,htmlOnly:m.htmlOnly,partition:'holdout',
   policyVersion:'inbox-scoring-4',ruleSetVersion:'rules-5',status:'partial',score:0,
   quarantined:m.label==='ham'?ham++<fp:spam++<tp,
  }));
 }
 return {...r,manifestSha256:'4d24e570303290285ede380b497dd148172b45ca0057a6cd60f022b5d8bbed26',
  variants:{baseline:variant(rows(before,hamBefore)),candidate:variant(rows(after,hamAfter))}};
}

test('reproduces all six reference row digests and still rejects rules-9 on fourth',()=>{
 for(const name of ['sa','enron','first','second','third','fourth']){
  const r=archive(name),result=compareReplacement(r,authoredIds);
  assert.equal(result.eligible,name!=='fourth',name);
  if(name==='fourth'){
   assert.equal(result.baseline.TP,188);assert.equal(result.candidate.TP,479);
   assert.equal(result.baseline.FP,1);assert.equal(result.candidate.FP,1);
   assert.equal(result.baselineHamIds.length,1);
   assert.deepEqual(result.failure,['replacement_legitimate_mail_caught']);
   const row=r.variants.baseline.rows.find((x:Row)=>x.label==='ham'&&x.quarantined);
   row.quarantined=false;
   assert.throws(()=>compareReplacement(r,authoredIds),/observed_reference_changed/);
  }
 }
});

test('fifth is an observed regression with a fixed reference digest',()=>{
 const r=load('../docs/evidence/dev-1009-replacement/replacement-fifth/report.json');
 r.identities.candidate.pins=candidatePins;
 assert.equal(compareReplacement(r,authoredIds).eligible,true);
 r.variants.baseline.rows[0].quarantined=!r.variants.baseline.rows[0].quarantined;
 assert.throws(()=>compareReplacement(r,authoredIds),/observed_reference_changed/);
});

test('eighth requires exact recall and gain independently, and zero replacement legitimate catches',()=>{
 const passing=compareReplacement(fabricated(180,300,1),authoredIds);
 assert(passing.eligible);assert.equal(passing.baselineHamIds.length,1);
 assert.deepEqual(compareReplacement(fabricated(181,300),authoredIds).failure,['fresh_gain_below_20_points']);
 assert.deepEqual(compareReplacement(fabricated(60,299),authoredIds).failure,['fresh_recall_below_50_percent']);
 const caught=compareReplacement(fabricated(180,300,0,1),authoredIds);
 assert.deepEqual(caught.failure,['replacement_legitimate_mail_caught']);
 assert.equal(caught.candidate.FP,1);
 const control=fabricated(180,300);
 control.controls.candidate.find((x:{id:string})=>x.id===authoredIds[0]).quarantined=true;
 assert.deepEqual(compareReplacement(control,authoredIds).failure,['replacement_legitimate_control_caught']);
});

test('rejects swapped labels, false totals, missing controls, and changed reference mode',()=>{
 const r=fabricated(180,300);
 const target=r.variants.candidate.rows[0];
 target.label=target.label==='spam'?'ham':'spam';
 assert.throws(()=>compareReplacement(r,authoredIds),/pair_id_labels_or_strata_changed/);
 const two=fabricated(180,300);
 two.variants.candidate.byPartition.holdout.other.FP=2;
 assert.throws(()=>compareReplacement(two,authoredIds),/FP inconsistent/);
 const three=fabricated(180,300);
 three.controls.candidate=three.controls.candidate.filter((x:{id:string})=>x.id!==authoredIds[0]);
 assert.throws(()=>compareReplacement(three,authoredIds),/missing_or_changed_legitimate_control/);
 const four=fabricated(180,300);four.policy.mode='shadow';
 assert.throws(()=>compareReplacement(four,authoredIds));
 assert.throws(()=>compareReplacement(fabricated(180,300),['fabricated_id',...authoredIds.slice(1)]),/missing_frozen_legitimate_identity/);
 const five=fabricated(180,300);five.variants.baseline.rows.pop();
 assert.throws(()=>compareReplacement(five,authoredIds));
 const wrongPin=fabricated(180,300);wrongPin.identities.candidate.pins.scorer='0'.repeat(40);
 assert.throws(()=>compareReplacement(wrongPin,authoredIds));
 const six=fabricated(180,300);
 for(const v of [six.variants.baseline,six.variants.candidate]){
  const ham=v.rows.find((x:Row)=>x.label==='ham'), spam=v.rows.find((x:Row)=>x.label==='spam');
  ham.label='spam';spam.label='ham';
 }
 assert.throws(()=>compareReplacement(six,authoredIds),/fresh_id_labels_changed/);
});
