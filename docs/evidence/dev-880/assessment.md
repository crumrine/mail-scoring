# DEV-880: mandatory confidentiality gate failed

Copyright (c) 2026 Brian Crumrine. SPDX-License-Identifier: Apache-2.0.

**Not ready. This is a partial, blocked assessment, not the requested completed
release-readiness deliverable or an approved PR.** A mandatory integrated
confidentiality check fails on the exact reviewed Inbox source. Do not promote a
passing scratch repair or passing scorer suite into a pass for that source.

## Exact sources and policy

- Scorer: https://github.com/crumrine/mail-scoring PR #3,
  `bb02819e4662e1d680805435dd886e3dc4728906`, base
  `8456996596af6446f533cacb90ff9ce2ecd1a4ab` (PR #2), foundation
  `ce6d9afedf607584c150d457f0e078a307047f8a` (PR #1).
- Inbox: https://github.com/crumrine/agentic-inbox-imap PR #8,
  `b87650673815a9a7236303457435bb33a0e1d4ac`, base PR #7
  `7cc31772b0ca17ec28ea4d78367e41e0a24e5ce5`.
- Live PR metadata confirmed both prerequisite heads open/unmerged. Their
  corresponding Trellis review/delivery results approve those exact heads.
  Main was not substituted for either dependency.
- Read scorer AGENTS.md, README.md, SECURITY.md, architecture, research,
  work-plan and contributing instructions, and Inbox CLAUDE.md,
  CONTRIBUTING.md and SECURITY.md at those revisions.
- Only DEV-880's local scorer branch was created. Inbox source is unchanged.
  No merge, push into dependency branches, deployment, provider/mail/AI call,
  activation, npm publication or private data was used.

## Reproduced inherited defect

`workers/lib/raw-mime.ts:103` catches a failed R2 write and emits the raw storage
key. That key contains the mailbox address and a per-message UUID. It also emits
the unsanitized exception message. `wrangler.jsonc` enables Inbox observability.
This diagnostic violates the requested content/identifier-free logging boundary.
The file's last modifying commit at the pin is
`ca218893ad93eb1f7a4761d68b1742b75d799bdf`: the finding is inherited, not a claim
that shadow scoring or quarantine introduced it.

The reproduction invokes the actual app email export, parses original synthetic
MIME, resolves the real local R2 mailbox registry, forwards actual bytes through
a separate real private scorer Worker, calls actual raw-persistence code and
persists the email/assessment in actual MailboxDO SQLite. Only R2 `put` is made
to throw a static synthetic error. A spy captures (and suppresses) the actual
production diagnostic. The test asserts a boolean rather than dumping the key.
Delivery, `raw_key: null`, one scoring call and presence of a diagnostic are
verified before the assertion rejects a mailbox identifier in the captured log.

The diagnostic-repair experiment replaces exactly that log with the static
`raw_mime_storage_failed` event in a disposable exported copy. It preserves the
error event, fallback and normal success behavior. Baseline/repair/restoration
receipts demonstrate the assertion is not vacuous. This is not a reviewed fix.
`workers/app.ts:193` also emits caught exception message/stack; that is a source
inspection target for the correction, not a separately reproduced parser exploit.

## Executed checks

Exact commands and environment are in receipts. Fresh scripts-disabled
`npm ci --ignore-scripts --no-audit --no-fund` completed in both repositories.
Node 24.15.0, npm 11.12.1, Linux x64; CPU and kernel in each receipt.

| Check | Result |
| --- | --- |
| Scorer `npm run check` | PASS: typecheck/build, 29 core test groups, workerd spike, 12 core mutations, 18 direct-growth cases, private/consumer build, actual RPC and 8 Worker mutations |
| Inbox `INBOX_LOCAL_ONLY=1 WRANGLER_SEND_METRICS=false npm run typecheck` | PASS, including regenerated Wrangler types |
| `node harness/dev-880/run.mjs baseline` | FAIL: 3 pass, confidentiality assertion fails |
| `node harness/dev-880/run.mjs diagnostic-repair` | PASS: 4/4; diagnostic stays present, identifiers absent |
| `node harness/dev-880/run.mjs restored` | FAIL: 3 pass, same confidentiality assertion fails again |

The joined success case checks original raw-byte preservation, persisted partial
assessment across DO eviction, authenticated list/thread/IMAP reads, zero
rescoring during repeated reads, service-token feedback rejection, cross-mailbox
message-ID rejection, Spam exclusion, explicit review, authenticated rescue,
assessment preservation, no other-mailbox sender preferences and zero AI/send
calls. Off makes zero calls. Missing binding preserves delivery with unavailable
assessment. These are actual backend paths; React rendering, a physical IMAP
client and the exhaustive failure/adversarial matrix are not covered here.

The actual harness scorer bundle is built from an immutable Git export and
passes the existing strict module/capability/config policy: no public routes,
workers.dev/preview URLs, logging/network/native/storage/mail/AI bindings.
The scorer has an outbound deny service. The test's synthetic JWKS fetch is
local and every other fetch throws/counts. Fake send and AI bindings throw/count;
`remoteBindings:false` applies. Unrelated Agent/MCP/SSR test surfaces are inert.
This does not claim capability absence from the entire Inbox product.

Scorer's final sequential `npm run check` Worker bundle receipt reports private
Wrangler 16,775 bytes / 6,169 gzip, consumer 4,984 / 2,100 gzip. The joined
harness uses the separately checked esbuild bundle from the immutable pin; its
hash/module graph is in the receipt. Test durations and concurrently executed
core growth checks are not release performance measurements or hosted CPU/cost.
No classification efficacy, savings or memory-peak claim is made.

## Attempts retained, not hidden

1. Initial Inbox pool runtime (`workerd` 1.20260815.1) rejected the scorer's
   2026-10-21 compatibility date before running tests. The harness now explicitly
   uses scorer's locked workerd 1.20261021.1 binary. The override is hashed and
   `--version` recorded, separately from the pool's installed version.
2. First binary override used the CJS export object rather than `.default`,
   causing `spawn [object Object]`/ENOENT and then receipt generation failure.
   Corrected deterministically; no product assertion ran in that attempt.
3. Prototype baseline/repair ran and found the same defect, but their receipt's
   scorer `pin` field accidentally used the Inbox variable. Those receipts are
   superseded, retained and explicitly not authoritative provenance. Exported
   scorer source was already the correct bb02819e pin. Final commands reran with
   corrected receipt metadata.
4. An early standalone Worker build overlapped the core mutation runner and is
   discarded as contaminated. The completed full-check build and immutable
   harness exports provide the valid evidence. No early measurement is used.

Committed text logs normalize surplus trailing EOF newlines for git diff --check;
original process logs remain in .artifacts and /tmp.

These were deterministic setup/evidence errors and expected assertion failures;
no unexplained product build/test failure required a Jev call. All failed attempts
remain local; no unfavorable baseline is replaced with a success claim.

## Privacy-preserving handoff and missing dependency

An authorized comment to existing affected ticket DEV-878 was attempted. Trellis
rejected it: **"Delivery gate rejected the report." / "Writes must target the
current ticket."** The finding and rejection were stored on DEV-880 instead.
No comment reached DEV-878. There is no private advisory/reporting capability in
the connected GitHub tools. Inbox SECURITY.md says "Report privately" and
"Please do not open a public issue for anything exploitable." Reproduction
source/evidence remain local, not in a public issue, comment or pushed PR.

Required next action: an authorized coordinator routes this existing finding
privately to DEV-878/PR #7 lineage (inherited by #8), incorporates the static
safe-diagnostic correction and audits the surrounding failure diagnostics,
retains delivery preservation and obtains an independently reviewed successor.
Do not reset review limits, reopen tickets without authorization, create a
separate fix ticket or mutate another worker's branch. Resume DEV-880 with
verified successor pins and rerun this gate before completing the remaining
assessment. The local repair control supplies a concrete bounded fix candidate.

## Remaining mandatory source work

The full adversarial corpus/generator, broad complete/partial/error variants,
actual UI connected to joined backend responses, classification labels and
false-positive/miss counts, cold/warm median/p95/max, bounded-work growth under
isolated measurement, complete call-count matrix, full dependency license/
NOTICE/SBOM review and upgrade compatibility audit are **not complete**.
The four current tests reuse one original synthetic plain-text receipt, with
`.test` identities and no attachment bytes. Fixture provenance is documented in
`harness/dev-880/README.md`; no private/unlicensed corpus is present.

Existing scorer notices preserve the selected Mailguard MIT adaptations; root
Apache-2.0 is not a license claim for all npm/tooling/Inbox components. The parser
is the locked PostalMime 2.7.3. Source inspection confirms Inbox buffers/parses
raw MIME before the scorer projection: 25 MiB intake ceiling and inherited
short-stream zero-padding remain. PostalMime defaults are depth 256 and 2 MiB
headers per MIME node. These are inherited parser exposures, not protections
provided by the scorer's 128 KiB raw inspection gate. No hostile parser-growth
measurement was completed here. Future upgrades must pin exact locks, audit
notices/data provenance and rerun boundary/mutation/joined contracts before
changing parser, RPC, schema, rules or runtime compatibility dates.

## Source order, disable procedure and later activation

Eventual source order remains scorer #1 -> #2 -> #3 -> completed DEV-880 harness;
Inbox #7 -> #8 -> any independently reviewed corrective successor. Preserve
cross-repository contract pins; no merge was performed. Recommended shipped
source remains scoring off/shadow, quarantine off, AI absent from intake/scoring.

To disable later, set MAIL_SCORING_MODE=off (or absent) to stop new scoring calls;
keep private binding unavailable until authorized. Leave quarantine disabled.
Preserve stored messages, assessments, dispositions and manual recovery; do not
drop tables or reinterpret ordinary moves as training. Roll back source/config
only through a separately authorized deployment. No such action was taken.

Pending owner-authorized production checklist:

- Private Cloudflare deployment and effective route/binding isolation.
- True inbound authentication-header availability and provenance.
- Received-message preservation, no polling rescore and no inbound auto-draft.
- Private observation labels and threshold/false-positive calibration.
- Hosted CPU and cost measurements.
- Actual desktop/mobile IMAP-client rescue and UID acceptance.

These pending live items do not themselves block the source-only deliverable.
The reproduced mandatory source failure and unavailable affected-ticket/private
reporting write path do. There is no approval, release or activation recommendation.
