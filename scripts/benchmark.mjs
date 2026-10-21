// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {scoreRequest, LIMITS} from '../packages/core/dist/index.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,platform,arch} from 'node:os';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const ordinary=JSON.parse(await readFile('fixtures/ordinary.json','utf8'));
const link={text:'https://good.test',href:'https://other.invalid'};
const cases=[
  ['ordinary',ordinary],
  ...[8192,32768,65536,131072,262144,1048576].map(n=>[`source-${n}`,{...ordinary,text:'x'.repeat(n)}]),
  ['whitespace-65536',{...ordinary,text:(' \n').repeat(32768)}],
  ['unicode-expansion',{...ordinary,text:'\ufdfa'.repeat(10000)}],
  ['repeated-phrases',{...ordinary,text:'verification code '.repeat(7000)}],
  ['100-anchors',{...ordinary,anchors:Array.from({length:100},()=>link)}],
  ['encoded-urls',{...ordinary,urls:Array.from({length:100},()=>encodeURIComponent(encodeURIComponent('https://other.invalid/'+ '%25'.repeat(100))))}],
  ['deep-html-skipped',{...ordinary,html:'<div>'.repeat(8192)+'x<br>'.repeat(8192)}],
  ['huge-attribute-skipped',{...ordinary,html:'<a href="'+'x'.repeat(130000)+'">x'}],
];
const samples=[];
for(const [name,value] of cases) {
  const input=new TextEncoder().encode(JSON.stringify(value));
  const before=process.memoryUsage();const first=performance.now();const result=scoreRequest(input);const firstInProcessMs=performance.now()-first;
  // Explicit warmup before the warm distribution; each case uses same bounded bytes.
  for(let i=0;i<10;i++)scoreRequest(input);
  const times=[];
  for(let i=0;i<100;i++){const t=performance.now();scoreRequest(input);times.push(performance.now()-t);}
  times.sort((a,b)=>a-b);const after=process.memoryUsage();
  samples.push({name,requestBytes:input.byteLength,status:result.status,limitsHit:result.limitsHit,firstInProcessMs,
    medianMs:times[50],p95Ms:times[95],maxMs:times[99],heapDeltaBytes:after.heapUsed-before.heapUsed,rssDeltaBytes:after.rss-before.rss});
}
const cold=[];
for(let i=0;i<5;i++) {
  const t=performance.now();const p=spawnSync(process.execPath,['scripts/benchmark-cold.mjs'],{encoding:'utf8',timeout:30000});
  assert.equal(p.status,0,'cold benchmark child failed');
  cold.push({processWallMs:performance.now()-t,...JSON.parse(p.stdout)});
}
await mkdir('.artifacts',{recursive:true});
// workerd event clocks do not measure synchronous CPU. Record whole fresh process
// wall samples for one call and an explicitly warmed 100-call batch; no subtraction
// of startup and no claim that batch/process duration is per-call Worker CPU.
const workerd=[];
for(const count of [1,100]) {
  const source=`import {scoreRequest} from '../packages/core/src/index.ts';
const bytes=new TextEncoder().encode(${JSON.stringify(JSON.stringify(ordinary))});
const initial=scoreRequest(bytes);
export default {test(){if(initial.status!=='partial')throw new Error('benchmark');
for(let i=0;i<10;i++)scoreRequest(bytes);
for(let i=0;i<${count};i++){if(scoreRequest(bytes).status!=='partial')throw new Error('benchmark');}}};`;
  await writeFile('.artifacts/benchmark-worker.ts',source);
  await build({entryPoints:['.artifacts/benchmark-worker.ts'],bundle:true,format:'esm',platform:'browser',target:'es2024',outfile:'.artifacts/benchmark-worker.js'});
  const config=(await readFile('workers/scorer/workerd.capnp','utf8')).replace('../../.artifacts/spike.js','../../.artifacts/benchmark-worker.js');
  await writeFile('workers/scorer/.benchmark.capnp',config);
  try {
    const times=[];
    for(let i=0;i<5;i++) {
      const t=performance.now();const p=spawnSync('node_modules/.bin/workerd',['test','workers/scorer/.benchmark.capnp','scorer'],{encoding:'utf8',timeout:30000});
      assert.equal(p.status,0,'workerd benchmark failed');times.push(performance.now()-t);
    }
    workerd.push({eventScoringCalls:count,warmupCalls:10,initializationCalls:1,freshProcessWallMs:times});
  } finally {const {unlink}=await import('node:fs/promises');await unlink('workers/scorer/.benchmark.capnp');}
}
const result={runtime:process.version,workerdVersion:spawnSync('node_modules/.bin/workerd',['--version'],{encoding:'utf8'}).stdout.trim(),platform:platform(),arch:arch(),cpu:cpus()[0]?.model,sampleCount:100,warmupCount:10,limits:LIMITS,samples,cold,workerdSamples:workerd,
  ordinaryP95TargetMs:25,ordinaryTargetPassed:samples[0].p95Ms<25,
  caveat:'Synthetic local wall time only. Node cold children separate import and first-score timing from process launch; warm distributions include full scoreRequest. Workerd reports fresh process wall durations including startup, initialization, warmup and test batch; event clocks cannot measure synchronous CPU, so no workerd per-call latency is claimed. Fixture construction/encoding is outside scoring measurement. Memory deltas are not peak allocation. No hosted CPU, billing, efficacy or accuracy conclusions.'};
await writeFile('.artifacts/benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
assert.ok(result.ordinaryTargetPassed,'ordinary p95 exceeds proposed 25 ms target');
