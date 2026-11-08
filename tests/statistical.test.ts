// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STATISTICAL_SPAM} from '../fixtures/statistical.ts';
import {scoreRequest,REASONS} from '@mail-scoring/core';
import {htmlText} from '../packages/core/dist/html-text.js';
import {statisticalTokens} from '../packages/core/dist/statistical-text.js';
import {combineClues,chiTail} from '../packages/core/dist/vendor/chi.js';
import {MODEL_COUNTS,MODEL_DOCUMENTS,MODEL_PARTITION_SHA256} from '../packages/core/dist/general-model.js';
const spam=STATISTICAL_SPAM;
const score=(text:string,extra:Record<string,unknown>={})=>scoreRequest(new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'general-test',subject:'',text,headers:[],sourceComplete:true,...extra})));
const hasSpam=(r:ReturnType<typeof score>)=>r.reasons.some(x=>x.id==='statistical_spam');
test('general spam detects original promotional plain text and inert HTML once, with static evidence',()=>{
 for(const input of [{text:spam},{text:'',html:'<html><body><p>'+spam+'</p></body></html>'},{text:spam+'\n'+spam}]){
  const r=score(input.text,input);assert.equal(r.ruleSetVersion,'rules-3');assert.equal(r.heuristicScore,60);
  assert.deepEqual(r.reasons,[{id:'statistical_spam',contribution:60,reason:REASONS.statistical_spam}]);
  assert.equal(r.signals.spam,'present');assert.equal(r.status,'partial');
 }
});
test('legitimate security, financial, medical, newsletter, Unicode and ordinary correspondence abstain',()=>{
 const ham=[
  'Your account security verification code is 123456. We detected a sign-in from your device. Never share your password or code. If this was you, no action is needed.',
  'Your mortgage statement is available. Your scheduled payment has been received. Please review the principal, interest and remaining balance in your account. Contact your bank with questions.',
  'Your prescription refill is ready at the pharmacy. Please bring your identification and insurance information. Your pharmacist can answer questions about dosage, interactions and possible side effects.',
  'The monthly newsletter includes community events, member discounts and a free workshop. You can unsubscribe in your account settings. Thank you for supporting our local library.',
  'Your order receipt confirms payment. Your item will ship tomorrow with free shipping. Please contact customer support if you need help with your purchase or return.',
  'Hello, I am a new colleague. Could we arrange a meeting next week to discuss the project schedule and the documents you requested?',
  'こんにちは。明日の会議は午後三時です。資料をご確認ください。よろしくお願いします。',
 ];
 for(const text of ham){assert.equal(hasSpam(score(text)),false);assert.equal(hasSpam(score('',{html:'<div>'+text+'</div>'})),false);}
});
test('statistical evidence excludes quoted and forwarded text and hidden active HTML',()=>{
 for(const text of ['> '+spam,'A legitimate note.\n-----Original Message-----\n'+spam,'A legitimate note.\n---------- Forwarded message ---------\n'+spam])assert.equal(hasSpam(score(text)),false);
 for(const html of ['<blockquote>'+spam+'</blockquote>','<div class="gmail_quote">'+spam+'</div>',
  '<script>'+spam+'</script><p>Meeting confirmed.</p>','<style>'+spam+'</style><p>Meeting confirmed.</p>',
  '<div hidden>'+spam+'</div><p>Meeting confirmed.</p>','<div style="display: none">'+spam+'</div><p>Meeting confirmed.</p>',
  '<template>'+spam+'</template><p>Meeting confirmed.</p>'])assert.equal(hasSpam(score('',{html})),false);
});
test('single repeated words, empty body, forged headers, raw addresses and URLs are insufficient evidence',()=>{
 assert.equal(hasSpam(score('money '.repeat(500))),false);
 assert.equal(hasSpam(score('',{subject:spam.slice(0,1000)})),false);
 assert.equal(hasSpam(score('Ordinary message',{headers:[{name:'X-Spam-Flag',value:'YES'},{name:'X-Spam-Status',value:spam}]})),false);
 assert.deepEqual(statisticalTokens('https://example.test/money/free/offer somebody@example.test www.example.test'),[]);
});
test('HTML source, tag, depth, output and statistical token ceilings abstain before unbounded work',()=>{
 const bodies=['<div>'.repeat(40)+spam,'<br>'.repeat(1025)+spam,'x'.repeat(32769),'<p>'+'&#xfdfa;'.repeat(3000)+'</p>'];
 for(const html of bodies){const r=htmlText(html);assert.ok(r.tags<=1025);assert.ok(r.depth<=32);assert.ok(Buffer.byteLength(r.text)<=32768);assert.equal(hasSpam(score('',{html})),false);}
 assert.equal(htmlText('x'.repeat(32769)).complete,false);
 assert.equal(htmlText('<div>'.repeat(33)).complete,false);
 const words=Array.from({length:1001},(_,i)=>'word'+String.fromCharCode(97+Math.floor(i/676),97+Math.floor(i/26)%26,97+i%26)).join(' ');
 const r=score(words);assert.ok(r.limitsHit.includes('statistical_limit'));assert.equal(hasSpam(r),false);
});
test('Fisher combination is symmetric, finite, bounded and preserves the unsure middle',()=>{
 assert.equal(combineClues([]),.5);assert.ok(combineClues(Array(20).fill(.99))>.99);
 assert.ok(combineClues(Array(20).fill(.01))<.01);
 assert.ok(Math.abs(combineClues([...Array(10).fill(.99),...Array(10).fill(.01)])-.5)<1e-10);
 assert.equal(combineClues(Array(65).fill(.99)),.5);assert.equal(combineClues([NaN]),.5);
 assert.equal(chiTail(-1,1),Math.exp(-1));assert.equal(chiTail(-1,100000),1);
});
test('numerical model is a bounded unique aggregate from the frozen training partition',()=>{
 assert.equal(MODEL_PARTITION_SHA256,'f3bb8ee9f757bc374ff27c10526a02f58509b5bbd399e1151235e261ebaed6e9');
 assert.deepEqual(MODEL_DOCUMENTS,[2452,331]);assert.equal(MODEL_COUNTS.length,9413);
 assert.equal(new Set(MODEL_COUNTS.map(c=>c[0])).size,MODEL_COUNTS.length);
 for(const [id,h,s]of MODEL_COUNTS){assert.ok(Number.isInteger(id)&&id>=0&&id<=0xffffffff);assert.ok(h>=0&&h<=MODEL_DOCUMENTS[0]);assert.ok(s>=0&&s<=MODEL_DOCUMENTS[1]);assert.ok(h+s>=3);}
});
