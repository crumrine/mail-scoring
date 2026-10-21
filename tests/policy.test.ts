// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-expect-error JS build-only policy is exercised directly, not part of the portable package.
import {inspectBundle} from '../scripts/bundle-policy.mjs';
test('bundle policy catches static/dynamic imports, logs and outbound APIs',()=>{
  const meta={inputs:{'synthetic.js':{}},outputs:{'out.js':{imports:[]}}};
  for(const code of ["fetch('https://example.invalid')","import('node:dns')","import x from 'node:fs'","console.log('synthetic')","new WebSocket('wss://example.invalid')"]) assert.throws(()=>inspectBundle(code,meta,['synthetic.js']));
  inspectBundle('export function x(){return 1}',meta,['synthetic.js']);
});
test('workerd config cannot implicitly restore internet, native modules or storage',()=>{
  const config=readFileSync('workers/scorer/workerd.capnp','utf8');
  assert.match(config,/name = "internet", worker/);
  assert.match(config,/"no_nodejs_compat", "no_nodejs_compat_v2"/);
  assert.doesNotMatch(config,/\b(?:network|disk|external|sockets|bindings|extensions)\s*=/);
});
