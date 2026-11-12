// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {readBounded} from './files.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pins={baseline:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'},candidate:{inbox:'35718322ea97e1c6cec6adee8b0483950bc65f99',scorer:'453cc3423e222b0e853bf3d8e9d590ee01e44bf7'}};
const selections=[{"mode":"wordpair-sa","manifestSha256":"111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803","selectedIdLabelsSha256":"658644be4b59699c438d0322a25179ac490b004c3fc05fcd73d6dd7156c380ac","rows":2736,"ham":1603,"spam":1133},{"mode":"wordpair-enron","manifestSha256":"3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380","selectedIdLabelsSha256":"b3f6176f82292e98f372f590255e64d077c75e2c2f20ec5eec44cc5dd96ccba5","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-first","manifestSha256":"2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552","selectedIdLabelsSha256":"8b9d8fd67d33d627e5954f15e472dcf4ff0c659192a2be527214b2884281596a","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-second","manifestSha256":"fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19","selectedIdLabelsSha256":"0aff4aeea50392a3b9fcdb460b8dc7ab4fee8b67a7561424acdb175313f87bb7","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-third","manifestSha256":"be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8","selectedIdLabelsSha256":"1de77663b0e1f9730bc40b5432767db820bc4ab6b31e228384c54d1a789bbbe9","rows":2000,"ham":1000,"spam":1000},{"mode":"wordpair-fourth","manifestSha256":"1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d","selectedIdLabelsSha256":"abd6a73c763d05934b0a0272e13d849c7af96832fdc28d4da7b709594365100c","rows":2000,"ham":1000,"spam":1000}];
const modes=selections.map(s=>s.mode),manifests=selections.map(s=>s.manifestSha256);
const runnerSha256='41379c9bc8562fd67190c30deed314e269d3e9e76eeaa447c67d0c8c5936627f';
const controlsSha256='973f7dd28694bc1b98a4be601a253a3fd1913da9eebbb187555b3d6622dbc3e2';
export function recallPass(before,after){return after.spam>0&&before.spam>0&&2*after.TP>=after.spam&&100*(after.TP*before.spam-before.TP*after.spam)>=20*before.spam*after.spam;}
if(process.argv[2]==='--self-check'){
 assert.equal(recallPass({TP:300,spam:1000},{TP:500,spam:1000}),true);
 assert.equal(recallPass({TP:301,spam:1000},{TP:500,spam:1000}),false);
 assert.equal(recallPass({TP:0,spam:1000},{TP:499,spam:1000}),false);
 assert.equal(recallPass({TP:500,spam:1000},{TP:700,spam:1000}),true);
 assert.equal(recallPass({TP:0,spam:0},{TP:0,spam:0}),false);
 console.log('Exact wordpair recall/gain boundary checks passed');
}else{
 assert.equal(process.argv.length,9,'usage: node wordpair-gate.mjs SA ENRON FIRST SECOND THIRD FOURTH OUTPUT');
 const frozenBytes=await readBounded(new URL('./wordpair-legitimate-controls.json',import.meta.url),1024*1024);assert.equal(sha(frozenBytes),controlsSha256);
 const frozen=JSON.parse(frozenBytes).records;assert.equal(frozen.length,143);
 const controlIds=frozen.flatMap(c=>['plain','html'].map(kind=>'legitimate_'+c.id+'_'+kind));assert.equal(new Set(controlIds).size,286);
 const inputs=[],failures=[];
 for(const [index,path] of process.argv.slice(2,8).entries()){
  const bytes=await readBounded(path,32*1024*1024),r=JSON.parse(bytes);
  assert.equal(r.evaluationMode,modes[index]);assert.equal(r.manifestSha256,manifests[index]);assert.equal(r.runnerSha256,runnerSha256);
  assert.equal(r.independentHoldout,index===5);assert.equal(r.checks.networkAttempts,0);assert.equal(r.checks.repeatedOrderInvariant,true);
  assert.equal(r.generalProvenance.modelVersion,'general-7');assert.equal(r.generalProvenance.modelSourceSha256,'ce506fc71c7b465ccf2fef1218c821739c381509c93abd7f8a98ec4da516d052');
  assert.equal(r.generalProvenance.twoWordIncidentPositiveLowerBound,true);assert.equal(r.generalProvenance.trainingGridSha256,'d9105721552555568fd4f387654bcda5029190dc93fe6a201ac81af86c2cbfae');assert.equal(r.generalProvenance.vocabularyCap,50000);assert.equal(r.generalProvenance.legitimateControlsSha256,controlsSha256);
  for(const name of ['baseline','candidate']){
   assert.deepEqual(r.identities[name].pins,pins[name]);const v=r.variants[name];
   assert.equal(v.rows.length,index===0?2736:2000);assert.equal(new Set(v.rows.map(row=>row.id)).size,v.rows.length);
   const idLabels=v.rows.map(row=>[row.id,row.label]).sort((a,b)=>a[0].localeCompare(b[0]));
   assert.equal(sha(JSON.stringify(idLabels)),selections[index].selectedIdLabelsSha256,'selected_case_identity_or_labels');
   assert.equal(r.selectedIdLabelsSha256,selections[index].selectedIdLabelsSha256);
   const n={TP:0,FP:0,TN:0,FN:0};
   for(const row of v.rows){
    assert.match(row.id,/^[a-f0-9]{64}$/);assert.ok(['ham','spam'].includes(row.label));assert.equal(typeof row.quarantined,'boolean');assert.ok(['partial','unavailable'].includes(row.status));
    assert.equal(row.policyVersion,name==='candidate'?'inbox-scoring-8':'inbox-scoring-4');
    if(row.status==='partial'){assert.equal(row.ruleSetVersion,name==='candidate'?'rules-9':'rules-5');assert.equal(row.engineVersion,'0.1.0');assert.ok(Number.isFinite(row.score)&&row.score>=0&&row.score<=100);}
    if(row.status==='unavailable'){assert.equal(row.quarantined,false);assert.equal(row.score,null);}
    n[row.label==='spam'?(row.quarantined?'TP':'FN'):(row.quarantined?'FP':'TN')]++;
   }
   for(const [key,value]of Object.entries(n))assert.equal(v.metrics[key],value);
   assert.equal(v.metrics.spam,n.TP+n.FN);assert.equal(v.metrics.ham,n.FP+n.TN);assert.equal(v.metrics.total,v.rows.length);
   assert.equal(v.metrics.spam,index===0?1133:1000);assert.equal(v.metrics.ham,index===0?1603:1000);
   if(n.FP)failures.push(modes[index]+':'+name+':ham_false_positive');
   const controls=r.controls[name];assert.equal(controls.length,311);assert.equal(new Set(controls.map(c=>c.id)).size,311);
   const byId=new Map(controls.map(c=>[c.id,c]));
   for(const id of controlIds){
    const c=byId.get(id);assert.ok(c,'missing frozen legitimate control');assert.equal(c.truth,'ham');assert.equal(c.kind,'authored_ham');
    assert.equal(c.status,'partial');assert.equal(c.ruleSetVersion,name==='candidate'?'rules-9':'rules-5');assert.equal(c.policyVersion,name==='candidate'?'inbox-scoring-8':'inbox-scoring-4');assert.equal(c.score,0);
   }
   if(controls.some(row=>row.truth==='ham'&&row.quarantined))failures.push(modes[index]+':'+name+':authored_ham_false_positive');
   assert.deepEqual(Object.keys(v.byPartition).sort(),index===0?['diagnostic','holdout','validation']:['holdout']);
   for(const p of Object.values(v.byPartition))for(const group of ['metrics','hardHam','htmlOnly','other'])if(p[group].FP)failures.push(modes[index]+':'+name+':stratum_ham_false_positive');
  }
  if(!r.generalGate.eligible||!r.release.regressionGatePassed)failures.push(modes[index]+':declared_gate_failed');
  inputs.push({path:resolve(path),sha256:sha(bytes),mode:r.evaluationMode,manifestSha256:r.manifestSha256,baseline:r.variants.baseline.metrics,candidate:r.variants.candidate.metrics});
 }
 const fresh=inputs[5];if(!recallPass(fresh.baseline,fresh.candidate))failures.push('fresh_recall_or_gain_below_predeclared_gate');
 const receipt={pins,runnerSha256,controlsSha256,legitimateCases:143,legitimatePlainHtmlEvaluationsPerVariantPerStudy:286,inputs,predeclared:{minimumFreshRecall:.50,minimumAbsoluteFreshGain:.20,zeroObservedHamFalsePositivesBothVariants:true},failures,eligible:failures.length===0,scope:'Five earlier observed corpora are regression only. Fourth sample is disjoint from all prior selections and authored controls, drawn from unused SH/kaminski-v and BG/beck-s members of the same dated archives, not a new population or modern provider accuracy. Later reproduction does not restore untouched status. Every earlier failed study remains failed. OPS-615 separately owns manual deployment.'};
 const out=resolve(process.argv[8]);await mkdir(out,{recursive:true});await writeFile(join(out,'acceptance.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({eligible:receipt.eligible,failures,fresh:{baseline:fresh.baseline.recall,candidate:fresh.candidate.recall,hamFP:fresh.candidate.FP}}));if(!receipt.eligible)process.exitCode=1;
}
