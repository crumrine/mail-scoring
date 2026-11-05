// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import {score,scoreRequest,parseRequest,guardInput,GTUBE_MARKER,LIMITS,REASONS,RULE_SET_VERSION,type ScoreContext,type ScoreResultV1} from '@mail-scoring/core';
import {inspect} from '../packages/core/dist/inspection.js';
import {normalizeText} from '../packages/core/dist/vendor/text.js';
const ajv=new Ajv2020({strict:false});
const outputSchema=ajv.compile(JSON.parse(readFileSync('packages/core/schemas/ScoreResultV1.json','utf8')));
const inputSchema=ajv.compile(JSON.parse(readFileSync('packages/core/schemas/ScoreInputV1.json','utf8')));
const base=()=>({schemaVersion:'1',policyVersion:'test-1',subject:'',headers:[],text:'',sourceComplete:true});
const encoded=(x:unknown)=>new TextEncoder().encode(JSON.stringify(x));
const parsed=(x:unknown)=>parseRequest(encoded(x)).value;
const scored=(x:unknown,c:ScoreContext={receivedAt:1792540800000})=>score(parsed(x),c);
function valid(r:ScoreResultV1) {
  assert.equal(outputSchema(r),true,JSON.stringify(outputSchema.errors));
  assert.equal(r.ruleSetVersion,RULE_SET_VERSION);
  assert.ok(encoded(r).length<=LIMITS.outputBytes);
  assert.equal(r.heuristicScore,r.reasons.reduce((n,x)=>n+x.contribution,0));
  assert.equal(new Set(r.reasons.map(x=>x.id)).size,r.reasons.length);
  assert.ok(r.reasons.every(x=>x.reason===REASONS[x.id]));
  if(r.status==='complete')assert.deepEqual(r.limitsHit,[]);
  if(r.limitsHit.length)assert.equal(r.status,'partial');
}
function inspected(x:unknown) {
  const guarded=guardInput(parsed(x));assert.ok(guarded);
  const limits=new Set(guarded.limitsHit);return {...inspect(guarded.input,limits),limits,input:guarded.input};
}
const link={text:'https://accounts.example.test/',href:'https://other.invalid/'};
test('synthetic rule fixtures validate schema, exact contributions and determinism',()=>{
  for(const name of readdirSync('fixtures/rules').sort()) {
    const fixture=JSON.parse(readFileSync(`fixtures/rules/${name}`,'utf8'));
    assert.ok(inputSchema(fixture.input),name);
    const bytes=encoded(fixture.input);const p=parseRequest(bytes).value;
    const before=JSON.stringify(p);
    const result=score(p,fixture.context);valid(result);
    assert.equal(result.heuristicScore,fixture.expectedScore,name);
    assert.deepEqual(result.signals,fixture.expectedSignals,name);
    for(const limit of fixture.expectedLimits)assert.ok(result.limitsHit.includes(limit),name);
    for(let i=0;i<5;i++)assert.deepEqual(score(p,fixture.context),result,name);
    assert.equal(JSON.stringify(p),before);
  }
});
test('normalized output guard bounds expansion before materializing full NFKC output',()=>{
  for(const n of [1985,1986,10000]) {
    const x=inspected({...base(),text:'\ufdfa'.repeat(n)});
    assert.ok(x.normalized.bytes<=65536);
    assert.ok(new TextEncoder().encode(x.normalized.text).length<=65536);
    assert.ok(x.normalized.units<=Math.min(n,1987));
    if(n===10000)assert.ok(x.limits.has('normalized_bytes'));
  }
  for(const delta of [-1,0,1]) {
    const x=inspected({...base(),text:'x'.repeat(65536+delta)});
    assert.ok(x.normalized.bytes<=65536);assert.ok(x.normalized.units<=65537);
    assert.equal(x.limits.has('normalized_bytes'),delta>0);
  }
  const joint=inspected({...base(),text:'a'.repeat(40000),extractedText:'b'.repeat(40000)});
  assert.ok(joint.limits.has('normalized_bytes'));
  assert.ok(joint.normalized.units<=65537);
});
test('anchor work is bounded by one shared URL budget before URL parsing',()=>{
  for(const n of [99,100,101,300]) {
    const x=inspected({...base(),anchors:Array.from({length:n},()=>link)});
    assert.equal(x.input.anchors!.length,Math.min(n,100));
    assert.ok(x.work.parses<=200);assert.equal(x.limits.has('url_count'),n>100);
    valid(scored({...base(),anchors:Array.from({length:n},()=>link)}));
  }
  const joint=inspected({...base(),anchors:Array.from({length:60},()=>link),urls:Array.from({length:60},()=>link.href)});
  assert.equal(joint.input.urls!.length,40);assert.ok(joint.limits.has('url_count'));
  assert.ok(joint.work.parses<=160);
});
test('URL decoding has a finite pass budget and never follows wrappers',()=>{
  for(let n=0;n<5;n++) {
    let href='https://other.invalid/';for(let i=0;i<n;i++)href=encodeURIComponent(href);
    const x=inspected({...base(),anchors:[{...link,href}]});
    assert.ok(x.work.decodePasses<=2);assert.equal(x.mismatch,n<=2);
    assert.equal(x.limits.has('url_decode_limit'),n>2);
  }
  for(const delta of [-1,0,1]) {
    const prefix='https://other.invalid/';
    const x=inspected({...base(),urls:[prefix+'x'.repeat(2048-prefix.length+delta)]});
    assert.equal(x.input.urls![0]!.length,Math.min(2048+delta,2048));
    assert.equal(x.limits.has('field_bytes'),delta>0);
  }
  assert.equal(inspected({...base(),anchors:[{text:link.text,href:link.text+'?next=https%3A%2F%2Fother.invalid'}]}).mismatch,false);
  assert.equal(inspected({...base(),anchors:[{text:'https://a.host.test',href:'https://b.host.test'}]}).mismatch,true);
  assert.equal(inspected({...base(),anchors:[{text:'https://例子.test',href:'https://xn--fsqu00a.test/'}]}).mismatch,false);
  for(const href of ['javascript:alert(1)','file:///synthetic','https%broken','https://[']) {
    const r=scored({...base(),urls:[href]});valid(r);assert.ok(r.limitsHit.includes('url_uninspected'));
  }
});
test('correlated contribution caps survive repeated evidence and global saturation',()=>{
  const bad={text:'https://good.test/',href:'https://good.test@other.invalid/'};
  const input={...base(),anchors:[bad],addresses:{from:'a@other.invalid',replyTo:'b@example.test',displayName:'a@example.test'},
    text:'Security team: verify your password.',transport:{provenance:'upstream',complete:true,spf:'fail',dkim:'fail',dmarc:'fail'},
    preferences:{senderAllowed:true,senderBlocked:true}};
  const ctx={transportVerified:true,preferencesVerified:true};
  const r=scored(input,ctx);valid(r);assert.equal(r.heuristicScore,100);
  assert.equal(r.reasons.filter(x=>x.id.startsWith('link_')).reduce((n,x)=>n+x.contribution,0),35);
  assert.equal(r.reasons.filter(x=>['reply_to_mismatch','display_identity_mismatch','impersonation_combined'].includes(x.id)).reduce((n,x)=>n+x.contribution,0),20);
  for(const n of [2,20,100])assert.deepEqual(scored({...input,anchors:Array.from({length:n},()=>bad)},ctx),r);
  const withoutAllow=scored({...input,preferences:{senderAllowed:false,senderBlocked:true}},ctx);
  assert.equal(withoutAllow.heuristicScore,r.heuristicScore);assert.equal(r.signals.phishing,'present');
});
test('linear quote skipping and inert HTML adversarial shapes remain partial',()=>{
  for(const n of [16384,32768]) {
    const x=inspected({...base(),text:(' \n').repeat(n)});
    assert.equal(x.normalized.units,2*n);assert.equal(x.normalized.text,'');
  }
  const q=scored({...base(),text:'> Security team: verify your password\n'.repeat(1000),addresses:{from:'a@a.test',replyTo:'b@b.test'}});
  assert.equal(q.heuristicScore,10);assert.ok(q.limitsHit.includes('quoted_content'));
  for(const html of ['<div>'.repeat(8192)+'x<br>'.repeat(8192),'<a href="https://x.test/">label!</a>'.repeat(3600),'<a href="'+'%25'.repeat(40000)+'">x', '<'.repeat(131072)]) {
    const x=inspected({...base(),html});assert.equal(x.work.parses,0);
    const r=scored({...base(),html});valid(r);assert.ok(r.limitsHit.includes('html_uninspected'));assert.equal(r.status,'partial');
  }
});
test('fixed phrase matches resist word repetition, Unicode expansion and prompts',()=>{
  for(const text of ['verify your password'.repeat(2000),'xverification code'.repeat(2000),'\ufdfa'.repeat(10000),'ｓｅｃｕｒｉｔｙ ｔｅａｍ: ｖｅｒｉｆｙ ｙｏｕｒ ｐａｓｓｗｏｒｄ','send your pass\u200bword']) {
    const x=inspected({...base(),text});assert.ok(x.normalized.bytes<=65536);assert.ok(x.normalized.units<=131072);
    const r=scored({...base(),text});valid(r);assert.equal(r.heuristicScore,0);
  }
  const x=inspected({...base(),text:'𐐀verification code𐐀'});assert.equal(x.sensitive,false);
});
test('hostile policy code, auth context and preference assertions are refused',()=>{
  for(const patch of [{rules:[{regex:'(a+)+$',weight:Infinity}]},{transportVerified:true},{preferencesVerified:true},{receivedAt:123},{weights:{link_mismatch:0}},{addresses:{from:'x',trusted:true}}]) {
    const r=scored({...base(),...patch});valid(r);assert.equal(r.status,'unavailable');
  }
  for(const receivedAt of [NaN,Infinity,-1,0.5,8640000000000001])assert.equal(scored(base(),{receivedAt}).status,'unavailable');
  assert.deepEqual(scored(base(),{receivedAt:0}),scored(base(),{receivedAt:1792540800000}));
});
test('seeded adversarial properties keep finite static schema and incomplete semantics',()=>{
  let seed=876;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const tokens=['a','\ufdfa','\u200b','😀',' ', '\n','>','verify your password','<a href="x">','%2525'];
  for(let i=0;i<180;i++) {
    let text='';for(let j=0;j<100;j++)text+=tokens[next()%tokens.length];
    const value={...base(),text,sourceComplete:next()%2===0,anchors:Array.from({length:next()%102},()=>link)};
    const r=scored(value);valid(r);assert.deepEqual(scored(value),r);
    if(!value.sourceComplete)assert.ok(r.limitsHit.includes('source_incomplete'));
    assert.equal(r.status,'partial');assert.ok(!JSON.stringify(r).includes('example.test'));
  }
  const maximum={...base(),text:'x'.repeat(131072),extractedText:'y'.repeat(65536),
    headers:Array.from({length:4},(_,i)=>({name:`X${i}`,value:'h'.repeat(8186)})),
    urls:Array.from({length:15},()=> 'https://a.test/'+'z'.repeat(2048-15))};
  const remaining=LIMITS.requestBytes-encoded(maximum).length;
  assert.ok(remaining>0 && remaining<=LIMITS.subjectBytes);
  maximum.subject='s'.repeat(remaining);
  assert.equal(encoded(maximum).length,LIMITS.requestBytes);
  const maximumResult=scoreRequest(encoded(maximum));valid(maximumResult);
  assert.equal(maximumResult.error,null);assert.equal(maximumResult.status,'partial');
  assert.equal(scoreRequest(encoded({...maximum,subject:maximum.subject+'s'})).error,'request_limit');
  valid(scoreRequest(new Uint8Array(LIMITS.requestBytes+1)));
  assert.equal(normalizeText(['x'.repeat(131072)]).truncated,true);
});
test('standard GTUBE marker recognition is exact, bounded, unquoted-only and non-multiplying',()=>{
  assert.equal(GTUBE_MARKER.length,68);
  assert.equal(new TextEncoder().encode(GTUBE_MARKER).byteLength,68);
  const pos=scored({...base(),subject:'Test spam mail (GTUBE)',
    headers:[{name:'Message-ID',value:'<gtube.1010101@example.test>'}],
    addresses:{from:'sender@example.test',replyTo:'sender@example.test',envelopeFrom:'sender@example.test',displayName:'Sender'},
    text:`Preface line.\n\n${GTUBE_MARKER}\n\nFooter line.`});
  valid(pos);
  assert.equal(pos.heuristicScore,100);
  assert.equal(pos.status,'partial');
  assert.deepEqual(pos.limitsHit,['auth_unknown']);
  assert.deepEqual(pos.signals,{spam:'present',phishing:'unknown',marketing:'unknown'});
  assert.deepEqual(pos.reasons,[{id:'gtube',contribution:100,reason:REASONS.gtube}]);
  // Verified transport pass makes status complete; incomplete/HTML/unknown inputs stay partial.
  const verifiedPass=scored({...base(),text:GTUBE_MARKER,
    transport:{provenance:'upstream',complete:true,spf:'pass',dkim:'pass',dmarc:'pass'}},{transportVerified:true});
  valid(verifiedPass);assert.equal(verifiedPass.status,'complete');assert.equal(verifiedPass.heuristicScore,100);
  const incomplete=scored({...base(),text:GTUBE_MARKER,html:'<p>uninspected</p>',sourceComplete:false});
  valid(incomplete);assert.equal(incomplete.status,'partial');assert.equal(incomplete.heuristicScore,100);
  assert.ok(incomplete.limitsHit.includes('source_incomplete') && incomplete.limitsHit.includes('html_uninspected') && incomplete.limitsHit.includes('auth_unknown'));
  // Nonspam control (reply-to host mismatch = 10, no GTUBE).
  const nonspam=scored({...base(),subject:'Test nonspam mail',addresses:{from:'sender@example.test',replyTo:'list@other.test'},text:'Ordinary nonspam body without test marker.'});
  valid(nonspam);assert.equal(nonspam.heuristicScore,10);assert.ok(!nonspam.reasons.some(r=>r.id==='gtube'));
  // Non-body fields must never trigger GTUBE recognition.
  for(const nonBody of [
    {...base(),subject:GTUBE_MARKER},
    {...base(),headers:[{name:'X-Spam-Status',value:GTUBE_MARKER},{name:'Comments',value:GTUBE_MARKER}]},
    {...base(),extractedText:GTUBE_MARKER},
    {...base(),html:`<p>${GTUBE_MARKER}</p>`},
    {...base(),addresses:{from:'sender@example.test',displayName:GTUBE_MARKER}},
    {...base(),urls:[`https://example.test/${GTUBE_MARKER}`]},
    {...base(),anchors:[{text:GTUBE_MARKER,href:`https://example.test/${GTUBE_MARKER}`}]},
  ]) {
    const r=scored(nonBody);valid(r);
    assert.equal(r.heuristicScore,0);assert.ok(!r.reasons.some(x=>x.id==='gtube'));
  }
  // Case, byte, truncation, internal whitespace, line-break, invisible and fullwidth variants must not trigger.
  for(const variant of [
    GTUBE_MARKER.toLowerCase(),
    GTUBE_MARKER.replace('GTUBE','Gtube'),
    GTUBE_MARKER.slice(0,67),
    GTUBE_MARKER.slice(1),
    GTUBE_MARKER.slice(0,-1)+'Y',
    'Y'+GTUBE_MARKER.slice(1),
    GTUBE_MARKER.replace('*GTUBE-','* GTUBE-'),
    GTUBE_MARKER.replace('*GTUBE-','*\tGTUBE-'),
    GTUBE_MARKER.replace('*GTUBE-','*\nGTUBE-'),
    GTUBE_MARKER.replace('*GTUBE-','*\r\nGTUBE-'),
    GTUBE_MARKER.replace('GTUBE','GT\u200bUBE'),
    GTUBE_MARKER.replace('GTUBE','GT\u00adUBE'),
    GTUBE_MARKER.replace('GTUBE','GT\x00UBE'),
    GTUBE_MARKER.replace('GTUBE','GT\u202eUBE'),
    GTUBE_MARKER.replace('GTUBE','ＧＴＵＢＥ'),
  ]) {
    const r=scored({...base(),text:variant});valid(r);
    assert.equal(r.heuristicScore,0);assert.ok(!r.reasons.some(x=>x.id==='gtube'));
  }
  // Quoted and forwarded markers must not trigger, and must record quoted_content.
  for(const quotedText of [
    `> ${GTUBE_MARKER}`,
    `   \t >${GTUBE_MARKER}`,
    `Reply text.\n> ${GTUBE_MARKER}\nMore reply text.`,
    `FYI\n-----Original Message-----\n${GTUBE_MARKER}`,
    `FYI\n   ---------- Forwarded message ---------\n${GTUBE_MARKER}`,
  ]) {
    const r=scored({...base(),text:quotedText});valid(r);
    assert.equal(r.heuristicScore,0);assert.ok(!r.reasons.some(x=>x.id==='gtube'));
    assert.ok(r.limitsHit.includes('quoted_content'));
  }
  // Unquoted marker with surrounding text, leading whitespace, Unicode, or separate quoted/forwarded blocks triggers and preserves limits.
  for(const [unquotedText,expectQuoted] of [
    [`   \t ${GTUBE_MARKER}   `,false],
    [`こんにちは ${GTUBE_MARKER} 🌍`,false],
    [`> earlier quote\n${GTUBE_MARKER}`,true],
    [`${GTUBE_MARKER}\n> later quote`,true],
    [`${GTUBE_MARKER}\n-----Original Message-----\nquoted body`,true],
  ] as const) {
    const r=scored({...base(),text:unquotedText});valid(r);
    assert.equal(r.heuristicScore,100);
    assert.deepEqual(r.reasons,[{id:'gtube',contribution:100,reason:REASONS.gtube}]);
    assert.equal(r.limitsHit.includes('quoted_content'),expectQuoted);
  }
  // Repetition never multiplies contributions; combined rules stay capped at 100.
  for(const count of [2,10,50]) {
    const repeated=scored({...base(),text:(`${GTUBE_MARKER}\n`).repeat(count)});valid(repeated);
    assert.equal(repeated.heuristicScore,100);
    assert.deepEqual(repeated.reasons,[{id:'gtube',contribution:100,reason:REASONS.gtube}]);
  }
  const combined=scored({...base(),text:`Security team: verify your password.\n${GTUBE_MARKER}`,
    addresses:{from:'a@example.test',replyTo:'b@other.test'}},{});
  valid(combined);assert.equal(combined.heuristicScore,100);
  assert.deepEqual(combined.reasons.map(r=>[r.id,r.contribution]),[['reply_to_mismatch',10],['impersonation_combined',10],['sensitive_request_combined',25],['gtube',55]]);
  // Source byte ceiling bounds before scanning.
  const exactEnd=scored({...base(),text:' '.repeat(LIMITS.sourceBytes-GTUBE_MARKER.length)+GTUBE_MARKER});
  valid(exactEnd);assert.equal(exactEnd.heuristicScore,100);assert.ok(!exactEnd.limitsHit.includes('source_bytes'));
  const beforeOverflow=scored({...base(),text:GTUBE_MARKER+' '.repeat(LIMITS.sourceBytes)});
  valid(beforeOverflow);assert.equal(beforeOverflow.heuristicScore,100);assert.ok(beforeOverflow.limitsHit.includes('source_bytes'));
  const straddlingCeiling=scored({...base(),text:' '.repeat(LIMITS.sourceBytes-10)+GTUBE_MARKER});
  valid(straddlingCeiling);assert.equal(straddlingCeiling.heuristicScore,0);assert.ok(straddlingCeiling.limitsHit.includes('source_bytes'));
  const afterCeiling=scored({...base(),text:' '.repeat(LIMITS.sourceBytes)+GTUBE_MARKER});
  valid(afterCeiling);assert.equal(afterCeiling.heuristicScore,0);assert.ok(afterCeiling.limitsHit.includes('source_bytes'));
  const manyLines=scored({...base(),text:'a\n'.repeat(2048)+GTUBE_MARKER});
  valid(manyLines);assert.equal(manyLines.heuristicScore,100);
});
