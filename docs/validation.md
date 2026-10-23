# Validation and source evidence

Run from a fresh checkout with Node **24.15.0**, npm **11.12.1**, Linux x64:

```sh
npm ci
npm run check
npm run sbom
node scripts/schemas.mjs
npm run benchmark
node scripts/receipt.mjs
```

Run these sequentially: the mutation suite temporarily changes/restores source and
compiled outputs, so no concurrent build or measurement is valid. `.npmrc` disables
all dependency lifecycle scripts. CI runs the same commands and uploads `.artifacts/`
under its exact source SHA. Push CI tests branch HEAD; pull_request CI may test a
synthetic merge SHA. Review must inspect the exact submitted branch SHA. Receipt
metadata records the commit, prerequisite pin, source-tree digest and runtime
versions; it does not independently attest test execution. Copies under
`docs/evidence/` are local pre-submission snapshots identified by their enclosing
commit; exact-head CI artifacts provide the final execution evidence.

## Core and schema

`check` builds the public package exports, typechecks, executes 25 test groups,
runs actual workerd, guard-removal mutations and direct-object/lazy-string growth.
22 synthetic rule fixtures, 180 seeded generated cases and a valid request exactly
at the 256KiB wire ceiling (plus one-byte overflow) validate the actual
result JSON schema with development-only Ajv, finite scores, exact contribution
accounting, safe static reasons, status/limit relationships and determinism. Fixtures
cover all requested legitimate, marketing, multilingual, quoted, spoofed and prompt
cases; these are regression examples, not a measure of detection accuracy.

The original parser-created immutable-root contract is preserved: byte/token/depth
preflight before parsing, private WeakSet check before enumeration, deep freeze,
O(1) oversized string omission, per-field UTF-8 and cardinality caps. Attachment
metadata is shape-validated only; no attachment features or bytes are inspected.
Output never carries attacker strings or mail identifiers. No runtime logging,
storage, tools, sending or mailbox mutation exists.

## Bounded feature work

- 64KiB combined normalized output is charged before appending each normalized
  scalar, including U+FDFA expansion. Source units stop early on output exhaustion.
- At most 100 anchor/URL pairs in one shared budget; each visible string/target is
  at most 2048 UTF-8 bytes before URL parsing. At most 200 lexical parses and 400
  whole encoded-scheme decode passes (two per visible/target URL), plus at most
  three 512-byte mailbox-host parses. Wrappers are
  never followed; unsupported/malformed targets and extra encoding stay partial.
- Fixed ten phrases, no dynamic regex/list, code-point-aware boundaries. Repetition
  cannot add a second contribution. Independent family and global caps are tested.
- Quoted line/forward markers scan linearly. The supplied `(' \n').repeat(16384)`
  and repeat(32768) shapes are exercised with exact work counters, as are repeated
  phrases/tokens and Unicode expansion. Counters are internal test observations,
  not an additional output with raw content.
- HTML is not parsed. Deep/repeated tags (`n=8192`), 3600 repeated anchors, huge
  attributes and malformed `<` sequences remain `html_uninspected`/partial with
  zero URL extraction. This is the explicitly permitted plain-text/supplied-anchor
  path, not a claim of a hardened HTML parser. No HTML depth/tag guard is pretended.

The mutation suite separately removes normalization output, anchor count, URL length, URL decode,
family cap, global cap, quote skip, preference provenance, source bound, immutable
parser-root, oversized-string and network-denial protections. Every mutant must
fail its specifically named regression; original files are restored in finally,
then both test and workerd positive controls pass. Test subprocess deadlines are
measurement containment only, never a substitute for synchronous input/work guards.
No mutation or broken source is committed.

`direct-growth` retains 18 inherited measurements for 1,000/100,000/1,000,000 keys
at root/header/transport/attachment levels and 1/16/64MiB lazy strings. They must be
refused without traversal/flattening, with a 4MiB observed per-call heap-delta
regression ceiling. This is not a proof of peak memory. Normal scoring allocations
are bounded by the parser, source/output/count limits; observations corroborate
rather than replace those guards.

## Actual workerd and capability boundary

Locked workerd **1.20261021.1** executes the real core at initialization and a test
event, including combined rules, marketing, normalization overflow and URL decode
limits. The core bundle has an exact eight-module allowlist and no external imports;
AST checks prohibit logs, network/native globals, dynamic imports/code and browser
worker constructors. These checks are against our fixed reviewed code, not a
sandbox accepting arbitrary attacker JavaScript.

