// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {lstat, mkdir, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

import {readBounded} from './files.mjs';
const GENERAL_MANIFEST_SHA = '111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803';
const GENERAL_PINS = {
 baseline:{inbox:'d49818571e969a537cd39ceaf9871bb7087576fa',scorer:'faa15bea06db52f2dc240257d5335a66a933f909'},
 candidate:{inbox:'5e694c7108e25437b5cd85f2cf1df6818f18e0ef',scorer:'041e79c5f56880b8eff0e210968569461cb95fc0'},
};
const FRESH_MANIFEST_SHA='3153073d1d498c1c1d3cafc63f64aad4415dab57c90e808e9c2a85eea909e380';
const CONTEXT_PINS={baseline:GENERAL_PINS.baseline,candidate:{inbox:'606d0edee433fbf2aee517b1f1b61e631251a79a',scorer:'5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0'}};
const RECALL_FRESH_SHA='2112573a17e0d71d96313846e7659b3aa5b574fc6b1e41a277f9d1481afe7552';
const STABLE_SECOND_SHA='fd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19';
const REFIT_THIRD_SHA='be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8';
const WORDPAIR_FOURTH_SHA='1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d';
const WORDPAIR_CONTROLS_SHA='973f7dd28694bc1b98a4be601a253a3fd1913da9eebbb187555b3d6622dbc3e2';
const REPLACEMENT_PINS={baseline:CONTEXT_PINS.candidate,candidate:{inbox:'2170ff6c5d29f0d8ecd8fb08f584556ae821f793',scorer:'f8aa6004c7a0990ae99dff51b2da0afe41bad412'}};
const REPLACEMENT_CONTROLS_SHA='4bba83f96cff7c545a38f8b75e8588890cce5ae23202337428bac0a8f20582fa';
const REPLACEMENT_MODEL_SHA='2a219245c49a089e0a61c8ff942533eac22f6090a358be8a757ee32dc25de852';
const REPLACEMENT_MODES=new Map([
 ['replacement-sa',[GENERAL_MANIFEST_SHA,null]],
 ['replacement-enron',[FRESH_MANIFEST_SHA,'enron-holdout-manifest.json']],
 ['replacement-first',[RECALL_FRESH_SHA,'recall-holdout-manifest.json']],
 ['replacement-second',[STABLE_SECOND_SHA,'recall-second-holdout-manifest.json']],
 ['replacement-third',[REFIT_THIRD_SHA,'recall-third-holdout-manifest.json']],
 ['replacement-fourth',[WORDPAIR_FOURTH_SHA,'recall-fourth-holdout-manifest.json']],
 ['replacement-fifth',['7e713aabc0adde0cc734cd7d73c3db13c919c96d6a765d42c7f468796bad1357','recall-fifth-holdout-manifest.json']],
]);
const WORDPAIR_PINS={baseline:CONTEXT_PINS.candidate,candidate:{inbox:'35718322ea97e1c6cec6adee8b0483950bc65f99',scorer:'453cc3423e222b0e853bf3d8e9d590ee01e44bf7'}};
const REFIT_CONTROLS_SHA='667dc0c9052480d0e63a83b7097550c1f8d9550a575ed9a15bf5d7d515e84975';
const REFIT_PINS={baseline:CONTEXT_PINS.candidate,candidate:{inbox:'b5a89a074e362d8123ee3bf260b6208c78503479',scorer:'62919bc8f939bc94c0552fc6a3917c03a3373646'}};
const STABLE_PINS={baseline:CONTEXT_PINS.candidate,candidate:{inbox:'c9bb28845088a8ad5ca6b91774d32053dd4ba246',scorer:'143e24e938365c31f2669fd5f9e918408383dc7e'}};
const RECALL_PINS={baseline:CONTEXT_PINS.candidate,candidate:{inbox:'049998e046cf37d5a5faf725d1fc75d5499d20b2',scorer:'0041d47f20d2565dc8725a3c11f0ed1af113ca74'}};
const PARTITIONS = ['diagnostic','validation','holdout'];
const MANIFEST_SHA = '4ff6356a2a674467d1d8ea6f97adf11d0cce04e12d03e6e22ea2f1b8e6ab7354';
const PINS = {
  baseline: {inbox:'08b92457015b3615e325cf4b57954daa12a628c2', scorer:'2fab406320ae3b3596345d2c76e0ef8a08593211'},
  candidate: {inbox:'d49818571e969a537cd39ceaf9871bb7087576fa', scorer:'faa15bea06db52f2dc240257d5335a66a933f909'},
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], {maxBuffer:16*1024*1024});
const sortedCounts = values => {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.keys(counts).sort().map(key => [key, counts[key]]));
};

function validateRecords(records, general = false, fresh = false) {
  if (!Array.isArray(records) || records.length > (fresh ? 2000 : general ? 6046 : 192)) throw new Error('manifest_count');
  const seen = new Set();
  for (const row of records) {
    if (!row || !/^[a-f0-9]{64}$/.test(row.id) || row.sha256 !== row.id ||
        !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > 2*1024*1024 ||
        !['ham','spam'].includes(row.label) ||
        !(fresh ? ['enron_ham','enron_spam'] : general ? ['easy_ham','hard_ham','spam','easy_ham_2','spam_2'] : ['easy_ham','hard_ham','spam']).includes(row.group) ||
        (row.label === 'spam') !== (fresh?row.group==='enron_spam':row.group.startsWith('spam')) ||
        row.path !== 'messages/' + row.id + '.eml' || ((!general||fresh) && !row.labelAuthority)) throw new Error('manifest_record');
    if (general && (!(fresh?['holdout','excluded']:['diagnostic','train','validation','holdout','excluded']).includes(row.partition) || typeof row.htmlOnly !== 'boolean')) throw new Error('manifest_partition');
    if (seen.has(row.id)) throw new Error('manifest_duplicate');
    seen.add(row.id);
  }
}

function parseManifest(bytes, general = false, fresh = false, expected = fresh ? FRESH_MANIFEST_SHA : general ? GENERAL_MANIFEST_SHA : MANIFEST_SHA) {
  if (hash(bytes) !== expected) throw new Error('manifest_hash');
  const manifest = JSON.parse(bytes);
  validateRecords(manifest.records, general, fresh);
  return manifest;
}

