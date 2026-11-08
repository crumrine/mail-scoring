// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pins={baseline:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'},candidate:{inbox:'c9bb28845088a8ad5ca6b91774d32053dd4ba246',scorer:'143e24e938365c31f2669fd5f9e918408383dc7e'}};
const modes=['stable-sa','stable-enron','stable-first','stable-second'];
const manifests=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552','fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19'];
export function recallPass(before,after){return after.spam>0&&before.spam>0&&2*after.TP>=after.spam&&100*(after.TP*before.spam-before.TP*after.spam)>=20*before.spam*after.spam;}
if(process.argv[2]==='--self-check'){
 assert.equal(recallPass({TP:300,spam:1000},{TP:500,spam:1000}),true);
 assert.equal(recallPass({TP:301,spam:1000},{TP:500,spam:1000}),false);
 assert.equal(recallPass({TP:0,spam:1000},{TP:499,spam:1000}),false);
 assert.equal(recallPass({TP:500,spam:1000},{TP:700,spam:1000}),true);
 assert.equal(recallPass({TP:0,spam:0},{TP:0,spam:0}),false);
 console.log('Exact recall/gain boundary checks passed');
}else{
 assert.equal(process.argv.length,7,'usage: node stable-gate.mjs SA ENRON FIRST SECOND OUTPUT');
 const inputs=[];const failures=[];const runnerSha256='fc1fd0210ae6d34b4573c290878401f242cddecb54cd102c9e882c03abd0738c'; // Immutable second-study runner; later modes do not rewrite this result.
 for(const [index,path] of process.argv.slice(2,6).entries()){
  const bytes=await readFile(path),r=JSON.parse(bytes);
  assert.equal(r.evaluationMode,modes[index]);assert.equal(r.manifestSha256,manifests[index]);assert.equal(r.runnerSha256,runnerSha256);
  assert.equal(r.independentHoldout,index===3);assert.equal(r.checks.networkAttempts,0);assert.equal(r.checks.repeatedOrderInvariant,true);
  assert.equal(r.generalProvenance.modelVersion,'general-5');assert.equal(r.generalProvenance.singlePositiveWordStability,true);
  for(const name of ['baseline','candidate']){
   assert.deepEqual(r.identities[name].pins,pins[name]);const v=r.variants[name];
   assert.equal(v.rows.length,index===0?2736:2000);assert.equal(new Set(v.rows.map(row=>row.id)).size,v.rows.length);
   const n={TP:0,FP:0,TN:0,FN:0};
   for(const row of v.rows){assert.ok(['ham','spam'].includes(row.label));assert.equal(typeof row.quarantined,'boolean');n[row.label==='spam'?(row.quarantined?'TP':'FN'):(row.quarantined?'FP':'TN')]++;}
   for(const [key,value]of Object.entries(n))assert.equal(v.metrics[key],value);
   assert.equal(v.metrics.spam,n.TP+n.FN);assert.equal(v.metrics.ham,n.FP+n.TN);assert.equal(v.metrics.total,v.rows.length);
   if(n.FP)failures.push(modes[index]+':'+name+':ham_false_positive');
   if(r.controls[name].some(row=>row.truth==='ham'&&row.quarantined))failures.push(modes[index]+':'+name+':authored_ham_false_positive');
   for(const p of Object.values(v.byPartition))for(const group of ['metrics','hardHam','htmlOnly','other'])if(p[group].FP)failures.push(modes[index]+':'+name+':stratum_ham_false_positive');
  }
  if(!r.generalGate.eligible)failures.push(modes[index]+':declared_gate_failed');
  inputs.push({path:resolve(path),sha256:sha(bytes),mode:r.evaluationMode,manifestSha256:r.manifestSha256,baseline:r.variants.baseline.metrics,candidate:r.variants.candidate.metrics});
 }
 const fresh=inputs[3];if(!recallPass(fresh.baseline,fresh.candidate))failures.push('fresh_recall_or_gain_below_predeclared_gate');
 const receipt={pins,runnerSha256,inputs,predeclared:{minimumFreshRecall:.50,minimumAbsoluteFreshGain:.20,zeroObservedHamFalsePositivesBothVariants:true},failures,eligible:failures.length===0,scope:'All previously observed data are regression only. Second cohort is a disjoint same-archive research sample, not a new population or modern provider accuracy. First failed study remains archived. OPS-615 separately owns manual deployment.'};
 const out=resolve(process.argv[6]);await mkdir(out,{recursive:true});await writeFile(join(out,'acceptance.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({eligible:receipt.eligible,failures,fresh:{baseline:fresh.baseline.recall,candidate:fresh.candidate.recall,hamFP:fresh.candidate.FP}}));if(!receipt.eligible)process.exitCode=1;
}
