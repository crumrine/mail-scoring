// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='docs/evidence/dev-880/reviewed-pins',base='.artifacts/dev-880';
await mkdir(out,{recursive:true});
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const receipt=await json(base+'/verified/receipt.json');assert.equal(receipt.exitCode,0);assert.equal(receipt.tests.failed,0);
const log=await readFile(base+'/verified/runner.log','utf8'),m=log.match(/DEV880_CORPUS (\[.*\])/);assert.ok(m);
const rows=JSON.parse(m[1]);assert.equal(rows.length,32);
// Evaluation-only cutoff declared here; never used by Inbox or shipping policy.
const cutoff=30,ordinary=rows.filter(r=>r.label==='ordinary'),suspicious=rows.filter(r=>r.label==='suspicious');
const confusion={evaluationOnlyCutoff:cutoff,ordinary:ordinary.length,suspicious:suspicious.length,
 truePositive:suspicious.filter(r=>r.score>=cutoff).length,falseNegative:suspicious.filter(r=>r.score<cutoff).length,
 falsePositive:ordinary.filter(r=>r.score>=cutoff).length,trueNegative:ordinary.filter(r=>r.score<cutoff).length,
 missedNames:suspicious.filter(r=>r.score<cutoff).map(r=>r.name),scope:'Authored synthetic examples only; no production accuracy or threshold calibration claim. Unknown/partial never means safe.'};
await writeFile(out+'/corpus.json',JSON.stringify({rows,confusion},null,2)+'\n');
const copies=[
 ['verified/receipt.json','joined-receipt.json'],['verified/vitest.json','joined-tests.json'],
 ['browser/result.json','browser.json'],['browser/joined-spam-1440.png','joined-spam-1440.png'],['browser/joined-spam-390.png','joined-spam-390.png'],
 ['audit/result.json','dependency-audit.json'],['parser/result.json','parser-growth.json'],
 ['refresh/scorer-check.log','scorer-check.log'],['refresh/scorer-receipt.json','scorer-receipt.json'],
 ['refresh/commands.json','commands.json'],['refresh/inbox-typecheck.log','inbox-typecheck.log'],['refresh/inbox-tests.log','inbox-tests.log'],
 ['refresh/diagnostics-negative.json','diagnostics-negative.json'],['refresh/diagnostics-negative.log','diagnostics-negative.log'],
 ['refresh/inbox-scoring-mutations.json','inbox-scoring-mutations.json'],
 ['refresh/inbox-quarantine-mutations.json','inbox-quarantine-mutations.json'],
 ['refresh/contract.json','contract.json'],
 ];
for(const file of await readdir(base+'/refresh'))if(/\.(log|json)$/.test(file)&&!copies.some(([,dst])=>dst===file))copies.push(['refresh/'+file,file]);
for(const [src,dst]of copies){if(dst.endsWith('.log'))await writeFile(join(out,dst),(await readFile(join(base,src),'utf8')).replace(/[ \t]+$/gm,'').trimEnd()+'\n');else await copyFile(join(base,src),join(out,dst));}
for(const [src,dst]of [['.artifacts/worker/benchmark.json','worker-benchmark.json'],['.artifacts/benchmark.json','core-benchmark.json'],
 ['.artifacts/direct-growth.json','direct-growth.json'],['.artifacts/mutations.json','core-mutations.json'],['.artifacts/worker/mutations.json','worker-mutations.json'],['.artifacts/worker/build.json','worker-build.json']])await copyFile(src,join(out,dst));
