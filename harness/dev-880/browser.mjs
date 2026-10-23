// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Local actual-SPA -> production JWT/API -> SQLite -> private scorer bridge.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import workerd from 'workerd';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),inbox=resolve(process.env.DEV880_INBOX??'../inbox');
const pin='43889e5c0ba7fd43090e830fbeac048a9551ffc8';
assert.equal(spawnSync('git',['rev-parse','HEAD'],{cwd:inbox,encoding:'utf8'}).stdout.trim(),pin);
const req=createRequire(join(inbox,'package.json'));
const load=name=>import(pathToFileURL(req.resolve(name)).href);
process.env.MINIFLARE_WORKERD_PATH=workerd.default;
const {Miniflare}=await load('miniflare'),{createServer}=await load('vite');
const playwright=await load('playwright');const chromium=playwright.chromium??playwright.default.chromium;
const {generateKeyPair,exportJWK,SignJWT}=await load('jose');
const out=join(root,'.artifacts/dev-880/browser');await mkdir(out,{recursive:true});
const keys=await generateKeyPair('RS256',{extractable:true});
const jwks=JSON.stringify({keys:[{...await exportJWK(keys.publicKey),kid:'synthetic',alg:'RS256'}]});
const token=await new SignJWT({email:'operator@inbox.test'}).setProtectedHeader({alg:'RS256',kid:'synthetic'})
 .setIssuer('https://access.test').setAudience('synthetic').setExpirationTime('1h').sign(keys.privateKey);
let blockedOutbound=0;
const hostile='<script>window.previewExecuted=1</script><img src="https://tracker.invalid/pixel"><form action="https://tracker.invalid"><input></form>';
const wrapper=`import worker from './workers/app.ts'; export {MailboxDO,ImapAuthRateLimitDO} from './workers/app.ts';
let calls=0,forbidden=0; const box='ui@example.test';
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);const e={...env,EMAIL:{send(){forbidden++;throw new Error('forbidden_send');}},AI:{run(){forbidden++;throw new Error('forbidden_ai');}},EMAIL_AGENT:{idFromName(){forbidden++;throw new Error('forbidden_agent');}},MAIL_SCORER:{scoreV1(...args){calls++;return env.MAIL_SCORER.scoreV1(...args);}}};
 const stub=env.MAILBOX.get(env.MAILBOX.idFromName(box));
 if(url.pathname==='/_test/seed'){
  const existing=await stub.getEmails({folder:'inbox'});for(const row of existing)await stub.deleteEmail(row.id);
  const spam=await stub.getEmails({folder:'spam'});for(const row of spam)await stub.deleteEmail(row.id);
  await env.BUCKET.put('mailboxes/'+box+'.json','{}');
  const raw=new TextEncoder().encode('From: sender@sender.test\\r\\nTo: '+box+'\\r\\nSubject: Joined suspicious message\\r\\nMIME-Version: 1.0\\r\\nContent-Type: text/html; charset=utf-8\\r\\n\\r\\n'+${JSON.stringify(hostile)});
  await worker.email({raw:new ReadableStream({start(c){c.enqueue(raw);c.close();}}),rawSize:raw.length,to:box,from:'sender@sender.test',setReject(){throw new Error('unexpected_rejection');}},e,ctx);
  const rows=await stub.getEmails({folder:'inbox'});const row=rows[0];if(!row)throw new Error('missing_seed');
  await stub.moveEmail(row.id,'spam');return Response.json({id:row.id,calls,forbidden});
 }
 if(url.pathname==='/_test/stats')return Response.json({calls,forbidden});
 return worker.fetch(request,e,ctx);
}};`;
const bundle=await build({stdin:{contents:wrapper,resolveDir:inbox,sourcefile:'dev880-browser-entry.ts',loader:'ts'},
 bundle:true,format:'esm',platform:'browser',target:'es2024',write:false,external:['cloudflare:*'],
 define:{'import.meta.env.DEV':'false','import.meta.env.MODE':'"production"'},
 plugins:[{name:'unrelated-surfaces',setup(b){
  b.onResolve({filter:/^(agents|virtual:react-router\/server-build)$/},a=>({path:a.path,namespace:'inert'}));
  b.onResolve({filter:/^react-router$/},a=>a.importer.endsWith('/workers/app.ts')?{path:'ssr-router',namespace:'inert'}:null);
  b.onResolve({filter:/^\.\/(agent|mcp)$/},a=>a.importer.endsWith('/workers/app.ts')?{path:a.path,namespace:'inert'}:null);
  b.onLoad({filter:/.*/,namespace:'inert'},a=>({contents:a.path==='ssr-router'?"export const createRequestHandler=()=>()=>new Response('forbidden_ssr',{status:500});":a.path==='agents'?"export function routeAgentRequest(){throw new Error('forbidden_agent');}":a.path==='./agent'?"export class EmailAgent {}":a.path==='./mcp'?"export const EmailMCP={serve(){return {fetch(){throw new Error('forbidden_mcp');}}}}":"export const routes={}; export const assets={}; export const entry={}; export const basename='/';",loader:'js'}));
 }}]});
