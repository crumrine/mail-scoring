// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pins={baseline:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'},candidate:{inbox:'b5a89a074e362d8123ee3bf260b6208c78503479',scorer:'62919bc8f939bc94c0552fc6a3917c03a3373646'}};
const modes=['refit-sa','refit-enron','refit-first','refit-second','refit-third'];
const manifests=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552','fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19','be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8'];
const runnerSha256='62bc563aee626e1ff2e7ba146ef8eac8a9fbe9365d481f15c1158cee5c9c57cf';
const controlsSha256='667dc0c9052480d0e63a83b7097550c1f8d9550a575ed9a15bf5d7d515e84975';
export function recallPass(before,after){return after.spam>0&&before.spam>0&&2*after.TP>=after.spam&&100*(after.TP*before.spam-before.TP*after.spam)>=20*before.spam*after.spam;}
if(process.argv[2]==='--self-check'){
 assert.equal(recallPass({TP:300,spam:1000},{TP:500,spam:1000}),true);
 assert.equal(recallPass({TP:301,spam:1000},{TP:500,spam:1000}),false);
 assert.equal(recallPass({TP:0,spam:1000},{TP:499,spam:1000}),false);
 assert.equal(recallPass({TP:500,spam:1000},{TP:700,spam:1000}),true);
 assert.equal(recallPass({TP:0,spam:0},{TP:0,spam:0}),false);
 console.log('Exact refit recall/gain boundary checks passed');
}else{
 assert.equal(process.argv.length,8,'usage: node refit-gate.mjs SA ENRON FIRST SECOND THIRD OUTPUT');
 const frozenBytes=await readFile(new URL('./refit-legitimate-controls.json',import.meta.url));assert.equal(sha(frozenBytes),controlsSha256);
 const frozen=JSON.parse(frozenBytes).records;assert.equal(frozen.length,119);
 const controlIds=frozen.flatMap(c=>['plain','html'].map(kind=>'legitimate_'+c.id+'_'+kind));assert.equal(new Set(controlIds).size,238);
 const inputs=[],failures=[];
 for(const [index,path] of process.argv.slice(2,7).entries()){
  const bytes=await readFile(path),r=JSON.parse(bytes);
  assert.equal(r.evaluationMode,modes[index]);assert.equal(r.manifestSha256,manifests[index]);assert.equal(r.runnerSha256,runnerSha256);
  assert.equal(r.independentHoldout,index===4);assert.equal(r.checks.networkAttempts,0);assert.equal(r.checks.repeatedOrderInvariant,true);
  assert.equal(r.generalProvenance.modelVersion,'general-6');assert.equal(r.generalProvenance.modelSourceSha256,'a08e63c014ef291ad94a6c1c357aca0b7fc308948efb7720d35133d4fb487d8f');
  assert.equal(r.generalProvenance.twoPositiveContributionLowerBound,true);assert.equal(r.generalProvenance.fixedReferenceConjunction,true);assert.equal(r.generalProvenance.legitimateControlsSha256,controlsSha256);
  for(const name of ['baseline','candidate']){
   assert.deepEqual(r.identities[name].pins,pins[name]);const v=r.variants[name];
   assert.equal(v.rows.length,index===0?2736:2000);assert.equal(new Set(v.rows.map(row=>row.id)).size,v.rows.length);
   const n={TP:0,FP:0,TN:0,FN:0};
   for(const row of v.rows){
    assert.match(row.id,/^[a-f0-9]{64}$/);assert.ok(['ham','spam'].includes(row.label));assert.equal(typeof row.quarantined,'boolean');
    if(row.status==='unavailable'){assert.equal(row.quarantined,false);assert.equal(row.score,null);}
    n[row.label==='spam'?(row.quarantined?'TP':'FN'):(row.quarantined?'FP':'TN')]++;
   }
   for(const [key,value]of Object.entries(n))assert.equal(v.metrics[key],value);
   assert.equal(v.metrics.spam,n.TP+n.FN);assert.equal(v.metrics.ham,n.FP+n.TN);assert.equal(v.metrics.total,v.rows.length);
   assert.equal(v.metrics.spam,index===0?1133:1000);assert.equal(v.metrics.ham,index===0?1603:1000);
   if(n.FP)failures.push(modes[index]+':'+name+':ham_false_positive');
   const controls=r.controls[name];assert.equal(controls.length,263);assert.equal(new Set(controls.map(c=>c.id)).size,263);
   const byId=new Map(controls.map(c=>[c.id,c]));
   for(const id of controlIds){
    const c=byId.get(id);assert.ok(c,'missing frozen legitimate control');assert.equal(c.truth,'ham');assert.equal(c.kind,'authored_ham');
    assert.equal(c.status,'partial');assert.equal(c.ruleSetVersion,name==='candidate'?'rules-8':'rules-5');assert.equal(c.policyVersion,name==='candidate'?'inbox-scoring-7':'inbox-scoring-4');assert.equal(c.score,0);
   }
   if(controls.some(row=>row.truth==='ham'&&row.quarantined))failures.push(modes[index]+':'+name+':authored_ham_false_positive');
   assert.deepEqual(Object.keys(v.byPartition).sort(),index===0?['diagnostic','holdout','validation']:['holdout']);
   for(const p of Object.values(v.byPartition))for(const group of ['metrics','hardHam','htmlOnly','other'])if(p[group].FP)failures.push(modes[index]+':'+name+':stratum_ham_false_positive');
  }
  if(!r.generalGate.eligible||!r.release.regressionGatePassed)failures.push(modes[index]+':declared_gate_failed');
  inputs.push({path:resolve(path),sha256:sha(bytes),mode:r.evaluationMode,manifestSha256:r.manifestSha256,baseline:r.variants.baseline.metrics,candidate:r.variants.candidate.metrics});
 }
 const fresh=inputs[4];if(!recallPass(fresh.baseline,fresh.candidate))failures.push('fresh_recall_or_gain_below_predeclared_gate');
 const receipt={pins,runnerSha256,controlsSha256,legitimateCases:119,legitimatePlainHtmlEvaluationsPerVariantPerStudy:238,inputs,predeclared:{minimumFreshRecall:.50,minimumAbsoluteFreshGain:.20,zeroObservedHamFalsePositivesBothVariants:true},failures,eligible:failures.length===0,scope:'Four earlier observed corpora are regression only. Third sample is disjoint from all prior selections but drawn from the same dated archives, not a new population or modern provider accuracy. Every earlier failed study remains failed. OPS-615 separately owns manual deployment.'};
 const out=resolve(process.argv[7]);await mkdir(out,{recursive:true});await writeFile(join(out,'acceptance.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({eligible:receipt.eligible,failures,fresh:{baseline:fresh.baseline.recall,candidate:fresh.candidate.recall,hamFP:fresh.candidate.FP}}));if(!receipt.eligible)process.exitCode=1;
}
