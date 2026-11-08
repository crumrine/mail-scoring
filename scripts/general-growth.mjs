// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {scoreRequest} from '../packages/core/dist/index.js';
import {htmlText} from '../packages/core/dist/html-text.js';
const samples=[];
for(const size of [1024,2048,4096,8192,16384,32768])for(const [kind,html] of Object.entries({
 open:'<'.repeat(size),attribute:'<a title="'+'x'.repeat(size-20)+'">text</a>',
 entities:'&amp;'.repeat(Math.floor(size/5)),depth:'<div>'.repeat(Math.floor(size/5)),
 tags:'<br>'.repeat(Math.floor(size/4)),unterminated:'<a title="'+'x'.repeat(size-10),
})){
 const times=[];let work;
 for(let i=0;i<5;i++){
  const start=performance.now();work=htmlText(html);
  const result=scoreRequest(new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'growth',subject:'',text:'',html,headers:[],sourceComplete:false})));
  times.push(performance.now()-start);assert.equal(result.heuristicScore,0);assert.equal(result.status,'partial');
  assert.ok(work.depth<=32&&work.tags<=1025&&Buffer.byteLength(work.text)<=32768);
 }
 times.sort((a,b)=>a-b);samples.push({kind,size,medianMs:times[2],maxMs:times.at(-1),tags:work.tags,depth:work.depth,outputBytes:Buffer.byteLength(work.text),complete:work.complete});
}
await mkdir('.artifacts/general',{recursive:true});
await writeFile('.artifacts/general/growth.json',JSON.stringify({runtime:process.version,samples,scope:'36 hostile HTML sizes/shapes; local Node wall observations, not peak memory or hosted CPU/billing. Structural limits are assertions.'},null,2)+'\n');
console.log(JSON.stringify({cases:samples.length,maxObservedMs:Math.max(...samples.map(s=>s.maxMs)),bounded:true}));
