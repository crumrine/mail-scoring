// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('refit release gate requires five complete pinned studies, every frozen HAM control and exact recall boundaries',()=>{
 const root=mkdtempSync(join(tmpdir(),'refit-gate-check-'));
 try{
  const pins={baseline:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'},candidate:{inbox:'b5a89a074e362d8123ee3bf260b6208c78503479',scorer:'62919bc8f939bc94c0552fc6a3917c03a3373646'}};
  const runnerSha256=createHash('sha256').update(readFileSync('harness/evaluation/run.mjs')).digest('hex');
  const frozen=JSON.parse(readFileSync('harness/evaluation/refit-legitimate-controls.json','utf8')).records;
  const manifests=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552','fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19','be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8'];
  const make=()=>['refit-sa','refit-enron','refit-first','refit-second','refit-third'].map((evaluationMode,index)=>({evaluationMode,manifestSha256:manifests[index],runnerSha256,independentHoldout:index===4,checks:{networkAttempts:0,repeatedOrderInvariant:true},generalProvenance:{modelVersion:'general-6',modelSourceSha256:'a08e63c014ef291ad94a6c1c357aca0b7fc308948efb7720d35133d4fb487d8f',twoPositiveContributionLowerBound:true,fixedReferenceConjunction:true,legitimateControlsSha256:'667dc0c9052480d0e63a83b7097550c1f8d9550a575ed9a15bf5d7d515e84975'},identities:Object.fromEntries(Object.entries(pins).map(([name,pins])=>[name,{pins:{...pins}}])),variants:Object.fromEntries(['baseline','candidate'].map(name=>{
   const total=index===0?2736:2000,spam=index===0?1133:1000,TP=name==='baseline'?300:500;
   return [name,{metrics:{TP,FP:0,TN:total-spam,FN:spam-TP,spam,ham:total-spam,total,recall:TP/spam},byPartition:Object.fromEntries((index===0?['diagnostic','validation','holdout']:['holdout']).map(p=>[p,{metrics:{FP:0},hardHam:{FP:0},htmlOnly:{FP:0},other:{FP:0}}])),rows:Array.from({length:total},(_,i)=>({id:i.toString(16).padStart(64,'0'),label:i<spam?'spam':'ham',quarantined:i<TP,status:'partial',score:i<TP?60:0}))}];
  })),controls:Object.fromEntries(['baseline','candidate'].map(name=>[name,[...frozen.flatMap((c:any)=>['plain','html'].map(kind=>({id:'legitimate_'+c.id+'_'+kind,truth:'ham',kind:'authored_ham',status:'partial',ruleSetVersion:name==='candidate'?'rules-8':'rules-5',policyVersion:name==='candidate'?'inbox-scoring-7':'inbox-scoring-4',score:0,quarantined:false}))),...Array.from({length:25},(_,i)=>({id:'installation_'+i,truth:'installation_control',quarantined:false}))]])),generalGate:{eligible:true},release:{regressionGatePassed:true}}));
  const run=(reports:any[])=>{
   const files=reports.map((r,i)=>{const path=join(root,i+'.json');writeFileSync(path,JSON.stringify(r));return path;});
   return spawnSync(process.execPath,['harness/evaluation/refit-gate.mjs',...files,join(root,'out')],{encoding:'utf8',timeout:10000});
  };
  const valid=run(make());assert.equal(valid.status,0,valid.stderr);
  for(const [index,mutate]of [
   (r:any[])=>{const v=r[4].variants.candidate;v.rows[499].quarantined=false;v.rows[499].status='unavailable';v.rows[499].score=null;v.metrics.TP=499;v.metrics.FN=501;v.metrics.recall=.499;},
   (r:any[])=>{const v=r[4].variants.baseline;v.rows[300].quarantined=true;v.metrics.TP=301;v.metrics.FN=699;v.metrics.recall=.301;},
   (r:any[])=>{const v=r[0].variants.candidate;v.rows[1133].quarantined=true;v.metrics.FP=1;v.metrics.TN--;},
   (r:any[])=>{const v=r[4].variants.baseline;v.rows[1000].quarantined=true;v.metrics.FP=1;v.metrics.TN--;},
   (r:any[])=>r[2].variants.baseline.byPartition.holdout.hardHam.FP=1,
   (r:any[])=>r[3].variants.candidate.byPartition.holdout.htmlOnly.FP=1,
   (r:any[])=>r[4].variants.candidate.rows.pop(),
   (r:any[])=>r[0].runnerSha256='0'.repeat(64),
   (r:any[])=>r[1].identities.candidate.pins.inbox='0'.repeat(40),
   (r:any[])=>r[4].manifestSha256='0'.repeat(64),
   (r:any[])=>r[0].checks.networkAttempts=1,
   (r:any[])=>r[1].controls.baseline.pop(),
   (r:any[])=>r[2].controls.candidate[0].score=null,
   (r:any[])=>r[3].controls.baseline[1].quarantined=true,
   (r:any[])=>r[4].controls.candidate[2].truth='spam',
   (r:any[])=>r[0].generalProvenance.fixedReferenceConjunction=false,
   (r:any[])=>r[1].release.regressionGatePassed=false,
  ].entries()){const reports=make();mutate(reports);assert.equal(run(reports).status,1,`negative case ${index}`);}
 }finally{rmSync(root,{recursive:true,force:true});}
});
