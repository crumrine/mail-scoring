// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreRequest} from '@mail-scoring/core';
const score=(x:unknown)=>scoreRequest(new TextEncoder().encode(JSON.stringify(x)));
const base={schemaVersion:'1',policyVersion:'test',subject:'Your account access is suspended',headers:[],text:'',sourceComplete:false,
 addresses:{from:'sender@example.test'},extractedText:'We detected unusual activity. Your account has been suspended. Verify your identity and password immediately to avoid permanent closure.',
 anchors:[{text:'Verify your account now',href:'https://account-check.invalid/secure'}]};
test('credential request with account lockout and unrelated action link is flagged',()=>{
 const r=score(base);assert.equal(r.ruleSetVersion,'rules-12');assert.equal(r.heuristicScore,45);
 assert.equal(r.signals.phishing,'present');assert.equal(r.reasons[0]?.id,'credential_phishing_combined');
 assert.ok(score({...base,extractedText:'Your account is suspended. To avoid permanent closure, verify your identity and password immediately.'}).reasons.some(r=>r.id==='credential_phishing_combined'));
});
test('credential warnings, related links, missing evidence and quoted text do not trigger',()=>{
 const samples=[
  {...base,extractedText:'Your account is suspended. We will never ask you to verify your password. Visit our help center.'},
  {...base,extractedText:'Your account is suspended. We will not ask you to enter your password.'},
  {...base,extractedText:"Your account is suspended. We won't ask you to enter your password."},
  {...base,extractedText:'Your account is suspended. There is no need to enter your password.'},
  {...base,extractedText:'Your account is suspended. Avoid entering your password.'},
  {...base,extractedText:'Your account is suspended. If you receive a request to enter your password, ignore it.'},
  {...base,extractedText:'Your account is suspended. Disregard any request to enter your password.'},
  {...base,extractedText:'Your account is suspended. Please refuse any request to enter your password.'},
  {...base,extractedText:'Your account is suspended. Reject any request to provide your password.'},
  {...base,extractedText:'Your account is suspended. Confirm your password has been changed.'},
  {...base,extractedText:'Your account is suspended. Verify your password is updated.'},
  {...base,extractedText:'Your account is suspended. Confirm your password reset.'},
  {...base,extractedText:'Your account is suspended. Verify your password reset immediately.'},
  {...base,extractedText:'The message stated: "Your account is suspended. Verify your password immediately."'},
  {...base,extractedText:'The message stated: ‘Your account is suspended. Verify your password immediately.’'},
  {...base,extractedText:'Warning: a scam says your account is suspended and asks you to verify your password.'},
  {...base,extractedText:'> Your account is suspended. Verify your password immediately.'},
  {...base,subject:'Sign in',extractedText:'Verify your identity and password to sign in.'},
  {...base,extractedText:'Your account is suspended. Verify your identity to restore access.'},
  {...base,anchors:[]},
  {...base,anchors:[{text:'Visit our privacy policy',href:'https://other.invalid/'}]},
  {...base,anchors:[{text:'Verify your account',href:'https://example.test/login'}]},
  {...base,anchors:[{text:'Verify your account',href:'https://sub.example.test/login'}]},
  {...base,anchors:[{...base.anchors[0],quoted:true}]},
  {...base,addresses:{from:''}},
  {...base,anchors:[{text:'Verify your account',href:'https://other.invalid/?url=https%3A%2F%2Fexample.test'}]},
 ];
 for(const [i,x] of samples.entries()) assert.ok(!score(x).reasons.some(r=>r.id==='credential_phishing_combined'),'negative control '+i);
});
