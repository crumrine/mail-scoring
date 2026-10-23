// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='docs/evidence/dev-880/resumed',base='.artifacts/dev-880';
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
 ['resume-check.log','scorer-check.log'],['resume-receipt.json','scorer-receipt.json'],
 ['mutations/inbox/docs/evidence/dev-878/mutations.json','inbox-scoring-mutations.json'],
 ['mutations/inbox/docs/evidence/dev-879/mutations.json','inbox-quarantine-mutations.json'],
 ['mutations/inbox/docs/evidence/dev-878/contract.json','contract.json'],
 ];
for(const [src,dst]of copies){if(dst.endsWith('.log'))await writeFile(join(out,dst),(await readFile(join(base,src),'utf8')).trimEnd()+'\n');else await copyFile(join(base,src),join(out,dst));}
for(const [src,dst]of [['.artifacts/worker/benchmark.json','worker-benchmark.json'],['.artifacts/benchmark.json','core-benchmark.json'],
 ['docs/evidence/direct-growth.json','direct-growth.json'],['docs/evidence/mutations.json','core-mutations.json'],['docs/evidence/worker-mutations.json','worker-mutations.json'],['docs/evidence/worker-build.json','worker-build.json']])await copyFile(src,join(out,dst));
const browser=await json(out+'/browser.json'),worker=await json(out+'/worker-benchmark.json'),core=await json(out+'/core-benchmark.json');
assert.equal(browser.results.length,2);assert.equal(browser.blockedOutbound,0);assert.equal(core.ordinaryTargetPassed,true);
const audit=await json(out+'/dependency-audit.json');assert.equal(audit.reports.length,2);
const acceptance={status:'source_checks_pass_review_pending',completeDeliverable:false,sourceChecksPassed:true,independentReviewPending:true,
 pins:{inbox:'43889e5c0ba7fd43090e830fbeac048a9551ffc8',inboxBase:'2838cfb45b870054297fd09e7b88a0c1545801f1',scorer:'bb02819e4662e1d680805435dd886e3dc4728906'},
 passed:['joined_email_rpc_storage_rest_feedback_rescue','content_free_failure_diagnostics','32_generated_rpc_cases','complete_partial_error_matrix','off_and_missing_binding','intake_only_calls','desktop_and_mobile_actual_spa_actual_backend','dependency_lock_notice_sbom_inventory','8_safe_mime_growth_cases','20_scorer_mutations','inbox_security_mutations','contract_parity','cold_warm_growth_benchmarks'],
 sourceCorrection:{issue:'DEV-878',pr:'https://github.com/crumrine/agentic-inbox-imap/pull/7',privateNote:5462},
 productionActivationReady:false,pendingLive:['private_deployment_and_effective_bindings','auth_header_provenance','received_mail_no_rescore_no_draft','private_labels_and_calibration','hosted_cpu_cost','physical_imap_client_rescue'],
 deploymentSideEffect:'Cloudflare auto-uploaded two inactive branch versions despite Production Disable builds=true. Production stays3c48b616 at100%; preview builds now disabled separately and verified after reload.',
 configuration:{scoring:'off/shadow',quarantine:false,aiInScoring:false},confusion,
 environment:receipt,limits:'Inherited MIME parse before scoring remains outside scorer bounds. Node safe-fixture and host wall-time measurements are not proof of hosted CPU, peak allocation or efficacy.'};
