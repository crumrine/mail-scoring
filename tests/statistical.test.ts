// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {LEGITIMATE_NOTICES} from '../fixtures/legitimate-notices.ts';
import assert from 'node:assert/strict';
import {STATISTICAL_SPAM,PHARMACY_SPAM,FRAGILE_SPAM,REFIT_FRAGILE_SPAM,CONTEXT_FRAGILE_SPAM} from '../fixtures/statistical.ts';
import {scoreRequest,REASONS} from '@mail-scoring/core';
import {htmlText} from '../packages/core/dist/html-text.js';
import {statisticalTokens,statisticalText} from '../packages/core/dist/statistical-text.js';
import {contextFeatures,contextKey} from '../packages/core/dist/context-features.js';
import {contextProbabilities} from '../packages/core/dist/context-probabilities.js';
import {tiledClues} from '../packages/core/dist/vendor/tiling.js';
import {combineClues,chiTail} from '../packages/core/dist/vendor/chi.js';
import {MODEL_COUNTS,MODEL_DOCUMENTS,MODEL_PARTITION_SHA256} from '../packages/core/dist/context-model.js';
import {MODEL_FEATURES,MODEL_TRAIN_MATRIX_SHA256,MODEL_VERSION,MODEL_MIN_KNOWN_BODY_PERCENT,MODEL_BIAS,MODEL_LOGIT_CUTOFF} from '../packages/core/dist/linear-model.js';
import {linearSpam} from '../packages/core/dist/linear.js';
const spam=STATISTICAL_SPAM;
const score=(text:string,extra:Record<string,unknown>={})=>scoreRequest(new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'general-test',subject:'',text,headers:[],sourceComplete:true,...extra})));
const hasSpam=(r:ReturnType<typeof score>)=>r.reasons.some(x=>x.id==='statistical_word_pair_spam');
test('general spam detects original promotional plain text and inert HTML once, with static evidence',()=>{
 for(const input of [{text:spam},{text:'',html:'<html><body><p>'+spam+'</p></body></html>'},{text:spam+'\n'+spam}]){
  const r=score(input.text,input);assert.equal(r.ruleSetVersion,'rules-9');assert.equal(r.heuristicScore,60);
  assert.deepEqual(r.reasons,[{id:'statistical_word_pair_spam',contribution:60,reason:REASONS.statistical_word_pair_spam}]);
  assert.equal(r.signals.spam,'present');assert.equal(r.status,'partial');
 }
});
test('additional public TRAIN vocabulary detects an authored pharmacy advertisement',()=>{
 for(const input of [{text:PHARMACY_SPAM},{text:'',html:'<p>'+PHARMACY_SPAM+'</p>'}]){
  const r=score(input.text,input);assert.equal(r.heuristicScore,60);assert.equal(hasSpam(r),true);
  assert.deepEqual(r.reasons,[{id:'statistical_word_pair_spam',contribution:60,reason:REASONS.statistical_word_pair_spam}]);
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
 assert.equal(hasSpam(score('qzxva qzxvb qzxvc qzxvd qzxve',{subject:spam.trim()})),false);
 assert.equal(hasSpam(score('',{subject:spam.slice(0,1000)})),false);
 assert.equal(hasSpam(score('Ordinary message',{headers:[{name:'X-Spam-Flag',value:'YES'},{name:'X-Spam-Status',value:spam}]})),false);
 assert.deepEqual(statisticalTokens('https://example.test/money/free/offer somebody@example.test www.example.test'),[]);
});

const modelWords=MODEL_FEATURES.filter(row=>row[1]===-1);
const numericFeatures=(rows:readonly (readonly number[])[])=>rows.map((row,start)=>({first:row[0]!,second:row[1]!,start,end:start}));
const wordRows=(ids:number[])=>ids.map(id=>[id,-1]);
const numericMargin=(rows:typeof MODEL_FEATURES,remove=0)=>{
 const incident=new Map<number,number>();let dot=0,norm=0;
 for(const [first,second,idf,weight]of rows){dot+=idf*weight;norm+=idf*idf;if(weight>0){incident.set(first,(incident.get(first)??0)+idf*weight);if(second!==-1&&second!==first)incident.set(second,(incident.get(second)??0)+idf*weight);}}
 return MODEL_BIAS+(dot-[...incident.values()].sort((a,b)=>b-a).slice(0,remove).reduce((a,b)=>a+b,0))/Math.sqrt(norm);
};
test('linear evidence requires supported body words, ignores repetition, and enforces feature ceilings',()=>{
 const positive=contextFeatures([spam]).features,body=statisticalTokens(spam);
 assert.equal(linearSpam(positive,body),true);
 assert.equal(linearSpam(positive,[]),false);
 assert.equal(linearSpam(positive,statisticalTokens('qzxva qzxvb qzxvc qzxvd qzxve')),undefined);
 assert.equal(linearSpam(Array.from({length:2000},(_,i)=>positive[i%positive.length]!),body),false);
 assert.equal(linearSpam(positive,Array.from({length:1001},(_,i)=>body[i%body.length]!)),false);
 const ordered=[...modelWords].sort((a,b)=>a[3]-b[3]);
 const negative=ordered.filter(row=>row[3]<0).slice(0,5).map(row=>row[0]);
 const support=ordered.filter(row=>row[3]>0).slice(0,5).map(row=>row[0]);
 const ham=[...negative,...support],keyword=ordered.at(-1)![0];
 assert.equal(linearSpam(numericFeatures(wordRows([...ham,keyword])),ham),false);
 assert.equal(linearSpam(numericFeatures(wordRows([...ham,...Array(100).fill(keyword)])),ham),false);
 const fourPositive=ordered.slice(-4).map(row=>row[0]);
 const weakNegative=ordered.filter(row=>row[3]<0).slice(-5).map(row=>row[0]);
 const mixed=[...fourPositive,...weakNegative];
 assert.equal(linearSpam(numericFeatures(wordRows(mixed)),mixed),false);
 assert.equal(linearSpam(numericFeatures(wordRows(fourPositive)),Array.from({length:100},(_,i)=>fourPositive[i%4]!)),false);
 const fiveKnown=ordered.slice(-5).map(row=>row[0]);
 assert.equal(linearSpam(numericFeatures(wordRows([...fiveKnown,0,1,2,3,4])),[...fiveKnown,0,1,2,3,4]),true);
 const mostlyKnown=[...fiveKnown,0,1,2,3,4,5];
 assert.equal(linearSpam(numericFeatures(wordRows(mostlyKnown)),mostlyKnown),undefined);
 assert.equal(linearSpam([...positive].reverse(),[...body].reverse()),true);
});

test('two-word stability rejects evidence that survives losing one word',()=>{
 const ordered=modelWords.filter(row=>row[3]>0).sort((a,b)=>a[3]-b[3]),weak=ordered.slice(0,5);
 let found:typeof MODEL_FEATURES=[];
 for(let n=1;n<=128;n++){
  const rows=[...weak,...ordered.slice(-n)];
  if(numericMargin(rows,1)>=MODEL_LOGIT_CUTOFF&&numericMargin(rows,2)<MODEL_LOGIT_CUTOFF){found=rows;break;}
 }
 assert.ok(found.length>=5,'construct positive evidence surviving one but not two word losses');
 const features=numericFeatures(found),ids=found.map(row=>row[0]);
 assert.equal(linearSpam(features,ids),false);
 assert.equal(linearSpam([...features].reverse(),[...ids].reverse()),false);
 assert.equal(linearSpam([...features,...Array(50).fill(features.at(-1)!)],ids),false);
});

test('two-word stability rejects the original contextual spam prefix in actual plain and HTML scoring',()=>{
 const content=statisticalText('',CONTEXT_FRAGILE_SPAM),features=contextFeatures([content.bodyText]).features;
 const table=new Map(MODEL_FEATURES.map(row=>[contextKey(row[0],row[1]),row]));
 const rows=[...new Set(features.map(f=>contextKey(f.first,f.second)))].map(k=>table.get(k)).filter((r):r is typeof MODEL_FEATURES[number]=>Boolean(r));
 assert.ok(numericMargin(rows,1)>=MODEL_LOGIT_CUTOFF);assert.ok(numericMargin(rows,2)<MODEL_LOGIT_CUTOFF);
 for(const input of [{text:CONTEXT_FRAGILE_SPAM},{text:'',html:`<p>${CONTEXT_FRAGILE_SPAM}</p>`}]){const result=score(input.text,input);assert.equal(result.heuristicScore,0);assert.equal(hasSpam(result),false);}
});

test('adjacent-pair negative evidence changes the decision rather than being discarded',()=>{
 const strong=modelWords.filter(row=>row[3]>0).sort((a,b)=>b[3]-a[3]).slice(0,40);
 assert.ok(numericMargin(strong,2)>=MODEL_LOGIT_CUTOFF);
 assert.equal(linearSpam(numericFeatures(strong),strong.map(row=>row[0])),true);
 const negative=MODEL_FEATURES.filter(row=>row[1]!==-1&&row[3]<0).sort((a,b)=>a[2]*a[3]-b[2]*b[3]);
 let found:typeof MODEL_FEATURES=[];
 for(let n=1;n<=256;n++){const rows=[...strong,...negative.slice(0,n)];if(numericMargin(rows,2)<MODEL_LOGIT_CUTOFF){found=rows;break;}}
 assert.ok(found.length>40);
 assert.equal(linearSpam(numericFeatures(found),strong.map(row=>row[0])),false);
});

test('word-loss bound includes every positive pair incident to either word',()=>{
 const weak=modelWords.filter(row=>row[3]>0).sort((a,b)=>a[3]-b[3]).slice(0,5);
 const groups=new Map<number,(typeof MODEL_FEATURES)[number][]>();
 for(const row of MODEL_FEATURES)if(row[1]!==-1&&row[3]>0){const group=groups.get(row[1])??[];group.push(row);groups.set(row[1],group);}
 let found:typeof MODEL_FEATURES=[];
 for(const group of groups.values()){
  group.sort((a,b)=>b[2]*b[3]-a[2]*a[3]);
  for(let n=3;n<=Math.min(group.length,64);n++){
   const rows=[...weak,...group.slice(0,n)],contributions=rows.map(row=>row[2]*row[3]).sort((a,b)=>b-a);
   const norm=Math.sqrt(rows.reduce((sum,row)=>sum+row[2]*row[2],0));
   const featureOnly=MODEL_BIAS+(contributions.reduce((a,b)=>a+b,0)-contributions[0]!-contributions[1]!)/norm;
   if(featureOnly>=MODEL_LOGIT_CUTOFF&&numericMargin(rows,2)<MODEL_LOGIT_CUTOFF){found=rows;break;}
  }
  if(found.length)break;
 }
 assert.ok(found.length>5,'feature losses differ from word losses when pairs share words');
 const body=found.filter(row=>row[1]===-1).map(row=>row[0]);
 assert.equal(linearSpam(numericFeatures(found),body),false);
 assert.equal(linearSpam(numericFeatures(found).reverse(),body.reverse()),false);
});

test('historical authored spam prefixes still abstain in plain text and HTML',()=>{
 for(const text of [FRAGILE_SPAM,REFIT_FRAGILE_SPAM])for(const input of [{text},{text:'',html:`<p>${text}</p>`}]){
  const result=score(input.text,input);assert.equal(result.heuristicScore,0);assert.equal(hasSpam(result),false);
 }
});

test('all frozen authored legitimate controls remain assessed, partial, zero-score in plain text and HTML',async()=>{
 const {readFile}=await import('node:fs/promises');
 const raw=await readFile('harness/evaluation/refit-legitimate-controls.json');
 assert.equal(createHash('sha256').update(raw).digest('hex'),'667dc0c9052480d0e63a83b7097550c1f8d9550a575ed9a15bf5d7d515e84975');
 const controls=JSON.parse(raw.toString()).records;assert.equal(controls.length,119);
 const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 for(const sample of controls)for(const extra of [{text:sample.text},{text:'',html:`<p>${escape(sample.text)}</p>`}]){
  assert.equal(sample.label,'ham');const result=score(extra.text,{subject:sample.subject,...extra});
  assert.equal(result.ruleSetVersion,'rules-9');assert.equal(result.status,'partial');assert.equal(result.heuristicScore,0,sample.id);assert.equal(hasSpam(result),false,sample.id);
 }
});

test('current linear model contains bounded numeric aggregates from the frozen TRAIN matrix',()=>{
 assert.equal(MODEL_VERSION,'general-7');assert.equal(MODEL_MIN_KNOWN_BODY_PERCENT,50);
 assert.equal(MODEL_TRAIN_MATRIX_SHA256,'1e86b9a7f97af06517a7bb00faeb42d5f4e6ba264678c7548e714a1b471dfd49');
 assert.equal(MODEL_FEATURES.length,50000);assert.equal(modelWords.length,25439);
 assert.equal(new Set(MODEL_FEATURES.map(row=>contextKey(row[0],row[1]))).size,MODEL_FEATURES.length);
 assert.equal(createHash('sha256').update(JSON.stringify({bias:MODEL_BIAS,features:MODEL_FEATURES})).digest('hex'),'55716233cf854b8ca2d4156d1f198b7d96fd22b0b9b8532a4b20c377b6db5be8');
 for(const [first,second,idf,weight]of MODEL_FEATURES){
  assert.ok(Number.isInteger(first)&&first>=0&&first<=0xffffffff);
  assert.ok(Number.isInteger(second)&&second>=-1&&second<=0xffffffff);
  assert.ok(Number.isFinite(idf)&&idf>=1&&idf<12);assert.ok(Number.isFinite(weight)&&Math.abs(weight)<10000);
 }
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
test('historical numerical reference model is a bounded unique aggregate from the frozen training partition',()=>{
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

test('legitimate clinical, pharmacy, financial, security and Unicode notices remain nonspam in plain text and HTML',()=>{
 for(const sample of LEGITIMATE_NOTICES){
  for(const result of [score(sample.text,{subject:sample.subject}),score('',{subject:sample.subject,html:`<article><h1>${sample.subject}</h1><p>${sample.text}</p></article>`})]){
   assert.equal(result.heuristicScore,0,sample.subject);
   assert.equal(hasSpam(result),false,sample.subject);
  }
 }
});

test('unsupported vocabulary abstains with partial provenance for the frozen Spanish notice and accentless equivalent',()=>{
 const sample=LEGITIMATE_NOTICES.find(row=>row.subject==='Recordatorio de consulta médica y revisión de tratamiento en la clínica')!;
 assert.ok(sample);
 for(const strip of [false,true]){
  const transform=(text:string)=>strip?text.normalize('NFKD').replace(/\p{M}/gu,''):text;
  const subject=transform(sample.subject),text=transform(sample.text);
  for(const result of [score(text,{subject}),score('',{subject,html:`<article><h1>${subject}</h1><p>${text}</p></article>`})]){
   assert.equal(result.heuristicScore,0);assert.equal(hasSpam(result),false);
   assert.equal(result.status,'partial');assert.ok(result.limitsHit.includes('statistical_limit'));
  }
 }
});

test('unsupported alphabetic scripts abstain before ASCII fragments can become statistical evidence',()=>{
 for(const suffix of [' 中文处方预约提醒',' кириллица',' e\u0301']){
  for(const result of [score(spam+suffix),score('',{html:`<p>${spam+suffix}</p>`})]){
   assert.equal(hasSpam(result),false);assert.ok(result.limitsHit.includes('statistical_limit'));
  }
 }
});

test('statistical word-position ceiling rejects supported repeated spam before truncated features can classify',()=>{
 const result=score(spam.repeat(80));
 assert.equal(hasSpam(result),false);assert.equal(result.heuristicScore,0);
 assert.ok(result.limitsHit.includes('statistical_limit'));
});
