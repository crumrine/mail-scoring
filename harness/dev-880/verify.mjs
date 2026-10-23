// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Serial reproduction; no provider, deployment, send or model commands.
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile,copyFile,symlink,mkdtemp,rm,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),inbox=resolve(process.env.DEV880_INBOX??'../inbox');
const out=join(root,'.artifacts/dev-880/refresh');
await mkdir(out,{recursive:true});
const pin='df4e70e65e91117ad8050b13a3a78e912d51c920',scorer='bb02819e4662e1d680805435dd886e3dc4728906';
const env={...process.env,DEV880_INBOX:inbox,INBOX_LOCAL_ONLY:'1',WRANGLER_SEND_METRICS:'false',CI:'true'};
const resumeAt=process.argv[2];
const previous=resumeAt?JSON.parse(await readFile(join(out,'commands.json'),'utf8')):[];
const records=[];
let skipping=!!resumeAt;
function git(args,cwd=root){const r=spawnSync('git',args,{cwd,env,encoding:'utf8'});assert.equal(r.status,0,'git preparation failed');return r.stdout.trim();}
assert.equal(git(['rev-parse','HEAD'],inbox),pin);
assert.equal(git(['status','--porcelain'],inbox),'','dependency checkout must be clean');
async function run(name,args,cwd=root,{expected=0,pattern,timeout=600000}={}){
  if(skipping&&name!==resumeAt){const old=previous.find(r=>r.name===name);assert.equal(old?.passed,true,'cannot skip unverified command '+name);records.push(old);return;}
  skipping=false;
  const start=performance.now(),r=spawnSync(args[0],args.slice(1),{cwd,env,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  const log=(r.stdout??'')+(r.stderr??'');
  await writeFile(join(out,name+'.log'),log.trimEnd()+'\n');
  const passed=r.status===expected&&(!pattern||pattern.test(log));
  records.push({name,command:args,cwd,exitCode:r.status,expectedExitCode:expected,signal:r.signal,error:r.error?.code??null,elapsedMs:performance.now()-start,passed});
  await writeFile(join(out,'commands.json'),JSON.stringify(records,null,2)+'\n');
  console.log(JSON.stringify({name,passed,exitCode:r.status}));
  assert.ok(passed,name+' failed; inspect retained log before retrying');
  return log;
}
await run('scorer-install',['npm','ci','--ignore-scripts','--no-audit','--no-fund']);
await run('inbox-install',['npm','ci','--ignore-scripts','--no-audit','--no-fund'],inbox);
await run('scorer-check',['npm','run','check']);
await run('scorer-sbom',['npm','run','sbom']);
await run('scorer-schemas',['node','scripts/schemas.mjs']);
await run('worker-benchmark',['npm','run','worker:benchmark']);
await run('core-benchmark',['npm','run','benchmark']);
await run('scorer-identity',['node','scripts/receipt.mjs']);
await copyFile('.artifacts/receipt.json',join(out,'scorer-receipt.json'));
await run('joined',['node','harness/dev-880/run.mjs','verified']);
await run('browser',['node','harness/dev-880/browser.mjs']);
await run('audit',['node','harness/dev-880/audit.mjs']);
await run('parser-growth',['node','harness/dev-880/parser-growth.mjs']);
await run('inbox-typecheck',['npm','run','typecheck'],inbox);
await run('inbox-tests',['npm','test','--','--maxWorkers=1','--testTimeout=30000','--hookTimeout=30000'],inbox);
const scratch=await mkdtemp(join(out,'mutations-')),scorerTree=join(scratch,'scorer'),target=join(scratch,'inbox');
await mkdir(target);
const archive=join(scratch,'inbox.tar');git(['archive','--format=tar','--output='+archive,pin],inbox);
const tar=spawnSync('tar',['-xf',archive,'-C',target]);assert.equal(tar.status,0);
await symlink(join(inbox,'node_modules'),join(target,'node_modules'),'dir');
await copyFile(join(inbox,'worker-configuration.d.ts'),join(target,'worker-configuration.d.ts'));
git(['worktree','add','--detach',scorerTree,scorer]);
try {
  await run('contract',['node','scripts/check-scoring-contract.mjs',scorerTree],target);
  await run('inbox-scoring-mutations',['node','scripts/scoring-mutations.mjs','--workerd'],target);
  await run('inbox-quarantine-mutations',['node','scripts/quarantine-mutations.mjs'],target);
  for(const [src,dst] of [['dev-878/contract.json','contract.json'],['dev-878/mutations.json','inbox-scoring-mutations.json'],['dev-879/mutations.json','inbox-quarantine-mutations.json']])await copyFile(join(target,'docs/evidence',src),join(out,dst));
  for(const dir of ['dev-878','dev-879'])for(const name of await readdir(join(target,'docs/evidence',dir))) {
    if(/^mut(ation|ant)-.*\.log$/.test(name))await copyFile(join(target,'docs/evidence',dir,name),join(out,dir+'-'+name));
  }
  // Restore original diagnostic implementations only in the disposable tree.
  for(const file of ['workers/app.ts','workers/index.ts','workers/lib/raw-mime.ts'])await writeFile(join(target,file),git(['show','b87650673815a9a7236303457435bb33a0e1d4ac:'+file],inbox)+'\n');
  await run('diagnostics-negative',['node',join(inbox,'node_modules/vitest/vitest.mjs'),'run','test/inbound-diagnostics.test.ts','--maxWorkers=1','--testTimeout=30000','--hookTimeout=30000'],target,{expected:1,pattern:/(?=[\s\S]*8 failed)(?=[\s\S]*AssertionError)/,timeout:240000});
  await writeFile(join(out,'diagnostics-negative.json'),JSON.stringify({source:pin,restoredCatchesFrom:'b87650673815a9a7236303457435bb33a0e1d4ac',exit:1,failedCases:8,assertionFailures:true},null,2)+'\n');
} finally {
  git(['worktree','remove','--force',scorerTree]);
  await rm(scratch,{recursive:true,force:true});
}
assert.equal(git(['status','--porcelain'],inbox),'','dependency source changed during validation');
// Report reads the completed command ledger; it does not include itself in that ledger.
const report=spawnSync('node',['harness/dev-880/report.mjs'],{cwd:root,env,stdio:'inherit'});
assert.equal(report.status,0,'report generation failed');
