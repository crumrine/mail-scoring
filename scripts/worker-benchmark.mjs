// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import workerd from 'workerd';
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,platform,arch,release} from 'node:os';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {localConfig} from './worker-local.mjs';
const config=await localConfig(true);
async function start(){
 const started=performance.now();
 const p=spawn(workerd.default,['serve',config,'--control-fd=3'],{stdio:['ignore','pipe','pipe','pipe']});
 let log='';p.stdout.on('data',d=>{log+=d;});p.stderr.on('data',d=>{log+=d;});
 const close=async()=>{if(p.exitCode===null){p.kill('SIGTERM');await once(p,'exit');}if(log.includes('PRIVATE_CANARY_877'))throw new Error('content_log');};
 try{
  const port=await new Promise((resolve,reject)=>{
   let text='';const timer=setTimeout(()=>reject(new Error('startup_timeout')),15000);
   p.once('exit',()=>{clearTimeout(timer);reject(new Error('startup_exit'));});
   p.stdio[3].on('data',d=>{text+=d;for(const line of text.split('\n').slice(0,-1)){try{const m=JSON.parse(line);if(m.event==='listen'&&m.port){clearTimeout(timer);resolve(m.port);}}catch{}}});
  });
  return {p,port,startupMs:performance.now()-started,close};
 }catch(e){await close();await writeFile('.artifacts/worker/benchmark-startup.log',log);throw e;}
}
async function call(server,name){const start=performance.now();const r=await fetch(`http://127.0.0.1:${server.port}/${name}`);if(r.status!==200||await r.text()!=='ok')throw new Error('benchmark_rpc_failure');return performance.now()-start;}
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,median:s.length%2?s[Math.floor(s.length/2)]:(s[s.length/2-1]+s[s.length/2])/2,p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1)};};
const names=['ordinary','newsletter','deceptive','unicode','ceiling','expansion','tags'];
const warm={};const server=await start();
try{for(const name of names){for(let i=0;i<10;i++)await call(server,name);const a=[];for(let i=0;i<100;i++)a.push(await call(server,name));warm[name]={...stats(a),rawMs:a};}}finally{await server.close();}
const cold={};for(const name of ['ordinary','deceptive','ceiling','expansion']){const a=[],startup=[];for(let i=0;i<10;i++){const s=await start();try{startup.push(s.startupMs);a.push(await call(s,name));}finally{await s.close();}}cold[name]={firstCall:stats(a),startup:stats(startup),firstCallMs:a,startupMs:startup};}
const command=(c,args)=>spawnSync(c,args,{encoding:'utf8'}).stdout.trim();
const result={scope:'Host wall time: loopback HTTP harness -> consumer RPC -> scorer RPC. Includes serialization and host scheduling, not billed CPU. Cold = fresh workerd process/isolate first call, startup separate.',environment:{node:process.version,npm:command('npm',['--version']),workerd:command('node_modules/.bin/workerd',['--version']),wrangler:JSON.parse(await readFile('node_modules/wrangler/package.json')).version,os:`${platform()} ${release()} ${arch()}`,cpu:cpus()[0]?.model},headSha:command('git',['rev-parse','HEAD']),worktreeDirty:command('git',['status','--porcelain'])!=='',bundleSha256:createHash('sha256').update(await readFile('.artifacts/worker/private.js')).digest('hex'),bundle:JSON.parse(await readFile('.artifacts/worker/build.json')),warmups:10,warm,cold,ordinaryTargetMs:25,ordinaryWarmTargetMet:warm.ordinary.p95<25,ordinaryColdTargetMet:cold.ordinary.firstCall.p95<25};
await writeFile('.artifacts/worker/benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({warm:Object.fromEntries(Object.entries(warm).map(([k,{rawMs,...v}])=>[k,v])),cold,ordinaryWarmTargetMet:result.ordinaryWarmTargetMet,ordinaryColdTargetMet:result.ordinaryColdTargetMet}));
