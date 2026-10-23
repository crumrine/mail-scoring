# DEV-880 source readiness assessment

The mandatory diagnostics failure is corrected in Inbox #7 at `2838cfb45b870054297fd09e7b88a0c1545801f1` and inherited by #8 at `43889e5c0ba7fd43090e830fbeac048a9551ffc8`. The preserved baseline/repair/restored receipts remain historical evidence. The resumed suite uses the actual corrected source, without a product overlay. New source checks pass; renewed independent dependency review and this report's own independent review remain pending. No activation approval is claimed.

## Evidence and results

- Actual local workerd email entry -> PostalMime -> private separate scoring RPC -> real R2/DO SQLite -> production JWT REST reads/feedback/rescue: 7/7 groups pass. It includes32 generated private-RPC cases, malformed/oversized/deep requests, duplicate/spoofed auth, Unicode/bidi/control expansion, huge tokens/attributes/encoded URLs, hostile HTML and embedded instructions. Direct trusted-context complete output and untrusted/HTML partial output are distinct from unavailable errors. The caller's inherited full error/timeout matrix is also in the571-test Inbox suite.
- Nine generated MIME deliveries exercise ordinary receipts/newsletters/new contacts, multilingual text, duplicate auth, prompts, bidi, oversized raw, deep tags and active HTML. Valid intake calls once per message; over-inspection raw skips optional RPC and stays delivered/unavailable. UI/REST/IMAP reads do not rescore. No send or model calls.
- Actual SPA/components/query cache/API client connect through a loopback proxy to actual production-JWT APIs and SQLite. Desktop1440 and mobile390 pass inert preview, sender block/clear and Not spam rescue. Backend state confirms the actions, and reads/actions add zero scoring calls. Zero external browser requests, outbound violations or page errors. Screenshots inspected. Unrelated SSR/Agent/MCP exports are inert; this does not test real providers or physical devices.
- Synthetic labels use an evaluation-only score cutoff30: TP6,FN1,FP0,TN12. The deliberately difficult Japanese social-engineering example is missed. The English rule vocabulary and HTML omission limit coverage; these counts establish neither production accuracy nor a quarantine threshold. Unknown remains unknown. No new language classifier was silently added.
- Scorer npm check passes:29 core test groups, actual workerd,12 core and8 Worker mutation controls,18 direct-growth cases. Fresh Inbox scoring/quarantine mutations and pinned cross-repo contract checks are captured. Security removals fail their intended assertions. Scorer bundle policy checks exclude forbidden imports/configuration/capabilities; public routes/bindings stay disabled.
- Locked inventories cover112 scorer and742 Inbox package records, with versions, license expressions, integrity, bundled-owner integrity and installed notice hashes. Six optional WASI bundled records inherit the parent archive's integrity, rather than inventing separate tarballs. Regenerated scorer SBOM/schema are unchanged; vendored adapted-file hashes match. Root Apache does not relicense third-party MIT/MIT-0/BSD/MPL/LGPL/CC-BY components. No new runtime dependency or external/private corpus is adopted.

## Timing and inherited parser limits

Ordinary warm private-RPC loopback host-wall p95 is5.375ms; fresh-process first-call p95 is17.836ms with startup separately recorded. Larger inputs remain slower (ceiling warm p9535.571ms, cold63.044ms). The ordinary25ms target passes; it is not a universal bound. Full raw samples, median/p95/max, bundle sizes and direct-growth results are included. Measurements ran separately from mutations. No hosted CPU, bill, cold-platform or peak-memory claim.

Inbox still buffers/parses MIME before bounded scoring projection. Its inherited25MiB intake, declared-size zero padding, PostalMime2.7.3 default depth/header limits remain distinct from inspection caps. Eight safe text-only parser cases cover1/16/64/128KiB, nesting8/32 and100/256 headers under15-second external process deadlines. These Node wall-time/non-peak heap observations do not prove hostile25MiB parser safety. No attachment bytes, archive/document/native scanning or URL/DNS verification enters the scorer.

## Reproduction and compatibility

Use the pinned sibling Inbox and Node24/npm11.12.1; run scripts-disabled installs. Run npm check, sbom, schemas, worker:benchmark and benchmark first. Then run `DEV880_INBOX_PIN=43889e5c0ba7fd43090e830fbeac048a9551ffc8 node harness/dev-880/run.mjs verified`, `CHROME_PATH=/usr/bin/google-chrome node harness/dev-880/browser.mjs`, audit.mjs and parser-growth.mjs. Scoring/quarantine mutation scripts execute in disposable Git exports, with actual pinned scorer contract source. report.mjs verifies and collects receipts. See acceptance.json and the resumed manifest.

Keep RPC/schema1,engine0.1.0,rules-1 pinned. An upgrade must rerun source graph/config checks, serialized contract parity, negative controls, actual joined cases, UI/rescue, licence/SBOM regeneration and the same cold/warm/growth corpus before accepting new source heads. Do not assume merged main contains this stack.

## Merge order and disable/rollback

Future source order: scorer #1 -> #2 -> #3 -> this harness PR; Inbox #7 -> #8 using the exact corrected prerequisite heads above. PR completion is separate from merging/deploying. Updated Inbox source CI/Go/Cloudflare checks are green. Cloudflare unexpectedly auto-uploaded branch versions cffc2c23 and407121d7; active production remains3c48b616 at100%traffic. Preview builds were separately disabled,saved and reloaded. Leave production and preview builds disabled.

Ship source off/shadow,quarantine off,AI absent from intake/scoring. MAIL_SCORING_MODE off or absent stops new scoring calls; retain unavailable private binding until activation is authorized. Preserve mail,assessment/feedback history and manual recovery; never drop tables/messages to disable scoring. Do not roll back stored mail or invent calibrated thresholds.

Pending owner-authorized live work: private Cloudflare deployment/effective binding checks, actual inbound auth-header provenance, received-message/no-rescore/no-draft behavior, private labels/threshold calibration, hosted CPU/cost and physical IMAP-client rescue/UID acceptance. These are later observations, not unresolved source-test failures. Production activation is not ready on synthetic evidence alone.

## Retained failed attempts

Earlier mandatory source failure and initial workerd compatibility/prototype failures remain in historical evidence. The resumed browser harness initially failed on explicit bundler externals, unused SSR dynamic import, eager inert MCP setup, CommonJS Playwright interop and a missing expected browser executable. Those were harness setup defects; the final run uses installed Chrome151,without downloading a browser or changing product assertions. The first audit incorrectly demanded a separate integrity for bundled optional packages; it now verifies the parent archive integrity. No failing product assertion was waived.
