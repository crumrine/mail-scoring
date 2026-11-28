// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Frozen TRAIN only. Never reads acceptance reports or held-out raw messages.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {readBounded} from './files.mjs';
import {createRuntime as createBaselineRuntime} from './rules11-runtime.mjs';
import {createRuntime as createTrainingRuntime} from './rules12-train-runtime.mjs';
import './mime-runtime.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const increment=(obj,key)=>{obj[key]=(obj[key]??0)+1;};
if(process.argv[2]==='--self-check'){
 const a={};increment(a,'unavailable');increment(a,'unavailable');assert.equal(a.unavailable,2);
 console.log(JSON.stringify({passed:true,scope:'synthetic aggregation only'}));process.exit(0);
}
assert.equal(process.argv.length,6,'INBOX_REPO SCORER_REPO TRAIN_ROOT OUTPUT');
const [inbox,scorer,data,out]=process.argv.slice(2).map(p=>resolve(p));
assert.equal(execFileSync('git',['-C',scorer,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','diagnostic_source_must_be_committed');
const workerd=createRequire(join(scorer,'package.json'))('workerd').default;
assert.equal(execFileSync(workerd,['--version'],{encoding:'utf8'}).trim(),'workerd 2026-10-21');
process.env.MINIFLARE_WORKERD_PATH=workerd;
const manifests=[
 [join(data,'partitions.json'),'111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803'],
 [resolve('harness/evaluation/enron-train-manifest.json'),'773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131'],
 [resolve('harness/evaluation/recall-train-manifest.json'),'e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67'],
];
const records=[];for(const [path,expected] of manifests){const bytes=await readBounded(path,32*1024*1024);assert.equal(hash(bytes),expected);records.push(...JSON.parse(bytes).records.filter(r=>r.partition==='train'));}
assert.equal(records.length,9804);assert.equal(new Set(records.map(r=>r.id)).size,records.length);
for(const path of ['harness/evaluation/recall-sixth-holdout-manifest.json','harness/evaluation/recall-seventh-holdout-manifest.json','harness/evaluation/recall-eighth-holdout-manifest.json']) {
 const held=JSON.parse(await readBounded(path,4*1024*1024)).records;
 const ids=new Set(held.map(r=>r.id)),bodies=new Set(held.map(r=>r.bodyFeatureSha256));
 assert(records.every(r=>!ids.has(r.id)&&!bodies.has(r.bodyFeatureSha256)),'train_holdout_overlap');
}
const clinicalBytes=await readBounded('harness/evaluation/clinical-train.json',128*1024);
assert.equal(hash(clinicalBytes),'8241ee48539317a9834974202e767ef56e5648c164e499653e794d8ebe9ff75e');
const clinical=JSON.parse(clinicalBytes).records;assert.equal(clinical.length,100);
const scratch=await mkdtemp(join(tmpdir(),'rules12-train-code-'));
const pins={rules10:{inbox:'1edbfb498d436331ba2b67a4704c72fcf11a9ac1',scorer:'f8aa6004c7a0990ae99dff51b2da0afe41bad412'},rules11:{inbox:'1011cb0f925e1dffa78d0f4e2ad94788441121bf',scorer:'fbf6feae2815b401253cb2783d7eddaf4c9c3e84'},candidate:{inbox:'ad693ec56486bb88ca25bc2591b738d39e58925a',scorer:'606856ba73fd4f4a4e5cfbc590171c86d4681052'}};
const runtimes=[];
try {
 for(const [name,pin] of Object.entries(pins)){
  const caller=join(scratch,name+'-inbox'),core=join(scratch,name+'-scorer');await mkdir(caller);await mkdir(core);
  for(const [repo,ref,paths,target] of [[inbox,pin.inbox,['workers/lib/mail-scoring'],caller],[scorer,pin.scorer,['packages/core/src','workers/private'],core]]){
   const tar=execFileSync('git',['-C',repo,'archive',ref,...paths],{maxBuffer:16*1024*1024});execFileSync('tar',['-xf','-','-C',target],{input:tar});
  }
  runtimes.push(await (name==='rules10'?createBaselineRuntime:createTrainingRuntime)(caller,core,inbox,scorer));
 }
 const totals=Object.fromEntries(['ham','spam'].map(label=>[label,{total:0,rules10:{quarantined:0,unavailable:0},rules11:{quarantined:0,unavailable:0},candidate:{quarantined:0,unavailable:0},candidateGained:0,candidateLost:0,lost:0,gained:0,lostLimits:{},gainedLimits:{},lostControlFields:{},lostAnchorWhitespaceOnly:0}]));
 async function evaluate(raw,label){
  assert(label==='ham'||label==='spam');const [old,current,candidate]=await Promise.all(runtimes.map(r=>r.classify(raw)));const stat=totals[label];stat.total++;
  for(const [name,result] of [['rules10',old],['rules11',current],['candidate',candidate]]){if(result.quarantined)stat[name].quarantined++;if(result.status==='unavailable')stat[name].unavailable++;}
  if(!current.quarantined&&candidate.quarantined)stat.candidateGained++;
  if(current.quarantined&&!candidate.quarantined)stat.candidateLost++;
  if(old.quarantined&&!current.quarantined){stat.lost++;if(current.limits.includes('control_chars')){for(const [field,present] of Object.entries(current.flags))if(present)increment(stat.lostControlFields,field);if(current.flags.anchorText&&!current.flags.anchorTextUnsafe)stat.lostAnchorWhitespaceOnly++;}for(const limit of current.limits)increment(stat.lostLimits,limit);if(current.status==='unavailable')increment(stat.lostLimits,'unavailable');}
  if(!old.quarantined&&current.quarantined){stat.gained++;for(const limit of current.limits)increment(stat.gainedLimits,limit);}
 }
 for(const row of records){
  assert.match(row.id,/^[a-f0-9]{64}$/);assert.equal(row.path,'messages/'+row.id+'.eml');assert.equal(row.sha256,row.id);assert(Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.bytes<=2*1024*1024);
  const raw=await readBounded(join(data,row.path),row.bytes);assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.id);await evaluate(raw,row.label);
 }
 for(const row of clinical){assert(typeof row.subject==='string'&&!/[\r\n]/.test(row.subject)&&row.subject.length<=200);assert(typeof row.text==='string'&&row.text.length<=2000);
  const raw=new TextEncoder().encode(['From: Clinic <clinic@example.test>','To: patient@example.test','Subject: '+row.subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','',row.text].join('\r\n'));await evaluate(raw,'ham');
 }
 assert.equal(totals.ham.total+totals.spam.total,9904);assert(runtimes.every(r=>r.networkAttempts()===0));
 const report={scope:'Frozen public TRAIN and synthetic clinical training controls only; no held-out predictions',pins,manifestHashes:manifests.map(m=>m[1]),clinicalSha256:hash(clinicalBytes),totals,networkAttempts:0};
 await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
} finally {for(const runtime of runtimes)await runtime.close();await rm(scratch,{recursive:true,force:true});}
