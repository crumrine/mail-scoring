// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,symlink,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
import workerd from 'workerd';
const workerdPath=workerd.default;
import {build} from 'esbuild';
import {checkConfig,checkWorkerBundle,scorerModules} from '../../scripts/worker-policy.mjs';
import assert from 'node:assert/strict';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const inbox=resolve(process.env.DEV880_INBOX??join(root,'../inbox'));
const pin='b87650673815a9a7236303457435bb33a0e1d4ac';
const scorer='bb02819e4662e1d680805435dd886e3dc4728906';
const mode=process.argv[2]??'baseline';
assert.ok(['baseline','diagnostic-repair','restored'].includes(mode));
const out=join(root,'.artifacts/dev-880',mode),scratch=join(out,'inbox');
await mkdir(scratch,{recursive:true});
const safeEnv={...process.env,MINIFLARE_WORKERD_PATH:workerdPath,INBOX_LOCAL_ONLY:'1',WRANGLER_SEND_METRICS:'false',CI:'true',XDG_CONFIG_HOME:join(out,'xdg'),WRANGLER_LOG_PATH:join(out,'wrangler.log')};
function command(cmd,args,cwd=root,timeout=120000){const r=spawnSync(cmd,args,{cwd,env:safeEnv,encoding:'utf8',timeout,maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(`${cmd} failed with ${r.status}: ${r.error?.code??''}`);return r.stdout.trim();}
assert.equal(command('git',['rev-parse','HEAD'],inbox),pin);
assert.equal(command('git',['remote','get-url','origin'],inbox),'https://github.com/crumrine/agentic-inbox-imap.git');
assert.equal(command('git',['remote','get-url','origin']),'https://github.com/crumrine/mail-scoring.git');
command('git',['merge-base','--is-ancestor',scorer,'HEAD']);
// Export immutable reviewed source; never change the dependency checkout.
const archive=join(out,'inbox.tar');command('git',['archive','--format=tar',`--output=${archive}`,pin],inbox);
command('tar',['-xf',archive,'-C',scratch]);
try{await stat(join(scratch,'node_modules'));}catch{await symlink(join(inbox,'node_modules'),join(scratch,'node_modules'),'dir');}
await copyFile(join(root,'harness/dev-880/vitest.config.ts'),join(scratch,'vitest.dev880.config.ts'));
await copyFile(join(root,'harness/dev-880/joined.test.ts'),join(scratch,'test/dev880.test.ts'));
const scorerScratch=join(out,'scorer');await mkdir(scorerScratch,{recursive:true});
const scorerArchive=join(out,'scorer.tar');command('git',['archive','--format=tar',`--output=${scorerArchive}`,scorer]);
command('tar',['-xf',scorerArchive,'-C',scorerScratch]);
checkConfig(JSON.parse(await readFile(join(scorerScratch,'workers/private/wrangler.json'),'utf8')));
const bundle=await build({absWorkingDir:scorerScratch,entryPoints:['workers/private/index.ts'],bundle:true,format:'esm',platform:'browser',target:'es2024',external:['cloudflare:workers'],metafile:true,write:false,minify:true});
checkWorkerBundle(bundle.outputFiles[0].text,bundle.metafile,scorerModules);
await writeFile(join(scratch,'dev880-scorer.js'),bundle.outputFiles[0].text);
await writeFile(join(out,'scorer-metafile.json'),JSON.stringify(bundle.metafile,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['workers/app.ts','workers/index.ts','workers/lib/raw-mime.ts','workers/lib/mail-scoring/intake.ts','workers/durableObject/index.ts','package-lock.json'];
const hashes={};for(const f of sourceFiles){const content=await readFile(join(scratch,f));assert.equal(hash(content),hash(await readFile(join(inbox,f))));hashes[f]=hash(content);}
if(mode==='diagnostic-repair'){
  // A bounded repair experiment only; NOT the reviewed dependency or a release.
  const file=join(scratch,'workers/lib/raw-mime.ts');let source=await readFile(file,'utf8');
  const before='console.error(`Failed to store raw MIME at ${key}:`, (e as Error).message);';
  assert.equal(source.split(before).length,2);source=source.replace(before,'console.error("raw_mime_storage_failed");');await writeFile(file,source);
}
const started=performance.now();
const result=spawnSync(join(inbox,'node_modules/.bin/vitest'),['run','--config','vitest.dev880.config.ts','--reporter=json',`--outputFile=${join(out,'vitest.json')}`],{cwd:scratch,env:safeEnv,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
await writeFile(join(out,'runner.log'),(result.stdout??'')+(result.stderr??''));
let tests=null;try{const report=JSON.parse(await readFile(join(out,'vitest.json'),'utf8'));tests={total:report.numTotalTests,passed:report.numPassedTests,failed:report.numFailedTests,success:report.success,
  assertions:report.testResults.flatMap(t=>t.assertionResults.map(a=>({title:a.fullName,status:a.status,durationMs:a.duration,failure:a.failureMessages.map(m=>m.replace(/\u001b\[[0-9;]*m/g,''))})))};}catch{}
const versions={};for(const f of ['package.json','node_modules/vitest/package.json','node_modules/@cloudflare/vitest-pool-workers/package.json','node_modules/@cloudflare/vitest-pool-workers/node_modules/workerd/package.json','node_modules/postal-mime/package.json']){try{const p=JSON.parse(await readFile(join(inbox,f),'utf8'));versions[p.name]=p.version??'private';}catch{}}
const receipt={mode,workerdBinarySha256:hash(await readFile(workerdPath)),workerdVersion:command(workerdPath,['--version']),inbox:{repository:'https://github.com/crumrine/agentic-inbox-imap',pin,sourceHashes:hashes,overlay:mode==='diagnostic-repair'?'static storage diagnostic only':null},scorer:{repository:'https://github.com/crumrine/mail-scoring',pin:scorer,bundleSha256:hash(await readFile(join(scratch,'dev880-scorer.js')))},
  harnessHashes:Object.fromEntries(await Promise.all(['run.mjs','vitest.config.ts','joined.test.ts'].map(async f=>[f,hash(await readFile(join(root,'harness/dev-880',f)))]))),
  command:'node harness/dev-880/run.mjs '+mode,node:process.version,npm:command('npm',['--version']),os:os.platform()+' '+os.release()+' '+os.arch(),cpu:os.cpus()[0]?.model,versions,
  remoteBindings:false,fixtureProvenance:'Original authored synthetic .test identities and text, Apache-2.0; no attachments or private mail',elapsedMs:performance.now()-started,exitCode:result.status,signal:result.signal,error:result.error?.code??null,tests};
await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({mode,exitCode:receipt.exitCode,tests:tests&&{total:tests.total,passed:tests.passed,failed:tests.failed},receipt:join(out,'receipt.json')}));
process.exitCode=result.status??1;
