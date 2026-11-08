// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {constants} from 'node:fs';
import {open, lstat, mkdir, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

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

async function readBounded(path, limit) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > limit) throw new Error('file_limit');
    const buffer = Buffer.alloc(limit + 1);
    let used = 0;
    for (let reads = 0; reads < 1024; reads++) {
      const {bytesRead} = await file.read(buffer, used, buffer.length - used, used);
      if (!bytesRead) return buffer.subarray(0, used);
      used += bytesRead;
      if (used > limit) throw new Error('file_limit');
    }
    throw new Error('read_limit');
  } finally { await file.close(); }
}

function validateRecords(records) {
  if (!Array.isArray(records) || records.length > 192) throw new Error('manifest_count');
  const seen = new Set();
  for (const row of records) {
    if (!row || !/^[a-f0-9]{64}$/.test(row.id) || row.sha256 !== row.id ||
        !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > 2*1024*1024 ||
        !['ham','spam'].includes(row.label) ||
        !['easy_ham','hard_ham','spam'].includes(row.group) ||
        (row.label === 'spam') !== (row.group === 'spam') ||
        row.path !== 'messages/' + row.id + '.eml' || !row.labelAuthority) throw new Error('manifest_record');
    if (seen.has(row.id)) throw new Error('manifest_duplicate');
    seen.add(row.id);
  }
}

