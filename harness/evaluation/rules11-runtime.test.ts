// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRuntime} from './rules11-runtime.mjs';

const inbox=process.env.INBOX_SOURCE;
const dependencies=process.env.INBOX_DEPENDENCIES;
test('actual Workers inspect HTML through private scorer RPC and deny outbound network',async()=>{
  assert.ok(inbox&&dependencies,'set INBOX_SOURCE and INBOX_DEPENDENCIES');
  const runtime=await createRuntime(inbox,process.cwd(),dependencies);
  try {
    const message=(href:string,plain?:string)=>new TextEncoder().encode([
      'From: QuickBooks <notice@sender.invalid>','To: box@example.test','Subject: Synthetic',
      ...(plain===undefined?['Content-Type: text/html','','']:[
        'MIME-Version: 1.0','Content-Type: multipart/alternative; boundary=alt','','--alt','Content-Type: text/plain','',plain,'--alt','Content-Type: text/html','',
      ]),
      `<img src="https://never-fetch.invalid/x"><p>Security team: negative review</p><a href="${href}">Respond now</a>`,
      ...(plain===undefined?[]:['--alt--','']),
    ].join('\r\n'));
    const positive=await runtime.classify(message('https://sender.invalid/','Please view the HTML.'));
    assert.equal(positive.ruleSetVersion,'rules-11');assert.equal(positive.score,45);assert.equal(positive.quarantined,true);
    const guarded=await runtime.classify(message('https://outer.example/?url=https%3A%2F%2Ftracker.example%2Fredirect%2Fhttps%253A%252F%252Fquickbooks.com','Please view the HTML.'));
    assert.equal(guarded.quarantined,false);assert.ok(guarded.limits.includes('url_decode_limit'));
    assert.equal(runtime.networkAttempts(),0);
  } finally {await runtime.close();}
});

test('archived rules-5 reference runs in Workers and preserves GTUBE and quote behavior',async()=>{
  assert.ok(inbox&&dependencies,'set INBOX_SOURCE and INBOX_DEPENDENCIES');
  const dir=mkdtempSync(join(tmpdir(),'rules11-reference-'));
  const archive=(repo:string,pin:string,paths:string[],target:string)=>{
    mkdirSync(target);const bytes=execFileSync('git',['-C',repo,'archive',pin,...paths],{maxBuffer:16*1024*1024});
    execFileSync('tar',['-xf','-','-C',target],{input:bytes});
  };
  try {
    const caller=join(dir,'caller'),scorer=join(dir,'scorer');
    archive(inbox,'606d0edee433fbf2aee517b1f1b61e631251a79a',['workers/lib/mail-scoring'],caller);
    archive(process.cwd(),'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0',['packages/core/src','workers/private'],scorer);
    const runtime=await createRuntime(caller,scorer,dependencies,process.cwd());
    try {
      const marker='XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X';
      const message=(body:string)=>new TextEncoder().encode(`From: sender@example.test\r\nTo: box@example.test\r\nSubject: Synthetic\r\nContent-Type: text/plain\r\n\r\n${body}`);
      const positive=await runtime.classify(message(marker));
      assert.equal(positive.ruleSetVersion,'rules-5');assert.equal(positive.quarantined,true);
      assert.equal((await runtime.classify(message('> '+marker))).quarantined,false);
      assert.equal(runtime.networkAttempts(),0);
    } finally {await runtime.close();}
  } finally {rmSync(dir,{recursive:true,force:true});}
});
