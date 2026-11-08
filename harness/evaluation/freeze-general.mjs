// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {MIME_RUNTIME} from './mime-runtime.mjs';
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {readBounded} from './files.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ROOT=resolve(process.argv[2]??'');
const inbox=resolve(process.argv[3]??'');
const require=createRequire(join(inbox,'package.json'));
const PostalMime=require('postal-mime');
const bytes=await readBounded(join(ROOT,'all.json'),2*1024*1024);
assert.equal(hash(bytes),'6f3dd4aa0b659a972563d8c03d97de2982464d4374dcca9513e8ec1eb2fdc486');
const input=JSON.parse(bytes);assert.equal(input.records.length,6046);
const diagnostic=JSON.parse(await readBounded('docs/evidence/dev-990/report.json',512*1024)).variants.candidate.rows;
const known=new Set(diagnostic.map(row=>row.id));assert.equal(known.size,192);
assert.equal((await lstat(join(ROOT,'messages'))).isSymbolicLink(),false);
const tmp=await mkdtemp('/tmp/freeze-general-');
try{
 const entry=join(tmp,'text.mjs');
 await build({entryPoints:['packages/core/src/statistical-text.ts'],bundle:true,platform:'node',format:'esm',outfile:entry});
 const {statisticalText,statisticalTokens}=await import(pathToFileURL(entry));
 const records=[];
 for(const row of input.records){
  assert.match(row.id,/^[a-f0-9]{64}$/);assert.equal(row.path,'messages/'+row.id+'.eml');
  assert.equal((await lstat(join(ROOT,row.path))).isSymbolicLink(),false);
  assert.ok(row.bytes>0&&row.bytes<=2*1024*1024);
  const raw=new Uint8Array(await readBounded(join(ROOT,row.path),row.bytes));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.id);
  const parsed=await PostalMime.parse(raw);
  const field=(s,n)=>s&&s.length<=n&&Buffer.byteLength(s)<=n?s:'';
  const subject=field(parsed.subject,2048),text=field(parsed.text,32768),html=field(parsed.html,32768);
  const body=statisticalText('',text,html),content=statisticalText(subject,text,html);
  const bodyTokens=statisticalTokens(body.text).sort((a,b)=>a-b);
  const identity=bodyTokens.length?hash(JSON.stringify(bodyTokens)):row.id;
  records.push({...row,bodyFeatureSha256:identity,features:statisticalTokens(content.text),textInspectable:content.complete&&!!(text||html),rawInspectable:raw.length<=131072&&!raw.includes(0),quoted:content.quoted,htmlOnly:!text&&!!html,partition:'unassigned'});
 }
 const byBody=new Map();for(const r of records){if(!byBody.has(r.bodyFeatureSha256))byBody.set(r.bodyFeatureSha256,[]);byBody.get(r.bodyFeatureSha256).push(r);}
 const exclusions=[];
 for(const same of byBody.values()){
  const previous=same.some(r=>known.has(r.id)),conflicting=new Set(same.map(r=>r.label)).size>1;
  same.sort((a,b)=>a.id.localeCompare(b.id));
  for(let i=0;i<same.length;i++){
   const r=same[i];
   if(known.has(r.id))r.partition='diagnostic';
   else if(previous||conflicting||i>0){r.partition='excluded';exclusions.push({id:r.id,reason:previous?'related_to_prior_diagnostic':conflicting?'conflicting_body_labels':'duplicate_body_features'});}
  }
 }
 for(const group of ['easy_ham','hard_ham','spam','easy_ham_2','spam_2']){
  const rows=records.filter(r=>r.group===group&&r.partition==='unassigned').sort((a,b)=>a.id.localeCompare(b.id));
  rows.forEach((r,i)=>{r.partition=group==='hard_ham'?(i<Math.floor(rows.length/2)?'train':i<Math.floor(rows.length*3/4)?'validation':'holdout'):group.endsWith('_2')?(i<256?'validation':'holdout'):'train';});
 }
 assert.equal(records.filter(r=>r.partition==='diagnostic').length,192);
 assert.ok(records.every(r=>['diagnostic','train','validation','holdout','excluded'].includes(r.partition)));
 const included=records.filter(r=>['train','validation','holdout'].includes(r.partition));
 assert.equal(new Set(included.map(r=>r.bodyFeatureSha256)).size,included.length);
 const summary={};for(const part of ['diagnostic','train','validation','holdout','excluded']){
  const rows=records.filter(r=>r.partition===part);summary[part]={total:rows.length,ham:rows.filter(r=>r.label==='ham').length,spam:rows.filter(r=>r.label==='spam').length,hardHam:rows.filter(r=>r.group==='hard_ham').length};
 }
 const manifest={version:1,inputManifestSha256:hash(bytes),selection:'Fixed before classifier development: exclude prior diagnostic raw IDs and body-feature duplicates/conflicts; original easy_ham/spam for training; hard_ham first half train/next quarter validation/rest holdout; new cohorts first256 pergroup validation/rest holdout. SHA256 order, no predictions used.',summary,exclusions,records:records.map(({features,...r})=>r)};
 const output=JSON.stringify(manifest,null,2)+'\n';
 const path=join(ROOT,'partitions.json');
 try{assert.equal((await readBounded(path,4*1024*1024)).toString('utf8'),output,'frozen partition drift');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(path,output);}
 await writeFile(join(ROOT,'features.json'),JSON.stringify(records)+'\n');
 console.log(JSON.stringify({runtime:MIME_RUNTIME,manifestSha256:hash(output),summary}));
}finally{await rm(tmp,{recursive:true,force:true});}