await writeFile(join(out,'inbox-bundle.js'),bundle.outputFiles[0].text);
const mf=new Miniflare({host:'127.0.0.1',port:0,workers:[
 {name:'inbox',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-21',compatibilityFlags:['nodejs_compat'],
  bindings:{DOMAINS:'example.test',EMAIL_ADDRESSES:[],MAIL_SCORING_MODE:'shadow',POLICY_AUD:'synthetic',TEAM_DOMAIN:'https://access.test'},
  r2Buckets:['BUCKET'],durableObjects:{MAILBOX:{className:'MailboxDO',useSQLite:true},IMAP_AUTH_RATE_LIMIT:{className:'ImapAuthRateLimitDO',useSQLite:true}},
  serviceBindings:{MAIL_SCORER:'scorer'},outboundService:r=>{if(r.url==='https://access.test/cdn-cgi/access/certs')return new Response(jwks,{headers:{'content-type':'application/json'}});blockedOutbound++;throw new Error('forbidden_outbound');}},
 {name:'scorer',modules:true,script:await readFile(join(root,'.artifacts/worker/private.js'),'utf8'),compatibilityDate:'2026-10-21',outboundService:()=>{blockedOutbound++;throw new Error('forbidden_scorer_outbound');}},
]});
let vite,browser;
const serverErrors=[];
try{
 await mf.ready;
 vite=await createServer({configFile:join(inbox,'test/browser/vite.config.mjs'),plugins:[{name:'actual-api-bridge',configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/api/'))return next();
   try{
    const body=[];for await(const chunk of req)body.push(chunk);
    const headers=new Headers(req.headers);headers.set('cf-access-jwt-assertion',token);
    const r=await mf.dispatchFetch('http://127.0.0.1:5189'+req.url,{method:req.method,headers,
      ...(body.length?{body:Buffer.concat(body)}:{})});
    res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await r.arrayBuffer()));
   }catch{serverErrors.push('api_bridge_failure');res.statusCode=500;res.end();}
  });
 }}]});await vite.listen();
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const results=[];
 for(const width of [1440,390]){
  const seed=await mf.dispatchFetch('http://local/_test/seed');assert.equal(seed.status,200);const seeded=await seed.json();
  const before=await (await mf.dispatchFetch('http://local/_test/stats')).json();
  const page=await browser.newPage({viewport:{width,height:1000}}),network=[],errors=[];
  page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:5189'){network.push('external_request');return route.abort();}return route.continue();});
  await page.goto('http://127.0.0.1:5189',{waitUntil:'domcontentloaded'});
  await page.getByText('Joined suspicious message',{exact:true}).click();
  await page.getByRole('region',{name:'Safe Spam preview'}).waitFor();
  assert.equal(await page.locator('section[aria-label="Safe Spam preview"] img,section[aria-label="Safe Spam preview"] script,iframe').count(),0);
  assert.equal(await page.evaluate(()=>window.previewExecuted),undefined);
  await page.screenshot({path:join(out,'joined-spam-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Always block sender',exact:true}).click();
  await page.getByText('Sender preference: block.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Clear sender preference',exact:true}).click();
  await page.getByText('Sender preference: none.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Not spam — move to Inbox',exact:true}).click();
  await page.getByText('No spam',{exact:true}).waitFor();
  const after=await (await mf.dispatchFetch('http://local/_test/stats')).json();
  assert.equal(after.calls,before.calls);assert.equal(after.forbidden,0);
  const headers={'cf-access-jwt-assertion':token};
  const r=await mf.dispatchFetch('http://127.0.0.1:5189/api/v1/mailboxes/ui@example.test/emails/'+seeded.id,{headers});assert.equal(r.status,200);
  const state=await mf.dispatchFetch('http://127.0.0.1:5189/api/v1/mailboxes/ui@example.test/emails/'+seeded.id+'/spam',{headers});
  assert.equal((await state.json()).disposition,'not_spam');
  assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
  results.push({width,inertPreview:true,realFeedback:true,realRescue:true,readRescoreCalls:after.calls-before.calls,forbiddenCalls:after.forbidden,externalRequests:network.length,pageErrors:errors});
  await page.close();
 }
 assert.deepEqual(serverErrors,[]);assert.equal(blockedOutbound,0);
 await writeFile(join(out,'result.json'),JSON.stringify({inbox:pin,scorer:'bb02819e4662e1d680805435dd886e3dc4728906',browser:browser.version(),results,blockedOutbound,serverErrors},null,2)+'\n');
 console.log(JSON.stringify({browserJoined:'passed',viewports:results.length}));
}finally{await browser?.close();await vite?.close();await mf.dispose();}
