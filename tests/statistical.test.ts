// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STATISTICAL_SPAM,PHARMACY_SPAM} from '../fixtures/statistical.ts';
import {scoreRequest,REASONS} from '@mail-scoring/core';
import {htmlText} from '../packages/core/dist/html-text.js';
import {statisticalTokens} from '../packages/core/dist/statistical-text.js';
import {contextFeatures,contextKey} from '../packages/core/dist/context-features.js';
import {contextProbabilities} from '../packages/core/dist/context-probabilities.js';
import {tiledClues} from '../packages/core/dist/vendor/tiling.js';
import {combineClues,chiTail} from '../packages/core/dist/vendor/chi.js';
import {MODEL_COUNTS,MODEL_DOCUMENTS,MODEL_PARTITION_SHA256} from '../packages/core/dist/context-model.js';
const spam=STATISTICAL_SPAM;
const score=(text:string,extra:Record<string,unknown>={})=>scoreRequest(new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'general-test',subject:'',text,headers:[],sourceComplete:true,...extra})));
const hasSpam=(r:ReturnType<typeof score>)=>r.reasons.some(x=>x.id==='statistical_generalized_spam');
test('general spam detects original promotional plain text and inert HTML once, with static evidence',()=>{
 for(const input of [{text:spam},{text:'',html:'<html><body><p>'+spam+'</p></body></html>'},{text:spam+'\n'+spam}]){
  const r=score(input.text,input);assert.equal(r.ruleSetVersion,'rules-5');assert.equal(r.heuristicScore,60);
  assert.deepEqual(r.reasons,[{id:'statistical_generalized_spam',contribution:60,reason:REASONS.statistical_generalized_spam}]);
  assert.equal(r.signals.spam,'present');assert.equal(r.status,'partial');
 }
});
test('additional public TRAIN vocabulary detects an authored pharmacy advertisement',()=>{
 for(const input of [{text:PHARMACY_SPAM},{text:'',html:'<p>'+PHARMACY_SPAM+'</p>'}]){
  const r=score(input.text,input);assert.equal(r.heuristicScore,60);assert.equal(hasSpam(r),true);
  assert.deepEqual(r.reasons,[{id:'statistical_generalized_spam',contribution:60,reason:REASONS.statistical_generalized_spam}]);
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
 assert.equal(hasSpam(score('qzxv '.repeat(5),{subject:spam.trim()})),false);
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
 assert.equal(MODEL_PARTITION_SHA256,'906c4e85f58bd40991acb724f36ab37f38eb74217b6cf673dc268f12c1933fd6');
 assert.deepEqual(MODEL_DOCUMENTS,[3351,66,1274]);assert.equal(MODEL_COUNTS.length,37500);
 assert.equal(new Set(MODEL_COUNTS.map(c=>c[0]+':'+c[1])).size,MODEL_COUNTS.length);
 for(const [id,second,easy,hard,s]of MODEL_COUNTS){assert.ok(Number.isInteger(id)&&id>=0&&id<=0xffffffff);assert.ok(Number.isInteger(second)&&second>=-1&&second<=0xffffffff);assert.ok(easy>=0&&easy<=MODEL_DOCUMENTS[0]);assert.ok(hard>=0&&hard<=MODEL_DOCUMENTS[1]);assert.ok(s>=0&&s<=MODEL_DOCUMENTS[2]);assert.ok(easy+hard+s>=3);}
});

test('context features keep positions bounded, skip whole URLs and addresses and separate sources',()=>{
 const normal=contextFeatures(['subscription free offer']);
 assert.equal(normal.positions,3);assert.equal(normal.features.length,5);
 assert.equal(contextFeatures(['free','offer']).features.length,2);
 assert.equal(contextFeatures(['free https://example.test/ offer']).features.length,2);
 assert.equal(contextFeatures(['free person@example.test offer']).features.length,2);
 const limited=contextFeatures(['money '.repeat(5000)]);
 assert.equal(limited.positions,1000);assert.equal(limited.features.length,1999);assert.equal(limited.limited,true);
});
test('context tiling never counts an overlapping word or duplicate clue twice',()=>{
 const input=contextFeatures(['subscription free offer']);
 const [first,second,pair,third]=input.features;
 assert.ok(first&&second&&pair&&third);
 const probabilities=new Map([
  [contextKey(first.first,first.second),.9],
  [contextKey(second.first,second.second),.9],
  [contextKey(pair.first,pair.second),.01],
  [contextKey(third.first,third.second),.9],
 ]);
 assert.deepEqual(tiledClues(input.features,probabilities),[.01,.9]);
 assert.deepEqual(tiledClues([...input.features,...input.features],probabilities),[.01,.9]);
 assert.deepEqual(tiledClues(Array(2000).fill(first),probabilities),[]);
 const many=Array.from({length:70},(_,i)=>({first:i+1,second:-1,start:i,end:i}));
 assert.equal(tiledClues(many,new Map(many.map(f=>[contextKey(f.first,f.second),.9]))).length,64);
});
test('context probabilities preserve square-root-count legitimate strata and document evidence strength',()=>{
 const probabilities=contextProbabilities([[1,-1,100,0,10],[2,-1,0,1,10]],[100,1,10]);
 assert.ok(Math.abs(probabilities.get('1:-1')!-(1.5+110*(11/21))/113)<1e-14);
 assert.ok(Math.abs(probabilities.get('2:-1')!-(1.5+11*(11/12))/14)<1e-14);
});
