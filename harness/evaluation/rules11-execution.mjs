// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,link,lstat} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {readBounded,sha256} from './files.mjs';
import {verifyPrior} from './rules11-prior.mjs';
import './mime-runtime.mjs';

assert.equal(process.argv.length,13,'INBOX SA ENRON FIRST SECOND THIRD FOURTH FIFTH KITCHEN GP OUTPUT');
const [inbox,sa,enron,first,second,third,fourth,fifth,kitchen,gp,outArg]=process.argv.slice(2).map(path=>resolve(path));
const out=outArg;
for(let dir=out;;dir=dirname(dir)){assert(!existsSync(join(dir,'.git')),'output_must_be_outside_git');if(dirname(dir)===dir)break;}
assert(!existsSync(out),'output_must_be_new');
const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
assert.equal(git(process.cwd(),'status','--porcelain','--untracked-files=no'),'','evaluator_source_must_be_committed');
const scorerHead=git(process.cwd(),'rev-parse','HEAD');
assert.equal(execFileSync(createRequire(join(process.cwd(),'package.json'))('workerd').default,['--version'],{encoding:'utf8'}).trim(),'workerd 2026-10-21');
assert.equal(git(inbox,'remote','get-url','origin').replace(/\.git$/,''),'https://github.com/crumrine/agentic-inbox-imap');
const runner=resolve('harness/evaluation/rules11-run.mjs');
const runnerSha256=sha256(await readFile(runner));
const controls=JSON.parse(await readBounded('harness/evaluation/replacement-legitimate-controls.json',1024*1024));
const authoredIds=controls.records.flatMap(r=>['plain','html'].map(type=>'legitimate_'+r.id+'_'+type));
const manifest=await readBounded('harness/evaluation/recall-sixth-holdout-manifest.json',4*1024*1024);
assert.equal(sha256(manifest),'33b743705fa31b3b41701ce0d28f4cfec0a5c1d58c184066e26d541c73609e5a');
const records=JSON.parse(manifest).records;assert.equal(records.length,2000);
const workerd=createRequire(join(process.cwd(),'package.json'))('workerd').default;
const env={...process.env,MINIFLARE_WORKERD_PATH:workerd,WRANGLER_SEND_METRICS:'false',INBOX_LOCAL_ONLY:'1',RULES11_PRIOR_DIR:out};
await mkdir(out,{recursive:false});
const modes=['sa','enron','first','second','third','fourth','fifth'];
const inputs=[sa,enron,first,second,third,fourth,fifth];
const receipts=[];
async function execute(mode,input) {
 const target=join(out,'replacement-'+mode),startedAt=new Date().toISOString();
 const result=spawnSync(process.execPath,[runner,'--replacement-'+mode,input,inbox,process.cwd(),target],{env,encoding:'utf8',timeout:300000,maxBuffer:1024*1024});
 await writeFile(join(out,mode+'.log'),(result.stdout??'')+(result.stderr??''),{flag:'wx'});
 const reportPath=join(target,'report.json');
 if(!existsSync(reportPath))throw new Error('report_missing_'+mode+': '+(result.error?.message??result.status));
 const bytes=await readBounded(reportPath,32*1024*1024),report=JSON.parse(bytes);
 const item={mode,startedAt,completedAt:new Date().toISOString(),exitCode:result.status,runnerSha256,sourceHead:scorerHead,reportSha256:sha256(bytes),candidate:report.generalGate.candidate,baseline:report.generalGate.baseline,regressionGatePassed:report.release.regressionGatePassed};
 receipts.push(item);await writeFile(join(out,'execution.json'),JSON.stringify(receipts,null,2)+'\n');
 if(result.status!==0||!item.regressionGatePassed)throw new Error('acceptance_failed_'+mode);
 return report;
}
for(let i=0;i<modes.length;i++)await execute(modes[i],inputs[i]);
await verifyPrior(out,runnerSha256,authoredIds,scorerHead);
await writeFile(join(out,'before-sixth-predictions.json'),JSON.stringify({at:new Date().toISOString(),scorerHead,runnerSha256,manifestSha256:sha256(manifest),observedRegressions:receipts},null,2)+'\n',{flag:'wx'});
const materialized=join(out,'sixth-input');await mkdir(join(materialized,'messages'),{recursive:true});
for(const row of records){
 const root=row.label==='ham'?kitchen:gp;
 assert(!(await lstat(root)).isSymbolicLink());assert(!(await lstat(join(root,'messages'))).isSymbolicLink());
 const source=join(root,row.path);const raw=await readBounded(source,row.bytes);
 assert.equal(raw.length,row.bytes);assert.equal(sha256(raw),row.id);
 await link(source,join(materialized,row.path));
}
const result=await execute('sixth',materialized);
assert.equal(result.independentHoldout,true);assert.equal(result.release.eligible,true);
await writeFile(join(out,'acceptance.json'),JSON.stringify({eligible:true,scorerHead,runnerSha256,manifestSha256:sha256(manifest),minimumFreshRecall:0.5,minimumAbsoluteFreshGain:0.2,zeroCandidateLegitimateCatches:true,studyReceipts:receipts},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({eligible:true,baseline:result.generalGate.baseline,candidate:result.generalGate.candidate}));
