// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readBounded,sha256} from './files.mjs';
import {compareReplacement} from './rules12-comparator.mjs';

// Seventh-cohort access is refused until all eight recorded regressions pass.
export async function verifyPrior(dir,runnerSha256,authoredIds,sourceHead) {
  assert.ok(dir,'prior_receipts_required');
  const receipts=JSON.parse(await readBounded(join(dir,'execution.json'),1024*1024));
  const modes=['sa','enron','first','second','third','fourth','fifth','sixth'];
  const manifests=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380','2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552','fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19','be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8','1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d','7e713aabc0adde0cc734cd7d73c3db13c919c96d6a765d42c7f468796bad1357','ec5b6ba3d47b6bb5e2795d7159051e75b05b52945db07eac548295b192a7aab8'];
  assert.deepEqual(receipts.map(r=>r.mode),modes);
  for(const item of receipts) {
    assert.equal(item.exitCode,0);assert.equal(item.runnerSha256,runnerSha256);assert.equal(item.sourceHead,sourceHead);
    const bytes=await readBounded(join(dir,'replacement-'+item.mode,'report.json'),32*1024*1024);
    assert.equal(sha256(bytes),item.reportSha256);
    const report=JSON.parse(bytes);
    assert.equal(report.evaluationMode,'replacement-'+item.mode);
    assert.equal(report.manifestSha256,manifests[modes.indexOf(item.mode)],'receipt_cohort_mismatch');
    assert.equal(report.independentHoldout,false);
    assert.equal(report.runnerSha256,runnerSha256);
    assert.equal(report.sourceRepositoryHead,sourceHead);
    for(const row of report.variants.candidate.rows){assert.equal(row.policyVersion,'inbox-scoring-11');if(row.status==='partial')assert.equal(row.ruleSetVersion,'rules-11');}
    const result=compareReplacement(report,authoredIds);
    assert.equal(result.eligible,true);assert.equal(result.candidate.FP,0);
    assert.equal(report.release.regressionGatePassed,true);
  }
  return receipts;
}
