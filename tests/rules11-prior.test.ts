// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-expect-error JavaScript-only acceptance helper.
import {verifyPrior} from '../harness/evaluation/rules11-prior.mjs';

test('sixth cohort refuses missing, incomplete and forged prior receipts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rules11-prior-'));
 try {
  await assert.rejects(verifyPrior('', 'a'.repeat(64), []),/prior_receipts_required/);
  writeFileSync(join(dir,'execution.json'),'[]');
  await assert.rejects(verifyPrior(dir,'a'.repeat(64),[]));
  const modes=['sa','enron','first','second','third','fourth','fifth'];
  writeFileSync(join(dir,'execution.json'),JSON.stringify(modes.map(mode=>({mode,exitCode:0,runnerSha256:'b'.repeat(64),reportSha256:'0'.repeat(64)}))));
  await assert.rejects(verifyPrior(dir,'a'.repeat(64),[]));
 } finally {rmSync(dir,{recursive:true,force:true});}
});
