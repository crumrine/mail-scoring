// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Development/validation only. Independent holdout scoring belongs to DEV-999.
import assert from 'node:assert/strict';
import {MIME_RUNTIME} from '../harness/evaluation/mime-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {readBounded,sha256} from '../harness/evaluation/files.mjs';
const [root,inbox]=process.argv.slice(2);
const require=createRequire(resolve(inbox,'package.json'));const PostalMime=require('postal-mime');
const frozen=await readBounded(join(root,'partitions.json'),4*1024*1024);assert.equal(sha256(frozen),'111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803');
const manifest=JSON.parse(frozen);await mkdir('.artifacts/general',{recursive:true});
await build({stdin:{contents:'export {scoreRpc} from '+JSON.stringify(resolve('workers/private/adapter.ts'))+';export {project,inspectableRaw} from '+JSON.stringify(resolve(inbox,'workers/lib/mail-scoring/intake.ts'))+';',resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:'.artifacts/general/validation-pipeline.mjs'});
const {scoreRpc,project,inspectableRaw}=await import(pathToFileURL(resolve('.artifacts/general/validation-pipeline.mjs')));
const originalFetch=globalThis.fetch;let fetches=0;globalThis.fetch=()=>{fetches++;throw new Error('offline_only');};
const rows=[];
try{
 for(const record of manifest.records.filter(r=>r.partition==='validation')){
  const raw=new Uint8Array(await readBounded(join(root,record.path),record.bytes));assert.equal(sha256(raw),record.id);
  let result=null;
  if(inspectableRaw(raw)){
   const parsed=await PostalMime.parse(raw),input=project(parsed);
   // Proposed bounded HTML-only projection; actual caller routing is independently verified downstream.
   if(!input.text&&parsed.html&&parsed.html.length<=32768&&Buffer.byteLength(parsed.html)<=32768)input.html=parsed.html;
   input.preferences={senderAllowed:false,senderBlocked:false};
   const wire=scoreRpc('1',new TextEncoder().encode(JSON.stringify(input)),JSON.stringify({transportVerified:false,preferencesVerified:true}));
   const decoded=JSON.parse(wire);if(decoded.ok)result=decoded.result;
  }
  rows.push({id:record.id,label:record.label,group:record.group,htmlOnly:record.htmlOnly,status:result?.status??'unavailable',score:result?.heuristicScore??null,reasons:result?.reasons.map(r=>r.id)??[],limits:result?.limitsHit??[],detected:result?.reasons.some(r=>r.id==='statistical_linear_spam')??false});
 }
}finally{globalThis.fetch=originalFetch;}
assert.equal(fetches,0);assert.equal(rows.length,556);
const TP=rows.filter(r=>r.label==='spam'&&r.detected).length,FP=rows.filter(r=>r.label==='ham'&&r.detected).length;
const report={source:execFileSync('git',['rev-parse','HEAD']).toString().trim(),runtime:MIME_RUNTIME,partitionSha256:sha256(frozen),scope:'Actual production scorer RPC + actual old projection with proposed bounded HTML-only addition, validation only; NOT actual caller routing or heldout acceptance.',metrics:{TP,FP,TN:300-FP,FN:256-TP},fetches,rows};
await writeFile('.artifacts/general/core-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({metrics:report.metrics,fetches,scope:report.scope}));
