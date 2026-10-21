// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,platform,arch} from 'node:os';
import {score,boundedText} from '../packages/core/dist/index.js';
assert.equal(typeof global.gc,'function','run with --expose-gc');
const base=()=>({schemaVersion:'1',policyVersion:'test',subject:'synthetic',headers:[],text:'',sourceComplete:true});
const samples=[];
function measure(kind,size,run,verify) {
  global.gc();
  const before=process.memoryUsage();const started=performance.now();
  const result=run();const elapsedMs=performance.now()-started;const after=process.memoryUsage();
  verify(result);
  const heapDeltaBytes=after.heapUsed-before.heapUsed;
  // Wide enumeration or lazy flattening at the largest fixtures exceeds this by
  // several multiples. Allow runtime measurement noise, without a brittle time gate.
  assert.ok(heapDeltaBytes<4*1024*1024,'direct_boundary_allocation_regression');
  samples.push({kind,size,elapsedMs,heapDeltaBytes,rssDeltaBytes:after.rss-before.rss});
}
for(const n of [1000,100000,1000000]) {
  for(const kind of ['root','header','transport','attachment']) {
    const wide={};for(let i=0;i<n;i++) wide[`extra${i}`]=i;
    const value=kind==='root'?Object.assign(wide,base()):kind==='header'?{...base(),headers:[{name:'X',value:'synthetic',...wide}]}:kind==='transport'?{...base(),transport:wide}:{...base(),attachments:[{filename:'synthetic',mediaType:'text/plain',...wide}]};
    measure(kind,n,()=>score(value),r=>assert.equal(r.error,'invalid_input'));
  }
}
for(const n of [1048576,16777216,67108864]) {
  for(const kind of ['repeat','concatenation']) {
    const value=kind==='repeat'?'x'.repeat(n):'prefix'+'x'.repeat(n);
    measure(kind,n,()=>boundedText(value,32),r=>assert.deepEqual(r,{text:'',bytes:0,truncated:true}));
  }
}
const result={runtime:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,samples,
  caveat:'Synthetic local Node observations, one cold call per constructed fixture. Fixture allocation and GC precede timing. Heap deltas are not peak-memory guarantees; no hosted CPU, accuracy or billing claim. Membership gate and O(1) length preflight enforce work bounds; 4MiB allocation regression threshold leaves runtime noise headroom.'};
await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/direct-growth.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
