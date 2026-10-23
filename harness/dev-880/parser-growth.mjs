// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Safe, generated MIME only. External deadline contains each Node child.
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const inbox=resolve(process.env.DEV880_INBOX??'../inbox');
const require=createRequire(join(inbox,'package.json'));
if(process.argv[2]==='child'){
 const {default:PostalMime}=await import(pathToFileURL(require.resolve('postal-mime')).href);
 const kind=process.argv[3],n=Number(process.argv[4]);
 const headers='From: sender@sender.test\r\nTo: receiver@inbox.test\r\nSubject: Generated MIME\r\n';
 let raw;
 if(kind==='nested'){
  let body='Content-Type: text/plain\r\n\r\nSynthetic body.';
  for(let i=0;i<n;i++)body=`Content-Type: multipart/mixed; boundary="b${i}"\r\n\r\n--b${i}\r\n${body}\r\n--b${i}--\r\n`;
  raw=headers+body;
 }else if(kind==='headers')raw=headers+Array.from({length:n},(_,i)=>'X-Synthetic-'+i+': '+'a'.repeat(100)+'\r\n').join('')+'Content-Type: text/plain\r\n\r\nSynthetic body.';
 else raw=headers+'Content-Type: text/plain\r\n\r\n'+'x'.repeat(n);
 const bytes=new TextEncoder().encode(raw),times=[];const before=process.memoryUsage();
 for(let i=0;i<20;i++){const t=performance.now();await PostalMime.parse(bytes);times.push(performance.now()-t);}
 const sorted=[...times].sort((a,b)=>a-b),after=process.memoryUsage();
 console.log(JSON.stringify({kind,size:n,bytes:bytes.length,samples:20,firstMs:times[0],medianMs:sorted[10],p95Ms:sorted[18],maxMs:sorted.at(-1),heapDelta:after.heapUsed-before.heapUsed}));
}else{
 const results=[];
 for(const [kind,n] of [['plain',1024],['plain',16384],['plain',65536],['plain',131072],['nested',8],['nested',32],['headers',100],['headers',256]]){
  const t=performance.now(),r=spawnSync(process.execPath,[process.argv[1],'child',kind,String(n)],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  assert.equal(r.status,0,'bounded synthetic MIME child failed');results.push({...JSON.parse(r.stdout),processWallMs:performance.now()-t});
 }
 await mkdir('.artifacts/dev-880/parser',{recursive:true});
 await writeFile('.artifacts/dev-880/parser/result.json',JSON.stringify({node:process.version,postalMime:JSON.parse(await readFile(join(inbox,'node_modules/postal-mime/package.json'),'utf8')).version,results,
  scope:'Safe generated text-only MIME, Node local wall time and non-peak heap deltas; not hosted CPU or proof of safety for the inherited 25MiB parser input. 15s external process deadline per child.'},null,2)+'\n');
 console.log(JSON.stringify({parserGrowth:'passed',cases:results.length}));
}
