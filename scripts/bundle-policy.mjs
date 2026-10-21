// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import ts from 'typescript';
const forbidden = new Set(['fetch','WebSocket','XMLHttpRequest','process','require','Buffer','console','eval','Function','Worker','caches','navigator']);
export function inspectBundle(code,meta,allowed) {
  assert.deepEqual(Object.keys(meta.inputs).sort(), [...allowed].sort(), 'unexpected module graph');
  for(const output of Object.values(meta.outputs)) assert.equal(output.imports.length,0,'emitted external import');
  const ast=ts.createSourceFile('bundle.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function walk(node) {
    assert.ok(!ts.isImportDeclaration(node) && !ts.isImportEqualsDeclaration(node) && node.kind!==ts.SyntaxKind.ImportKeyword,'runtime import');
    if(ts.isIdentifier(node)) assert.ok(!forbidden.has(node.text),'forbidden capability');
    ts.forEachChild(node,walk);
  }
  walk(ast);
}
