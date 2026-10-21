// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {scoreRequest, LIMITS} from '../packages/core/dist/index.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,platform,arch} from 'node:os';
const ordinary=JSON.parse(await readFile('fixtures/ordinary.json','utf8'));
const samples=[];
for(const n of [0,8192,32768,65536,131072,262144,1048576]) {
  const input=new TextEncoder().encode(JSON.stringify({...ordinary,text:'x'.repeat(n)}));
  const before=process.memoryUsage();const cold=performance.now();const result=scoreRequest(input);const firstMs=performance.now()-cold;
  const status=result.status;
  const times=[];
  for(let i=0;i<100;i++){const t=performance.now();scoreRequest(input);times.push(performance.now()-t);}
  times.sort((a,b)=>a-b);const after=process.memoryUsage();
  samples.push({sourceBytes:n,requestBytes:input.byteLength,status,firstMs,medianMs:times[50],p95Ms:times[95],maxMs:times[99],heapDeltaBytes:after.heapUsed-before.heapUsed,rssDeltaBytes:after.rss-before.rss});
}
const result={runtime:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,sampleCount:100,limits:LIMITS,samples,
  caveat:'Local Node synthetic wall time; first invocation per case is not isolated process startup. GC and shared host noise affect memory deltas. No hosted CPU, efficacy, accuracy or billing conclusions. Includes preflight/decode/parse/freeze/scoring; oversized requests are unavailable before decode. Fixture encoding is outside measurement.'};
await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