function verifySample(raw, record) {
  if (raw.byteLength !== record.bytes || hash(raw) !== record.sha256) throw new Error('sample_hash_or_size');
}

function metrics(rows) {
  let TP=0, FP=0, TN=0, FN=0;
  for (const row of rows) {
    if (row.label === 'spam') { if (row.quarantined) TP++; else FN++; }
    else { if (row.quarantined) FP++; else TN++; }
  }
  return {
    total:rows.length, spam:TP+FN, ham:TN+FP, TP, FP, TN, FN,
    precision:TP+FP ? TP/(TP+FP) : null,
    recall:TP+FN ? TP/(TP+FN) : null,
    falsePositiveRate:FP+TN ? FP/(FP+TN) : null,
    inspection:sortedCounts(rows.map(row => row.status)),
    ruleSets:sortedCounts(rows.map(row=>row.ruleSetVersion??'unavailable')),
    engineVersions:sortedCounts(rows.map(row=>row.engineVersion??'unavailable')),
    unavailableCauses:sortedCounts(rows.filter(row=>row.status==='unavailable').map(row=>row.unavailableCause??'unspecified')),
    uncertainty:sortedCounts(rows.map(row => row.status === 'unavailable' ? 'unavailable' : row.quarantined ? 'rule_evidence' : 'insufficient_evidence')),
    scores:sortedCounts(rows.map(row => row.score === null ? 'unavailable' : String(row.score))),
    reasons:sortedCounts(rows.flatMap(row => row.reasons.map(reason => reason.id))),
    limits:sortedCounts(rows.flatMap(row => row.limits)),
  };
}

function selfCheck() {
  const row = {label:'spam', quarantined:false, status:'unavailable', score:null, reasons:[], limits:[]};
  assert.deepEqual([metrics([]).precision,metrics([]).recall,metrics([]).falsePositiveRate],[null,null,null]);
  assert.deepEqual([metrics([row]).FN,metrics([row]).recall,metrics([row]).inspection.unavailable],[1,0,1]);
  const all = [row,{...row,quarantined:true,status:'partial',score:50},
    {...row,label:'ham',quarantined:true},{...row,label:'ham'}];
  assert.deepEqual([metrics(all).TP,metrics(all).FP,metrics(all).TN,metrics(all).FN],[1,1,1,1]);
  assert.deepEqual(metrics(all),metrics([...all].reverse()));
  const sample = {id:'a'.repeat(64),sha256:'a'.repeat(64),bytes:10,label:'ham',group:'hard_ham',path:'messages/'+'a'.repeat(64)+'.eml',labelAuthority:'test'};
  validateRecords([sample]);
  assert.throws(() => validateRecords([sample,sample]), /manifest_duplicate/);
  assert.throws(() => validateRecords([{...sample,label:'maybe'}]), /manifest_record/);
  assert.throws(() => validateRecords([{...sample,path:'../message.eml'}]), /manifest_record/);
  assert.throws(() => validateRecords([{...sample,sha256:'b'.repeat(64)}]), /manifest_record/);
  assert.throws(() => validateRecords([{...sample,bytes:2*1024*1024+1}]), /manifest_record/);
  assert.throws(()=>parseManifest(Buffer.from('{}')),/manifest_hash/);
  const raw=Buffer.from('synthetic');
  const record={bytes:raw.length,sha256:hash(raw)};
  verifySample(raw,record);
  assert.throws(()=>verifySample(Buffer.from('Synthetic'),record),/sample_hash_or_size/);
  assert.throws(()=>verifySample(Buffer.from('synthetic!'),record),/sample_hash_or_size/);
  return {passed:true, cases:['zero_denominators','unavailable_spam_still_FN','all_confusion_cells','order_invariance','duplicate','label','path','hash_identity','byte_limit','raw_hash','raw_size','manifest_hash']};
}

function generalAcceptance(variants, controls, partitionsToCheck=PARTITIONS) {
 const partitions=Object.fromEntries(partitionsToCheck.map(part=>{
  const before=variants.baseline.byPartition[part],after=variants.candidate.byPartition[part];
  return [part,{hamDidNotIncrease:after.metrics.FP<=before.metrics.FP,
   hardHamDidNotIncrease:after.hardHam.FP<=before.hardHam.FP}];
 }));
 const recallGain=variants.candidate.byPartition.holdout.metrics.recall-variants.baseline.byPartition.holdout.metrics.recall;
 const authoredHamFalsePositives=controls.candidate.filter(row=>row.kind==='authored_ham'&&row.quarantined).length;
 return {partitions,heldoutRecallGain:recallGain,requiredAbsoluteRecallGain:0.20,authoredHamFalsePositives,
  eligible:recallGain>=0.20&&authoredHamFalsePositives===0&&Object.values(partitions).every(p=>p.hamDidNotIncrease&&p.hardHamDidNotIncrease)};
}
function generalSelfCheck() {
 const sample={id:'a'.repeat(64),sha256:'a'.repeat(64),bytes:10,label:'spam',group:'spam_2',path:'messages/'+'a'.repeat(64)+'.eml',partition:'holdout',htmlOnly:true};
 validateRecords([sample],true);
 assert.throws(()=>validateRecords([{...sample,partition:'other'}],true),/manifest_partition/);
 assert.throws(()=>validateRecords([{...sample,htmlOnly:'yes'}],true),/manifest_partition/);
 const variant=recall=>({byPartition:Object.fromEntries(PARTITIONS.map(part=>[part,{metrics:{FP:0,recall},hardHam:{FP:0}}]))});
 const baseline=variant(0),candidate=variant(.20);
 assert.equal(generalAcceptance({baseline,candidate},{candidate:[]}).eligible,true);
 assert.equal(generalAcceptance({baseline,candidate:variant(.199)},{candidate:[]}).eligible,false);
 candidate.byPartition.validation.metrics.FP=1;
 assert.equal(generalAcceptance({baseline,candidate},{candidate:[]}).eligible,false);
 candidate.byPartition.validation.metrics.FP=0;candidate.byPartition.diagnostic.hardHam.FP=1;
 assert.equal(generalAcceptance({baseline,candidate},{candidate:[]}).eligible,false);
 assert.equal(generalAcceptance({baseline,candidate:variant(.50)},{candidate:[{kind:'authored_ham',quarantined:true}]}).eligible,false);
 const fresh={...sample,group:'enron_spam',labelAuthority:'original filename'};validateRecords([fresh],true,true);
 assert.throws(()=>validateRecords([{...fresh,label:'ham'}],true,true),/manifest_record/);
 assert.throws(()=>validateRecords([{...fresh,partition:'train'}],true,true),/manifest_partition/);
 assert.throws(()=>validateRecords([{...fresh,labelAuthority:''}],true,true),/manifest_record/);
 assert.equal(generalAcceptance({baseline,candidate:variant(.20)},{candidate:[]},['holdout']).eligible,true);
 const freshCandidate=variant(.20);freshCandidate.byPartition.holdout.metrics.FP=1;
 assert.equal(generalAcceptance({baseline,candidate:freshCandidate},{candidate:[]},['holdout']).eligible,false);
 return {passed:true,cases:['fresh_label_partition_authority','fresh_holdout_gate','general_record','partition','html_stratum','recall_boundary','recall_below_gate','validation_ham_regression','diagnostic_hard_ham_regression','authored_ham_regression']};
}

