// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Run only after successful validation; records identity, not an independent test verdict.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const command=(name,args)=>{const r=spawnSync(name,args,{encoding:'utf8'});if(r.status!==0)throw new Error('receipt_command_failed');return r.stdout.trim();};
const files=[];
async function walk(path){for(const f of (await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=`${path}/${f.name}`;if(f.isDirectory())await walk(p);else files.push(p);}}
await walk('packages/core/src');await walk('workers/scorer');
const hash=createHash('sha256');for(const f of files)hash.update(f).update('\0').update(await readFile(f)).update('\0');
const receipt={headSha:command('git',['rev-parse','HEAD']),baseSha:'66b7b08691ccd3061c6460ff7184ee3f76c3c080',
  sourceTreeDigest:hash.digest('hex'),node:process.version,npm:command('npm',['--version']),workerd:command('node_modules/.bin/workerd',['--version']),
  commands:['npm ci','npm run check','npm run sbom','node scripts/schemas.mjs','npm run benchmark'],
  workflowSha:process.env.GITHUB_SHA??null,scope:'source-only; synthetic local/workerd evidence; no production or real-mail acceptance'};
await writeFile('.artifacts/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