for(const [dir,prefix]of [['.artifacts','core-'],['.artifacts/worker','worker-']])for(const file of await readdir(dir))if(/^mutation-.*\.log$/.test(file))await writeFile(join(out,prefix+file),(await readFile(join(dir,file),'utf8')).replace(/[ \t]+$/gm,'').trimEnd()+'\n');
assert.equal((await json(out+'/core-mutations.json')).length,12);
assert.equal((await json(out+'/worker-mutations.json')).length,8);
const browser=await json(out+'/browser.json'),worker=await json(out+'/worker-benchmark.json'),core=await json(out+'/core-benchmark.json');
assert.equal(worker.ordinaryWarmTargetMet,true);assert.equal(worker.ordinaryColdTargetMet,true);
assert.equal(browser.results.length,2);assert.equal(browser.blockedOutbound,0);assert.equal(core.ordinaryTargetPassed,true);
const audit=await json(out+'/dependency-audit.json');assert.equal(audit.reports.length,2);
assert.equal(receipt.inbox.pin,'df4e70e65e91117ad8050b13a3a78e912d51c920');
assert.equal(browser.inbox,receipt.inbox.pin);
const currentHarnessHashes={};for(const file of Object.keys(receipt.harnessHashes))currentHarnessHashes[file]=createHash('sha256').update(await readFile('harness/dev-880/'+file)).digest('hex');
for(const file of ['run.mjs','vitest.config.ts','joined.test.ts','corpus.mjs'])assert.equal(currentHarnessHashes[file],receipt.harnessHashes[file]);
await writeFile(out+'/assembly.json',JSON.stringify({currentHarnessHashes,scope:'Published fresh text logs normalize trailing horizontal whitespace only. Joined receipt hashes identify the files at that execution. Browser and report/driver startup repairs followed; browser has its own executed hash. Joined runtime/config/corpus are unchanged. The command ledger retains earlier successful commands and replaces only the separately preserved failed browser attempt.'},null,2)+'\n');
const commands=await json(out+'/commands.json');assert.ok(commands.every(r=>r.passed));
assert.equal(browser.harnessSha256,createHash('sha256').update(await readFile('harness/dev-880/browser.mjs')).digest('hex'));
const negative=await json(out+'/diagnostics-negative.json');assert.equal(negative.failedCases,8);
const acceptance={status:'source_checks_pass_review_pending',completeDeliverable:false,sourceChecksPassed:true,independentReviewPending:true,
 pins:{foundation:'ce6d9afedf607584c150d457f0e078a307047f8a',core:'8456996596af6446f533cacb90ff9ce2ecd1a4ab',inboxMain:'d01da09e26adf76ef8fe60e2a5f76226426a167b',inbox:'df4e70e65e91117ad8050b13a3a78e912d51c920',inboxBase:'2838cfb45b870054297fd09e7b88a0c1545801f1',scorer:'bb02819e4662e1d680805435dd886e3dc4728906'},
 passed:['joined_email_rpc_storage_rest_feedback_rescue','content_free_failure_diagnostics','32_generated_rpc_cases','complete_partial_error_matrix','off_and_missing_binding','intake_only_calls','desktop_and_mobile_actual_spa_actual_backend','dependency_lock_notice_sbom_inventory','8_safe_mime_growth_cases','20_scorer_mutations','inbox_security_mutations','contract_parity','cold_warm_growth_benchmarks'],
 sourceCorrection:{issue:'DEV-878',pr:'https://github.com/crumrine/agentic-inbox-imap/pull/7',privateNote:5462},
 productionActivationReady:false,pendingLive:['private_deployment_and_effective_bindings','auth_header_provenance','received_mail_no_rescore_no_draft','private_labels_and_calibration','hosted_cpu_cost','physical_imap_client_rescue'],
 deploymentObservation:{source:'Owner records DEV-878 event5468 and DEV-879 event5470, 2026-10-23',observed:'Earlier automatic inactive version uploads cffc2c23/407121d7 despite production builds disabled; owner observed production3c48b616 at100%traffic, then separately disabled and reloaded preview builds.',verifiedLiveByThisRun:false},
 dependencyReviews:{scorer:'6577b085-a39e-4746-ba77-3a8775ba2307',inboxBase:'ad38acaf-9fec-4247-88e5-14a3971906c7',inbox:'64db78c2-c64f-486c-8227-ccb5d3ac9865',status:'approved'},
 configuration:{scoring:'off/shadow',quarantine:false,aiInScoring:false},confusion,
 environment:receipt,limits:'Inherited MIME parse before scoring remains outside scorer bounds. Node safe-fixture and host wall-time measurements are not proof of hosted CPU, peak allocation or efficacy.'};
