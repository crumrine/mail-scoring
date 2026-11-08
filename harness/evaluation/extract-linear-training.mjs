// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// TRAIN-only actual projection and neutral guards. No classifier or model import.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readBounded} from './files.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [sa,extra,additional,inboxArg,outputDir]=process.argv.slice(2);
assert(outputDir,'usage: extract-linear-training.mjs SA_ROOT EXTRA_ROOT ADDITIONAL_ROOT PINNED_INBOX OUTPUT');
const inbox=resolve(inboxArg),dir=resolve(outputDir),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(dir,{recursive:true});
await import('./mime-runtime.mjs');
assert.equal(execFileSync('git',['-C',inbox,'rev-parse','HEAD']).toString().trim(),'606d0edee433fbf2aee517b1f1b61e631251a79a','frozen_extractor_caller');
const {build}=createRequire(root+'/package.json')('esbuild'),PostalMime=createRequire(inbox+'/package.json')('postal-mime');
assert.equal(JSON.parse(await readFile(join(inbox,'package-lock.json'))).packages['node_modules/postal-mime'].version,'2.7.3');
assert.equal(JSON.parse(await readBounded(join(inbox,'node_modules/postal-mime/package.json'),65536)).version,'2.7.3');
const manifests=[
 [join(resolve(sa),'partitions.json'),'111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803',resolve(sa)],
 [root+'/harness/evaluation/enron-train-manifest.json','773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131',resolve(extra)],
 [root+'/harness/evaluation/recall-train-manifest.json','e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67',resolve(additional)],
];
const authoredBytes=await readBounded(root+'/harness/evaluation/clinical-train.json',128*1024);
assert.equal(hash(authoredBytes),'8241ee48539317a9834974202e767ef56e5648c164e499653e794d8ebe9ff75e');
const authored=JSON.parse(authoredBytes);assert.equal(authored.records.length,100);
await build({stdin:{contents:`export {project} from '${inbox}/workers/lib/mail-scoring/intake.ts';export {parseRequest,guardInput} from '${root}/packages/core/src/guards.ts';export {inspect} from '${root}/packages/core/src/inspection.ts';export {statisticalText,statisticalTokens} from '${root}/packages/core/src/statistical-text.ts';export {contextFeatures,contextKey} from '${root}/packages/core/src/context-features.ts';`,loader:'ts',resolveDir:root},outfile:dir+'/train-neutral.mjs',bundle:true,platform:'node',format:'esm'});
const m=await import(pathToFileURL(dir+'/train-neutral.mjs'));
let fetches=0;globalThis.fetch=()=>{fetches++;throw Error('offline_only');};
const rows=[],seen=new Set();
async function extract(raw,record){
 assert(!seen.has(record.id));seen.add(record.id);
 const row={id:record.id,label:record.label,group:record.group,partition:'train',rawInspectable:raw.length<=131072,textInspectable:false,quoted:false,bodyPositions:0,bodyDistinct:0,eligible:false,features:[]};
 if(row.rawInspectable){try{
  const parsed=await PostalMime.parse(raw),input=m.project(parsed);
  if(!((parsed.text&&!input.text)||(!input.text.trim()&&parsed.html&&!input.html))){
   const guarded=m.guardInput(m.parseRequest(new TextEncoder().encode(JSON.stringify(input))).value);assert(guarded);
   const limits=new Set(guarded.limitsHit);limits.add('auth_unknown');m.inspect(guarded.input,limits);
   const content=m.statisticalText(guarded.input.subject,guarded.input.text,guarded.input.html??'');
   const fs=m.contextFeatures([content.subjectText,content.bodyText]);row.quoted=content.quoted;
   row.bodyPositions=m.contextFeatures([content.bodyText]).positions;row.bodyDistinct=m.statisticalTokens(content.bodyText).length;
   row.textInspectable=content.complete&&!fs.limited;
   row.eligible=row.textInspectable&&!row.quoted&&row.bodyDistinct>=5&&[...limits].every(l=>['auth_unknown','source_incomplete','html_uninspected','identity_uninspected'].includes(l));
   if(row.textInspectable)row.features=fs.features.map(f=>m.contextKey(f.first,f.second));
  }
 }catch{row.textInspectable=false;row.eligible=false;row.features=[];}}
 rows.push(row);assert(rows.length<=10000);
}
for(const [path,expected,data]of manifests){
 const bytes=await readBounded(path,8*1024*1024);assert.equal(hash(bytes),expected);
 for(const r of JSON.parse(bytes).records.filter(r=>r.partition==='train')){
  assert.match(r.id,/^[a-f0-9]{64}$/);assert.equal(r.path,'messages/'+r.id+'.eml');assert(['ham','spam'].includes(r.label));
  assert(Number.isSafeInteger(r.bytes)&&r.bytes>=0&&r.bytes<=2*1024*1024);
  const raw=new Uint8Array(await readBounded(data+'/'+r.path,r.bytes));assert.equal(raw.length,r.bytes);assert.equal(hash(raw),r.id);
  await extract(raw,r);
 }
}
assert.equal(rows.length,9804);
for(const r of authored.records){
 assert(typeof r.subject==='string'&&r.subject.length<=200&&!/[\r\n]/.test(r.subject));assert(typeof r.text==='string'&&r.text.length<=2000);
 const raw=new TextEncoder().encode(['From: Clinic <clinic@example.test>','To: patient@example.test','Subject: '+r.subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','',r.text].join('\r\n'));
 await extract(raw,{id:hash(raw),label:'ham',group:'hard_ham'});
}
assert.equal(rows.length,9904);assert.equal(fetches,0);
const output=JSON.stringify(rows)+'\n';assert(Buffer.byteLength(output)<=128*1024*1024);
assert.equal(hash(output),'41cfddf1ba4baf4a49ff84a621905ff6f662fad9f034f771225bee96662b440b','TRAIN_feature_reproduction');
await writeFile(dir+'/complete-training-features.json',output,{flag:'wx'});
const receipt={sha256:hash(output),rows:rows.length,summary:Object.fromEntries(['ham','spam'].map(label=>[label,{total:rows.filter(r=>r.label===label).length,eligible:rows.filter(r=>r.label===label&&r.eligible).length}])),sources:[...manifests.map(m=>m[1]),hash(authoredBytes)],fetches,scope:'Frozen public TRAIN plus100 original authored clinical TRAIN ham; synthetic rows are development data, never independent accuracy. Exact raw byte provenance; no classifier imports or heldout reads.'};
await writeFile(dir+'/complete-training-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
