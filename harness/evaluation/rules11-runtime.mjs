// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';

/** Build exact archived caller and private scorer into isolated Workers. */
export async function createRuntime(inbox,scorer,dependencies,scorerDependencies=scorer) {
 const require=createRequire(join(dependencies,'package.json'));
 const lock=JSON.parse(await readFile(join(dependencies,'package-lock.json'),'utf8'));
 const miniflarePackage=JSON.parse(await readFile(join(dependencies,'node_modules/miniflare/package.json'),'utf8'));
 assert.equal(miniflarePackage.version,lock.packages['node_modules/miniflare'].version);
 assert.ok(process.env.MINIFLARE_WORKERD_PATH,'workerd_path_required');
 assert.equal(execFileSync(process.env.MINIFLARE_WORKERD_PATH,['--version'],{encoding:'utf8'}).trim(),'workerd 2026-10-21');
 const {Miniflare}=require('miniflare');
 const options={bundle:true,write:false,format:'esm',platform:'browser',target:'es2024',external:['cloudflare:workers'],nodePaths:[join(dependencies,'node_modules'),join(scorerDependencies,'node_modules')]};
 const caller=(await build({...options,entryPoints:[resolve('harness/evaluation/rules11-worker.ts')],alias:{'inbox-intake':join(inbox,'workers/lib/mail-scoring/intake.ts')}})).outputFiles[0].text;
 const core=(await build({...options,entryPoints:[join(scorer,'workers/private/index.ts')]})).outputFiles[0].text;
 let networkAttempts=0;
 const deny=()=>{networkAttempts++;throw new Error('evaluation_network_forbidden');};
 const mf=new Miniflare({workers:[
  {name:'evaluator',modules:true,script:caller,compatibilityDate:'2026-10-21',compatibilityFlags:['nodejs_compat'],serviceBindings:{MAIL_SCORER:'scorer'},outboundService:deny},
  {name:'scorer',modules:true,script:core,compatibilityDate:'2026-10-21',compatibilityFlags:['nodejs_compat'],outboundService:deny},
 ]});
 try {
  const profile=await (await mf.dispatchFetch('http://evaluation.invalid/profile')).json();
  for(const alias of ['windows-1252','latin1','iso-8859-1','ascii'])assert.deepEqual(profile[alias],[0x20ac,0x2026,0x2018,0x2019,0x201c,0x201d,0x2122]);
  const denied=await mf.dispatchFetch('http://evaluation.invalid/network-probe');
  assert.equal(denied.ok,false);assert.equal(networkAttempts,1);networkAttempts=0;
 } catch(error) {await mf.dispose();throw error;}
 return {async classify(raw){const response=await mf.dispatchFetch('http://evaluation.invalid/',{method:'POST',body:raw});if(!response.ok)throw new Error('worker_status_'+response.status);return response.json();},
  async close(){await mf.dispose();},networkAttempts:()=>networkAttempts,
  hashes:{caller:createHash('sha256').update(caller).digest('hex'),scorer:createHash('sha256').update(core).digest('hex'),miniflare:miniflarePackage.version,workerd:'2026-10-21'}};
}
