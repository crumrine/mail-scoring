# DEV-875 validation evidence

Run from a fresh checkout with Node **24.15.0**, npm **11.12.1**, Linux x64:

```sh
npm ci
npm run check
npm run sbom
node scripts/schemas.mjs
npm run benchmark
node scripts/receipt.mjs
```

`npm run check` runs typecheck, package build, core/security tests, actual workerd
spike, and deliberate removal/restoration of protections. CI executes these on
every push/PR and attaches `.artifacts/` to the source SHA. `receipt.json` records
the exact checkout SHA and a source-tree digest; it is identity metadata, not an
independent test result. PR checks/logs are the execution evidence. In a PR event
GitHub may test a synthetic merge SHA; the push workflow also tests the exact
branch head. Independent review and delivery must verify the recorded branch head.

Builds copy the Apache license and full third-party notices alongside compiled
package files and CI artifacts.

The checked-in files under `docs/evidence/` are the pre-submission synthetic local
snapshot; their enclosing Git commit supplies immutable identity. The Trellis
implementation report and PR record the final submitted SHA. Local scope:

- Package exports build and are consumed by tests; input/schema artifacts regenerate.
- Below/at/above ceilings, shared source budget, UTF-8 code points/lone surrogates,
  header delimiters/block totals, counts, field maxima, C0/C1/bidi controls, duplicate
  headers, wrong types/unknown fields, deep JSON, token count, invalid UTF-8/JSON,
  spoofed transport, truncated evidence, array accessors and attachment byte rejection.
- Static output registry, finite score range, bounded output and no content-bearing
  errors or console calls. The emitted core AST/import graph forbids external or
  dynamic imports, network/native globals, logging and dynamic code constructors.
  This is an auditable allowlisted source graph, not a general sandbox for malicious
  JavaScript supplied by callers (which is not an accepted input type).
- Real workerd **1.20261021.1** executes the selected path both during initialization
  and in a test event. The configuration has no network/disk/external service,
  sockets, mailbox/storage/send binding or credentials. Its implicit internet is
  replaced with a local throwing service, so even hostname fetch never reaches DNS.
- Exact-date workerd compatibility source showed Node compatibility enabled by
  default after 2026-08-04. Both `no_nodejs_compat` and `no_nodejs_compat_v2` are
  explicitly set. Initialization probes for node:dns, node:fs and node:child_process
  must fail; runtime probes require process/require/Buffer absence. An initialization
  fetch probe must fail, as must hostname, loopback and file fetches inside an event.
- Mutation test enlarges the source text allowance and requires the source-bound
  test to fail. It also removes the parser-root identity check and string-length
  preflight separately, requiring their specific regression tests to fail. It then
  replaces the deny service's throw with a response and
  requires the workerd network assertion to fail. Finally it restores source and
  reruns the positive baselines. No mutation or broken build is submitted.

`npm run audit:mailguard` separately re-fetches immutable public research inputs
and regenerates the adoption evidence, without upstream lifecycle execution. It is
not required by routine CI, which has no Mailguard runtime dependency. The tarball
SHA-512, archive/file SHA-256 values, exact audit lock, source-map comparisons,
export graph, license-file hashes and selected narrow workerd result are committed.

`benchmark.json` describes 100 samples per source size, median/p95/max, first call,
heap/RSS deltas and hardware. It now measures the entire scoreRequest path, including
preflight/parse/deep freeze/field guards. Source strings within a valid request are
clipped at inspection caps; oversized requests return unavailable before decoding.
Synthetic fixture encoding is outside timing. Memory deltas are GC-sensitive measurements,
not peak-memory guarantees. The enforceable allocation/work bounds come from the
fixed parser byte/token/depth budgets and bounded loops; asynchronous deadlines
are not used as synchronous CPU protection. Ordinary-fixture p95 is compared with
the proposed 25 ms **local wall** target; slower tail observations remain visible.
No result is hosted billed CPU, cold deployment latency, real-mail efficacy,
classification accuracy or billing savings. Additional classifier rules will need
fresh adversarial/performance evidence; no real mailbox or mailbox provider call occurred.

`npm run direct-growth` (also in `check`/CI) measures cold calls after fixture
construction and GC: 1,000/100,000/1,000,000 properties at root, header, transport
and attachment levels, plus 1/16/64 MiB repeated and concatenated lazy strings.
Unprepared objects must return unavailable without enumeration, and oversized
strings must return empty/truncated without flattening. Each call has a 4 MiB
heap-delta regression ceiling; timings and RSS deltas remain visible without a
flaky absolute time assertion. This is regression evidence, not a peak-memory
proof. The implementation's private identity check and O(1) length gate establish
the bounds. Deep freezing is separately tested to prevent post-parse changes.
`docs/evidence/direct-growth.json` contains the local snapshot.

The previous direct-object API and its performance claims were superseded after
review found eager key enumeration and rope flattening. The protocol now requires
parser-created immutable roots; downstream adapters must use bounded bytes and
cannot pass ordinary objects directly. Export names and wire schemas remain stable.

The initial workerd diagnostic and Jev advisory JSON are retained. The first failure
was a missing explicit native-compatibility opt-out, corrected against the pinned
workerd compatibility source; tests were not weakened. Jev's local JSON has
`audit_saved:false`, so this repository copy is the durable advisory record.

Pending **out of scope**, not blockers to this PR: full deterministic rules,
private RPC service deployment, actual inbound-header provenance verification,
mailbox labels/thresholds, hosted CPU/billing and live mail routing. This stage
submits a PR; independent exact-head review follows on DEV-875. No merge or release.
