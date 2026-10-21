// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import ts from 'typescript';
export const coreModules=['index','contract','guards','inspection','vendor/authentication-failed','vendor/text','vendor/links','vendor/bulk'].map(n=>`packages/core/src/${n}.ts`);
export const scorerModules=[...coreModules,...['index','adapter','protocol'].map(n=>`workers/private/${n}.ts`)];
export const consumerModules=['workers/consumer/index.ts','workers/consumer/integration.ts','workers/private/protocol.ts','packages/core/src/contract.ts'];
export function checkConfig(c,consumer=false) {
 const base=['compatibility_date','workers_dev','preview_urls','routes','observability','minify','send_metrics','name','main'];
 assert.deepEqual(Object.keys(c).sort(),[...base,...(consumer?['vars','services']:[])].sort(),'unexpected configuration/binding');
 assert.equal(c.workers_dev,false);assert.equal(c.preview_urls,false);assert.deepEqual(c.routes,[]);
 assert.deepEqual(c.observability,{enabled:false});assert.equal(c.send_metrics,false);assert.equal(c.minify,true);
 assert.equal(c.compatibility_date,'2026-10-21');assert.equal(c.main,'index.ts');
 assert.equal(c.name,consumer?'mail-scoring-consumer-example':'mail-scoring-private');
 if(consumer){assert.deepEqual(c.vars,{SCORING_ENABLED:'false'});assert.deepEqual(c.services,[{binding:'SCORER',service:'mail-scoring-private'}]);}
}
const forbidden=new Set(['globalThis','fetch','WebSocket','XMLHttpRequest','process','require','Buffer','console','eval','Function','Worker','caches','navigator','setTimeout','clearTimeout','setInterval','queueMicrotask','waitUntil','WebTransport','EventSource','connect','Deno','Bun','localStorage','indexedDB']);
export function checkWorkerBundle(code,meta,allowed=scorerModules) {
 assert.deepEqual(Object.keys(meta.inputs).sort(),[...allowed].sort(),'unexpected module graph');
 assert.deepEqual(Object.values(meta.outputs).flatMap(o=>o.imports).map(i=>({path:i.path,kind:i.kind})),[{path:'cloudflare:workers',kind:'import-statement'}],'external imports');
 const ast=ts.createSourceFile('worker.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function walk(n){
  if(ts.isImportDeclaration(n))assert.equal(n.moduleSpecifier.text,'cloudflare:workers');
  assert.ok(n.kind!==ts.SyntaxKind.ImportKeyword&&!ts.isImportEqualsDeclaration(n),'dynamic import');
  if(ts.isIdentifier(n)||ts.isStringLiteral(n)) {
   const word=n.text;
   // Only the harmless HTTP method declaration may use the name fetch.
   if(word==='fetch'&&ts.isMethodDeclaration(n.parent)&&n.parent.name===n){
    const body=n.parent.body?.getText(ast).replace(/\s/g,'');
    assert.ok(/^\{returnnewResponse\(null,\{status:404\}\);?\}$/.test(body),'HTTP body must only return 404');
   }else if(allowed===consumerModules&&(word==='setTimeout'||word==='clearTimeout')){/* consumer wait only */}
   else assert.ok(!forbidden.has(word),'forbidden capability: '+word);
  }
  ts.forEachChild(n,walk);
 }
 walk(ast);
}
