// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {MIME_RUNTIME} from './mime-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {readBounded,sha256} from './files.mjs';
function trainingCounts(features){
 const train=features.filter(r=>r.partition==='train'&&r.rawInspectable&&r.textInspectable&&r.features.length<1000);
 const documents=[train.filter(r=>r.label==='ham').length,train.filter(r=>r.label==='spam').length];
 const counts=new Map();
 for(const row of train)for(const id of new Set(row.features)){
  const c=counts.get(id)??[0,0];c[row.label==='spam'?1:0]++;counts.set(id,c);
 }
 const entries=[...counts].filter(([,c])=>c[0]+c[1]>=3).sort((a,b)=>a[0]-b[0]).map(([id,c])=>[id,...c]);
 return {documents,counts,entries};
}
if(process.argv[2]==='--self-check'){
 const row={partition:'train',label:'ham',features:[7,7],rawInspectable:true,textInspectable:true};
 const rows=[row,row,row,{...row,partition:'holdout',label:'spam'},{...row,partition:'validation',label:'spam'},{...row,rawInspectable:false,label:'spam'}];
 const actual=trainingCounts(rows);assert.deepEqual(actual.documents,[3,0]);assert.deepEqual(actual.entries,[[7,3,0]]);
 assert.deepEqual(actual.entries,trainingCounts([...rows].reverse()).entries);
 console.log(JSON.stringify({passed:true,cases:['train_only','no_holdout_or_validation_labels','unavailable_excluded','document_not_word_frequency','order_invariance']}));process.exit(0);
}
const root=process.argv[2];
const frozen=await readBounded(root+'/partitions.json',4*1024*1024);
assert.equal(sha256(frozen),'111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803');
const featureBytes=await readBounded(root+'/features.json',16*1024*1024);
assert.equal(sha256(featureBytes),'59d3915ab9b93943d3f454fa940e2d1da21f8ba0d766874dbc94f4b32b330e36');
const manifest=JSON.parse(frozen),features=JSON.parse(featureBytes);
assert.deepEqual(features.map(({features,...row})=>row),manifest.records);
for(const row of features)assert.ok(Array.isArray(row.features)&&row.features.length<=1000&&row.features.every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff));
const {documents,counts,entries}=trainingCounts(features);
const model={version:'general-1',partitionSha256:createHash('sha256').update(frozen).digest('hex'),documents,counts:entries};
await mkdir('.artifacts/general',{recursive:true});
await writeFile('.artifacts/general/model.json',JSON.stringify(model)+'\n');
if(process.argv[3]==='--write-model')await writeFile('packages/core/src/general-model.ts',
 '// Copyright (c) 2026 Brian Crumrine\n// SPDX-License-Identifier: Apache-2.0\n'+
 '// Original numerical aggregate counts generated from the declared public training partition.\n'+
 '// No source messages, words, addresses, URLs or sequences are included. Provenance: docs/general-spam.md.\n'+
 'export const MODEL_VERSION = '+JSON.stringify(model.version)+';\n'+
 'export const MODEL_PARTITION_SHA256 = '+JSON.stringify(model.partitionSha256)+';\n'+
 'export const MODEL_DOCUMENTS:readonly [number,number] = '+JSON.stringify(documents)+';\n'+
 'export const MODEL_COUNTS:ReadonlyArray<readonly [number,number,number]> = [\n'+entries.map(e=>'  '+JSON.stringify(e)).join(',\n')+'\n];\n');
await build({entryPoints:['packages/core/src/vendor/chi.ts'],outfile:'.artifacts/general/chi.mjs',bundle:true,format:'esm',platform:'node'});
const {combineClues}=await import(pathToFileURL(process.cwd()+'/.artifacts/general/chi.mjs'));
function classify(row){
 if(!row.rawInspectable||!row.textInspectable||row.quoted)return {value:0.5,clues:0};
 const probs=[];
 for(const id of row.features){
  const c=counts.get(id);if(!c||c[0]+c[1]<3)continue;
  const ham=c[0]/documents[0],spam=c[1]/documents[1],n=c[0]+c[1];
  const p=Math.max(.01,Math.min(.99,(1.5+n*spam/(ham+spam))/(3+n)));
  if(Math.abs(p-.5)>=.1)probs.push([id,p]);
 }
 probs.sort((a,b)=>Math.abs(b[1]-.5)-Math.abs(a[1]-.5)||a[0]-b[0]);
 const selected=probs.slice(0,64);
 return {value:combineClues(selected.map(p=>p[1])),clues:selected.length};
}
const rows=features.filter(r=>r.partition==='validation').map(r=>({id:r.id,label:r.label,group:r.group,htmlOnly:r.htmlOnly,...classify(r)}));
const metrics=[];
for(const cutoff of [.9,.95,.98,.99,.995,.999,.9999])for(const minClues of [12,20]){
 let TP=0,FP=0,TN=0,FN=0;
 for(const r of rows){const spam=r.value>=cutoff&&r.clues>=minClues;if(r.label==='spam'){if(spam)TP++;else FN++;}else{if(spam)FP++;else TN++;}}
 metrics.push({cutoff,minClues,TP,FP,TN,FN});
}
const report={runtime:MIME_RUNTIME,partitionSha256:model.partitionSha256,documents,modelEntries:entries.length,validationOnly:true,rows,metrics};
await writeFile('.artifacts/general/validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({partitionSha256:model.partitionSha256,documents,modelEntries:entries.length,metrics}));
