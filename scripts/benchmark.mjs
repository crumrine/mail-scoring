// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {score, LIMITS} from '../packages/core/dist/index.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,platform,arch} from 'node:os';
const ordinary=JSON.parse(await readFile('fixtures/ordinary.json','utf8'));
const samples=[];
for(const n of [0,8192,32768,65536,131072,262144,1048576]) {
  const input={...ordinary,text:'x'.repeat(n)};
  const before=process.memoryUsage();const cold=performance.now();score(input);const firstMs=performance.now()-cold;
  const times=[];
  for(let i=0;i<100;i++){const t=performance.now();score(input);times.push(performance.now()-t);}
  times.sort((a,b)=>a-b);const after=process.memoryUsage();
  samples.push({sourceBytes:n,firstMs,medianMs:times[50],p95Ms:times[95],maxMs:times[99],heapDeltaBytes:after.heapUsed-before.heapUsed,rssDeltaBytes:after.rss-before.rss});
}
const result={runtime:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,sampleCount:100,limits:LIMITS,samples,
  caveat:'Local Node synthetic wall time; first invocation per case is not isolated process startup. GC and shared host noise affect memory deltas. No hosted CPU, efficacy, accuracy or billing conclusions. Adversarial growth stops at inspection ceilings; fixture allocation is outside measurement.'};
await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
