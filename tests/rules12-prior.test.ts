// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-expect-error JavaScript-only acceptance helper.
import {verifyPrior} from '../harness/evaluation/rules12-prior.mjs';

test('seventh cohort refuses missing, incomplete and forged prior receipts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rules12-prior-'));
 try {
  await assert.rejects(verifyPrior('', 'a'.repeat(64), []),/prior_receipts_required/);
  writeFileSync(join(dir,'execution.json'),'[]');
  await assert.rejects(verifyPrior(dir,'a'.repeat(64),[]));
  const modes=['sa','enron','first','second','third','fourth','fifth','sixth'];
  const bytes=JSON.stringify({evaluationMode:'replacement-sa',manifestSha256:'3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380'});
  mkdirSync(join(dir,'replacement-sa'));writeFileSync(join(dir,'replacement-sa','report.json'),bytes);
  const receipt=modes.map(mode=>({mode,exitCode:0,runnerSha256:'a'.repeat(64),sourceHead:'head',reportSha256:createHash('sha256').update(bytes).digest('hex')}));
  writeFileSync(join(dir,'execution.json'),JSON.stringify(receipt));
  await assert.rejects(verifyPrior(dir,'a'.repeat(64),[],'head'),/receipt_cohort_mismatch/);
  writeFileSync(join(dir,'execution.json'),JSON.stringify(modes.map(mode=>({mode,exitCode:0,runnerSha256:'b'.repeat(64),reportSha256:'0'.repeat(64)}))));
  await assert.rejects(verifyPrior(dir,'a'.repeat(64),[]));
 } finally {rmSync(dir,{recursive:true,force:true});}
});
