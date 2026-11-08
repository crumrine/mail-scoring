// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

test('recall release gate rejects lower recall, hidden HAM catches and changed source/evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'recall-gate-check-'));
 try{
  const pins={baseline:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'},candidate:{inbox:'049998e046cf37d5a5faf725d1fc75d5499d20b2',scorer:'0041d47f20d2565dc8725a3c11f0ed1af113ca74'}};
  const runnerSha256=createHash('sha256').update(readFileSync('harness/evaluation/run.mjs')).digest('hex');
  const manifests=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552'];
  const make=()=>['recall-sa','recall-enron','recall-fresh'].map((evaluationMode,index)=>({evaluationMode,manifestSha256:manifests[index],runnerSha256,independentHoldout:index===2,checks:{networkAttempts:0,repeatedOrderInvariant:true},identities:Object.fromEntries(Object.entries(pins).map(([name,pins])=>[name,{pins:{...pins}}])),variants:Object.fromEntries(['baseline','candidate'].map(name=>{
   const total=index===0?2736:2000,TP=name==='baseline'?300:500;
   return [name,{metrics:{TP,FP:0,TN:total-1000,FN:1000-TP,spam:1000,recall:TP/1000},rows:Array.from({length:total},(_,i)=>({label:i<1000?'spam':'ham',quarantined:i<TP}))}];
  })),controls:{baseline:[],candidate:[]},generalGate:{eligible:true}}));
  const run=(reports:any[])=>{
   const files=reports.map((r,i)=>{const path=join(root,i+'.json');writeFileSync(path,JSON.stringify(r));return path;});
   return spawnSync(process.execPath,['harness/evaluation/recall-gate.mjs',...files,join(root,'out')],{encoding:'utf8',timeout:10000});
  };
  assert.equal(run(make()).status,0);
  for(const [index,mutate] of [
   (r:any[])=>{const v=r[2].variants.candidate;v.rows[499].quarantined=false;v.metrics.TP=499;v.metrics.FN=501;v.metrics.recall=.499;},
   (r:any[])=>{const v=r[2].variants.baseline;v.rows[300].quarantined=true;v.metrics.TP=301;v.metrics.FN=699;v.metrics.recall=.301;},
   (r:any[])=>{for(const name of ['baseline','candidate']){const v=r[0].variants[name];v.rows[1000].quarantined=true;v.metrics.FP=1;v.metrics.TN--; }},
   (r:any[])=>r[1].controls.baseline.push({truth:'ham',quarantined:true}),
   (r:any[])=>r[2].variants.candidate.rows.pop(),
   (r:any[])=>r[0].runnerSha256='0'.repeat(64),
   (r:any[])=>r[1].identities.candidate.pins.inbox='0'.repeat(40),
   (r:any[])=>r[2].manifestSha256='0'.repeat(64),
   (r:any[])=>r[0].checks.networkAttempts=1,
  ].entries()){const reports=make();mutate(reports);assert.equal(run(reports).status,1,`negative case ${index}`);}
 }finally{rmSync(root,{recursive:true,force:true});}
});