function recallAcceptance(variants, controls, partitionsToCheck, independent) {
 const partitions=Object.fromEntries(partitionsToCheck.map(part=>[part,Object.fromEntries(Object.entries(variants).map(([name,v])=>{
  const p=v.byPartition[part];return [name,{hamFalsePositives:p.metrics.FP,hardHamFalsePositives:p.hardHam.FP,htmlHamFalsePositives:p.htmlOnly.FP,otherHamFalsePositives:p.other.FP}];
 }))]));
 const before=variants.baseline.byPartition.holdout.metrics,after=variants.candidate.byPartition.holdout.metrics;
 const authoredHamFalsePositives=Object.fromEntries(Object.entries(controls).map(([name,rows])=>[name,rows.filter(r=>r.kind==='authored_ham'&&r.quarantined).length]));
 const zeroHam=Object.values(partitions).every(p=>Object.values(p).every(v=>Object.values(v).every(n=>n===0)))&&Object.values(authoredHamFalsePositives).every(n=>n===0);
 // Cross-products preserve the exact predeclared percentage boundaries.
 const recallAtLeastHalf=after.spam>0&&2*after.TP>=after.spam;
 const recallGainAtLeastTwentyPoints=before.spam>0&&after.spam>0&&100*(after.TP*before.spam-before.TP*after.spam)>=20*before.spam*after.spam;
 return {partitions,authoredHamFalsePositives,zeroObservedHamFalsePositives:zeroHam,independent,
  heldoutRecallGain:after.recall-before.recall,requiredAbsoluteRecallGain:0.20,requiredRecall:0.50,
  recallAtLeastHalf,recallGainAtLeastTwentyPoints,eligible:zeroHam&&(!independent||(recallAtLeastHalf&&recallGainAtLeastTwentyPoints))};
}
function recallSelfCheck(){
 const variant=(TP,FP=0)=>({byPartition:{holdout:{metrics:{TP,spam:1000,recall:TP/1000,FP},hardHam:{FP:0},htmlOnly:{FP:0},other:{FP}}}});
 const controls={baseline:[],candidate:[]};const check=(a,b)=>recallAcceptance({baseline:a,candidate:b},controls,['holdout'],true);
 assert.equal(check(variant(300),variant(500)).eligible,true);
 assert.equal(check(variant(301),variant(500)).eligible,false);
 assert.equal(check(variant(0),variant(499)).eligible,false);
 assert.equal(check(variant(500),variant(700)).eligible,true);
 assert.equal(check(variant(300,1),variant(500)).eligible,false);
 assert.equal(check(variant(300),variant(500,1)).eligible,false);
 const hard=variant(500);hard.byPartition.holdout.hardHam.FP=1;assert.equal(check(variant(300),hard).eligible,false);
 const authored={baseline:[{kind:'authored_ham',quarantined:true}],candidate:[]};
 assert.equal(recallAcceptance({baseline:variant(300),candidate:variant(500)},authored,['holdout'],true).eligible,false);
 assert.equal(recallAcceptance({baseline:variant(300),candidate:variant(300)},controls,['holdout'],false).eligible,true);
 return {passed:true,cases:['exact_50percent','exact_20point_gain','below_recall','below_gain','floating_boundary','baseline_ham_FP','candidate_ham_FP','hard_ham_FP','authored_ham_FP','observed_regression_not_independent']};
}

async function exportSource(repo, pin, paths, target) {
  if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error('source_pin');
  git(repo, 'cat-file', '-e', pin+'^{commit}');
  await mkdir(target, {recursive:true});
  const archive = git(repo, 'archive', pin, ...paths);
  execFileSync('tar', ['-xf','-','-C',target], {input:archive});
  return hash(archive);
}

