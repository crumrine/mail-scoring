// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Local-only harness. All bodies are synthetic; this file is excluded from deployment bundles.
import {bytes, cases, ordinary} from './fixtures.js';
import {decodeResponse, type ScorerBinding} from '../../workers/private/protocol.js';
import type {Assessment} from '../../workers/consumer/integration.js';
interface Env {SCORER:ScorerBinding; CONSUMER:{inspectV1(input:Uint8Array):Promise<Assessment>}; OFF:{inspectV1(input:Uint8Array):Promise<Assessment>}}
function check(ok:unknown,id:string):asserts ok {if(!ok)throw new Error(id);}
export default {
 async test(_controller:unknown,env:Env) {
  const call=async(v:unknown,version='1',context='{}')=>decodeResponse(await env.SCORER.scoreV1(version,v as Uint8Array,context));
  const err=async(v:unknown,error:string,version='1',context='{}')=>{const r=await call(v,version,context);check(r&&!r.ok&&r.error===error,'rpc_'+error);};
  const input=bytes(ordinary);
  const a=await env.CONSUMER.inspectV1(input);check(a.delivery==='preserve'&&a.inspection==='assessed'&&a.result?.status==='partial','consumer_binding');
  check((await env.OFF.inspectV1(input)).inspection==='disabled','off');
  await err({},'invalid_input');await err('mail','invalid_input');await err(null,'invalid_input');
  await err(new Uint8Array([0xff]),'invalid_json');await err(new TextEncoder().encode('{'),'invalid_json');
  await err(input,'unsupported_version','2');await err(bytes({...ordinary,schemaVersion:'2'}),'unsupported_version');
  await err(bytes({...ordinary,text:17}),'invalid_input');await err(bytes({...ordinary,unexpected:true}),'invalid_input');
  await err(bytes({...ordinary,attachments:[{filename:'x',mediaType:'x',bytes:[1]}]}),'invalid_input');
  await err(input,'invalid_input','1','{"transportVerified":"true"}');await err(input,'invalid_input','1','{"extra":true}');
  await err(input,'invalid_input','1','x'.repeat(257));await err(input,'invalid_input','1','{');
  const padded=new Uint8Array(262144).fill(32);padded.set(input);check((await call(padded))?.ok,'exact_bytes');
  await err(new Uint8Array(262145),'request_limit');
  const multi=bytes({...ordinary,text:'🌍'.repeat(32769)});const mr=await call(multi);check(mr?.ok&&mr.result.limitsHit.includes('source_bytes'),'multibyte_field');
  const mp=new Uint8Array(262144).fill(32);mp.set(bytes(cases.unicode));check((await call(mp))?.ok,'multibyte_exact');await err(new Uint8Array(262145).fill(32),'request_limit');
  await err(new TextEncoder().encode('['.repeat(7)+'0'+']'.repeat(7)),'request_limit');
  await err(new TextEncoder().encode('['+'0,'.repeat(4097)+'0]'),'request_limit');
  const hc=await call(bytes({...ordinary,headers:Array.from({length:101},(_,i)=>({name:'X-'+i,value:'x'}))}));check(hc?.ok&&hc.result.limitsHit.includes('header_count'),'cardinality');
  const partial=await call(bytes({...ordinary,html:'<b>uninspected</b>',sourceComplete:false}));check(partial?.ok&&partial.result.status==='partial'&&partial.result.limitsHit.includes('html_uninspected'),'partial');
  const forged=bytes({...ordinary,transport:{provenance:'upstream',complete:true,spf:'fail',dkim:'fail',dmarc:'fail'},preferences:{senderBlocked:true,senderAllowed:false}});
  const f=await call(forged);check(f?.ok&&f.result.heuristicScore===0&&f.result.limitsHit.includes('auth_unknown')&&f.result.limitsHit.includes('preferences_unknown'),'provenance');
  const trusted=await call(forged,'1','{"transportVerified":true,"preferencesVerified":true,"receivedAt":123}');check(trusted?.ok&&trusted.result.heuristicScore===60,'verified_context');
  const canary='PRIVATE_CANARY_877';
  const wire=await env.SCORER.scoreV1('1',bytes({...ordinary,subject:canary,text:canary,addresses:{from:canary+'@example.test'},urls:['https://example.test/'+canary],headers:[{name:'Message-ID',value:canary}]}));
  check(!wire.includes(canary)&&new TextEncoder().encode(wire).length<=4096,'content_output');
  // Direct HTTP is harmless, even through a local service binding.
  const response=await (env.SCORER as unknown as {fetch(r:Request):Promise<Response>}).fetch(new Request('https://example.invalid/',{method:'POST',body:canary}));
  check(response.status===404&&(await response.text())==='','http_404');
  for(const fixture of Object.values(cases)){const a=await env.CONSUMER.inspectV1(bytes(fixture));check(a.inspection==='assessed'&&a.delivery==='preserve','fixtures');}
 },
 async fetch(request:Request,env:Env) {
  // Loopback benchmark only: select a static synthetic fixture, never accept mail bodies.
  const name=new URL(request.url).pathname.slice(1) as keyof typeof cases;
  if(!Object.hasOwn(cases,name))return new Response(null,{status:404});
  const a=await env.CONSUMER.inspectV1(bytes(cases[name]));
  if(a.inspection!=='assessed')return new Response(null,{status:500});
  return new Response('ok');
 }
};
