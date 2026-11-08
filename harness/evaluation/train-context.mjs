// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Offline TRAIN only; never reads validation/holdout message bytes or adjusts cutoffs.
import assert from 'node:assert/strict';
import {MIME_RUNTIME} from './mime-runtime.mjs';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {readBounded,sha256} from './files.mjs';
import {contextCounts} from './context-counts.mjs';
const [root,inbox]=process.argv.slice(2);
const frozen=await readBounded(join(root,'partitions.json'),4*1024*1024);
assert.equal(sha256(frozen),'111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803');
const manifest=JSON.parse(frozen);
const require=createRequire(resolve(inbox,'package.json'));const PostalMime=require('postal-mime');
assert.equal(JSON.parse(await readFile(resolve(inbox,'package-lock.json'))).packages['node_modules/postal-mime'].version,'2.7.3');
assert.equal(JSON.parse(await readFile(join(dirname(require.resolve('postal-mime')),'../package.json'))).version,'2.7.3');
const temp=await mkdtemp('/tmp/train-context-');
let attempts=0;const fetch=globalThis.fetch;globalThis.fetch=()=>{attempts++;throw new Error('offline_only');};
try{
 const modulePath=join(temp,'features.mjs');
 await build({stdin:{contents:`export {statisticalText} from ${JSON.stringify(resolve('packages/core/src/statistical-text.ts'))};export {contextFeatures,contextKey} from ${JSON.stringify(resolve('packages/core/src/context-features.ts'))};`,resolveDir:process.cwd(),loader:'ts'},outfile:modulePath,bundle:true,platform:'node',format:'esm'});
 const {statisticalText,contextFeatures,contextKey}=await import(pathToFileURL(modulePath));
 const rows=[];
 for(const row of manifest.records.filter(r=>r.partition==='train'&&r.rawInspectable&&r.textInspectable)){
  assert.match(row.id,/^[a-f0-9]{64}$/);assert.equal(row.path,'messages/'+row.id+'.eml');
  assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.bytes<=131072);
  const raw=await readBounded(join(root,row.path),row.bytes);assert.equal(raw.length,row.bytes);assert.equal(sha256(raw),row.id);
  const parsed=await PostalMime.parse(raw);
  const field=(s,n)=>s&&s.length<=n&&Buffer.byteLength(s)<=n?s:'';
  const subject=field(parsed.subject,2048),text=field(parsed.text,32768),html=field(parsed.html,32768);
  const content=statisticalText(subject,text,html);
  const result=contextFeatures([content.subjectText,content.bodyText]);
  rows.push({...row,quoted:content.quoted,bodyPositions:contextFeatures([content.bodyText]).positions,textInspectable:content.complete&&!result.limited,features:result.features.map(f=>contextKey(f.first,f.second))});
 }
 const {documents,entries:counts}=contextCounts(rows);
 assert.ok(counts.length<100000);assert.equal(attempts,0);
 const source='// Copyright (c) 2026 Brian Crumrine\n// SPDX-License-Identifier: Apache-2.0\n'+
  '// Numeric document aggregates from the fixed TRAIN partition only. No words, messages or phrase strings.\n'+
  'export const MODEL_VERSION = "general-3";\n'+
  'export const MODEL_PARTITION_SHA256 = '+JSON.stringify(sha256(frozen))+';\n'+
  'export const MODEL_DOCUMENTS:readonly [number,number,number] = '+JSON.stringify(documents)+';\n'+
  'export const MODEL_COUNTS:ReadonlyArray<readonly [number,number,number,number,number]> = [\n'+counts.map(c=>'  '+JSON.stringify(c)).join(',\n')+'\n];\n';
 await mkdir('.artifacts/context',{recursive:true});
 await writeFile('.artifacts/context/context-model.ts',source);
 await writeFile('.artifacts/context/training-features.json',JSON.stringify(rows)+'\n');
 if(process.argv[4]==='--write-model')await writeFile('packages/core/src/context-model.ts',source);
 const receipt={runtime:MIME_RUNTIME,partitionSha256:sha256(frozen),modelVersion:'general-3',hamMixture:{estimator:'pooled legitimate document counts'},modelSourceSha256:sha256(source),documents,entries:counts.length,featurePositionsCap:1000,maxFeatures:1999,readPartitions:['train'],rawMessagesRead:rows.length,readIdsSha256:sha256(JSON.stringify(rows.map(r=>r.id).sort())),eligibleIdsSha256:sha256(JSON.stringify(rows.filter(r=>r.textInspectable).map(r=>r.id).sort())),fetches:attempts};
 await writeFile('.artifacts/context/training.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{globalThis.fetch=fetch;await rm(temp,{recursive:true,force:true});}