async function run(dataDir, inboxRepo, scorerRepo, outputDir, mode = 'legacy') {
  const replacement=REPLACEMENT_MODES.get(mode);
  const wordpair=mode.startsWith('wordpair-'),refit=mode.startsWith('refit-'),stable=mode.startsWith('stable-'),recall=mode.startsWith('recall-')||stable||refit||wordpair||!!replacement,independent=mode==='replacement-fifth'||mode==='recall-fresh'||mode==='stable-second'||mode==='refit-third'||mode==='wordpair-fourth';
  const general=mode!=='legacy',fresh=!!replacement?.[1]||mode==='fresh'||mode==='recall-enron'||mode==='stable-enron'||mode==='stable-first'||['refit-enron','refit-first','refit-second','wordpair-enron','wordpair-first','wordpair-second','wordpair-third'].includes(mode)||independent,context=mode==='context'||fresh||recall;
  const partitionsToCheck=fresh?['holdout']:PARTITIONS;
  const manifestSha=replacement?replacement[0]:mode==='wordpair-fourth'?WORDPAIR_FOURTH_SHA:(mode==='refit-third'||mode==='wordpair-third')?REFIT_THIRD_SHA:(mode==='stable-second'||mode==='refit-second'||mode==='wordpair-second')?STABLE_SECOND_SHA:(independent||mode==='stable-first'||mode==='refit-first'||mode==='wordpair-first')?RECALL_FRESH_SHA:fresh?FRESH_MANIFEST_SHA:general?GENERAL_MANIFEST_SHA:MANIFEST_SHA;
  const pinsByVariant=replacement?REPLACEMENT_PINS:wordpair?WORDPAIR_PINS:refit?REFIT_PINS:stable?STABLE_PINS:recall?RECALL_PINS:context?CONTEXT_PINS:general?GENERAL_PINS:PINS;
  const runtimeProfile=general ? (await import('./mime-runtime.mjs')).MIME_RUNTIME : undefined;
  // Validate BOTH immutable candidates before producing any held-out prediction.
  for(const pins of Object.values(pinsByVariant)) for(const [repo,pin] of [[inboxRepo,pins.inbox],[scorerRepo,pins.scorer]]) {
    if(!/^[a-f0-9]{40}$/.test(pin)) throw new Error('source_pin');
    git(repo,'cat-file','-e',pin+'^{commit}');
  }
  selfCheck();if(general)generalSelfCheck();if(recall)recallSelfCheck();
  dataDir=resolve(dataDir); inboxRepo=resolve(inboxRepo); scorerRepo=resolve(scorerRepo); outputDir=resolve(outputDir);
  for (const [repo, expected] of [[inboxRepo,'https://github.com/crumrine/agentic-inbox-imap'],[scorerRepo,'https://github.com/crumrine/mail-scoring']]) {
    if (git(repo,'remote','get-url','origin').toString().trim().replace(/\.git$/,'') !== expected) throw new Error('repository_origin');
  }
  const manifestPath=replacement?(replacement[1]?new URL('./'+replacement[1],import.meta.url):join(dataDir,'partitions.json')):mode==='wordpair-fourth'?new URL('./recall-fourth-holdout-manifest.json',import.meta.url):(mode==='refit-third'||mode==='wordpair-third')?new URL('./recall-third-holdout-manifest.json',import.meta.url):(mode==='stable-second'||mode==='refit-second'||mode==='wordpair-second')?new URL('./recall-second-holdout-manifest.json',import.meta.url):(independent||mode==='stable-first'||mode==='refit-first'||mode==='wordpair-first')?new URL('./recall-holdout-manifest.json',import.meta.url):fresh?new URL('./enron-holdout-manifest.json',import.meta.url):join(dataDir,general?'partitions.json':'manifest.json');
  const manifestBytes = await readBounded(manifestPath,general?4*1024*1024:256*1024);
  const manifest = parseManifest(manifestBytes,general,fresh,manifestSha);
  if (manifest.records.length !== (fresh?2000:general?6046:192) || (await lstat(join(dataDir,'messages'))).isSymbolicLink()) throw new Error('manifest_count_or_path');
  const selectedRecords=general?manifest.records.filter(r=>partitionsToCheck.includes(r.partition)):manifest.records;
  assert.equal(selectedRecords.length,fresh?2000:general?2736:192);
  if(general&&!fresh)assert.deepEqual(PARTITIONS.map(p=>selectedRecords.filter(r=>r.partition===p).length),[192,556,1988]);
  const require = createRequire(join(inboxRepo,'package.json'));
  const {build,version:esbuildVersion} = require('esbuild');
  const PostalMime = require('postal-mime');
  if (typeof PostalMime.parse !== 'function') throw new Error('parser_export');
  const parserEntry=require.resolve('postal-mime');
  const parserPackage=JSON.parse(await readFile(join(dirname(parserEntry),'../package.json')));
  const lockedParser = JSON.parse(await readFile(join(inboxRepo,'package-lock.json'))).packages['node_modules/postal-mime'].version;
  if (parserPackage.version !== lockedParser) throw new Error('installed_parser_version');
  for (const pins of Object.values(pinsByVariant)) {
    const locked = JSON.parse(git(inboxRepo,'show',pins.inbox+':package-lock.json')).packages['node_modules/postal-mime'].version;
    if (locked !== lockedParser) throw new Error('parser_version_drift');
  }
  const scratch = await mkdtemp(join(tmpdir(),'spam-evaluation-'));
  const variants={}, controls={}, identities={};
  let generalProvenance;
  let authoredSpam,pharmacySpam,legitimateNotices;
  if(general){
    const model=git(scorerRepo,'show',pinsByVariant.candidate.scorer+':packages/core/src/'+(recall?'linear-model.ts':context?'context-model.ts':'general-model.ts'));
    assert.equal(hash(model),replacement?REPLACEMENT_MODEL_SHA:wordpair?'ce506fc71c7b465ccf2fef1218c821739c381509c93abd7f8a98ec4da516d052':refit?'a08e63c014ef291ad94a6c1c357aca0b7fc308948efb7720d35133d4fb487d8f':stable?'e696518b43c30ce9df8275956542d5113fe53ddb20243f15c23740cfb6ffec8c':recall?'52c58c189621f5f1ad74d28103d18b803d609af5a8a48c6dab52239435652473':context?'e20fe32bbe2688c9407a9b1e8a6e36cce9563800f1b2bdb5878270bdb73e5ab6':'1689e31898347d42d74bb213284be00e92f70ba2161edfa7afd9eb85da2a16f0');
    const fixture=git(scorerRepo,'show',pinsByVariant.candidate.scorer+':fixtures/statistical.ts');
    assert.equal(hash(fixture),replacement||wordpair?'5cbb6cf184e77829b2bc4b18069c0580f8371cf451745beed85fba32c59d3f40':refit?'279a791b633f1dc87dafc1dbd4b3f6565a70dd114870704f0a2ca57ae05b26b3':stable?'32326aad52ba0548f52622ecc7d85704b2d359881b22c94b9f00d7342e1dad8f':context?'33359d73a7c0a466be12a28fe7d72286f65e7eafb48ea2252df36f256bf2e80a':'75ec84c3fd3f6fb48e6ede7a716b36a7a32def1dff222cef4bf18d098d817541');
    const fixtureModule=join(scratch,'authored-fixture.mjs');
    await build({stdin:{contents:fixture.toString(),loader:'ts',resolveDir:scorerRepo},outfile:fixtureModule,bundle:true,platform:'node',format:'esm'});
    ({STATISTICAL_SPAM:authoredSpam,PHARMACY_SPAM:pharmacySpam}=await import(pathToFileURL(fixtureModule)));
    if(recall){
      const notices=git(scorerRepo,'show',pinsByVariant.candidate.scorer+':fixtures/legitimate-notices.ts');
      const noticeModule=join(scratch,'notices.mjs');await build({stdin:{contents:notices.toString(),loader:'ts',resolveDir:scorerRepo},outfile:noticeModule,bundle:true,platform:'node',format:'esm'});
      ({LEGITIMATE_NOTICES:legitimateNotices}=await import(pathToFileURL(noticeModule)));assert.equal(legitimateNotices.length,37);
      if(refit||wordpair||replacement){
        const controlsBytes=await readBounded(new URL(replacement?'./replacement-legitimate-controls.json':wordpair?'./wordpair-legitimate-controls.json':'./refit-legitimate-controls.json',import.meta.url),1024*1024);
        assert.equal(hash(controlsBytes),replacement?REPLACEMENT_CONTROLS_SHA:wordpair?WORDPAIR_CONTROLS_SHA:REFIT_CONTROLS_SHA);
        const frozen=JSON.parse(controlsBytes);assert.equal(frozen.records.length,replacement?167:wordpair?143:119);
        assert.equal(new Set(frozen.records.map(r=>r.id)).size,replacement?167:wordpair?143:119);
        for(const r of frozen.records){
          assert.equal(r.label,'ham');assert.equal(typeof r.id,'string');assert.equal(typeof r.stratum,'string');
          assert.equal(typeof r.subject,'string');assert.equal(typeof r.text,'string');assert.ok(!/[\r\n]/.test(r.subject));
          assert.ok(Buffer.byteLength(r.subject)<=2048&&Buffer.byteLength(r.text)<=32768);
        }
        legitimateNotices=frozen.records;
      }
    }
    generalProvenance={modelVersion:replacement?'general-8':wordpair?'general-7':refit?'general-6':stable?'general-5':recall?'general-4':context?'general-3':'general-1',modelSourceSha256:hash(model),partitionSha256:manifestSha,cutoff:0.99,minClues:20,maxClues:64,authoredFixtureSha256:hash(fixture),...(recall?{...(replacement?{minimumPositivePercent:55,twoWordIncidentPositiveLowerBound:true,trainingGridSha256:'caf9ea19d98aa49b93722c61cfa808dd56a0d54b82e8252406acbfc1517daea2',vocabularyCap:50000,legitimateControlsSha256:REPLACEMENT_CONTROLS_SHA}:wordpair?{twoWordIncidentPositiveLowerBound:true,trainingGridSha256:'d9105721552555568fd4f387654bcda5029190dc93fe6a201ac81af86c2cbfae',vocabularyCap:50000,legitimateControlsSha256:WORDPAIR_CONTROLS_SHA}:refit?{twoPositiveContributionLowerBound:true,fixedReferenceConjunction:true,minimumPositiveBodyWordsPerHead:5,legitimateControlsSha256:REFIT_CONTROLS_SHA}:stable?{singlePositiveWordStability:true}:{}),trainingMatrixSha256:'1e86b9a7f97af06517a7bb00faeb42d5f4e6ba264678c7548e714a1b471dfd49',minimumPositiveBodyWords:5,minimumKnownBodyPercent:50,supportedRepresentation:'NFKC normalized ASCII letters, no other letters or marks',minClues:undefined,maxClues:undefined}:{}),scorerLockSha256:hash(git(scorerRepo,'show',pinsByVariant.candidate.scorer+':package-lock.json'))};
  }
  let networkAttempts=0;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=()=>{ networkAttempts++; throw new Error('evaluation_network_forbidden'); };
  try {
    for (const [name,pins] of Object.entries(pinsByVariant)) {
      const inbox=join(scratch,name,'inbox'), scorer=join(scratch,name,'scorer');
      identities[name] = {pins,
        inboxArchiveSha256:await exportSource(inboxRepo,pins.inbox,['workers/lib/mail-scoring'],inbox),
        scorerArchiveSha256:await exportSource(scorerRepo,pins.scorer,['packages/core/src','workers/private'],scorer)};
      const modulePath=join(scratch,name,'pipeline.mjs');
      await build({stdin:{contents:'export {assessArrival,inspectableRaw,shouldQuarantine,unavailable} from '+JSON.stringify(join(inbox,'workers/lib/mail-scoring/intake.ts'))+';export {scoreRpc} from '+JSON.stringify(join(scorer,'workers/private/adapter.ts'))+';',loader:'ts',resolveDir:scratch},outfile:modulePath,bundle:true,platform:'node',format:'esm',nodePaths:[join(scorerRepo,'node_modules')]});
      identities[name].bundleSha256=hash(await readFile(modulePath));
      const module=await import(pathToFileURL(modulePath));
      const classify=async raw=>{
        let assessment,parseUnavailable=false,unavailableCause=null;
        // readBounded and verifySample establish exact complete-file bytes.
        if (!module.inspectableRaw(raw, true)) { assessment=module.unavailable(); unavailableCause='raw_preflight'; }
        else {
          try {
            const parsed=await PostalMime.parse(raw);
            assessment=await module.assessArrival({MAIL_SCORING_MODE:'filter',MAIL_SCORER:{scoreV1:async(...args)=>module.scoreRpc(...args)}},parsed,true,undefined,'none');
          } catch {assessment=module.unavailable();parseUnavailable=true;unavailableCause='mime_or_pipeline_error';}
        }
        if (assessment?.status==='unavailable' && !unavailableCause) unavailableCause='scorer_unavailable';
        return {quarantined:module.shouldQuarantine(assessment,'none'), status:assessment?.status??'unavailable',
          policyVersion:assessment?.policyVersion??null,engineVersion:assessment?.result?.engineVersion??null,ruleSetVersion:assessment?.result?.ruleSetVersion??null,
          score:assessment?.result?.heuristicScore??null,reasons:assessment?.result?.reasons.map(r=>({id:r.id,contribution:r.contribution}))??[],
          limits:assessment?.result?.limitsHit??[],parseUnavailable,unavailableCause};
      };
      const evaluate=async records=>{
        const rows=[];
        for (const record of records) {
          const raw=new Uint8Array(await readBounded(join(dataDir,record.path),record.bytes));
          verifySample(raw,record);
          rows.push({id:record.id,label:record.label,group:record.group,...(general?{partition:record.partition,htmlOnly:record.htmlOnly}:{}),...await classify(raw)});
        }
        return rows.sort((a,b)=>a.id.localeCompare(b.id));
      };
      const marker='XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X';
      const mime=(body,subject='Synthetic',headers=[],type='text/plain; charset=utf-8')=>new TextEncoder().encode('From: sender@example.test\r\nTo: mailbox@example.test\r\nSubject: '+subject+'\r\n'+(headers.length?headers.join('\r\n')+'\r\n':'')+'MIME-Version: 1.0\r\nContent-Type: '+type+'\r\n\r\n'+body);
      const cases=[['gtube',mime(marker),general||name==='candidate'],['quoted',mime('> '+marker),false],
        ['near',mime(marker.toLowerCase()),false],['subject_only',mime('Ordinary receipt.',marker),false],
        ['mixed',mime('\u202e> '+marker+'\n'+marker.replace('GTUBE','GT\u202eUBE')),false],
        ['security_notice',mime('Your sign-in verification code is 123456. Never share it.'),false],
        ['receipt',mime('Your order receipt is ready at https://shop.example.test/order.'),false],
        ['newsletter',mime('This week in the newsletter: https://news.example.test/','Synthetic newsletter',['List-Id: news.example.test']),false],
        ['ordinary_link',mime('The meeting agenda is at https://team.example.test/agenda.'),false],
        ['new_correspondent',mime('Hello, I would like to arrange a meeting.'),false],
        ['quoted_scam',mime('Thank you.\n> Security team: verify your password https://user@example.test/'),false],
        ['forwarded_scam',mime('For your records.\n-----Original Message-----\nSecurity team: verify your password https://user@example.test/'),false],
        ['unicode_ham',mime('こんにちは。明日の会議は午後三時です。'),false],
        ['userinfo_miss',mime('Account access: https://accounts.example.test@other.example.test/'),false]];
      if(general){
        cases.push(['general_plain',mime(authoredSpam),recall||name==='candidate',recall||name==='candidate'?60:0],
          ['general_html',mime(`<p>${authoredSpam}</p>`,'Synthetic',[],'text/html; charset=utf-8'),recall||name==='candidate',recall||name==='candidate'?60:0],
          ['hidden_html',mime(`<p hidden>${authoredSpam}</p><p>Ordinary meeting.</p>`,'Synthetic',[],'text/html; charset=utf-8'),false,0],
          ['quoted_html',mime(`<blockquote>${authoredSpam}</blockquote>`,'Synthetic',[],'text/html; charset=utf-8'),false,0],
          ['medical',mime('Your appointment is confirmed. Please bring your insurance card and medication list.'),false,0],
          ['financial',mime('Your statement is ready. Use your usual bookmark to review your account balance.'),false,0]);
        if(context)cases.push(['repeated_body',mime('qzxv '.repeat(5),authoredSpam.trim()),false,0],
          ['general_pharmacy_plain',mime(pharmacySpam),recall||name==='candidate',recall||name==='candidate'?60:0],
          ['general_pharmacy_html',mime(`<p>${pharmacySpam}</p>`,'Synthetic',[],'text/html; charset=utf-8'),recall||name==='candidate',recall||name==='candidate'?60:0]);
        const inline=body=>new TextEncoder().encode(['From: Security Team <sender@example.test>','Reply-To: helpdesk@other.example.org','To: mailbox@example.test','Subject: Fwd: verify your password','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary=report','','--report','Content-Type: text/plain','','Please investigate the reported phishing.','--report','Content-Type: message/rfc822','Content-Disposition: inline','','From: reported@example.test','Subject: Evidence','MIME-Version: 1.0','Content-Type: text/plain','','Security team: verify your password. '+body,'--report--',''].join('\r\n'));
        cases.push(['inline_report',inline(''),!recall&&name==='baseline',45],['oversized_inline_report',inline('x'.repeat(32768)),!recall&&name==='baseline',!recall&&name==='baseline'?45:null]);
      }
      if(recall)for(const [index,sample] of legitimateNotices.entries())for(const html of [false,true]){
        const text=(refit||wordpair||replacement)?sample.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'):sample.text;
        cases.push([(refit||wordpair||replacement)?'legitimate_'+sample.id+'_'+(html?'html':'plain'):'legitimate_'+index+'_'+html,mime(html?`<p>${text}</p>`:sample.text,sample.subject,[],`text/${html?'html':'plain'}; charset=utf-8`),false,0]);
      }
      controls[name]=[];
      for (const [id,raw,expected,scoreOverride] of cases) {
        const result=await classify(raw);
        const additionalReferenceHam=replacement&&name==='baseline'&&legitimateNotices.slice(143).some(r=>id==='legitimate_'+r.id+'_plain'||id==='legitimate_'+r.id+'_html');
        if(!additionalReferenceHam)assert.equal(result.quarantined,expected,name+' installation/hard-ham control '+id);
        const expectedScore=scoreOverride!==undefined?scoreOverride:(general||name==='candidate')?(id==='gtube'?100:id==='userinfo_miss'?15:0):0;
        if(!additionalReferenceHam)assert.equal(result.score,expectedScore,name+' control score '+id);
        const kind=id.startsWith('general_')?'authored_spam':id==='userinfo_miss'?'authored_known_miss':['gtube','quoted','near','subject_only','mixed'].includes(id)?'installation':'authored_ham';
        controls[name].push({id,kind,truth:kind==='authored_ham'?'ham':['authored_known_miss','authored_spam'].includes(kind)?'spam':'installation_control',...result});
      }
      const forward=await evaluate(selectedRecords);
      assert.deepEqual(forward,await evaluate([...selectedRecords].reverse()),'repeated/order-invariant classification');
      variants[name]={metrics:metrics(forward),hardHam:metrics(forward.filter(r=>r.group==='hard_ham')),rows:forward,...(general?{byPartition:Object.fromEntries(partitionsToCheck.map(part=>{const rows=forward.filter(r=>r.partition===part);return [part,{metrics:metrics(rows),hardHam:metrics(rows.filter(r=>r.group==='hard_ham')),htmlOnly:metrics(rows.filter(r=>r.htmlOnly)),other:metrics(rows.filter(r=>!r.htmlOnly))}];}))}:{})};
    }
    assert.equal(networkAttempts,0);
  } finally {
    globalThis.fetch=originalFetch;
    await rm(scratch,{recursive:true,force:true});
  }
  const baseline=new Map(variants.baseline.rows.map(row=>[row.id,row]));
  const evidence=row=>[row.quarantined,row.status,row.score,row.reasons,row.limits,row.unavailableCause];
  const changes=variants.candidate.rows.filter(row=>JSON.stringify(evidence(row))!==JSON.stringify(evidence(baseline.get(row.id))))
    .map(row=>{
      const before=baseline.get(row.id);
      return {id:row.id,label:row.label,before,after:row,scoreDelta:(row.score??0)-(before.score??0),
        addedReasons:row.reasons.filter(reason=>!before.reasons.some(old=>old.id===reason.id&&old.contribution===reason.contribution)),
        removedReasons:before.reasons.filter(reason=>!row.reasons.some(current=>current.id===reason.id&&current.contribution===reason.contribution))};
    });
  const regressions=Object.fromEntries(Object.entries(variants).map(([name,v])=>[name,v.rows.filter(r=>r.label==='spam'&&!r.quarantined||r.label==='ham'&&r.quarantined)]));
  let replacementGate;
  if(replacement){
    for(const row of variants.candidate.rows){
      assert.equal(row.policyVersion,'inbox-scoring-9');
      if(row.status==='partial'){assert.equal(row.ruleSetVersion,'rules-10');assert.equal(row.engineVersion,'0.1.0');}
    }
    for(const row of controls.candidate.filter(r=>r.id.startsWith('legitimate_'))){
      assert.equal(row.policyVersion,'inbox-scoring-9');assert.equal(row.ruleSetVersion,'rules-10');
    }
    const {compareReplacement}=await import('./replacement-comparator.mjs');
    const authoredIds=legitimateNotices.flatMap(r=>['plain','html'].map(type=>'legitimate_'+r.id+'_'+type));
    replacementGate={...compareReplacement({manifestSha256:manifestSha,identities,policy:{mode:'filter'},checks:{networkAttempts,repeatedOrderInvariant:true},variants,controls},authoredIds),heldoutRecallGain:variants.candidate.byPartition.holdout.metrics.recall-variants.baseline.byPartition.holdout.metrics.recall};
  }
  const generalGate=replacement?replacementGate:recall?recallAcceptance(variants,controls,partitionsToCheck,independent):general?generalAcceptance(variants,controls,partitionsToCheck):undefined;
  const releaseReady=general?generalGate.eligible:variants.candidate.metrics.FP<=variants.baseline.metrics.FP && variants.candidate.hardHam.FP<=variants.baseline.hardHam.FP;
  const report={manifestSha256:manifestSha,evaluationMode:mode,independentHoldout:recall?independent:general&&(!context||fresh),selection:manifest.selection,...(replacement?{study:'replacement fifth acceptance',cohortRole:independent?'untouched fifth sample':'previously observed regression',selectedIdLabelsSha256:hash(JSON.stringify(selectedRecords.map(r=>[r.id,r.label]).sort((a,b)=>a[0].localeCompare(b[0]))))}:wordpair?{study:'word and adjacent-pair fourth acceptance',cohortRole:independent?'untouched disjoint same-archive union sample':'previously observed regression',selectedIdLabelsSha256:hash(JSON.stringify(selectedRecords.map(r=>[r.id,r.label]).sort((a,b)=>a[0].localeCompare(b[0]))))}:refit?{study:'fixed refit third acceptance',cohortRole:mode==='refit-third'?'untouched disjoint same-archive sample':'previously observed regression'}:stable?{study:'precision-corrected second acceptance',cohortRole:mode==='stable-second'?'untouched disjoint same-archive sample':mode==='stable-first'?'first failed acceptance now regression':'previously observed regression'}:{}),...(general?{partitionSummary:manifest.summary,hardHamSubset:fresh?'not supplied by corpus; prior hard-ham regression separately required':'frozen hard_ham labels',generalProvenance,generalGate,selectedPartitions:partitionsToCheck}:{}),
    sourceTerms:fresh?'https://www2.aueb.gr/users/ion/data/enron-spam/readme.txt':'https://spamassassin.apache.org/old/publiccorpus/readme.html',
    runtime:{node:process.version,...(runtimeProfile?{profile:runtimeProfile}:{}),parser:lockedParser,parserEntrySha256:hash(await readFile(parserEntry)),consumerLockSha256:hash(await readFile(join(inboxRepo,'package-lock.json'))),esbuild:esbuildVersion},
    runnerSha256:hash(await readFile(fileURLToPath(import.meta.url))), sourceRepositoryHead:git(scorerRepo,'rev-parse','HEAD').toString().trim(),identities,
    checks:{selfChecks:selfCheck(),...(general?{generalSelfChecks:generalSelfCheck()}:{}),...(recall?{recallSelfChecks:recallSelfCheck()}:{}),repeatedOrderInvariant:true,networkAttempts,standardControlsExcludedFromMetrics:true},
    policy:{mode:'filter',ordinaryThreshold:45,...(general?{statisticalThreshold:60,cutoff:0.99,...(recall?{minimumPositiveBodyWords:5,minimumKnownBodyPercent:50}:{minClues:20,maxClues:64})}:{}),preference:'none',transport:'unknown',scope:'actual production MIME parser, intake/assessment, serialized scorer RPC adapter and routing policy; no mailbox mutation'},
    variants,controls,changes,decisionChanges:changes.filter(row=>row.before.quarantined!==row.after.quarantined),regressions,
    release:{scope:replacement?(independent?'Frozen fifth kitchen-l/GP research sample; OPS-615 owns manual deployment':'Six previously observed corpora, regression only'):wordpair?(independent?'Fourth frozen disjoint SH/kaminski-v and BG/beck-s paired acceptance; dated same research archives, not a modern provider population; OPS-615 owns manual deployment':'Five previously observed corpora are regression only, not independent acceptance'):recall?(independent?'Fresh untouched frozen SH/kaminski-v paired acceptance; OPS-615 owns manual deployment':'Observed SA/Enron regression only; not independent acceptance'):context?(fresh?'Fresh frozen independent Enron-Spam raw holdout; original unseen membership retained':'Observed diagnostic/validation/old holdout REGRESSION ONLY; independent acceptance still required'):general?'Paired frozen diagnostic/validation/holdout acceptance; OPS-614 owns manual release gates':'Bounded source-regression evidence; OPS-599 owns remaining manual release gates',candidateRoutingFalsePositivesDidNotIncrease:variants.candidate.metrics.FP<=variants.baseline.metrics.FP,hardHamRoutingFalsePositivesDidNotIncrease:variants.candidate.hardHam.FP<=variants.baseline.hardHam.FP,eligible:releaseReady&&(recall?independent:!(context&&!fresh)),regressionGatePassed:releaseReady,remainingMisses:variants.candidate.metrics.FN},
    limits:[...(fresh?['Enron-Spam raw source archives are dated research mail, not modern provider traffic. Balanced fixed sample; no separately labeled hard-ham subset.']:context?['Original holdout was observed before model redesign; it is regression evidence, not independent acceptance.']:[]),fresh?'Enron-Spam was published in 2006 and is not representative of a current mailbox.': 'SpamAssassin corpus dates to 2003 and is not representative of a current mailbox; frozen HTML-only strata describe bounded extraction, not rendered visibility.',
      'Inspection completeness and classification uncertainty are separate. Retained mail is not classified safe.',
      'Unavailable spam remains a routing miss; unavailable counts are also reported separately.',
      'No training, threshold tuning, mail sending, DNS/auth replay or production accuracy claim.']};
  await mkdir(outputDir,{recursive:true});
  await writeFile(join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  const lines=['# Paired offline routing evaluation','', replacement&&independent?'Fresh frozen untouched fifth kitchen-l/GP research sample, 1,000 legitimate and 1,000 spam.':independent?'Fresh frozen untouched SH/kaminski-v,1000spam/1000ham. Fixed before development and predictions, deduplicated against all previous sources; original exclusions retained.':recall?'Previously observed public corpora REGRESSION ONLY.':fresh?'Fresh independent frozen Enron-Spam raw holdout2000 (1000ham/1000spam), before predictions; prior raw/body-feature matches excluded, membership explicit and fixed.':context?'Observed public diagnostic192/validation556/oldholdout1988 REGRESSION ONLY. Fresh independent acceptance required.':general?'Fixed disjoint public data: diagnostic192, validation556 and independent holdout1988. Training/exclusions and authored/installation controls are excluded from metrics.':'Fixed public-corpus slice: 192 messages, 128 ham and 64 spam. Standard installation controls are excluded.','',
    '| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |','| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const [name,v] of Object.entries(variants)) { const m=v.metrics; lines.push('| '+[name,m.TP,m.FP,m.TN,m.FN,m.precision??'undefined',m.recall??'undefined',m.falsePositiveRate??'undefined'].join(' | ')+' |'); }
  if(general){
    lines.push('','| Partition | Variant | TP | FP | TN | FN | Recall |','| --- | --- | --- | --- | --- | --- | --- |');
    for(const part of partitionsToCheck)for(const [name,v]of Object.entries(variants)){const m=v.byPartition[part].metrics;lines.push('| '+[part,name,m.TP,m.FP,m.TN,m.FN,m.recall].join(' | ')+' |');}
    if(replacement)lines.push('', 'Replacement requires zero legitimate catches on every test and, on the fifth cohort, at least 50% recall and a gain of at least 20 points. Reference false positives remain recorded. Gate: '+(releaseReady?'PASSED':'FAILED')+'.');
    else lines.push('',...(recall?['Predeclared recall >=50% and gain >=20 points on fresh cohort; zero observed HAM in BOTH variants and every corpus/partition/stratum/control. Observed corpora are regression only.']:[]),'Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: '+(releaseReady?'PASSED':'FAILED')+'. Actual gain: '+(generalGate.heldoutRecallGain*100).toFixed(2)+' percentage points.');
  }
  lines.push('', 'Candidate misses remain '+report.release.remainingMisses+'. All sample changes and misses/false positives are retained by opaque content hash in report.json.','',
    'These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.','',
    (context&&!fresh?'Observed-data regression gate (does not establish independent release acceptance): ':'Release regression gate: ')+(releaseReady?'PASSED on the declared frozen inputs.':'FAILED: one or more declared acceptance conditions failed; corrective source and fresh review required.'),'',
    'Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.');
  await writeFile(join(outputDir,'report.md'),lines.join('\n')+'\n');
  console.log(JSON.stringify({baseline:variants.baseline.metrics,candidate:variants.candidate.metrics,changes:changes.length,releaseReady:report.release.eligible,acceptanceConditionsPassed:releaseReady}));
  if (!releaseReady) process.exitCode=1;
}

if(process.argv[2]==='--recall-self-check'){await import('./mime-runtime.mjs');console.log(JSON.stringify({legacy:selfCheck(),general:generalSelfCheck(),recall:recallSelfCheck()}));}
else if(process.argv[2]==='--general'&&process.argv[3]==='--self-check') {await import('./mime-runtime.mjs');console.log(JSON.stringify({legacy:selfCheck(),general:generalSelfCheck()}));}
else if(REPLACEMENT_MODES.has(process.argv[2]?.slice(2))&&process.argv[2].startsWith('--')&&process.argv.length===7) await run(...process.argv.slice(3),process.argv[2].slice(2));
else if(['--general','--context','--fresh','--recall-sa','--recall-enron','--recall-fresh','--stable-sa','--stable-enron','--stable-first','--stable-second','--refit-sa','--refit-enron','--refit-first','--refit-second','--refit-third','--wordpair-sa','--wordpair-enron','--wordpair-first','--wordpair-second','--wordpair-third','--wordpair-fourth'].includes(process.argv[2])&&process.argv.length===7) await run(...process.argv.slice(3),process.argv[2].slice(2));
else if (process.argv[2]==='--self-check') console.log(JSON.stringify(selfCheck()));
else if (process.argv.length===6) await run(...process.argv.slice(2));
else throw new Error('usage: node run.mjs [--general|--context|--fresh|--recall-sa|--recall-enron|--recall-fresh] DATA_DIR INBOX_REPO SCORER_REPO OUTPUT_DIR');
