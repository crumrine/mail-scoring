// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {inspectBundle} from './bundle-policy.mjs';
await mkdir('.artifacts',{recursive:true});
const result=await build({entryPoints:['packages/core/src/index.ts'],bundle:true,format:'esm',platform:'browser',target:'es2024',metafile:true,write:false,minify:true});
const code=result.outputFiles[0].text;
inspectBundle(code,result.metafile,[
  'packages/core/src/index.ts','packages/core/src/contract.ts','packages/core/src/guards.ts','packages/core/src/vendor/authentication-failed.ts'
]);
await writeFile('.artifacts/core.js',code);
await writeFile('.artifacts/core-meta.json',JSON.stringify(result.metafile,null,2)+'\n');
await build({entryPoints:['workers/scorer/spike.ts'],bundle:true,format:'esm',platform:'browser',target:'es2024',outfile:'.artifacts/spike.js'});
const started=performance.now();
const run=spawnSync('node_modules/.bin/workerd',['test','workers/scorer/workerd.capnp','scorer'],{encoding:'utf8',timeout:30000});
await writeFile('.artifacts/workerd.log',run.stdout+run.stderr);
if(run.status!==0) { console.error('workerd spike failed; see .artifacts/workerd.log'); process.exit(1); }
// Test that node DNS/filesystem/native modules cannot even initialize in this configuration.
for(const specifier of ['node:dns','node:fs','node:child_process']) {
  await writeFile('.artifacts/probe.js',`import * as x from '${specifier}'; export default {test(){if(!x) throw new Error('probe');}};`);
  const config=(await readFile('workers/scorer/workerd.capnp','utf8')).replace('../../.artifacts/spike.js','../../.artifacts/probe.js');
  // Keep relative includes rooted in workers/scorer by passing a config located there.
  const path='workers/scorer/.probe.capnp';
  await writeFile(path,config);
  try {
    const p=spawnSync('node_modules/.bin/workerd',['test',path,'scorer'],{encoding:'utf8',timeout:30000});
    if(p.status===0 || !/No such module|not found|No such built-in module/i.test(p.stderr+p.stdout)) throw new Error('native_capability_probe_failed');
  } finally { const {unlink}=await import('node:fs/promises'); await unlink(path); }
}
// Initialization must not initiate I/O either. No hostname reaches a resolver.
await writeFile('.artifacts/probe.js',`const pending=fetch('https://example.invalid/'); export default {async test(){await pending;}};`);
const initConfig=(await readFile('workers/scorer/workerd.capnp','utf8')).replace('../../.artifacts/spike.js','../../.artifacts/probe.js');
await writeFile('workers/scorer/.probe.capnp',initConfig);
try {
  const probe=spawnSync('node_modules/.bin/workerd',['test','workers/scorer/.probe.capnp','scorer'],{encoding:'utf8',timeout:30000});
  if(probe.status===0 || !/outside.*(?:handler|context)|global scope|network_disabled/is.test(probe.stderr+probe.stdout)) throw new Error('initialization_io_probe_failed');
} finally {const {unlink}=await import('node:fs/promises');await unlink('workers/scorer/.probe.capnp');}
const evidence={workerd:'passed',coreBundleBytes:Buffer.byteLength(code),runtimeImports:0,nativeInitializationProbes:3,hostProcessAndProbesMs:performance.now()-started};
await writeFile('.artifacts/workerd-result.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
