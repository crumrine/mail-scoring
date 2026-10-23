// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
export async function localConfig(socket=false){
 await mkdir('.artifacts/worker',{recursive:true});
 await build({entryPoints:['tests/rpc/harness.ts'],bundle:true,format:'esm',platform:'browser',target:'es2024',outfile:'.artifacts/worker/harness.js'});
 const worker=(name,file,bindings='')=>`(name = "${name}", worker = (modules = [(name = "index.js", esModule = embed "${file}")], compatibilityDate = "2026-10-21", compatibilityFlags = ["no_nodejs_compat", "no_nodejs_compat_v2"], globalOutbound = "internet" ${bindings}))`;
 const config=`using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (services = [
${worker('scorer','private.js')},
${worker('consumer','consumer.js',', bindings = [(name = "SCORER", service = "scorer"), (name = "SCORING_ENABLED", text = "true")]')},
${worker('off','consumer.js',', bindings = [(name = "SCORER", service = "scorer"), (name = "SCORING_ENABLED", text = "false")]')},
${worker('harness','harness.js',', bindings = [(name = "SCORER", service = "scorer"), (name = "CONSUMER", service = "consumer"), (name = "OFF", service = "off")]')},
${worker('internet','../../workers/scorer/deny.js')}
] ${socket?', sockets = [(name = "http", address = "127.0.0.1:0", http = (), service = "harness")]':''});`;
 await writeFile('.artifacts/worker/local.capnp',config);return '.artifacts/worker/local.capnp';
}
if(process.argv[1]?.endsWith('/worker-local.mjs')){
 const config=await localConfig();
 const run=spawnSync('node_modules/.bin/workerd',['test',config,'harness'],{encoding:'utf8',timeout:60000});
 await writeFile('.artifacts/worker/local.log',run.stdout+run.stderr);
 if(run.status!==0)throw new Error('worker_rpc_test_failed');
 if((run.stdout+run.stderr).includes('PRIVATE_CANARY_877'))throw new Error('content_log_leak');
 await writeFile('.artifacts/worker/local-result.json',JSON.stringify({passed:true,realServiceBinding:true,publicSockets:0,fixtures:'tests/rpc/harness.ts'})+'\n');
 console.log('actual consumer -> scorer workerd RPC tests passed');
}
