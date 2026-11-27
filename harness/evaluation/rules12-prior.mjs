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
  assert.deepEqual(receipts.map(r=>r.mode),modes);
  for(const item of receipts) {
    assert.equal(item.exitCode,0);assert.equal(item.runnerSha256,runnerSha256);assert.equal(item.sourceHead,sourceHead);
    const bytes=await readBounded(join(dir,'replacement-'+item.mode,'report.json'),32*1024*1024);
    assert.equal(sha256(bytes),item.reportSha256);
    const report=JSON.parse(bytes);
    assert.equal(report.evaluationMode,'replacement-'+item.mode);
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
