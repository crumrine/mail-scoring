// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {createExecutionContext,env,waitOnExecutionContext} from 'cloudflare:test';
import {it,expect,vi,beforeAll,afterAll} from 'vitest';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
// Only unrelated Agent/MCP/SSR entrypoints are inert. The email export, parser,
// intake, RPC scorer, DO SQLite, R2, JWT and REST handlers are real source.
vi.mock('agents',()=>({routeAgentRequest:()=>{throw new Error('forbidden_agent');}}));
vi.mock('../workers/agent',()=>({EmailAgent:class {}}));
vi.mock('../workers/mcp',()=>({EmailMCP:{serve:()=>({fetch:()=>{throw new Error('forbidden_mcp');}})}}));
import worker from '../workers/app';
import {mailbox,query,restart} from './helpers';
import type {Env} from '../workers/types';
const BOX='release@inbox.test', OTHER='other@inbox.test', ORIGIN='https://inbox.test';
let human:string,service:string;
let networkCalls=0;
beforeAll(async()=>{
  vi.stubEnv('DEV',false);
  const keys=await generateKeyPair('RS256',{extractable:true});
  const jwks=JSON.stringify({keys:[{...await exportJWK(keys.publicKey),kid:'synthetic',alg:'RS256'}]});
  const token=(payload:Record<string,string>)=>new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'synthetic'})
    .setIssuer('https://access.test').setAudience('synthetic').setExpirationTime('1h').sign(keys.privateKey);
  human=await token({email:'operator@inbox.test'});service=await token({common_name:'synthetic'});
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
    const url=input instanceof Request?input.url:String(input);
    if(url!=='https://access.test/cdn-cgi/access/certs'){networkCalls++;throw new Error('forbidden_network');}
    return new Response(jwks,{headers:{'content-type':'application/json'}});
  }));
});
afterAll(()=>{expect(networkCalls).toBe(0);vi.unstubAllGlobals();vi.unstubAllEnvs();});
function bindings(mode='shadow'){
  // Count and forward the exact bytes/context across an actual Worker RPC binding.
  const scoreV1=vi.fn((...args:any[])=>(env as any).MAIL_SCORER.scoreV1(...args));
  const forbidden=vi.fn(()=>{throw new Error('forbidden_send_or_ai');});
  const e={...env,DOMAINS:'inbox.test',EMAIL_ADDRESSES:[],MAIL_SCORING_MODE:mode,
    POLICY_AUD:'synthetic',TEAM_DOMAIN:'https://access.test',MAIL_SCORER:{scoreV1},
    EMAIL:{send:forbidden},AI:{run:forbidden},EMAIL_AGENT:{idFromName:forbidden,get:forbidden}} as unknown as Env;
  return {e,scoreV1,forbidden};
}
function raw(body='Original synthetic receipt. Total 12 units.',extra:string[]=[]){
  return new TextEncoder().encode(['From: sender@sender.test',`To: ${BOX}`,'Subject: Synthetic receipt',
    ...extra,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','',body].join('\r\n'));
}
async function deliver(e:Env,bytes=raw()){
  const ctx=createExecutionContext(),reject=vi.fn();
  await worker.email({raw:new ReadableStream({start(c){c.enqueue(bytes);c.close();}}),rawSize:bytes.length,
    from:'sender@sender.test',to:BOX,setReject:reject} as unknown as ForwardableEmailMessage,e,ctx);
  await waitOnExecutionContext(ctx);expect(reject).not.toHaveBeenCalled();
  const rows=await query<any>(mailbox(BOX),'SELECT id,raw_key,folder_id,uid,thread_id FROM emails ORDER BY uid DESC');
  expect(rows.length).toBeGreaterThan(0);return rows[0];
}
async function registered(){await env.BUCKET.put(`mailboxes/${BOX}.json`,'{}');await mailbox(BOX).getFolders();}
const base=`/api/v1/mailboxes/${BOX}`;
async function request(e:Env,path:string,body?:unknown,token=human){
  const ctx=createExecutionContext();
  const response=await worker.fetch(new Request(ORIGIN+path,{method:body===undefined?'GET':'POST',headers:{
    'cf-access-jwt-assertion':token,origin:ORIGIN,'sec-fetch-site':'same-origin','x-inbox-manual-action':'1','content-type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body)}),e,ctx);
  await waitOnExecutionContext(ctx);return response;
}
it('joined email -> private scorer -> SQLite -> authenticated pages/thread/feedback/rescue; reads never rescore',async()=>{
  await registered();const b=bindings();const bytes=raw();const row=await deliver(b.e,bytes);
  expect(b.scoreV1).toHaveBeenCalledTimes(1);
  const wire=await b.scoreV1.mock.results[0].value;
  expect(JSON.parse(wire)).toMatchObject({rpcVersion:'1',ok:true,result:{status:'partial',heuristicScore:0}});
  expect(new Uint8Array(await (await env.BUCKET.get(row.raw_key))!.arrayBuffer())).toEqual(bytes);
  const state=await (await restart(BOX)).getSpamState(row.id);
  expect(state?.assessments[0]).toMatchObject({status:'partial',result:JSON.parse(wire).result});
  for(let i=0;i<2;i++)for(const path of [base+'/emails',base+'/emails/'+row.id,base+'/threads/'+row.thread_id,
    `/api/imap/v1/${BOX}/inbox/status`,`/api/imap/v1/${BOX}/inbox/messages`]) expect((await request(b.e,path)).status).toBe(200);
  const action={emailId:row.id,disposition:'spam',expectedRevision:0};
  expect((await request(b.e,base+'/spam-feedback',action,service)).status).toBe(403);
  await env.BUCKET.put(`mailboxes/${OTHER}.json`,'{}');
  expect((await request(b.e,`/api/v1/mailboxes/${OTHER}/spam-feedback`,action)).status).toBe(404);
  expect((await request(b.e,base+'/spam-feedback',action)).status).toBe(200);
  expect((await request(b.e,base+'/emails/'+row.id)).status).toBe(404);
  expect((await request(b.e,base+'/emails/'+row.id+'?scope=spam')).status).toBe(200);
  expect(await (await request(b.e,base+'/threads/'+row.thread_id)).json()).toEqual([]);
  expect((await request(b.e,base+'/spam-feedback',{...action,disposition:'not_spam',expectedRevision:1})).status).toBe(200);
  expect((await request(b.e,base+'/emails/'+row.id)).status).toBe(200);
  expect((await mailbox(BOX).getSpamState(row.id))?.assessments).toEqual(state?.assessments);
  expect(await query(mailbox(OTHER),'SELECT * FROM sender_preferences')).toEqual([]);
  expect(b.scoreV1).toHaveBeenCalledTimes(1);expect(b.forbidden).not.toHaveBeenCalled();
});
it('off makes zero RPC calls and preserves mail',async()=>{
  await registered();const b=bindings('off'),row=await deliver(b.e);
  expect((await mailbox(BOX).getSpamState(row.id))?.assessments).toEqual([]);
  expect(b.scoreV1).not.toHaveBeenCalled();expect(b.forbidden).not.toHaveBeenCalled();
});
it('missing private binding preserves delivery and unknown status',async()=>{
  await registered();const b=bindings();delete b.e.MAIL_SCORER;const row=await deliver(b.e);
  expect(row.folder_id).toBe('inbox');expect((await mailbox(BOX).getSpamState(row.id))?.assessments[0]).toMatchObject({status:'unavailable',result:null});
  expect(b.forbidden).not.toHaveBeenCalled();
});
it('actual raw persistence failure preserves delivery without logging mailbox identifiers',async()=>{
  await registered();const b=bindings();
  // Deterministic R2 fault: only put fails; registry reads and SQLite are real.
  const put=vi.fn(async()=>{throw new Error('synthetic_storage_failure');});
  b.e.BUCKET=new Proxy(env.BUCKET,{get(target,key){if(key==='put')return put;const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  const logs=vi.spyOn(console,'error').mockImplementation(()=>{});
  try{
    const row=await deliver(b.e);expect(put).toHaveBeenCalledTimes(1);expect(row.raw_key).toBeNull();
    expect(row.folder_id).toBe('inbox');expect(b.scoreV1).toHaveBeenCalledTimes(1);
    expect(logs).toHaveBeenCalled(); // diagnostic remains, content must not
    const leaked=JSON.stringify(logs.mock.calls).includes(BOX);
    expect(leaked,'mailbox identifier must not enter content-free diagnostics').toBe(false);
  }finally{logs.mockRestore();}
});
