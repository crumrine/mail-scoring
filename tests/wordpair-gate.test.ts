// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('wordpair release gate requires six complete pinned studies, every frozen HAM control and exact recall boundaries',()=>{
 const root=mkdtempSync(join(tmpdir(),'wordpair-gate-check-'));
 try{
  const pins={baseline:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'},candidate:{inbox:'35718322ea97e1c6cec6adee8b0483950bc65f99',scorer:'453cc3423e222b0e853bf3d8e9d590ee01e44bf7'}};
  const runnerSha256='41379c9bc8562fd67190c30deed314e269d3e9e76eeaa447c67d0c8c5936627f';
  const frozen=JSON.parse(readFileSync('harness/evaluation/wordpair-legitimate-controls.json','utf8')).records;
  const selections=[{"mode":"wordpair-sa","manifestSha256":"111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803","selectedIdLabelsSha256":"658644be4b59699c438d0322a25179ac490b004c3fc05fcd73d6dd7156c380ac","rows":2736,"ham":1603,"spam":1133},{"mode":"wordpair-enron","manifestSha256":"3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380","selectedIdLabelsSha256":"b3f6176f82292e98f372f590255e64d077c75e2c2f20ec5eec44cc5dd96ccba5","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-first","manifestSha256":"2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552","selectedIdLabelsSha256":"8b9d8fd67d33d627e5954f15e472dcf4ff0c659192a2be527214b2884281596a","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-second","manifestSha256":"fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19","selectedIdLabelsSha256":"0aff4aeea50392a3b9fcdb460b8dc7ab4fee8b67a7561424acdb175313f87bb7","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-third","manifestSha256":"be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8","selectedIdLabelsSha256":"1de77663b0e1f9730bc40b5432767db820bc4ab6b31e228384c54d1a789bbbe9","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-fourth","manifestSha256":"1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d","selectedIdLabelsSha256":"abd6a73c763d05934b0a0272e13d849c7af96832fdc28d4da7b709594365100c","rows":2000,"ham":1000,"spam":1000}];
  const manifests=selections.map(s=>s.manifestSha256);
  // Public metadata only, fabricated gate results: no MIME, features, model or classifier import.
  const expectedRows=[JSON.parse(readFileSync('docs/evidence/dev-1009-refit/refit-sa/report.json','utf8')).variants.baseline.rows,...['enron-holdout-manifest.json','recall-holdout-manifest.json','recall-second-holdout-manifest.json','recall-third-holdout-manifest.json','recall-fourth-holdout-manifest.json'].map(p=>JSON.parse(readFileSync('harness/evaluation/'+p,'utf8')).records)].map(rows=>rows.map((r:any)=>({id:r.id,label:r.label})).sort((a:any,b:any)=>a.id.localeCompare(b.id)));
  const make=()=>['wordpair-sa','wordpair-enron','wordpair-first','wordpair-second','wordpair-third','wordpair-fourth'].map((evaluationMode,index)=>({evaluationMode,manifestSha256:manifests[index],selectedIdLabelsSha256:selections[index]!.selectedIdLabelsSha256,runnerSha256,independentHoldout:index===5,checks:{networkAttempts:0,repeatedOrderInvariant:true},generalProvenance:{modelVersion:'general-7',modelSourceSha256:'ce506fc71c7b465ccf2fef1218c821739c381509c93abd7f8a98ec4da516d052',twoWordIncidentPositiveLowerBound:true,trainingGridSha256:'d9105721552555568fd4f387654bcda5029190dc93fe6a201ac81af86c2cbfae',vocabularyCap:50000,legitimateControlsSha256:'973f7dd28694bc1b98a4be601a253a3fd1913da9eebbb187555b3d6622dbc3e2'},identities:Object.fromEntries(Object.entries(pins).map(([name,pins])=>[name,{pins:{...pins}}])),variants:Object.fromEntries(['baseline','candidate'].map(name=>{
   const total=index===0?2736:2000,spam=index===0?1133:1000,TP=name==='baseline'?300:500;let caught=0;
   return [name,{metrics:{TP,FP:0,TN:total-spam,FN:spam-TP,spam,ham:total-spam,total,recall:TP/spam},byPartition:Object.fromEntries((index===0?['diagnostic','validation','holdout']:['holdout']).map(p=>[p,{metrics:{FP:0},hardHam:{FP:0},htmlOnly:{FP:0},other:{FP:0}}])),rows:expectedRows[index]!.map((r:any)=>{const hit=r.label==='spam'&&caught++<TP;return {...r,quarantined:hit,status:'partial',score:hit?60:0,ruleSetVersion:name==='candidate'?'rules-9':'rules-5',policyVersion:name==='candidate'?'inbox-scoring-8':'inbox-scoring-4',engineVersion:'0.1.0'};})}];
  })),controls:Object.fromEntries(['baseline','candidate'].map(name=>[name,[...frozen.flatMap((c:any)=>['plain','html'].map(kind=>({id:'legitimate_'+c.id+'_'+kind,truth:'ham',kind:'authored_ham',status:'partial',ruleSetVersion:name==='candidate'?'rules-9':'rules-5',policyVersion:name==='candidate'?'inbox-scoring-8':'inbox-scoring-4',score:0,quarantined:false}))),...Array.from({length:25},(_,i)=>({id:'installation_'+i,truth:'installation_control',quarantined:false}))]])),generalGate:{eligible:true},release:{regressionGatePassed:true}}));
  const run=(reports:any[])=>{
   const files=reports.map((r,i)=>{const path=join(root,i+'.json');writeFileSync(path,JSON.stringify(r));return path;});
   return spawnSync(process.execPath,['harness/evaluation/wordpair-gate.mjs',...files,join(root,'out')],{encoding:'utf8',timeout:10000});
  };
  const valid=run(make());assert.equal(valid.status,0,valid.stderr);
  for(const [index,mutate]of [
   (r:any[])=>{const v=r[5].variants.candidate,row=v.rows.filter((x:any)=>x.quarantined).at(-1);row.quarantined=false;row.status='unavailable';row.score=null;row.ruleSetVersion=null;row.engineVersion=null;v.metrics.TP=499;v.metrics.FN=501;v.metrics.recall=.499;},
   (r:any[])=>{const v=r[5].variants.baseline;v.rows.find((x:any)=>x.label==='spam'&&!x.quarantined).quarantined=true;v.metrics.TP=301;v.metrics.FN=699;v.metrics.recall=.301;},
   (r:any[])=>{const v=r[0].variants.candidate;v.rows.find((x:any)=>x.label==='ham').quarantined=true;v.metrics.FP=1;v.metrics.TN--;},
   (r:any[])=>{const v=r[5].variants.baseline;v.rows.find((x:any)=>x.label==='ham').quarantined=true;v.metrics.FP=1;v.metrics.TN--;},
   (r:any[])=>r[2].variants.baseline.byPartition.holdout.hardHam.FP=1,
   (r:any[])=>r[3].variants.candidate.byPartition.holdout.htmlOnly.FP=1,
   (r:any[])=>r[5].variants.candidate.rows.pop(),
   (r:any[])=>r[0].runnerSha256='0'.repeat(64),
   (r:any[])=>r[1].identities.candidate.pins.inbox='0'.repeat(40),
   (r:any[])=>r[5].manifestSha256='0'.repeat(64),
   (r:any[])=>r[0].checks.networkAttempts=1,
   (r:any[])=>r[1].controls.baseline.pop(),
   (r:any[])=>r[2].controls.candidate[0].score=null,
   (r:any[])=>r[3].controls.baseline[1].quarantined=true,
   (r:any[])=>r[5].controls.candidate[2].truth='spam',
   (r:any[])=>r[0].generalProvenance.twoWordIncidentPositiveLowerBound=false,
   (r:any[])=>r[1].release.regressionGatePassed=false,
   (r:any[])=>{const rows=r[5].variants.candidate.rows,a=rows.find((x:any)=>x.label==='ham'),b=rows.find((x:any)=>x.label==='spam');[a.label,b.label]=[b.label,a.label];},
   (r:any[])=>r[5].variants.candidate.rows[0].id='f'.repeat(64),
   (r:any[])=>r[1].selectedIdLabelsSha256='0'.repeat(64),
   (r:any[])=>r[1].generalProvenance.trainingGridSha256='0'.repeat(64),
  ].entries()){const reports=make();mutate(reports);assert.equal(run(reports).status,1,`negative case ${index}`);}
 }finally{rmSync(root,{recursive:true,force:true});}
});
