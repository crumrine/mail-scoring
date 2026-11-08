// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Neutral cached metadata only: no MIME parser, classifier, prediction or training imports.
import assert from 'node:assert/strict';
import {mkdir,writeFile,lstat} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import './mime-runtime.mjs';
import {readBounded} from './files.mjs';
import {statisticalText,statisticalTokens} from '../../packages/core/dist/statistical-text.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
function validate(r){
 assert.match(r.id,/^[a-f0-9]{64}$/);assert.equal(r.sha256,r.id);assert.match(r.bodyFeatureSha256,/^[a-f0-9]{64}$/);
 assert.equal(r.path,'messages/'+r.id+'.eml');assert(['ham','spam'].includes(r.label));
 assert(Number.isSafeInteger(r.bytes)&&r.bytes>0&&r.bytes<=2*1024*1024);
}
export function selectUnseen(candidates,excluded,quota=1000){
 assert(Number.isSafeInteger(quota)&&quota>0&&quota<=1000);assert(candidates.length<=30000&&excluded.length<=100000);
 const rawSeen=new Set(),bodySeen=new Set();for(const r of excluded){validate(r);rawSeen.add(r.id);bodySeen.add(r.bodyFeatureSha256);}
 const byBody=new Map();
 for(const r of candidates){validate(r);if(rawSeen.has(r.id)||bodySeen.has(r.bodyFeatureSha256))continue;
  const group=byBody.get(r.bodyFeatureSha256)??[];group.push(r);byBody.set(r.bodyFeatureSha256,group);
 }
 const eligible=[];
 for(const rows of byBody.values()){
  if(new Set(rows.map(r=>r.label)).size!==1)continue;
  rows.sort((a,b)=>a.id.localeCompare(b.id));eligible.push(rows[0]);
 }
 const selected=[];
 for(const label of ['ham','spam']){const rows=eligible.filter(r=>r.label===label).sort((a,b)=>a.id.localeCompare(b.id));assert(rows.length>=quota,'insufficient_unseen_'+label);selected.push(...rows.slice(0,quota));}
 assert.equal(new Set(selected.map(r=>r.id)).size,selected.length);assert.equal(new Set(selected.map(r=>r.bodyFeatureSha256)).size,selected.length);
 return selected.sort((a,b)=>a.id.localeCompare(b.id));
}
if(process.argv[2]==='--self-check'){
 const row=(id,label,body=id)=>({id:id.repeat(64),sha256:id.repeat(64),bytes:1,path:'messages/'+id.repeat(64)+'.eml',label,bodyFeatureSha256:body.repeat(64)});
 const candidates=[row('a','ham'),row('b','ham'),row('c','spam'),row('d','spam'),row('e','ham','f'),row('f','spam','f')];
 const selected=selectUnseen(candidates,[row('1','ham','a')],1);assert.deepEqual(selected.map(r=>r.id[0]),['b','c']);
 assert.deepEqual(selectUnseen([...candidates].reverse(),[row('1','ham','a')],1),selected);
 assert.deepEqual(selectUnseen([...candidates,candidates[0]],[],1).map(r=>r.id[0]),['a','c']);
 assert.throws(()=>selectUnseen(candidates,[row('a','ham')],3),/insufficient_unseen/);
 assert.throws(()=>selectUnseen([{...candidates[0],path:'../escape'}],[],1));
 assert.throws(()=>selectUnseen([{...candidates[0],label:'unknown'}],[],1));
 console.log(JSON.stringify({passed:true,cases:['body_exclusion','raw_exclusion','conflicting_body_labels','stable_order','multi_pool_duplicate','exact_quota','path','label'],predictions:0}));
}else if(process.argv.length===9||process.argv.length===10||process.argv.length===11){
 const [sa,train,additional,old,first,...tail]=process.argv.slice(2);const fourth=tail.length===4,third=tail.length>=3;
 const [second,thirdManifest,privateExclusions,outArg]=fourth?tail:third?[tail[0],undefined,...tail.slice(1)]:[undefined,undefined,...tail];const out=resolve(outArg);
 assert(!(await lstat(out)).isSymbolicLink(),'output_symlink');
 for(let dir=out;;dir=dirname(dir)){assert(!existsSync(join(dir,'.git')),'outside_git_required');if(dirname(dir)===dir)break;}
 const metadata=[];
 const inputs=[sa,train,additional,old,first,...(third?[second]:[]),...(fourth?[thirdManifest]:[]),privateExclusions];
 for(const [index,path] of inputs.entries()){
  const bytes=await readBounded(resolve(path),32*1024*1024);const data=JSON.parse(bytes);assert(Array.isArray(data.records)&&data.records.length<=30000);
  metadata.push({data,sha256:hash(bytes),private:index===inputs.length-1});
 }
 assert.deepEqual(metadata.slice(0,5).map(m=>m.sha256),["111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803", "5a709401c29401a5bdf821056fad86c1187048b506dad172f1f4d753a3e8f7e4", "e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67", "6709a966ef9780e6970960b983017984dab7caed395a32d188bc62eb12f4b263", "aa9275f4c90ef71e12400648471fdb0a5b08115497f49013bcd14fb9fd724293"]);
 if(third)assert.equal(metadata[5].sha256,'fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19');
 if(fourth)assert.equal(metadata[6].sha256,'be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8');
 const clinicalBytes=await readBounded(new URL('./clinical-train.json',import.meta.url),128*1024);
 assert.equal(hash(clinicalBytes),'8241ee48539317a9834974202e767ef56e5648c164e499653e794d8ebe9ff75e');
 const clinical=JSON.parse(clinicalBytes).records;assert.equal(clinical.length,100);
 let authored=[],authoredSha;
 if(fourth){
  const bytes=await readBounded(new URL('./refit-legitimate-controls.json',import.meta.url),1024*1024);authoredSha=hash(bytes);
  assert.equal(authoredSha,'667dc0c9052480d0e63a83b7097550c1f8d9550a575ed9a15bf5d7d515e84975');
  authored=JSON.parse(bytes).records;assert.equal(authored.length,119);assert(authored.every(r=>r.label==='ham'));
 }
 const clinicalExcluded=[...clinical,...authored].map(r=>{
  const raw=new TextEncoder().encode(['From: Clinic <clinic@example.test>','To: patient@example.test','Subject: '+r.subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','',r.text].join('\r\n'));
  const id=hash(raw),tokens=statisticalTokens(statisticalText('',r.text).text).sort((a,b)=>a-b);
  return {id,sha256:id,path:'messages/'+id+'.eml',label:'ham',bytes:raw.length,bodyFeatureSha256:tokens.length?hash(JSON.stringify(tokens)):id};
 });
 const excluded=[...clinicalExcluded,...metadata[0].data.records,...metadata[1].data.records.filter(r=>r.partition==='train'),...metadata[2].data.records,...metadata[3].data.records.filter(r=>r.partition==='holdout'),...metadata[4].data.records.filter(r=>r.partition==='holdout'),...(third?metadata[5].data.records:[]),...(fourth?metadata[6].data.records:[]),...metadata.at(-1).data.records];
 const candidates=[...metadata[4].data.records,...(fourth?metadata[3].data.records:[])];
 const sourceRoots=new Map(metadata[4].data.records.map(r=>[r.id,resolve(first,'..')]));
 if(fourth){
  assert.equal(metadata[3].data.source,metadata[4].data.source);
  for(const r of metadata[3].data.records)if(!sourceRoots.has(r.id))sourceRoots.set(r.id,resolve(old,'..'));
 }
 const selected=selectUnseen(candidates,excluded);await mkdir(join(out,'messages'),{recursive:true});
 const source=resolve(first,'..');assert(!(await lstat(source)).isSymbolicLink());assert(!(await lstat(join(source,'messages'))).isSymbolicLink());assert(!(await lstat(join(out,'messages'))).isSymbolicLink());let total=0;
 for(const r of selected){const sourceRoot=fourth?sourceRoots.get(r.id):source;assert(sourceRoot);assert(!(await lstat(sourceRoot)).isSymbolicLink());assert(!(await lstat(join(sourceRoot,'messages'))).isSymbolicLink());const raw=await readBounded(join(sourceRoot,r.path),r.bytes);assert.equal(raw.length,r.bytes);assert.equal(hash(raw),r.id);total+=raw.length;assert(total<=256*1024*1024);await writeFile(join(out,r.path),raw,{flag:'wx'});}
 const manifest={version:1,source:metadata[4].data.source,archives:fourth?[...metadata[4].data.archives,...metadata[3].data.archives]:metadata[4].data.archives,
  selection:fourth?'Fourth cohort frozen before further classifier development. Neutral candidate union of unused cached SH/kaminski-v and BG/beck-s archives (25590 records, within existing30000 bound). First1000 per label by SHA after all prior TRAIN/observed corpora, first2112573a/secondfd22/thirdbe8 cohorts, clinical100 and all119 authored legitimate regression controls, plus private-study exclusion-only raw/body-feature hashes. Conflicting body labels and within-cohort duplicates removed. All three earlier SH/kaminski-v cohorts are observed regression only. Selected unused cached public archive members were excluded from TRAIN and all earlier predictions. No content/model/prediction-dependent selection.':third?'Third cohort frozen before further detector development. First1000 per label by SHA after all prior TRAIN/observed corpora, both first2112573a and secondfd22 cohorts, authored clinical and private-study exclusion-only raw/body hashes. Conflicting body labels and within-cohort duplicates removed. Both earlier SH/kaminski-v cohorts are observed regression only. Remaining cached same-archive messages were reserved from TRAIN and have never been scored. No content/model/prediction-dependent selection.':'Second cohort frozen before corrective detector development. First1000 per label by SHA after all prior TRAIN/observed selected corpora and private-study exclusion-only raw/body hashes; conflicting body labels and within-cohort duplicates removed. First SH/kaminski-v cohort2000/2112573a is now observed regression only. Unused cached same-archive messages were reserved from TRAIN and have never been scored. No content/model/prediction-dependent selection.',
  summary:{holdout:{total:2000,ham:1000,spam:1000}},publicMetadataSha256:metadata.filter(m=>!m.private).map(m=>m.sha256),privateExclusionsUsed:true,...(fourth?{authoredLegitimateControlsSha256:authoredSha}:{}),
  records:selected.map(r=>({...r,partition:'holdout'}))};
 const bytes=JSON.stringify(manifest,null,2)+'\n';await writeFile(join(out,'manifest.json'),bytes,{flag:'wx'});
 const receipt={manifestSha256:hash(bytes),summary:manifest.summary,selectedBytes:total,selection:'neutral raw/body disjoint SHA order, first1000 per label',rawAndBodyOverlapWithExclusions:0,withinCohortRawOrBodyDuplicates:0,predictions:0};
 await writeFile(join(out,'freeze.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
}else throw Error('usage: --self-check OR SA_METADATA TRAIN_METADATA ADDITIONAL_TRAIN_METADATA OLD_METADATA FIRST_METADATA [SECOND_MANIFEST [THIRD_MANIFEST]] PRIVATE_EXCLUSIONS EXISTING_OUTSIDE_GIT_DIR');
