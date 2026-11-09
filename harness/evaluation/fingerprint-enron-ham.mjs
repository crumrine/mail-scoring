// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Acquisition only: derive the existing neutral dedup key without running a classifier.
import assert from 'node:assert/strict';
import {lstat,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createRequire} from 'node:module';
import './mime-runtime.mjs';
import {readBounded,sha256} from './files.mjs';
import {statisticalText,statisticalTokens} from '../../packages/core/dist/statistical-text.js';

const [rootArg,inboxArg,manifestSha]=process.argv.slice(2);
const root=resolve(rootArg);
for(let dir=root;;dir=dirname(dir)){
 assert(!(await lstat(dir)).isSymbolicLink()&&!existsSync(join(dir,'.git')));
 if(dir===dirname(dir))break;
}
assert(!(await lstat(join(root,'messages'))).isSymbolicLink());
const require=createRequire(join(resolve(inboxArg),'package.json'));
const lock=JSON.parse(await readBounded(join(resolve(inboxArg),'package-lock.json'),4*1024*1024));
assert.equal(lock.packages['node_modules/postal-mime'].version,'2.7.3');
const PostalMime=require('postal-mime');
const bytes=await readBounded(join(root,'all.json'),32*1024*1024);
assert.match(manifestSha,/^[a-f0-9]{64}$/);assert.equal(sha256(bytes),manifestSha);
const input=JSON.parse(bytes);assert(input.records.length>0&&input.records.length<=20000);
const field=(s,n)=>s&&s.length<=n&&Buffer.byteLength(s)<=n?s:'';
const records=[];
let total=0;
for(const row of input.records){
 assert.match(row.id,/^[a-f0-9]{64}$/);assert.equal(row.sha256,row.id);
 assert.equal(row.label,'ham');assert.equal(row.path,'messages/'+row.id+'.eml');
 assert(Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.bytes<=2*1024*1024);
 const raw=await readBounded(join(root,row.path),row.bytes);
 assert.equal(raw.length,row.bytes);assert.equal(sha256(raw),row.id);
 total+=raw.length;assert(total<=256*1024*1024);
 let bodyFeatureSha256=row.id,htmlOnly=false,parseUnavailable=false;
 let parsed;
 try{parsed=await PostalMime.parse(raw);}catch{parseUnavailable=true;}
 if(parsed){
  const text=field(parsed.text,32768),html=field(parsed.html,32768);
  const tokens=statisticalTokens(statisticalText('',text,html).text).sort((a,b)=>a-b);
  if(tokens.length)bodyFeatureSha256=sha256(JSON.stringify(tokens));
  htmlOnly=!text&&!!html;
 }
 records.push({...row,bodyFeatureSha256,htmlOnly,parseUnavailable});
}
const output=JSON.stringify({...input,records},null,2)+'\n';
await writeFile(join(root,'fingerprints.json'),output,{flag:'wx'});
console.log(JSON.stringify({metadataSha256:sha256(output),records:records.length,rawBytes:total,predictions:0}));