await writeFile('docs/evidence/dev-880/acceptance.json',JSON.stringify(acceptance,null,2)+'\n');
const text=`# DEV-880 source readiness assessment

The mandatory diagnostics failure is corrected in Inbox #7 at \`2838cfb45b870054297fd09e7b88a0c1545801f1\` and inherited by #8 at \`43889e5c0ba7fd43090e830fbeac048a9551ffc8\`. The preserved baseline/repair/restored receipts remain historical evidence. The resumed suite uses the actual corrected source, without a product overlay. New source checks pass; renewed independent dependency review and this report's own independent review remain pending. No activation approval is claimed.

## Evidence and results

- Actual local workerd email entry -> PostalMime -> private separate scoring RPC -> real R2/DO SQLite -> production JWT REST reads/feedback/rescue: ${receipt.tests.passed}/${receipt.tests.total} groups pass. It includes32 generated private-RPC cases, malformed/oversized/deep requests, duplicate/spoofed auth, Unicode/bidi/control expansion, huge tokens/attributes/encoded URLs, hostile HTML and embedded instructions. Direct trusted-context complete output and untrusted/HTML partial output are distinct from unavailable errors. The caller's inherited full error/timeout matrix is also in the571-test Inbox suite.
- Nine generated MIME deliveries exercise ordinary receipts/newsletters/new contacts, multilingual text, duplicate auth, prompts, bidi, oversized raw, deep tags and active HTML. Valid intake calls once per message; over-inspection raw skips optional RPC and stays delivered/unavailable. UI/REST/IMAP reads do not rescore. No send or model calls.
- Actual SPA/components/query cache/API client connect through a loopback proxy to actual production-JWT APIs and SQLite. Desktop1440 and mobile390 pass inert preview, sender block/clear and Not spam rescue. Backend state confirms the actions, and reads/actions add zero scoring calls. Zero external browser requests, outbound violations or page errors. Screenshots inspected. Unrelated SSR/Agent/MCP exports are inert; this does not test real providers or physical devices.
- Synthetic labels use an evaluation-only score cutoff${cutoff}: TP${confusion.truePositive},FN${confusion.falseNegative},FP${confusion.falsePositive},TN${confusion.trueNegative}. The deliberately difficult Japanese social-engineering example is missed. The English rule vocabulary and HTML omission limit coverage; these counts establish neither production accuracy nor a quarantine threshold. Unknown remains unknown. No new language classifier was silently added.
- Scorer npm check passes:29 core test groups, actual workerd,12 core and8 Worker mutation controls,18 direct-growth cases. Fresh Inbox scoring/quarantine mutations and pinned cross-repo contract checks are captured. Security removals fail their intended assertions. Scorer bundle policy checks exclude forbidden imports/configuration/capabilities; public routes/bindings stay disabled.
- Locked inventories cover${audit.reports[0].packageCount} scorer and${audit.reports[1].packageCount} Inbox package records, with versions, license expressions, integrity, bundled-owner integrity and installed notice hashes. Six optional WASI bundled records inherit the parent archive's integrity, rather than inventing separate tarballs. Regenerated scorer SBOM/schema are unchanged; vendored adapted-file hashes match. Root Apache does not relicense third-party MIT/MIT-0/BSD/MPL/LGPL/CC-BY components. No new runtime dependency or external/private corpus is adopted.

## Timing and inherited parser limits

Ordinary warm private-RPC loopback host-wall p95 is${worker.warm.ordinary.p95.toFixed(3)}ms; fresh-process first-call p95 is${worker.cold.ordinary.firstCall.p95.toFixed(3)}ms with startup separately recorded. Larger inputs remain slower (ceiling warm p95${worker.warm.ceiling.p95.toFixed(3)}ms, cold${worker.cold.ceiling.firstCall.p95.toFixed(3)}ms). The ordinary25ms target passes; it is not a universal bound. Full raw samples, median/p95/max, bundle sizes and direct-growth results are included. Measurements ran separately from mutations. No hosted CPU, bill, cold-platform or peak-memory claim.

Inbox still buffers/parses MIME before bounded scoring projection. Its inherited25MiB intake, declared-size zero padding, PostalMime2.7.3 default depth/header limits remain distinct from inspection caps. Eight safe text-only parser cases cover1/16/64/128KiB, nesting8/32 and100/256 headers under15-second external process deadlines. These Node wall-time/non-peak heap observations do not prove hostile25MiB parser safety. No attachment bytes, archive/document/native scanning or URL/DNS verification enters the scorer.

## Reproduction and compatibility

Use the pinned sibling Inbox and Node24/npm11.12.1; run scripts-disabled installs. Run npm check, sbom, schemas, worker:benchmark and benchmark first. Then run \`DEV880_INBOX_PIN=43889e5c0ba7fd43090e830fbeac048a9551ffc8 node harness/dev-880/run.mjs verified\`, \`CHROME_PATH=/usr/bin/google-chrome node harness/dev-880/browser.mjs\`, audit.mjs and parser-growth.mjs. Scoring/quarantine mutation scripts execute in disposable Git exports, with actual pinned scorer contract source. report.mjs verifies and collects receipts. See acceptance.json and the resumed manifest.

Keep RPC/schema1,engine0.1.0,rules-1 pinned. An upgrade must rerun source graph/config checks, serialized contract parity, negative controls, actual joined cases, UI/rescue, licence/SBOM regeneration and the same cold/warm/growth corpus before accepting new source heads. Do not assume merged main contains this stack.

## Merge order and disable/rollback

Future source order: scorer #1 -> #2 -> #3 -> this harness PR; Inbox #7 -> #8 using the exact corrected prerequisite heads above. PR completion is separate from merging/deploying. Updated Inbox source CI/Go/Cloudflare checks are green. Cloudflare unexpectedly auto-uploaded branch versions cffc2c23 and407121d7; active production remains3c48b616 at100%traffic. Preview builds were separately disabled,saved and reloaded. Leave production and preview builds disabled.

Ship source off/shadow,quarantine off,AI absent from intake/scoring. MAIL_SCORING_MODE off or absent stops new scoring calls; retain unavailable private binding until activation is authorized. Preserve mail,assessment/feedback history and manual recovery; never drop tables/messages to disable scoring. Do not roll back stored mail or invent calibrated thresholds.

Pending owner-authorized live work: private Cloudflare deployment/effective binding checks, actual inbound auth-header provenance, received-message/no-rescore/no-draft behavior, private labels/threshold calibration, hosted CPU/cost and physical IMAP-client rescue/UID acceptance. These are later observations, not unresolved source-test failures. Production activation is not ready on synthetic evidence alone.

## Retained failed attempts

Earlier mandatory source failure and initial workerd compatibility/prototype failures remain in historical evidence. The resumed browser harness initially failed on explicit bundler externals, unused SSR dynamic import, eager inert MCP setup, CommonJS Playwright interop and a missing expected browser executable. Those were harness setup defects; the final run uses installed Chrome151,without downloading a browser or changing product assertions. The first audit incorrectly demanded a separate integrity for bundled optional packages; it now verifies the parent archive integrity. No failing product assertion was waived.
`;
await writeFile('docs/release-readiness.md',text);
await writeFile('docs/evidence/dev-880/assessment.md',text);
const manifest={};for(const file of (await readdir(out)).filter(f=>f!=='manifest.json').sort())manifest[file]=createHash('sha256').update(await readFile(join(out,file))).digest('hex');
await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const master={};async function walk(dir,prefix=''){for(const ent of await readdir(dir,{withFileTypes:true})){const file=join(dir,ent.name),name=prefix+ent.name;if(name==='manifest.json')continue;if(ent.isDirectory())await walk(file,name+'/');else master[name]=createHash('sha256').update(await readFile(file)).digest('hex');}}
await walk('docs/evidence/dev-880');await writeFile('docs/evidence/dev-880/manifest.json',JSON.stringify(master,null,2)+'\n');
console.log(JSON.stringify({sourceChecks:'passed',review:'pending',files:Object.keys(manifest).length,confusion}));