function parseManifest(bytes) {
  if (hash(bytes) !== MANIFEST_SHA) throw new Error('manifest_hash');
  const manifest = JSON.parse(bytes);
  validateRecords(manifest.records);
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

async function exportSource(repo, pin, paths, target) {
  if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error('source_pin');
  git(repo, 'cat-file', '-e', pin+'^{commit}');
  await mkdir(target, {recursive:true});
  const archive = git(repo, 'archive', pin, ...paths);
  execFileSync('tar', ['-xf','-','-C',target], {input:archive});
  return hash(archive);
}

async function run(dataDir, inboxRepo, scorerRepo, outputDir) {
  dataDir=resolve(dataDir); inboxRepo=resolve(inboxRepo); scorerRepo=resolve(scorerRepo); outputDir=resolve(outputDir);
  for (const [repo, expected] of [[inboxRepo,'https://github.com/crumrine/agentic-inbox-imap'],[scorerRepo,'https://github.com/crumrine/mail-scoring']]) {
    if (git(repo,'remote','get-url','origin').toString().trim().replace(/\.git$/,'') !== expected) throw new Error('repository_origin');
  }
  const manifestBytes = await readBounded(join(dataDir,'manifest.json'),256*1024);
  const manifest = parseManifest(manifestBytes);
  if (manifest.records.length !== 192 || (await lstat(join(dataDir,'messages'))).isSymbolicLink()) throw new Error('manifest_count_or_path');
  const require = createRequire(join(inboxRepo,'package.json'));
  const {build,version:esbuildVersion} = require('esbuild');
  const PostalMime = require('postal-mime');
  if (typeof PostalMime.parse !== 'function') throw new Error('parser_export');
  const parserEntry=require.resolve('postal-mime');
  const parserPackage=JSON.parse(await readFile(join(dirname(parserEntry),'../package.json')));
  const lockedParser = JSON.parse(await readFile(join(inboxRepo,'package-lock.json'))).packages['node_modules/postal-mime'].version;
  if (parserPackage.version !== lockedParser) throw new Error('installed_parser_version');
  for (const pins of Object.values(PINS)) {
    const locked = JSON.parse(git(inboxRepo,'show',pins.inbox+':package-lock.json')).packages['node_modules/postal-mime'].version;
    if (locked !== lockedParser) throw new Error('parser_version_drift');
  }
  const scratch = await mkdtemp(join(tmpdir(),'spam-evaluation-'));
  let networkAttempts=0;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=()=>{ networkAttempts++; throw new Error('evaluation_network_forbidden'); };
  const variants={}, controls={}, identities={};
  try {
    for (const [name,pins] of Object.entries(PINS)) {
      const inbox=join(scratch,name,'inbox'), scorer=join(scratch,name,'scorer');
      identities[name] = {pins,
        inboxArchiveSha256:await exportSource(inboxRepo,pins.inbox,['workers/lib/mail-scoring'],inbox),
        scorerArchiveSha256:await exportSource(scorerRepo,pins.scorer,['packages/core/src','workers/private'],scorer)};
      const modulePath=join(scratch,name,'pipeline.mjs');
      await build({stdin:{contents:'export {assessArrival,inspectableRaw,shouldQuarantine,unavailable} from '+JSON.stringify(join(inbox,'workers/lib/mail-scoring/intake.ts'))+';export {scoreRpc} from '+JSON.stringify(join(scorer,'workers/private/adapter.ts'))+';',loader:'ts',resolveDir:scratch},outfile:modulePath,bundle:true,platform:'node',format:'esm'});
      identities[name].bundleSha256=hash(await readFile(modulePath));
      const module=await import(pathToFileURL(modulePath));
      const classify=async raw=>{
        let assessment,parseUnavailable=false,unavailableCause=null;
        if (!module.inspectableRaw(raw)) { assessment=module.unavailable(); unavailableCause='raw_preflight'; }
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
          rows.push({id:record.id,label:record.label,group:record.group,...await classify(raw)});
        }
        return rows.sort((a,b)=>a.id.localeCompare(b.id));
      };
      const forward=await evaluate(manifest.records);
      assert.deepEqual(forward,await evaluate([...manifest.records].reverse()),'repeated/order-invariant classification');
      variants[name]={metrics:metrics(forward),hardHam:metrics(forward.filter(r=>r.group==='hard_ham')),rows:forward};
      const marker='XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X';
      const mime=(body,subject='Synthetic',headers=[])=>new TextEncoder().encode('From: sender@example.test\r\nTo: mailbox@example.test\r\nSubject: '+subject+'\r\n'+(headers.length?headers.join('\r\n')+'\r\n':'')+'MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n'+body);
      const cases=[['gtube',mime(marker),name==='candidate'],['quoted',mime('> '+marker),false],
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
      controls[name]=[];
      for (const [id,raw,expected] of cases) {
        const result=await classify(raw);
        assert.equal(result.quarantined,expected,name+' installation/hard-ham control '+id);
        const expectedScore=name==='candidate'?(id==='gtube'?100:id==='userinfo_miss'?15:0):0;
        assert.equal(result.score,expectedScore,name+' control score '+id);
        const kind=id==='userinfo_miss'?'authored_known_miss':['gtube','quoted','near','subject_only','mixed'].includes(id)?'installation':'authored_ham';
        controls[name].push({id,kind,truth:kind==='authored_ham'?'ham':kind==='authored_known_miss'?'spam':'installation_control',...result});
      }
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
  const releaseReady=variants.candidate.metrics.FP<=variants.baseline.metrics.FP && variants.candidate.hardHam.FP<=variants.baseline.hardHam.FP;
  const report={manifestSha256:MANIFEST_SHA,selection:manifest.selection,
    sourceTerms:'https://spamassassin.apache.org/old/publiccorpus/readme.html',
    runtime:{node:process.version,parser:lockedParser,parserEntrySha256:hash(await readFile(parserEntry)),consumerLockSha256:hash(await readFile(join(inboxRepo,'package-lock.json'))),esbuild:esbuildVersion},
    runnerSha256:hash(await readFile(fileURLToPath(import.meta.url))), sourceRepositoryHead:git(scorerRepo,'rev-parse','HEAD').toString().trim(),identities,
    checks:{selfChecks:selfCheck(),repeatedOrderInvariant:true,networkAttempts,standardControlsExcludedFromMetrics:true},
    policy:{mode:'filter',ordinaryThreshold:45,preference:'none',transport:'unknown',scope:'actual production MIME parser, intake/assessment, serialized scorer RPC adapter and routing policy; no mailbox mutation'},
    variants,controls,changes,decisionChanges:changes.filter(row=>row.before.quarantined!==row.after.quarantined),regressions,
    release:{scope:'Bounded source-regression evidence; OPS-599 owns remaining manual release gates',candidateRoutingFalsePositivesDidNotIncrease:variants.candidate.metrics.FP<=variants.baseline.metrics.FP,hardHamRoutingFalsePositivesDidNotIncrease:variants.candidate.hardHam.FP<=variants.baseline.hardHam.FP,eligible:releaseReady,remainingMisses:variants.candidate.metrics.FN},
    limits:['Corpus dates to 2003 and is not representative of a current mailbox.',
      'Inspection completeness and classification uncertainty are separate. Retained mail is not classified safe.',
      'Unavailable spam remains a routing miss; unavailable counts are also reported separately.',
      'No training, threshold tuning, mail sending, DNS/auth replay or production accuracy claim.']};
  await mkdir(outputDir,{recursive:true});
  await writeFile(join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  const lines=['# Paired offline routing evaluation','', 'Fixed public-corpus slice: 192 messages, 128 ham and 64 spam. Standard installation controls are excluded.','',
    '| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |','| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const [name,v] of Object.entries(variants)) { const m=v.metrics; lines.push('| '+[name,m.TP,m.FP,m.TN,m.FN,m.precision??'undefined',m.recall??'undefined',m.falsePositiveRate??'undefined'].join(' | ')+' |'); }
  lines.push('', 'Candidate misses remain '+report.release.remainingMisses+'. All sample changes and misses/false positives are retained by opaque content hash in report.json.','',
    'The 2003 corpus is dated. These figures measure routing on this frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.','',
    'Release regression gate: '+(releaseReady?'no observed increase in ham quarantined on this frozen slice.':'FAILED: ham quarantined increased; corrective source and fresh review required.'),'',
    'Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.');
  await writeFile(join(outputDir,'report.md'),lines.join('\n')+'\n');
  console.log(JSON.stringify({baseline:variants.baseline.metrics,candidate:variants.candidate.metrics,changes:changes.length,releaseReady}));
  if (!releaseReady) process.exitCode=1;
}

if (process.argv[2]==='--self-check') console.log(JSON.stringify(selfCheck()));
else if (process.argv.length===6) await run(...process.argv.slice(2));
else throw new Error('usage: node run.mjs DATA_DIR INBOX_REPO SCORER_REPO OUTPUT_DIR');
