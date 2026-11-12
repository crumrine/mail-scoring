// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreRequest} from '@mail-scoring/core';
const base={schemaVersion:'1',policyVersion:'synthetic-2',subject:'Account notice',headers:[],text:'',sourceComplete:false,
  addresses:{from:'notice@sender.invalid',displayName:'QuickBooks'},extractedText:'Security team: inspect a negative review.',
  anchors:[{text:'Respond now',href:'https://tracker.example/route?fallback=https%3A%2F%2Fdestination.invalid%2F'}]};
const score=(x:unknown)=>scoreRequest(new TextEncoder().encode(JSON.stringify(x)));
test('HTML feature review lure fires once with static evidence and a finite score',()=>{
  const r=score(base);assert.equal(r.ruleSetVersion,'rules-11');assert.equal(r.heuristicScore,45);
  assert.equal(r.signals.phishing,'present');assert.equal(r.reasons[0]?.id,'brand_impersonation_combined');
  assert.deepEqual(score({...base,anchors:Array(50).fill(base.anchors[0])}),r);
  assert.ok(!JSON.stringify(r).includes('destination.invalid'));
});
test('empty optional addresses from the actual Inbox projection are absent, not malformed',()=>{
  const r=score({...base,addresses:{...base.addresses,replyTo:'',envelopeFrom:''}});
  assert.equal(r.heuristicScore,45);assert.ok(!r.limitsHit.includes('identity_uninspected'));
  assert.ok(score({...base,addresses:{...base.addresses,replyTo:'not an address'}}).limitsHit.includes('identity_uninspected'));
});
test('brand mention, sender mismatch, tracker and marketing alone are insufficient',()=>{
  const controls=[
    {...base,addresses:{...base.addresses,displayName:'Person discussing QuickBooks'}},
    {...base,addresses:{from:'notice@notify.intuit.com',displayName:'QuickBooks'}},
    {...base,anchors:[{text:'Respond now',href:'https://qbo.intuit.com/reviews'}]},
    {...base,anchors:[{text:'Respond now',href:'https://tracker.example/?url=https%3A%2F%2Fquickbooks.com%2Freviews'}]},
    {...base,extractedText:'A newsletter about an ordinary bookkeeping feature.'},
    {...base,extractedText:'> Security team: inspect a negative review.'},
    {...base,anchors:[{...base.anchors[0],quoted:true}]},
    {...base,anchors:[]},
  ];
  for(const control of controls)assert.equal(score(control).heuristicScore,0);
});
test('exact domain boundaries, Unicode brand folding, second brand and ambiguous redirects',()=>{
  assert.equal(score({...base,addresses:{from:'notice@intuit.com.attacker.invalid',displayName:'ＱｕｉｃｋＢｏｏｋｓ'}}).heuristicScore,45);
  assert.equal(score({...base,addresses:{...base.addresses,displayName:'PayPal'},extractedText:'Verify your account.'}).heuristicScore,45);
  for(const href of [
    'https://tracker.example/?url=https://one.invalid&fallback=https://two.invalid',
    'https://tracker.example/?url=https%3A%2F%2Fone.invalid%2F%3Furl%3Dhttps%253A%252F%252Ftwo.invalid',
    'javascript:alert(1)',
  ]){
    const r=score({...base,anchors:[{text:'Respond now',href}]});
    assert.equal(r.heuristicScore,0);assert.equal(r.status,'partial');
    assert.ok(r.limitsHit.some(l=>l==='url_uninspected'||l==='url_decode_limit'));
  }
});