Local workerd has no listening socket, network/disk/external service, mailbox/send/
storage binding or credentials. Explicit no_nodejs_compat/no_nodejs_compat_v2 flags
prevent compatibility defaults from restoring native access. The implicit internet
service is replaced by a local deny worker. Hostname, loopback and file requests
fail before any resolver/network/disk action; initialization fetch and node:dns,
node:fs, node:child_process imports fail. process/require/Buffer are absent. Dynamic
Function construction is denied. A negative mutation must fail the network assertion.
Builds copy the original Apache license and full retained MIT notices with artifacts.

## Performance measurements

`benchmark` measures the full scoreRequest path (preflight/decode/parse/freeze/guards/
normalization/rules), after fixture construction and encoding. Each of 14 cases has
10 warmups then 100 warm samples, reporting median/p95/max and noisy heap/RSS deltas.
Cases include ordinary mail, source ceilings, oversized request rejection, whitespace,
Unicode expansion, repeated phrases, 100 anchors, encoded URLs, skipped deep HTML
and huge attributes. The proposed 25ms local ordinary-fixture p95 is an explicit
check; slower large-case tails remain in the output and are not hidden by a timeout.

Five fresh Node processes separately record import and first-score times plus total
process wall time. These are genuine isolated first calls, unlike the also recorded
first-in-current-process sample for each warm case. OS caches remain uncontrolled.

Workerd event clocks do not measure synchronous CPU. Five fresh workerd processes
for each of two test batches record whole process wall time: initialization, ten
warmups and then one or 100 calls. These are cold-process/warm-batch samples, not
per-call workerd latency; startup is not estimated by subtraction. There is no
hosted CPU, deployment cold start, peak-memory, real-mail accuracy or billing claim.
Runtime/CPU/platform/limits and all samples are in `benchmark.json`; bundle minified
and gzip sizes are in `workerd-result.json`.

## Pins and remaining scope

Prerequisite PR #1 exact reviewed head:
`ce6d9afedf607584c150d457f0e078a307047f8a`. DEV-876 stacks on that branch; merge order
is PR #1, DEV-876 PR, DEV-877. No merge/release is authorized. Original Mailguard
source/package audit remains under `evidence/mailguard/audit.json`; selected new
leaf source hashes/modifications are in `rules-provenance.json` and local adaptation
hashes in the SBOM. The upstream audit and initial Jev diagnostic remain historical
foundation evidence, not fresh execution or expanded runtime adoption.

Pending outside this deliverable: private service/inbox integration, production
activation, actual inbound-header provenance, private efficacy labels, production
thresholds and hosted CPU/billing. These do not block this source-only PR. The next
stage is independent exact-head review on the same DEV-876 ticket.

## Local DEV-876 snapshot

Measured sequentially on Linux x64, Intel Xeon Gold 6152 @ 2.10GHz, Node 24.15.0,
npm 11.12.1 and workerd 1.20261021.1. The bundle is **12,962 minified / 5,019 gzip
bytes**, eight allowlisted source modules and zero external runtime imports. All
25 test groups, 12 targeted mutations/restored controls and 18 direct-growth cases
pass; maximum observed direct-growth heap delta is 23,696 bytes (4MiB ceiling).

Ordinary warm scoring: median **0.097ms**, p95 **0.171ms**, max **1.399ms**; the
proposed ordinary-only 25ms p95 target passes. Larger cases do not establish that
bound: 64KiB text p95 **184.257ms**, max **257.108ms**; 128KiB text p95 **33.050ms**;
repeated phrases p95 **50.809ms**. Unicode expansion p95 **27.382ms**; whitespace
65,536-byte shape p95 **21.316ms**. All full distributions remain in the JSON.
Shared-host/GC variability is visible; no universal 25ms latency claim is made.

Five fresh Node first-score samples range **11.245–25.495ms**, excluding measured
import time; total process wall ranges **136.016–186.698ms**. Fresh workerd processes
with initialization + ten warmups + one call range **200.967–275.865ms**; those with
100 calls range **226.510–302.398ms**. These are process/batch durations, not Worker
CPU or per-request latency. An initial timing attempt overlapped mutation testing
and was discarded; only the later sequential run is committed here.

## DEV-877 private service evidence

The sections above retain the historical foundation/core evidence. The private
service is now implemented in DEV-877; its [contract, configuration, local checks,
release boundary and rollback procedure](private-worker.md) supersede the earlier
"private service pending" note. Inbox/live integration remains pending. Current
worker snapshots are `docs/evidence/worker-*.json`; CI emits exact-head receipts.