await writeFile('docs/evidence/dev-880/acceptance.json',JSON.stringify(acceptance,null,2)+'\n');
const text=`# DEV-880 source readiness assessment

The mandatory diagnostics failure is corrected in Inbox #7 at \`2838cfb45b870054297fd09e7b88a0c1545801f1\` and inherited by #8 at \`df4e70e65e91117ad8050b13a3a78e912d51c920\`. The preserved baseline/repair/restored receipts remain historical evidence. The fresh suite uses the exact independently reviewed dependency heads, without a product overlay. The earlier resumed receipts are unchanged historical evidence. New source checks pass; this report's own independent review remains pending. No activation approval is claimed.

## Source review and lineage

Scorer #1 foundation is \`ce6d9afedf607584c150d457f0e078a307047f8a\`, #2 core is \`8456996596af6446f533cacb90ff9ce2ecd1a4ab\`, and #3 private Worker is \`bb02819e4662e1d680805435dd886e3dc4728906\`. Inbox #7 is based on main \`d01da09e26adf76ef8fe60e2a5f76226426a167b\`; #8 includes #7. The DEV-880 PR remains stacked on scorer #3. Dependency approval run IDs are in acceptance.json. All 56 files changed from the earlier Inbox harness pin to the current pin are documentation/evidence; runtime, SPA, shared code and locks are byte-identical. Historical evidence is not relabeled as a fresh run.

Independent source inspection rechecked parser-root identity before enumeration, serialized byte/depth/token preflight, bounded normalization/lexical URLs and static output; private Worker module/config allowlists; caller off/shadow and unknown transport projection; immutable assessments and manual mailbox-scoped capability/revision checks; and corrected static diagnostics. The actual scorer bundle excludes network, storage, mail and AI capabilities. The existing whole Inbox product still includes optional outbound and AI surfaces: synthetic bindings deny them on the tested intake path, and unrelated Agent/MCP/SSR exports are inert in the joined harness. Separate prerequisite tests cover their quarantine context gates. Exact-head Inbox review64db78c2-c64f-486c-8227-ccb5d3ac9865 also verified desktop/mobile stale-cache, search and thread regressions and their controls; those additional browser receipts are retained dependency evidence, not freshly executed by this runner. This is not a claim that the entire Inbox bundle lacks those capabilities. Access authorization remains app-wide, not a per-user mailbox ACL; feedback preferences and message IDs remain mailbox scoped.

## Evidence and results

- Actual local workerd email entry -> PostalMime -> private separate scoring RPC -> real R2/DO SQLite -> production JWT REST reads/feedback/rescue: ${receipt.tests.passed}/${receipt.tests.total} groups pass. It includes 32 generated private-RPC cases, malformed/oversized/deep requests, duplicate/spoofed auth, Unicode/bidi/control expansion, huge tokens/attributes/encoded URLs, hostile HTML and embedded instructions. Direct trusted-context complete output and untrusted/HTML partial output are distinct from unavailable errors. The caller's inherited full error/timeout matrix is also in the freshly executed 571-test Inbox suite.
- Nine generated MIME deliveries exercise ordinary receipts/newsletters/new contacts, multilingual text, duplicate auth, prompts, bidi, oversized raw, deep tags and active HTML. Valid intake calls once per message; over-inspection raw skips optional RPC and stays delivered/unavailable. UI/REST/IMAP reads do not rescore. No send or model calls.
- Actual SPA/components/query cache/API client connect through a loopback proxy to actual production-JWT APIs and SQLite. Desktop 1440 and mobile 390 pass inert preview, sender block/clear and Not spam rescue. Backend state confirms the actions, and reads/actions add zero scoring calls. Zero external browser requests, outbound violations or page errors. Screenshots inspected. Local navigation took ${(browser.results[0].navigationMs/1000).toFixed(1)}s on desktop and ${(browser.results[1].navigationMs/1000).toFixed(1)}s on mobile; these are harness startup observations, not a production UI performance claim. Unrelated SSR/Agent/MCP exports are inert; this does not test real providers or physical devices.
- Synthetic labels use an evaluation-only score cutoff ${cutoff}: TP ${confusion.truePositive}, FN ${confusion.falseNegative}, FP ${confusion.falsePositive}, TN ${confusion.trueNegative}. The deliberately difficult Japanese social-engineering example is missed. The English rule vocabulary and HTML omission limit coverage; these counts establish neither production accuracy nor a quarantine threshold. Unknown remains unknown. No new language classifier was silently added.
- Scorer npm check passes: 29 core test groups, actual workerd, 12 core and 8 Worker mutation controls, 18 direct-growth cases. Fresh Inbox scoring/quarantine mutations, all eight original-diagnostics negative controls and pinned cross-repo contract checks are captured. Security removals fail their intended assertions. Scorer bundle policy checks exclude forbidden imports/configuration/capabilities; public routes/bindings stay disabled.
- Locked inventories cover ${audit.reports[0].packageCount} scorer and ${audit.reports[1].packageCount} Inbox package records, with versions, license expressions, integrity, bundled-owner integrity and installed notice hashes. Six optional WASI bundled records inherit the parent archive's integrity, rather than inventing separate tarballs. Regenerated scorer SBOM/schema are unchanged; vendored adapted-file hashes match. Root Apache does not relicense third-party MIT/MIT-0/BSD/MPL/LGPL/CC-BY components. No new runtime dependency or external/private corpus is adopted.

## Timing and inherited parser limits

Ordinary warm private-RPC loopback host-wall p95 is ${worker.warm.ordinary.p95.toFixed(3)}ms; fresh-process first-call p95 is ${worker.cold.ordinary.firstCall.p95.toFixed(3)}ms with startup separately recorded. Larger inputs remain slower (ceiling warm p95 ${worker.warm.ceiling.p95.toFixed(3)}ms, cold${worker.cold.ceiling.firstCall.p95.toFixed(3)}ms). The ordinary 25 ms target passes; it is not a universal bound. Full raw samples, median/p95/max, bundle sizes and direct-growth results are included. Measurements ran separately from mutations. No hosted CPU, bill, cold-platform or peak-memory claim.

Inbox still buffers/parses MIME before bounded scoring projection. Its inherited 25 MiB intake, declared-size zero padding, PostalMime 2.7.3 default depth/header limits remain distinct from inspection caps. Eight safe text-only parser cases cover 1/16/64/128KiB, nesting 8/32 and 100/256 headers under 15-second external process deadlines. These Node wall-time/non-peak heap observations do not prove hostile 25 MiB parser safety. No attachment bytes, archive/document/native scanning or URL/DNS verification enters the scorer.

## Reproduction and compatibility

Use the pinned sibling Inbox and Node 24/npm 11.12.1; run scripts-disabled installs. Run npm check, sbom, schemas, worker:benchmark and benchmark first. Then run \`DEV880_INBOX_PIN=df4e70e65e91117ad8050b13a3a78e912d51c920 node harness/dev-880/run.mjs verified\`, \`CHROME_PATH=/usr/bin/google-chrome node harness/dev-880/browser.mjs\`, audit.mjs and parser-growth.mjs. Scoring/quarantine mutation scripts execute in disposable Git exports, with actual pinned scorer contract source. report.mjs verifies and collects receipts. Run \`node harness/dev-880/verify.mjs\` to execute and record the complete sequence, including disposable mutations and report generation. See acceptance.json and the reviewed-pins manifest. CHROME_PATH may point to any installed compatible Chromium; the harness does not download one.

Keep RPC/schema1,engine0.1.0,rules-1 pinned. An upgrade must rerun source graph/config checks, serialized contract parity, negative controls, actual joined cases, UI/rescue, licence/SBOM regeneration and the same cold/warm/growth corpus before accepting new source heads. Do not assume merged main contains this stack.

## Merge order and disable/rollback

Future source order: scorer #1 -> #2 -> #3 -> this harness PR; Inbox #7 -> #8 using the exact corrected prerequisite heads above. PR completion is separate from merging/deploying. Dependencies have independent source approvals at the exact pins above. Owner records DEV-878 event5468 and DEV-879 event5470 (2026-10-23) describe earlier automatic inactive branch uploads cffc2c23/407121d7, production3c48b616 at100%traffic at that time, and separately disabling/saving/reloading preview builds. This run did not verify dashboard, current traffic or deployment state. Source CI is not live evidence. Leave production and preview builds disabled.

Ship source off/shadow,quarantine off,AI absent from intake/scoring. MAIL_SCORING_MODE off or absent stops new scoring calls; retain unavailable private binding until activation is authorized. Preserve mail,assessment/feedback history and manual recovery; never drop tables/messages to disable scoring. Do not roll back stored mail or invent calibrated thresholds.

Pending owner-authorized live work: private Cloudflare deployment/effective binding checks, actual inbound auth-header provenance, received-message/no-rescore/no-draft behavior, private labels/threshold calibration, hosted CPU/cost and physical IMAP-client rescue/UID acceptance. These are later observations, not unresolved source-test failures. Production activation is not ready on synthetic evidence alone.

## Retained failed attempts

Earlier mandatory source failure and initial workerd compatibility/prototype failures remain in historical evidence. The resumed browser harness initially failed on explicit bundler externals, unused SSR dynamic import, eager inert MCP setup, CommonJS Playwright interop and a missing expected browser executable. Those were harness setup defects; that historical run used installed Chrome151. The fresh run uses installed Chromium ${browser.browser}; no browser download or product assertion relaxation occurred. The first audit incorrectly demanded a separate integrity for bundled optional packages; it now verifies the parent archive integrity. The first fresh browser attempt timed out during local Vite navigation at 45 seconds, before UI assertions. Its log/command ledger and Jev insufficient-evidence advisory are retained. Startup navigation now has a separate 120-second bound for a fresh install; product action assertions remain 45 seconds. This does not establish the original timeout cause. No failing product assertion was waived. Final manifest verification also found a historical scorer-check.log present locally but omitted from Git by the blanket log ignore rule. Its bytes match the original manifest; this submission includes it and adds a CI check that every manifest entry is tracked and hash-correct.
`;
await writeFile('docs/release-readiness.md',text);
await writeFile('docs/evidence/dev-880/assessment.md',text);
const manifest={};for(const file of (await readdir(out)).filter(f=>f!=='manifest.json').sort())manifest[file]=createHash('sha256').update(await readFile(join(out,file))).digest('hex');
await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await mkdir('docs/evidence/dev-880/refresh-attempt-1',{recursive:true});
for(const file of ['commands.json','browser.log']){try{await copyFile(base+'/refresh-attempt-1/'+file,'docs/evidence/dev-880/refresh-attempt-1/'+file);}catch(e){if(e.code!=='ENOENT')throw e;}}
const master={};async function walk(dir,prefix=''){for(const ent of await readdir(dir,{withFileTypes:true})){const file=join(dir,ent.name),name=prefix+ent.name;if(name==='manifest.json')continue;if(ent.isDirectory())await walk(file,name+'/');else master[name]=createHash('sha256').update(await readFile(file)).digest('hex');}}
await walk('docs/evidence/dev-880');await writeFile('docs/evidence/dev-880/manifest.json',JSON.stringify(master,null,2)+'\n');
console.log(JSON.stringify({sourceChecks:'passed',review:'pending',files:Object.keys(manifest).length,confusion}));
