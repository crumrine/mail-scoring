// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Known first-failure CORE regressions only. Not independent evaluation or caller routing acceptance.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {resolve,join} from 'node:path';import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {MIME_RUNTIME} from '../harness/evaluation/mime-runtime.mjs';
import {readBounded,sha256} from '../harness/evaluation/files.mjs';
const [root,inbox,previousReport,output]=process.argv.slice(2);
const reportBytes=await readBounded(previousReport,16*1024*1024);
assert.equal(sha256(reportBytes),'d2e79f93f380b2cfb775defdf7ba3ea91027ad95682fa9ad9f17a765d98e927f');
const report=JSON.parse(reportBytes);
const manifestBytes=await readBounded(join(root,'partitions.json'),4*1024*1024);
assert.equal(sha256(manifestBytes),'111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803');
const records=new Map(JSON.parse(manifestBytes).records.map(r=>[r.id,r]));
const previous=report.variants.candidate.rows.filter(r=>r.label==='ham'&&r.quarantined);assert.equal(previous.length,3);
const PostalMime=createRequire(resolve(inbox,'package.json'))('postal-mime');
const temp=await mkdtemp('/tmp/context-regression-');
let fetches=0;const fetch=globalThis.fetch;globalThis.fetch=()=>{fetches++;throw Error('offline_only');};
try{
 const entry=join(temp,'pipeline.mjs');
 await build({stdin:{contents:`export {scoreRpc} from ${JSON.stringify(resolve('workers/private/adapter.ts'))};export {decodeResponse} from ${JSON.stringify(resolve('workers/private/protocol.ts'))};export {project} from ${JSON.stringify(resolve(inbox,'workers/lib/mail-scoring/intake.ts'))};`,loader:'ts',resolveDir:process.cwd()},outfile:entry,bundle:true,platform:'node',format:'esm'});
 const {scoreRpc,project,decodeResponse}=await import(pathToFileURL(entry));const rows=[];
 for(const row of previous){
  const record=records.get(row.id);assert.ok(record);assert.equal(record.path,'messages/'+record.id+'.eml');
  const raw=await readBounded(join(root,record.path),record.bytes);assert.equal(raw.length,record.bytes);assert.equal(sha256(raw),row.id);
  const input=project(await PostalMime.parse(raw));input.preferences={senderAllowed:false,senderBlocked:false};
  const wire=scoreRpc('1',new TextEncoder().encode(JSON.stringify(input)),JSON.stringify({transportVerified:false,preferencesVerified:true}));
  const value=decodeResponse(wire);assert.ok(value?.ok);
  rows.push({id:row.id,partition:row.partition,status:value.result.status,score:value.result.heuristicScore,reasons:value.result.reasons.map(r=>r.id),statistical:value.result.reasons.some(r=>r.id==='statistical_refit_spam')});
 }
 const result={scope:'Observed first-failure CORE regressions only, not fresh heldout or actual caller routing',source:execFileSync('git',['rev-parse','HEAD']).toString().trim(),runtime:MIME_RUNTIME,callerProjectionSha256:sha256(await readFile(resolve(inbox,'workers/lib/mail-scoring/intake.ts'))),callerProjectionRepoHead:execFileSync('git',['-C',inbox,'rev-parse','HEAD']).toString().trim(),firstReportSha256:sha256(reportBytes),fetches,rows};
 await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 assert.equal(fetches,0);assert.equal(rows.filter(r=>r.statistical).length,0,'known legitimate core false positives remain');
}finally{globalThis.fetch=fetch;await rm(temp,{recursive:true,force:true});}
