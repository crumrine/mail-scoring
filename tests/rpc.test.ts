// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {REASONS} from '@mail-scoring/core';
import {test} from 'node:test';
import {STATISTICAL_SPAM} from '../fixtures/statistical.ts';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.artifacts',{recursive:true});
await build({stdin:{contents:"export {scoreRpc} from './workers/private/adapter.ts'; export {decodeResponse,encodeBoundedJson} from './workers/private/protocol.ts'; export {assess} from './workers/consumer/integration.ts';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:'es2024',outfile:'.artifacts/rpc-unit.mjs'});
const {scoreRpc,decodeResponse,encodeBoundedJson,assess}=await import('../.artifacts/rpc-unit.mjs' as string);
const input=new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'test',subject:'test',text:'test',headers:[],sourceComplete:true}));
test('RPC validates bytes and bounded context and sanitizes unexpected exceptions',()=>{
 assert.equal(JSON.parse(scoreRpc('1',{},'{}')).error,'invalid_input');
 assert.equal(JSON.parse(scoreRpc('2',input)).error,'unsupported_version');
 assert.equal(JSON.parse(scoreRpc('1',new Uint8Array(262145))).error,'request_limit');
 assert.equal(JSON.parse(scoreRpc('1',input,'{"transportVerified":{}}')).error,'invalid_input');
 const hostile=new Proxy(new Uint8Array(1),{get(){throw new Error('PRIVATE_CANARY_877');}});
 assert.equal(scoreRpc('1',hostile),'{'+'"rpcVersion":"1","ok":false,"error":"internal_failure"}');
 assert.equal(encodeBoundedJson('x'.repeat(262145)),null);
 assert.equal(encodeBoundedJson('🌍'.repeat(65537)),null);
});
test('consumer preserves delivery on disabled/missing/throwing/malformed services',async()=>{
 let calls=0;const SCORER={async scoreV1(){calls++;throw new Error('PRIVATE_CANARY_877');}};
 assert.deepEqual(await assess({SCORER},input),{delivery:'preserve',inspection:'disabled'});assert.equal(calls,0);
 for(const env of [{},{SCORER},{SCORER:{async scoreV1(){return 'PRIVATE_CANARY_877';}}},{SCORER:{async scoreV1(){return 'x'.repeat(4097);}}}]) {
  assert.deepEqual(await assess({...env,SCORING_ENABLED:'true'},input),{delivery:'preserve',inspection:'unknown'});
 }
});
test('consumer wait limit preserves delivery without claiming CPU cancellation',async()=>{
 const result=await assess({SCORING_ENABLED:'true',SCORER:{scoreV1(){return new Promise(()=>{});}}},input);
 assert.deepEqual(result,{delivery:'preserve',inspection:'unknown'});
});
test('response guard rejects content, incompatible versions, excess nesting, invalid contributions and limits',()=>{
 const wire=scoreRpc('1',input);const decoded=decodeResponse(wire);assert.ok(decoded?.ok);
 assert.equal(decoded.result.ruleSetVersion,'rules-7');
 const gtubeInput=new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'test',subject:'Test spam mail (GTUBE)',text:'XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X',headers:[],sourceComplete:true}));
 const gtubeWire=scoreRpc('1',gtubeInput);const gtubeDecoded=decodeResponse(gtubeWire);
 assert.ok(gtubeDecoded?.ok);assert.equal(gtubeDecoded.result.ruleSetVersion,'rules-7');
 assert.equal(gtubeDecoded.result.heuristicScore,100);assert.equal(gtubeDecoded.result.reasons[0]?.id,'gtube');
 // Caller-first rollout compatibility: rules-1 remains accepted for legacy reasons, but rejects gtube.
 const rules1Legacy=JSON.parse(wire);rules1Legacy.result.ruleSetVersion='rules-1';
 assert.ok(decodeResponse(JSON.stringify(rules1Legacy))?.ok);
 const rules1WithGtube=JSON.parse(gtubeWire);rules1WithGtube.result.ruleSetVersion='rules-1';
 assert.equal(decodeResponse(JSON.stringify(rules1WithGtube)),null);
 assert.equal(decodeResponse('{"rpcVersion":"1","ok":false,"error":"invalid_input"}'.padEnd(4097,' ')),null);
 assert.equal(decodeResponse('['.repeat(7)+'0'+']'.repeat(7)),null);
 for(const mutate of [
  (r:any)=>{r.rpcVersion='2';},(r:any)=>{r.result.ruleSetVersion='rules-8';},(r:any)=>{r.result.extra='PRIVATE_CANARY_877';},
  (r:any)=>{r.result.reasons=[{id:'link_mismatch',contribution:30,reason:'PRIVATE_CANARY_877'}];},
  (r:any)=>{r.result.reasons=[{id:'unknown_reason',contribution:10,reason:'Unknown'}];},
  (r:any)=>{r.result.heuristicScore=101;},(r:any)=>{r.result.limitsHit=['PRIVATE_CANARY_877'];},
  (r:any)=>{r.result.status='complete';},(r:any)=>{r.result.signals.spam='safe';}
 ]){const r=JSON.parse(wire);mutate(r);assert.equal(decodeResponse(JSON.stringify(r)),null);}
});

test('new statistical evidence requires declared rules-7',()=>{
 const wire=scoreRpc('1',new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'test',subject:'',text:STATISTICAL_SPAM,headers:[],sourceComplete:true})));
 const current=decodeResponse(wire);assert.ok(current?.ok);assert.equal(current.result.heuristicScore,60);
 for(const version of ['rules-1','rules-2','rules-3','rules-4','rules-5','rules-6']){const old=JSON.parse(wire);old.result.ruleSetVersion=version;assert.equal(decodeResponse(JSON.stringify(old)),null);}
 const ordinary=JSON.parse(scoreRpc('1',input));ordinary.result.ruleSetVersion='rules-2';ordinary.result.limitsHit.push('html_limit');assert.equal(decodeResponse(JSON.stringify(ordinary)),null);
});

test('historical rules-3 through rules-6 statistical evidence remain strictly readable',()=>{
 for(const [version,id]of [['rules-3','statistical_spam'],['rules-4','statistical_context_spam'],['rules-5','statistical_generalized_spam'],['rules-6','statistical_linear_spam']] as const){
  const current=JSON.parse(scoreRpc('1',new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'test',subject:'',text:STATISTICAL_SPAM,headers:[],sourceComplete:true}))));
  current.result.ruleSetVersion=version;
  current.result.reasons=current.result.reasons.map((r:any)=>r.id==='statistical_robust_spam'?{id,contribution:r.contribution,reason:REASONS[id]}:r);
  assert.ok(decodeResponse(JSON.stringify(current))?.ok);
  current.result.ruleSetVersion='rules-7';assert.equal(decodeResponse(JSON.stringify(current)),null);
 }
});
