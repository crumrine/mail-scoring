// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Development comparison only; all evaluated rows must belong to the original TRAIN partition.
import {writeFile,mkdtemp,rm} from 'node:fs/promises';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
import {MIME_RUNTIME} from './mime-runtime.mjs';
import {readBounded} from './files.mjs';
const [input,output]=process.argv.slice(2);
const {build}=createRequire(process.cwd()+'/package.json')('esbuild');const bytes=await readBounded(input,64*1024*1024);if(createHash('sha256').update(bytes).digest('hex')!=='f425bd39b2ca7b111cc8269ee4a80c8642bb3898a4418383d2811579fcbc3bb4')throw Error('TRAIN_matrix_hash');const rows=JSON.parse(bytes);if(!Array.isArray(rows)||rows.length>4804||!rows.every(r=>r.partition==='train'&&/^[a-f0-9]{64}$/.test(r.id)&&['ham','spam'].includes(r.label)&&['easy_ham','hard_ham','spam','enron_ham','enron_spam'].includes(r.group)&&Number.isInteger(r.bodyPositions)&&r.bodyPositions>=0&&r.bodyPositions<=1000&&typeof r.textInspectable==='boolean'&&typeof r.rawInspectable==='boolean'&&Array.isArray(r.features)&&r.features.length<=1999&&r.features.every(k=>/^[0-9]{1,10}:(?:-1|[0-9]{1,10})$/.test(k))))throw Error('TRAIN_feature_schema');
const temp=await mkdtemp('/tmp/train-cv-');try{
const entry=temp+'/helpers.mjs';await build({stdin:{contents:`export {tiledClues} from ${JSON.stringify(process.cwd()+'/packages/core/src/vendor/tiling.ts')};export {combineClues} from ${JSON.stringify(process.cwd()+'/packages/core/src/vendor/chi.ts')};`,loader:'ts',resolveDir:process.cwd()},outfile:entry,bundle:true,platform:'node',format:'esm'});const {tiledClues,combineClues}=await import(pathToFileURL(entry));
const fold=r=>parseInt(r.id.slice(0,8),16)%5;
const features=r=>{let position=0;return r.features.map(key=>{const [first,second]=key.split(':').map(Number);return second===-1?{first,second,start:position,end:position++}:{first,second,start:position-2,end:position-1};});};
const results=[];
for(const scope of ['unigram','context'])for(const method of ['pooled','equal','sqrt'])for(const cutoff of [.99,.995,.999]){
 const predictions={};
 const metrics={TP:0,FP:0,TN:0,FN:0,hardHamFP:0,hardHamTotal:0};
 for(let f=0;f<5;f++){
 const docs=[0,0,0],counts=new Map();
 for(const r of rows.filter(r=>fold(r)!==f&&r.textInspectable)){
 const type=r.label==='spam'?2:r.group==='hard_ham'?1:0;docs[type]++;
 for(const key of new Set(r.features)){const c=counts.get(key)??[0,0,0];c[type]++;counts.set(key,c);}
 }
 const probabilities=new Map();
 for(const [key,c]of counts){const n=c.reduce((a,b)=>a+b,0);if(n<3)continue;const weight=method==='equal'?.5:Math.sqrt(docs[1])/(Math.sqrt(docs[0])+Math.sqrt(docs[1]));const ham=method==='pooled'?(c[0]+c[1])/(docs[0]+docs[1]):(1-weight)*c[0]/docs[0]+weight*c[1]/docs[1];const spam=c[2]/docs[2];probabilities.set(key,Math.max(.01,Math.min(.99,(1.5+n*spam/(ham+spam))/(3+n))));}
 for(const r of rows.filter(r=>fold(r)===f)){
 const unigrams=r.features.filter(key=>key.endsWith(':-1'));
 const bodyDistinct=r.bodyPositions?new Set(unigrams.slice(-r.bodyPositions)).size:0;
 const clues=r.textInspectable&&!r.quoted&&bodyDistinct>=5?tiledClues(features(r).filter(feature=>scope==='context'||feature.second===-1),probabilities):[];
 const spam=clues.length>=20&&combineClues(clues)>=cutoff;
 predictions[r.id]=spam;
 if(r.label==='spam')metrics[spam?'TP':'FN']++;else metrics[spam?'FP':'TN']++;
 if(r.group==='hard_ham'){metrics.hardHamTotal++;if(spam)metrics.hardHamFP++;}
 }
 }
 results.push({scope,method,cutoff,metrics,predictions});
}
const combinations=[];
for(const method of ['pooled','equal','sqrt'])for(const unigramCutoff of [.99,.995,.999])for(const contextCutoff of [.99,.995,.999]){
 const a=results.find(r=>r.scope==='unigram'&&r.method===method&&r.cutoff===unigramCutoff),b=results.find(r=>r.scope==='context'&&r.method===method&&r.cutoff===contextCutoff);
 const metrics={TP:0,FP:0,TN:0,FN:0,hardHamFP:0};
 for(const r of rows){const spam=a.predictions[r.id]||b.predictions[r.id];if(r.label==='spam')metrics[spam?'TP':'FN']++;else metrics[spam?'FP':'TN']++;if(r.group==='hard_ham'&&spam)metrics.hardHamFP++;}
 combinations.push({method,unigramCutoff,contextCutoff,metrics});
}
for(const r of results)delete r.predictions;
const options=[...results.map(r=>({...r,kind:r.scope,minCutoff:r.cutoff,heads:1})),...combinations.map(r=>({...r,kind:'ensemble',minCutoff:Math.min(r.unigramCutoff,r.contextCutoff),heads:2}))];
const selected=options.filter(r=>r.method==='sqrt'&&r.metrics.FP===0).sort((a,b)=>b.metrics.TP-a.metrics.TP||b.minCutoff-a.minCutoff||a.heads-b.heads||['pooled','equal','sqrt'].indexOf(a.method)-['pooled','equal','sqrt'].indexOf(b.method))[0];
if(!selected)throw Error('no_zero_FP_TRAIN_candidate');
const receipt={predeclaredCandidates:45,combinations,selected,selection:'retain existing sqrt-hardham safetyguard; maxTRAIN-CVTP subjectto0FP; tiehigherminimumcutoff, fewerheads, simplerprior; no othercorpusread',runtime:MIME_RUNTIME,scope:'Development only:5fold hashCV onTRAIN rows; novalidation/holdout/freshcorpusread',positions:1000,cutoff:.99,minClues:20,maxClues:64,featuresSha256:createHash('sha256').update(bytes).digest('hex'),rows:rows.length,results};await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{await rm(temp,{recursive:true,force:true});}
