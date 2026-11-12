// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readBounded,sha256} from './files.mjs';

const baselinePins={inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'};
const history=[
 ['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','1717f679b6a97bbfe9558ba73f15af3583bd43ccf325a25a0367fc6ffabbcfc1',2736,1133],
 ['3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','347019e8e0ee52ca43ae027cbbac911b1d01a82b8d3d1c295a3d32cbd9d878f7',2000,1000],
 ['2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552','0f1ae8214071f8a7fa8d962ce2b914fb7f1116c00ac12d00c7df2672d8b2678b',2000,1000],
 ['fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19','b5a6a8a42df0874ef7026a995d3b2e064d6e7e80717500c063778e26e592ff25',2000,1000],
 ['be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8','1f2bbcf1f40a4329a8a0eaeb8c1f5698caacc6e0c035980c7f4ca887dbef9ac5',2000,1000],
 ['1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d','831f3e06a4e28779de1a2180206c328021cf2323f0310c4e7652e1f0256ec28b',2000,1000],
 ['7e713aabc0adde0cc734cd7d73c3db13c919c96d6a765d42c7f468796bad1357',null,2000,1000],
];
const fifthIdentity='3f53b2c18df6c89bb07fe77cfc545b176563502d6f99dd99410774d6984fea71';
const frozen=await readBounded(new URL('./wordpair-legitimate-controls.json',import.meta.url),1024*1024);
assert.equal(sha256(frozen),'973f7dd28694bc1b98a4be601a253a3fd1913da9eebbb187555b3d6622dbc3e2');
const originalAuthoredIds=JSON.parse(frozen).records.flatMap(r=>['plain','html'].map(type=>'legitimate_'+r.id+'_'+type));
assert.equal(new Set(originalAuthoredIds).size,286);
const previousFalsePositive='dfc9acee291da921677d3d8f766ace54850498546dea43230e81e7650772f6af';
const ordered=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const identity=rows=>rows.map(({id,label,group,partition,htmlOnly})=>[id,label,group,partition,htmlOnly]);

function count(rows){
 const n={TP:0,FP:0,TN:0,FN:0};
 for(const row of rows){
  assert.match(row.id,/^[a-f0-9]{64}$/);
  assert(row.label==='ham'||row.label==='spam');
  assert.equal(typeof row.quarantined,'boolean');
  assert(row.status==='partial'||row.status==='unavailable');
  if(row.status==='unavailable'){assert.equal(row.quarantined,false);assert.equal(row.score,null);}
  else assert(Number.isFinite(row.score)&&row.score>=0&&row.score<=100);
  n[row.label==='spam'?(row.quarantined?'TP':'FN'):(row.quarantined?'FP':'TN')]++;
 }
 return {...n,spam:n.TP+n.FN,ham:n.TN+n.FP,total:rows.length};
}
function assertCounts(expected,actual){for(const [key,value] of Object.entries(expected))assert.equal(actual[key],value,key+' inconsistent');}
function verifyStrata(variant){
 const partitions=Object.keys(variant.byPartition).sort();
 assert.deepEqual(partitions,[...new Set(variant.rows.map(r=>r.partition))].sort());
 for(const part of partitions){
  const rows=variant.rows.filter(r=>r.partition===part), strata=variant.byPartition[part];
  assertCounts(count(rows),strata.metrics);
  assertCounts(count(rows.filter(r=>r.group==='hard_ham')),strata.hardHam);
  assertCounts(count(rows.filter(r=>r.htmlOnly)),strata.htmlOnly);
  assertCounts(count(rows.filter(r=>!r.htmlOnly)),strata.other);
 }
}

/** Applied after the acceptance runner verifies runtime/source pins, contract versions and mandatory non-HAM controls. */
export function compareReplacement(report,authoredIds){
 const entry=history.find(h=>h[0]===report.manifestSha256);assert(entry,'unknown_cohort');
 const [,,total,spam]=entry, referenceRowsSha=entry[1], isFresh=referenceRowsSha===null;
 const {baseline,candidate}=report.variants;
 assert.deepEqual(report.identities.baseline.pins,baselinePins);
 assert.equal(report.policy.mode,'filter');
 assert.equal(report.checks.networkAttempts,0);assert.equal(report.checks.repeatedOrderInvariant,true);
 assert.equal(baseline.rows.length,total);assert.equal(candidate.rows.length,total);
 const ref=ordered(baseline.rows), next=ordered(candidate.rows);
 assert.equal(new Set(ref.map(row=>row.id)).size,total);
 for(const r of ref){
  assert.equal(r.policyVersion,'inbox-scoring-4');
  if(r.status==='partial')assert.equal(r.ruleSetVersion,'rules-5');
 }
 assert.deepEqual(identity(ref),identity(next),'pair_id_labels_or_strata_changed');
 if(!isFresh)assert.equal(sha256(JSON.stringify(ref)),referenceRowsSha,'observed_reference_changed');
 else assert.equal(sha256(JSON.stringify(ref.map(r=>[r.id,r.label]))),fifthIdentity,'fresh_id_labels_changed');

 const baselineCounts=count(ref), candidateCounts=count(next);
 assert.equal(baselineCounts.spam,spam);assertCounts(baselineCounts,baseline.metrics);assertCounts(candidateCounts,candidate.metrics);
 verifyStrata(baseline);verifyStrata(candidate);
 const baselineHamIds=ref.filter(r=>r.label==='ham'&&r.quarantined).map(r=>r.id);
 if(entry===history[5])assert.deepEqual(baselineHamIds,[previousFalsePositive]);

 const controls=report.controls.candidate;
 assert(Array.isArray(authoredIds)&&authoredIds.length>=286);
 const requiredIds=new Set(authoredIds);
 assert.equal(requiredIds.size,authoredIds.length);
 assert(originalAuthoredIds.every(id=>requiredIds.has(id)),'missing_frozen_legitimate_identity');
 const byId=new Map(controls.map(c=>[c.id,c]));
 assert.equal(byId.size,controls.length);
 for(const id of authoredIds){
  const control=byId.get(id);
  assert(control?.truth==='ham'&&control.kind==='authored_ham','missing_or_changed_legitimate_control');
  assert.equal(control.status,'partial');assert.equal(control.score,0);
 }
 const failure=[];
 if(candidateCounts.FP)failure.push('replacement_legitimate_mail_caught');
 if(controls.some(row=>row.truth==='ham'&&row.quarantined!==false))failure.push('replacement_legitimate_control_caught');
 if(isFresh){
  if(2*candidateCounts.TP<spam)failure.push('fresh_recall_below_50_percent');
  if(100*(candidateCounts.TP-baselineCounts.TP)<20*spam)failure.push('fresh_gain_below_20_points');
 }
 return {eligible:failure.length===0,failure,baselineHamIds,baseline:baselineCounts,candidate:candidateCounts};
}
