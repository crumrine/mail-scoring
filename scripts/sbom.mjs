// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const bytes=await readFile('package-lock.json');const lock=JSON.parse(bytes);
const packages=Object.entries(lock.packages).filter(([path,p])=>path.startsWith('node_modules/')&&!p.link).map(([path,p])=>({
  name:path.split('node_modules/').at(-1),version:p.version,license:p.license??'NOASSERTION',
  resolved:p.resolved,integrity:p.integrity,scope:'development-only',optional:p.optional??false,hasInstallScript:p.hasInstallScript??false,
}));
const sbom={format:'mail-scoring-provenance-1',lockSha256:createHash('sha256').update(bytes).digest('hex'),
  runtimeDependencies:[],vendored:[{name:'Mailguard authenticationFailed',repository:'https://github.com/Sarv/mailguard',revision:'ae51a1ddee18649ef729a4195313cbf57db22e87',version:'0.4.3',source:'src/verdict.ts',local:'packages/core/src/vendor/authentication-failed.ts',license:'MIT',data:'none',modifications:'Narrow type; non-null argument enforced by wrapper; retained predicate logic',sha256:createHash('sha256').update(await readFile('packages/core/src/vendor/authentication-failed.ts')).digest('hex')}],
  packages,notes:['All npm lifecycle scripts disabled by .npmrc; optional platform binaries installed by npm lock resolution.', 'Lock lists all platforms, while npm ci installs the host platform only.', 'Package-level tooling inventory; native workerd includes its upstream runtime components, not redistributed in this source repository. See exact upstream tag for full native notices.']};
const selected=JSON.parse(await readFile('docs/evidence/mailguard/rules-provenance.json','utf8'));
for(const a of selected.adaptations)sbom.vendored.push({name:`Mailguard ${a.functions}`,repository:selected.repository,revision:selected.revision,version:selected.version,source:a.source,sourceSha256:a.sourceSha256,local:a.local,license:selected.license,data:'none',modifications:a.modifications,sha256:createHash('sha256').update(await readFile(a.local)).digest('hex')});
await writeFile('docs/evidence/sbom.json',JSON.stringify(sbom,null,2)+'\n');
console.log(JSON.stringify({packages:packages.length,runtimeDependencies:0,vendored:sbom.vendored.length}));

await mkdir('.artifacts/licenses',{recursive:true});
await writeFile('.artifacts/licenses/sbom.json',JSON.stringify(sbom,null,2)+'\n');
const notices=[];
for(const [path,p] of Object.entries(lock.packages)) {
  if(!path.startsWith('node_modules/')||p.link)continue;
  let files;try{files=await readdir(path);}catch{continue;}
  for(const f of files.filter(f=>/^(licen[cs]e|notice|copying|thirdpartynotice)/i.test(f))) {
    try{const data=await readFile(`${path}/${f}`,'utf8');notices.push({package:path,version:p.version,license:p.license,file:f,sha256:createHash('sha256').update(data).digest('hex'),text:data});}catch{/* Directories carry component notices upstream. */}
  }
}
await writeFile('.artifacts/licenses/installed-notices.json',JSON.stringify(notices,null,2)+'\n');
