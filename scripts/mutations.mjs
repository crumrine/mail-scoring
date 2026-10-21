// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
await mkdir('.artifacts',{recursive:true});
const checks=[
  {id:'url-length',file:'packages/core/src/guards.ts',before:"read(item(urls,i),LIMITS.urlBytes,'field_bytes')",after:"read(item(urls,i),LIMITS.requestBytes,'field_bytes')",command:['test'],failure:/✖ URL decoding has a finite/},
  {id:'normalized-output',file:'packages/core/src/vendor/text.ts',before:'if(bytes+cost>LIMITS.normalizedBytes)',after:'if(bytes+cost>LIMITS.requestBytes)',command:['test'],failure:/✖ normalized output guard/},
  {id:'anchor-count',file:'packages/core/src/guards.ts',before:'Math.min(anchors.length,LIMITS.urls)',after:'anchors.length',command:['test'],failure:/✖ anchor work is bounded/},
  {id:'url-decode',file:'packages/core/src/vendor/links.ts',before:'i<LIMITS.urlDecodePasses',after:'i<10',command:['test'],failure:/✖ URL decoding has a finite/},
  {id:'family-cap',file:'packages/core/src/index.ts',before:'FAMILY_CAPS[family]-totals[family]',after:'100',command:['test'],failure:/✖ correlated contribution caps/},
  {id:'total-cap',file:'packages/core/src/index.ts',before:'100-result.heuristicScore',after:'100',command:['test'],failure:/✖ correlated contribution caps/},
  {id:'quote-skip',file:'packages/core/src/vendor/text.ts',before:'if(skip || forwarded) continue;',after:'// Deliberately inspect quoted content.',command:['test'],failure:/✖ linear quote skipping/},
  {id:'preference-provenance',file:'packages/core/src/index.ts',before:'context.preferencesVerified!==true',after:'false',command:['test'],failure:/✖ synthetic rule fixtures/},
  {id:'source-bound',file:'packages/core/src/guards.ts',before:"text:read(r.text,LIMITS.sourceBytes,'source_bytes',true)",after:"text:read(r.text,LIMITS.requestBytes,'source_bytes',true)",command:['test'],failure:/✖ source and extracted byte limits/},
  {id:'parsed-root',file:'packages/core/src/guards.ts',before:"    if (!value || typeof value !== 'object' || !parsedRoots.has(value)) return null;",after:"    // Deliberately removed parser identity guard.",command:['test'],failure:/✖ unprepared roots/},
  {id:'lazy-string',file:'packages/core/src/guards.ts',before:"  if (value.length > LIMITS.requestBytes) return {text:'', bytes:0, truncated:true};",after:"  // Deliberately removed representation length preflight.",command:['test'],failure:/✖ lazy strings/},
  {id:'network-deny',file:'workers/scorer/deny.js',before:"throw new Error('network_disabled')",after:"return new Response('synthetic mutation')",command:['run','workerd-spike'],failure:/workerd spike failed/},
];
const evidence=[];
for(const check of checks) {
  const original=await readFile(check.file,'utf8');assert.ok(original.includes(check.before));
  try {
    await writeFile(check.file,original.replace(check.before,check.after));
    const r=spawnSync('npm',check.command,{encoding:'utf8',timeout:60000});
    await writeFile(`.artifacts/mutation-${check.id}.log`,r.stdout+r.stderr);
    assert.notEqual(r.status,0,'mutation survived');assert.match(r.stdout+r.stderr,check.failure,'mutation failed for unrelated reason');
    if(check.id==='network-deny') assert.match(await readFile('.artifacts/workerd.log','utf8'),/network_guard/);
    evidence.push({mutation:check.id,caught:true,exitCode:r.status});
  } finally {await writeFile(check.file,original);}
}
// Restore compiled outputs and prove both positive controls pass after restoration.
for(const command of [['test'],['run','workerd-spike']]) {
  const r=spawnSync('npm',command,{encoding:'utf8',timeout:60000});
  assert.equal(r.status,0,'restored baseline failed');
}
await writeFile('.artifacts/mutations.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
