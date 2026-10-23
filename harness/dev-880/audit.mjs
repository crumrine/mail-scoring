// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=x=>createHash('sha256').update(x).digest('hex');
const reports=[];
for(const [name,root] of [['scorer',process.cwd()],['inbox',resolve(process.env.DEV880_INBOX??'../inbox')]]){
 const bytes=await readFile(join(root,'package-lock.json')),lock=JSON.parse(bytes),packages=[];
 for(const [path,p] of Object.entries(lock.packages)){
  if(!path.startsWith('node_modules/')||p.link)continue;
  assert.ok(p.license,'missing package license metadata');assert.ok(p.integrity||p.inBundle,'missing locked integrity at '+path);
  const bundleOwner=p.inBundle?path.slice(0,path.lastIndexOf('/node_modules/')):null;
  if(bundleOwner)assert.ok(lock.packages[bundleOwner]?.integrity,'missing enclosing bundle integrity');
  let installed=false,notices=[];
  try{
   const actual=JSON.parse(await readFile(join(root,path,'package.json'),'utf8'));
   assert.equal(actual.version,p.version,'installed version mismatch at '+path);installed=true;
   const files=await readdir(join(root,path));
   for(const file of files.filter(f=>/^(licen[cs]e|notice|copying|thirdpartynotice)/i.test(f))){
    try{notices.push({file,sha256:hash(await readFile(join(root,path,file)))});}catch{}
   }
  }catch(e){if(e.code!=='ENOENT'&&e.code!=='ENOTDIR')throw e;}
  packages.push({path,version:p.version,license:p.license,integrity:p.integrity??lock.packages[bundleOwner]?.integrity,bundleOwner,development:!!p.dev,optional:!!p.optional,installed,notices});
 }
 const licenses=[...new Set(packages.map(p=>p.license))].sort();
 const roots=[];for(const file of ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.md']){try{roots.push({file,sha256:hash(await readFile(join(root,file)))});}catch{}}
 reports.push({name,lockSha256:hash(bytes),packageCount:packages.length,licenses,roots,packages});
}
const sbom=JSON.parse(await readFile('docs/evidence/sbom.json','utf8'));
for(const v of sbom.vendored)assert.equal(hash(await readFile(v.local)),v.sha256);
await mkdir('.artifacts/dev-880/audit',{recursive:true});
await writeFile('.artifacts/dev-880/audit/result.json',JSON.stringify({reports,vendored:sbom.vendored,
 scope:'Lockfile inventory, installed-version and available notice-file hashes. Root Apache applies only to original work. All-platform optional packages may be absent on this host; metadata is not a legal compatibility opinion. No new runtime dependency or corpus adopted.'},null,2)+'\n');
console.log(JSON.stringify({audit:'passed',packages:reports.map(r=>({name:r.name,count:r.packageCount,licenses:r.licenses}))}));
