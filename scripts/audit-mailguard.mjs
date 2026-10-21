// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Explicit public-source research command; never part of the runtime. No upstream lifecycle scripts.
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import ts from 'typescript';
import assert from 'node:assert/strict';
const sha='ae51a1ddee18649ef729a4195313cbf57db22e87';
const dir=resolve('.artifacts/mailguard');await mkdir(dir,{recursive:true});
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});assert.equal(r.status,0,'audit_command_failed');return r.stdout;};
const download=async(url,path)=>{const r=await fetch(url);assert.ok(r.ok);const b=Buffer.from(await r.arrayBuffer());await writeFile(path,b);return b;};
const tgz=await download('https://registry.npmjs.org/@sarv-in/mailguard/-/mailguard-0.4.3.tgz',`${dir}/package.tgz`);
assert.equal(createHash('sha512').update(tgz).digest('base64'),'41QBqfaT69BHSuqhmsaFDU1nRURnui7fkiQ9L9FzdB/EzVVichTYnbcod7buqTBFNHa63e9qC/v5aMnTMWbu6g==');
const src=await download(`https://codeload.github.com/Sarv/mailguard/tar.gz/${sha}`,`${dir}/source.tgz`);
run('tar',['-xzf',`${dir}/package.tgz`,'-C',dir]);run('tar',['-xzf',`${dir}/source.tgz`,'-C',dir]);
const source=`${dir}/mailguard-${sha}`;
await mkdir(`${dir}/install`,{recursive:true});
await writeFile(`${dir}/install/package.json`,'{"private":true,"dependencies":{"@sarv-in/mailguard":"0.4.3"}}\n');
await copyFile('docs/evidence/mailguard/package-lock.json',`${dir}/install/package-lock.json`);
run('npm',['ci','--prefix',`${dir}/install`,'--ignore-scripts','--omit=optional','--no-audit','--no-fund']);
const pkg=JSON.parse(await readFile(`${dir}/package/package.json`,'utf8'));
assert.deepEqual(pkg,JSON.parse(await readFile(`${source}/package.json`,'utf8')));
assert.equal(await readFile(`${dir}/package/LICENSE`,'utf8'),await readFile(`${source}/LICENSE`,'utf8'));
const hash=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const files=[];const maps=[];
for(const file of (await readdir(`${dir}/package/dist`)).sort()) {
  const data=await readFile(`${dir}/package/dist/${file}`);files.push({file,bytes:data.length,sha256:hash(data)});
  if(!file.endsWith('.map')) continue;
  const m=JSON.parse(data);
  for(let i=0;i<m.sources.length;i++) {
    const path=m.sources[i].replace(/^\.\.\//,'');
    assert.ok(path.startsWith('src/') && !path.includes('..'));
    const checked=await readFile(`${source}/${path}`,'utf8');
    assert.equal(m.sourcesContent[i],checked,`source map mismatch ${path}`);maps.push(path);
  }
}
const graph={};
for(const [name,exp] of Object.entries(pkg.exports)) {
  const visited=new Set(),external=new Set();
  async function walk(file) {
    if(visited.has(file)) return;visited.add(file);
    const text=await readFile(file,'utf8');
    const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const imports=[];
    function scan(node) {
      if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if(ts.isCallExpression(node) && node.expression.kind===ts.SyntaxKind.ImportKeyword) {
        assert.ok(node.arguments.length===1 && ts.isStringLiteral(node.arguments[0]),'nonliteral dynamic import');
        imports.push(node.arguments[0].text);
      }
      ts.forEachChild(node,scan);
    }
    scan(ast);
    for(const spec of imports) {if(spec.startsWith('.')) await walk(resolve(dirname(file),spec));else external.add(spec);}

  }
  await walk(resolve(`${dir}/package`,exp.import.default));
  graph[name]={files:[...visited].map(x=>relative(`${dir}/package`,x)).sort(),external:[...external].sort()};
}
const builds={};
for(const [label,expression] of Object.entries({
  'narrow-verdict':`export { authenticationFailed } from '${dir}/install/node_modules/@sarv-in/mailguard/dist/verdict.js';`,
  'adapted-predicate':`export { authenticationFailed } from '${resolve('packages/core/src/vendor/authentication-failed.ts')}';`,
  'original-unknown-only':'export function score(){return {status:"partial",heuristicScore:0,signals:{spam:"unknown",phishing:"unknown",marketing:"unknown"}}}',
  'content-extract':`export { extractHtml } from '${dir}/install/node_modules/@sarv-in/mailguard/dist/content.js';`,
  'umbrella':`export * from '${dir}/install/node_modules/@sarv-in/mailguard/dist/index.js';`,
})) {
  try {
    const b=await build({stdin:{contents:expression,resolveDir:process.cwd(),sourcefile:`${label}.js`},bundle:true,format:'esm',platform:'browser',minify:true,metafile:true,write:false,logLevel:'silent'});
    builds[label]={bytes:b.outputFiles[0].contents.length,sha256:hash(b.outputFiles[0].contents),inputs:Object.keys(b.metafile.inputs).map(x=>x.replace('.artifacts/mailguard/','audit/')),imports:Object.values(b.metafile.outputs).flatMap(x=>x.imports)};
    await writeFile(`${dir}/${label}.js`,b.outputFiles[0].text);
  } catch(e) {builds[label]={failure:'browser_bundle_failed',unresolved:e.errors?.map(x=>x.text)??[]};}
}
// Execute real published narrow predicate at module initialization and inside workerd's test event.
const narrow=await readFile(`${dir}/narrow-verdict.js`,'utf8');
await writeFile(`${dir}/narrow-entry.js`, `import {authenticationFailed} from './narrow-verdict.js';
const input={spf:'fail',dkim:'fail',dmarc:'fail',overall:'fail'};
const initial=authenticationFailed(input);
export default {test(){if(!initial || !authenticationFailed(input)) throw new Error('candidate_failed');}};`);
await build({entryPoints:[`${dir}/narrow-entry.js`],bundle:true,format:'esm',platform:'browser',outfile:`${dir}/narrow-workerd.js`});
const config=(await readFile('workers/scorer/workerd.capnp','utf8')).replace('../../.artifacts/spike.js','../../.artifacts/mailguard/narrow-workerd.js');
await writeFile('workers/scorer/.audit.capnp',config);
try {run('node_modules/.bin/workerd',['test','workers/scorer/.audit.capnp','scorer']);}
finally {const {unlink}=await import('node:fs/promises');await unlink('workers/scorer/.audit.capnp');}
const lock=JSON.parse(await readFile(`${dir}/install/package-lock.json`,'utf8'));
const dependencies=[];
for(const [path,p] of Object.entries(lock.packages)) {
  if(!path || p.peer) continue;
  const root=`${dir}/install/${path}`;
  let manifest;try {manifest=JSON.parse(await readFile(`${root}/package.json`,'utf8'));}catch{continue;}
  const notices=[];
  for(const file of await readdir(root)) if(/^(license|notice|copying)/i.test(file)) notices.push({file,sha256:hash(await readFile(`${root}/${file}`))});
  dependencies.push({name:manifest.name,version:manifest.version,license:manifest.license,scripts:manifest.scripts??{},integrity:p.integrity,notices});
}
const evidence={candidate:{repository:'https://github.com/Sarv/mailguard',sha,version:pkg.version,tarballSha256:hash(tgz),sourceArchiveSha256:hash(src),sourceMapFilesVerified:[...new Set(maps)].sort(),packageManifestMatches:true,licenseMatches:true,lifecycleScripts:pkg.scripts,optionalPeers:pkg.peerDependencies},graph,builds,dependencies,narrowWorkerd:'passed',files};
await writeFile('docs/evidence/mailguard/audit.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({audit:'passed',sourceFiles:evidence.candidate.sourceMapFilesVerified.length,builds,narrowWorkerd:'passed'}));
