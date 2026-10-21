// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {checkConfig,checkWorkerBundle} from './worker-policy.mjs';
const evidence=[];
const productionBundle=await readFile('.artifacts/worker/private.js');
let activeName='';
async function bundle(){const r=await build({entryPoints:['workers/private/index.ts'],bundle:true,format:'esm',platform:'browser',target:'es2024',external:['cloudflare:workers'],metafile:true,write:false,minify:true});checkWorkerBundle(r.outputFiles[0].text,r.metafile);return r.outputFiles[0].text;}
async function mutation(name,path,change,check){
 activeName=name;const original=await readFile(path,'utf8');let caught=false,failure='';
 try{const changed=change(original);assert.notEqual(changed,original);await writeFile(path,changed);try{await check();}catch(e){caught=true;failure=e.message;}assert.ok(caught,'mutation survived: '+name);}
 finally{await writeFile(path,original);}
 await check();evidence.push({name,caught,restored:true,failure});
}
for(const [name,injection] of [['outbound_fetch',"void fetch('https://example.invalid/');"],['content_log',"console.log(bytes);"],['retained_content',"globalThis.retained=bytes;"]]){
 await mutation(name,'workers/private/index.ts',s=>s.replace('return scoreRpc(version,bytes,context);',injection+'return scoreRpc(version,bytes,context);'),bundle);
}
await mutation('resource_binding','workers/private/wrangler.json',s=>JSON.stringify({...JSON.parse(s),kv_namespaces:[{binding:'MAILBOX',id:'synthetic'}]}),async()=>checkConfig(JSON.parse(await readFile('workers/private/wrangler.json','utf8'))));
const run=(name,args)=>{const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:60000});if(r.status!==0){writeFileSync(`.artifacts/worker/mutation-${activeName}.log`,r.stdout+r.stderr);throw new Error(name+' targeted check failed');}};
await mutation('response_size','workers/private/protocol.ts',s=>s.replace('RPC_OUTPUT_BYTES = 4096','RPC_OUTPUT_BYTES = 8192'),()=>run('response_size',['--test','tests/rpc.test.ts']));
await mutation('exception_sanitizer','workers/private/adapter.ts',s=>s.replace("catch{return failure('internal_failure');}","catch{return 'PRIVATE_CANARY_877';}"),()=>run('exception_sanitizer',['--test','tests/rpc.test.ts']));
const local=async()=>{await writeFile('.artifacts/worker/private.js',await bundle());run('local',['scripts/worker-local.mjs']);};
await mutation('request_bytes','packages/core/src/contract.ts',s=>s.replace('requestBytes: 262144','requestBytes: 262145'),local);
await mutation('json_depth','packages/core/src/contract.ts',s=>s.replace('jsonDepth: 6','jsonDepth: 7'),local);
await writeFile('.artifacts/worker/private.js',productionBundle);run('production_restored',['scripts/worker-local.mjs']);
await writeFile('.artifacts/worker/mutations.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
