// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime} from './rules12-train-runtime.mjs';

test('training diagnostic distinguishes HTML anchor whitespace from unsafe controls',async()=>{
 const inbox=process.env.INBOX_SOURCE,dependencies=process.env.INBOX_DEPENDENCIES;assert.ok(inbox&&dependencies);
 const runtime=await createRuntime(inbox,process.cwd(),dependencies);
 try {
  const raw=new TextEncoder().encode('From: Person <sender@example.test>\r\nTo: box@example.test\r\nSubject: Synthetic\r\nContent-Type: text/html\r\n\r\n<p>Hello</p><a href="https://example.test/">See\n details</a>');
  const result=await runtime.classify(raw);
  assert.equal(result.flags.anchorText,true);assert.equal(result.flags.anchorTextUnsafe,false);
  assert.ok(result.limits.includes('control_chars'));assert.equal(runtime.networkAttempts(),0);
 } finally {await runtime.close();}
});
