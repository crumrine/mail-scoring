// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Check committed/staged evidence, including files otherwise hidden by ignore rules.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const tracked=new Set(execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0'));
let manifests=0,entries=0;
async function check(dir){
  for(const item of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,item.name);
    if(item.isDirectory()){await check(path);continue;}
    if(item.name!=='manifest.json')continue;
    assert.ok(tracked.has(path),'untracked manifest: '+path);
    const manifest=JSON.parse(await readFile(path,'utf8'));
    for(const [file,expected]of Object.entries(manifest)){
      const target=join(dir,file);
      assert.ok(tracked.has(target),'manifest references untracked artifact: '+target);
      assert.equal(createHash('sha256').update(await readFile(target)).digest('hex'),expected,target);
      entries++;
    }
    manifests++;
  }
}
await check('docs/evidence/dev-880');
console.log(JSON.stringify({manifests,entries,passed:true}));
