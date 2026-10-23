// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardInput,boundedText,score,scoreRequest,parseRequest,readRequest,LIMITS,LIMIT_IDS,REASONS} from '@mail-scoring/core';
const base=()=>({schemaVersion:'1',policyVersion:'test-1',subject:'synthetic',headers:[] as Array<{name:string;value:string}>,text:'',sourceComplete:true});
const encoded=(x:unknown)=>new TextEncoder().encode(JSON.stringify(x));
const bytes=(x:string)=>new TextEncoder().encode(x).length;
const prepared=(x:unknown)=>parseRequest(encoded(x)).value;
const scored=(x:unknown,context={})=>score(prepared(x),context);
const guarded=(x:unknown)=>{const r=guardInput(prepared(x));assert.ok(r);return r;};
test('UTF-8 clipping is exact and never splits a code point',()=>{
  for(const s of ['a','é','€','😀','\ud800']) for(const max of [0,1,2,3,4,5,8]) {
    const r=boundedText(s.repeat(10),max);assert.ok(bytes(r.text)<=max);assert.equal(r.bytes,bytes(r.text));assert.equal(r.truncated,true);
  }
  assert.equal(boundedText('😀a',4).text,'😀');
});
test('source and extracted byte limits below/at/above; combined budget includes controls',()=>{
  for(const delta of [-1,0,1]) {
    const n=LIMITS.sourceBytes+delta;
    const r=guarded({...base(),text:'x'.repeat(n)});
    assert.equal(r.input.text.length,Math.min(n,LIMITS.sourceBytes));assert.equal(r.limitsHit.includes('source_bytes'),delta>0);
    const d=guarded({...base(),extractedText:'x'.repeat(LIMITS.extractedBytes+delta)});
    assert.equal(d.limitsHit.includes('extracted_bytes'),delta>0);
    assert.ok(bytes(d.input.extractedText!)<=LIMITS.extractedBytes);
  }
  const r=guarded({...base(),text:'😀'.repeat(32768),html:'x'});
  assert.equal(r.input.html,'');assert.ok(r.limitsHit.includes('source_bytes'));
  assert.equal(guarded({...base(),text:'\x00'.repeat(20000),html:'x'.repeat(LIMITS.sourceBytes-20000+1)}).input.html!.length,LIMITS.sourceBytes-20000);
});
test('header byte accounting includes delimiters and never exceeds field/block caps',()=>{
  for(const delta of [-1,0,1]) {
    const r=guarded({...base(),headers:[{name:'X',value:'x'.repeat(LIMITS.headerFieldBytes-5+delta)}]});
    assert.equal(r.limitsHit.includes('header_field_bytes'),delta>0);
    assert.ok(bytes(r.input.headers[0]!.value)+5<=LIMITS.headerFieldBytes);
    const hs=Array.from({length:4},(_,i)=>({name:`X${i}`,value:'x'.repeat(LIMITS.headerFieldBytes-6)}));
    hs[3]!.value=hs[3]!.value.slice(0,-1);
    if(delta>=0) hs[3]!.value+='x';
    if(delta>0) hs.push({name:'Z',value:''});
    const block=guarded({...base(),headers:hs});
    assert.equal(block.limitsHit.includes('header_bytes'),delta>0);
    assert.ok(block.input.headers.reduce((n,h)=>n+bytes(h.name)+bytes(h.value)+4,0)<=LIMITS.headerBytes);
  }
});
test('header, URL, metadata cardinalities below/at/above',()=>{
  for(const delta of [-1,0,1]) {
    for(const [key,limit,id,entry] of [
      ['headers',LIMITS.headers,'header_count',{name:'X',value:''}],
      ['urls',LIMITS.urls,'url_count','https://example.invalid/'],
      ['attachments',LIMITS.attachments,'attachment_count',{filename:'synthetic.txt',mediaType:'text/plain'}],
    ] as const) {
      const r=guarded({...base(),[key]:Array.from({length:limit+delta},()=>entry)});
      assert.equal(r.input[key]!.length,Math.min(limit+delta,limit));assert.equal(r.limitsHit.includes(id),delta>0);
    }
  }
});
test('secondary fields and multibyte truncation are bounded',()=>{
  const r=guarded({...base(),subject:'😀'.repeat(1000),addresses:{from:'é'.repeat(1000)},urls:['x'.repeat(3000)],attachments:[{filename:'x'.repeat(256),mediaType:'x'.repeat(128)}]});
  assert.equal(bytes(r.input.subject),2048);assert.equal(bytes(r.input.addresses!.from!),512);
  assert.equal(r.input.urls![0]!.length,2048);assert.equal(r.input.attachments![0]!.filename.length,255);assert.equal(r.input.attachments![0]!.mediaType.length,127);
});
test('malformed fields, controls, duplicate names and attachment bytes cannot become trusted data',()=>{
  for(const value of [null,[],{}, {...base(),headers:[{name:'Bad\r\nName',value:'x'}]}, {...base(),text:2},
    {...base(),attachments:[{filename:'a',mediaType:'b',bytes:[1]}]}, {...base(),rawMime:'secret'},
    {...base(),transport:{provenance:'forged'}}, {...base(),subject:{deep:{data:1}}}]) assert.equal(scored(value).status,'unavailable');
  const r=guarded({...base(),headers:[{name:'FROM',value:'a\r\nb'},{name:'from',value:'c'}]});
  assert.ok(r.limitsHit.includes('duplicate_header'));assert.ok(r.limitsHit.includes('control_chars'));assert.equal(r.input.headers[0]!.value,'ab');
  let called=false;const evil={...base()};Object.defineProperty(evil,'text',{get(){called=true;return 'bad';},enumerable:true});
  assert.equal(score(evil).status,'unavailable');assert.equal(called,false);
});
test('transport claims and authserv-id never grant trust; ambiguity invalidates context',()=>{
  const t={provenance:'upstream',complete:true,spf:'fail',dkim:'fail',dmarc:'fail'};
  const input={...base(),transport:t};
  assert.equal(scored(input).heuristicScore,0);assert.ok(scored(input).limitsHit.includes('auth_unknown'));
  const result=scored(input,{transportVerified:true});assert.equal(result.heuristicScore,20);assert.equal(result.status,'complete');
  for(const patch of [{sourceComplete:false},{html:'<p>x'},{headers:[{name:'Authentication-Results',value:'mx.example.test; dmarc=pass'},{name:'authentication-results',value:'mx.example.test; dmarc=pass'}]}]) {
    assert.equal(scored({...input,...patch},{transportVerified:true}).heuristicScore,0);
  }
  assert.equal(scored({...input,transport:{...t,provenance:'unknown'}},{transportVerified:true}).status,'partial');
  assert.equal(scored({...input,transport:{...t,spf:'unknown'}},{transportVerified:true}).status,'partial');
});
test('raw request caps and structural preflight precede parsing; errors never echo content',()=>{
  for(const delta of [-1,0,1]) {
    const s=' '.repeat(LIMITS.requestBytes-2+delta)+'{}';
    assert.equal(parseRequest(new TextEncoder().encode(s)).error,delta>0?'request_limit':undefined);
  }
  assert.equal(scoreRequest(new TextEncoder().encode('['.repeat(7)+'0'+']'.repeat(7))).error,'request_limit');
  assert.equal(scoreRequest(new TextEncoder().encode('['+'0,'.repeat(4097)+'0]')).error,'request_limit');
  assert.equal(scoreRequest(new Uint8Array([0xff])).error,'invalid_json');
  assert.equal(scoreRequest(new TextEncoder().encode('{SECRET_SENTINEL')).error,'invalid_json');
  assert.ok(!JSON.stringify(scored({subject:'SECRET_SENTINEL'})).includes('SECRET_SENTINEL'));
});
test('stream accumulation enforces limit without Content-Length and cancels oversize source',async()=>{
  for(const delta of [-1,0,1]) {
    let canceled=false;
    let sent=false;
    const stream=new ReadableStream<Uint8Array>({pull(c){if(sent)c.close();else{c.enqueue(new Uint8Array(LIMITS.requestBytes+delta));sent=true;}},cancel(){canceled=true;}});
    const r=await readRequest(stream);assert.equal(r?.length??null,delta>0?null:LIMITS.requestBytes+delta);assert.equal(canceled,delta>0);
  }
});
test('synthetic hostile fixtures produce only bounded static outputs and no console calls',()=>{
  const old=console.log;let calls=0;console.log=()=>{calls++;};
  try {
    for(const file of ['ordinary','hostile']) {
      const result=scored(JSON.parse(readFileSync(`fixtures/${file}.json`,'utf8')));
      assert.ok(bytes(JSON.stringify(result))<LIMITS.outputBytes);assert.ok(Number.isFinite(result.heuristicScore));
      assert.ok(result.heuristicScore>=0 && result.heuristicScore<=100);
      assert.ok(result.limitsHit.every(x=>LIMIT_IDS.includes(x)));assert.ok(result.reasons.every(x=>x.reason===REASONS[x.id]));
      assert.equal(result.signals.marketing,'unknown');
    }
  } finally {console.log=old;}
  assert.equal(calls,0);
});
test('array accessors, sparse arrays and hidden object getters are never executed',()=>{
  let calls=0;
  const headers=[{name:'x',value:'a'}];Object.defineProperty(headers,'0',{get(){calls++;return {name:'x',value:'a'};}});
  assert.equal(score({...base(),headers}).status,'unavailable');
  assert.equal(score({...base(),urls:new Array(10)}).status,'unavailable');
  const hidden={...base()};Object.defineProperty(hidden,'text',{get(){calls++;return 'a';},enumerable:false});
  assert.equal(score(hidden).status,'unavailable');assert.equal(calls,0);
});
test('header multibyte and bidi control handling is partial and bounded',()=>{
  const r=guarded({...base(),headers:[{name:'X',value:'é'.repeat(8192)}],subject:'A\u202eB'});
  assert.ok(bytes(r.input.headers[0]!.value)+5<=8192);assert.ok(r.limitsHit.includes('header_field_bytes'));
  assert.ok(r.limitsHit.includes('control_chars'));assert.equal(r.input.subject,'AB');
});

