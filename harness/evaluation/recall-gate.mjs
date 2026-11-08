// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(process.argv.length,6,'usage: node recall-gate.mjs SA_REPORT ENRON_REPORT FRESH_REPORT OUTPUT_DIR');
const inputs=[];
for(const path of process.argv.slice(2,5)){
 const bytes=await readFile(path);inputs.push({path:resolve(path),sha256:sha(bytes),report:JSON.parse(bytes)});
}
assert.deepEqual(inputs.map(x=>x.report.evaluationMode),['recall-sa','recall-enron','recall-fresh']);
assert.deepEqual(inputs.map(x=>x.report.manifestSha256),['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552']);
const runnerSha256=sha(await readFile(new URL('./run.mjs',import.meta.url)));
const pins=Object.fromEntries(Object.entries(inputs[0].report.identities).map(([name,v])=>[name,v.pins]));
assert.deepEqual(pins.baseline,{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'});
assert.equal(pins.candidate.scorer,'0041d47f20d2565dc8725a3c11f0ed1af113ca74');
assert.equal(pins.candidate.inbox,'049998e046cf37d5a5faf725d1fc75d5499d20b2');
const failures=[];
for(const [index,{report:r}] of inputs.entries()){
 assert.equal(r.runnerSha256,runnerSha256);assert.equal(r.checks.networkAttempts,0);assert.equal(r.checks.repeatedOrderInvariant,true);
 assert.equal(r.independentHoldout,index===2);
 for(const [name,v] of Object.entries(r.variants)){
  assert.deepEqual(r.identities[name].pins,pins[name]);
  assert.equal(v.rows.length,index===0?2736:2000);
  const counts={TP:0,FP:0,TN:0,FN:0};
  for(const row of v.rows)counts[row.label==='spam'?(row.quarantined?'TP':'FN'):(row.quarantined?'FP':'TN')]++;
  for(const [key,n] of Object.entries(counts))assert.equal(v.metrics[key],n);
  if(counts.FP!==0)failures.push(r.evaluationMode+':'+name+':ham_false_positive');
  if(r.controls[name].some(row=>row.truth==='ham'&&row.quarantined))failures.push(r.evaluationMode+':'+name+':authored_ham_false_positive');
 }
 if(!r.generalGate.eligible)failures.push(r.evaluationMode+':declared_gate_failed');
}
const fresh=inputs[2].report,baseline=fresh.variants.baseline.metrics,candidate=fresh.variants.candidate.metrics;
if(2*candidate.TP<candidate.spam)failures.push('fresh_recall_below_50percent');
if(100*(candidate.TP*baseline.spam-baseline.TP*candidate.spam)<20*baseline.spam*candidate.spam)failures.push('fresh_gain_below_20points');
const receipt={pins,runnerSha256,inputs:inputs.map(({path,sha256,report})=>({path,sha256,mode:report.evaluationMode,manifestSha256:report.manifestSha256,baseline:report.variants.baseline.metrics,candidate:report.variants.candidate.metrics})),predeclared:{minimumFreshRecall:.50,minimumAbsoluteFreshGain:.20,zeroObservedHamFalsePositivesBothVariants:true},failures,eligible:failures.length===0,scope:'Paired frozen research mail routing, not modern production accuracy or zero future false positives. Observed SA/Enron are regression only; SH/kaminski-v independent. OPS-615 owns separate manual release.'};
const out=resolve(process.argv[5]);await mkdir(out,{recursive:true});await writeFile(join(out,'acceptance.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({eligible:receipt.eligible,failures,fresh:{baseline:baseline.recall,candidate:candidate.recall,hamFP:candidate.FP}}));
if(!receipt.eligible)process.exitCode=1;
