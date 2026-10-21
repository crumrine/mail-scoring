// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {build} from 'esbuild';
import {resolve,relative} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {checkConfig,checkWorkerBundle,scorerModules,consumerModules} from './worker-policy.mjs';
await mkdir('.artifacts/worker',{recursive:true});
const evidence={};
for(const [role,allowed] of [['private',scorerModules],['consumer',consumerModules]]) {
 const config=JSON.parse(await readFile(`workers/${role}/wrangler.json`,'utf8'));checkConfig(config,role==='consumer');
 const r=await build({entryPoints:[`workers/${role}/index.ts`],bundle:true,format:'esm',platform:'browser',target:'es2024',external:['cloudflare:workers'],metafile:true,write:false,minify:true});
 const code=r.outputFiles[0].text;checkWorkerBundle(code,r.metafile,allowed);
 await writeFile(`.artifacts/worker/${role}.js`,code);await writeFile(`.artifacts/worker/${role}-meta.json`,JSON.stringify(r.metafile,null,2));
 evidence[role]={bytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).length,modules:Object.keys(r.metafile.inputs)};
 const run=spawnSync('node_modules/.bin/wrangler',['deploy','--dry-run','--config',`workers/${role}/wrangler.json`,'--outdir',resolve(`.artifacts/worker/dry-${role}`),'--metafile',`.artifacts/worker/dry-${role}-meta.json`],{encoding:'utf8',timeout:60000,env:{...process.env,WRANGLER_SEND_METRICS:'false',CI:'true',XDG_CONFIG_HOME:resolve('.artifacts/worker/xdg'),WRANGLER_LOG_PATH:resolve('.artifacts/worker/wrangler.log')}});
 await writeFile(`.artifacts/worker/dry-${role}.log`,run.stdout+run.stderr);
 if(run.status!==0)throw new Error(`dry_run_${role}_failed`);
 const dry=await readFile(`.artifacts/worker/dry-${role}/index.js`,'utf8');
 const meta=JSON.parse(await readFile(`.artifacts/worker/dry-${role}-meta.json`,'utf8'));
 // Wrangler resolves paths relative to its config directory; normalize before allowlist comparison.
 meta.inputs=Object.fromEntries(Object.entries(meta.inputs).map(([p,v])=>[relative(process.cwd(),resolve(`workers/${role}`,p)),v]));
 checkWorkerBundle(dry,meta,allowed);
 evidence[role].dryRunBytes=Buffer.byteLength(dry);evidence[role].dryRunGzipBytes=gzipSync(dry).length;
 // Exercise exactly Wrangler's checked dry-run output in workerd and benchmarks.
 await writeFile(`.artifacts/worker/${role}.js`,dry);
}
await writeFile('.artifacts/worker/build.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