test('unprepared roots are refused before any structural operation',()=>{
  assert.equal(score(base()).error,'invalid_input');
  assert.equal(guardInput(base()),null);
  let calls=0;
  const proxy=new Proxy(base(),{ownKeys(){calls++;throw new Error('synthetic');},getPrototypeOf(){calls++;throw new Error('synthetic');}});
  assert.equal(score(proxy).error,'invalid_input');assert.equal(calls,0);
  const parsed=prepared({...base(),headers:[{name:'X',value:'synthetic'}]}) as ReturnType<typeof base>;
  assert.ok(Object.isFrozen(parsed));assert.ok(Object.isFrozen(parsed.headers));assert.ok(Object.isFrozen(parsed.headers[0]));
  assert.throws(()=>{parsed.text='changed';},TypeError);
  assert.throws(()=>{parsed.headers[0]!.value='changed';},TypeError);
  assert.equal(score(parsed).status,'partial');
  assert.equal(score({...parsed}).error,'invalid_input');
  assert.equal(score(structuredClone(parsed)).error,'invalid_input');
  assert.equal(score(guarded(base()).input).error,'invalid_input');
});
test('lazy strings are omitted before flattening beyond representation ceiling',()=>{
  for(const n of [LIMITS.requestBytes+1,1048576,16777216,67108864]) {
    for(const value of ['x'.repeat(n),'prefix'+'x'.repeat(n)]) {
      assert.deepEqual(boundedText(value,32),{text:'',bytes:0,truncated:true});
    }
  }
  assert.deepEqual(boundedText('x'.repeat(LIMITS.requestBytes),32),{text:'x'.repeat(32),bytes:32,truncated:true});
});
