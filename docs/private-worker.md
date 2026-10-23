# Private scoring RPC v1

DEV-877 is source/PR-only. No Worker is deployed, no service binding is activated,
and no mailbox/provider call or npm publication is part of this evidence.

## Pins and contract

Repository: https://github.com/crumrine/mail-scoring. Branch from DEV-876 PR #2,
exact reviewed core `8456996596af6446f533cacb90ff9ce2ecd1a4ab`; foundation PR #1 is
`ce6d9afedf607584c150d457f0e078a307047f8a`. PR base remains
`codex/dev-876-deterministic-core`. Eventual merge order is #1, #2, DEV-877, then
Inbox integration. These prerequisites are reviewed PRs, not merged main.
No additional repository changes are needed here.

`workers/private/protocol.ts` exports `ScoreInputV1`, `ScoreResultV1`,
`ScoreContext`, `ScorerBinding` and `RpcResponseV1`. The default `WorkerEntrypoint`
exports `scoreV1(version, inputBytes, contextJson = '{}') -> Promise<string>` over
RPC. The implementation returns synchronously; Workers RPC supplies the promise.
`version` must equal `'1'`. Input is a UTF-8 `Uint8Array` containing JSON matching
ScoreInputV1, not an arbitrary RPC object. The receiver checks runtime types,
request bytes, structure, schema and fields. Client TypeScript is not validation.

The response is a UTF-8-bounded JSON string, at most 4096 bytes:

```ts
{ rpcVersion: '1', ok: true, result: ScoreResultV1 }
{ rpcVersion: '1', ok: false, error: 'unsupported_version' | 'invalid_input' |
  'invalid_json' | 'request_limit' | 'internal_failure' }
```

Only static errors leave the scorer. No exception message, stack, cause, input,
policy string or stable mail ID is returned or logged. `decodeResponse` validates
size/depth, exact fields, versions, finite contributions, safe reasons, limits and
completeness before a consumer uses the result. Incompatible future engine/rule
versions fail to unknown; coordinate version rollout with the caller. A new rule
contract must not silently bypass that validation.

### Bounds and trust

The core is unchanged. Its private WeakSet and deeply frozen parser-root contract
remain: parsing happens inside the receiving Worker, never by branding RPC clones.
Request ceiling is 262144 bytes; JSON depth 6 and structural tokens 4096 precede
JSON.parse. Combined text/HTML 131072 bytes; extracted/normalized text 65536 bytes;
headers 32768 bytes/100 entries/8192 bytes each; anchors plus URLs 100 entries with
2048-byte fields and two decoding passes; 32 attachment **metadata** entries only.
Field/cardinality truncation remains partial; malformed schema is unavailable.
HTML is uninspected/partial. See [core protocol](protocol-v1.md) for every bound.
These are inspection limits, never mail acceptance limits.

Separate `contextJson` is at most 256 UTF-8 bytes, depth one (no arrays), with only optional booleans
`transportVerified`, `preferencesVerified` and a nonnegative safe integer
`receivedAt` up to 8640000000000000. Defaults assert no provenance. Only trusted
same-account application code may set these facts after independently verifying
transport evidence or authenticated user preferences. Never copy this argument
from email, a header or model output. The serialized ScoreInput's transport and
preference claims cannot establish their own trust. The sample exposes no context
argument; its public-to-the-account RPC uses unknown defaults.

Worker RPC materializes arguments before method entry. Application byte guards
bound parsing/inspection, **not arbitrary allocation by the platform transport**.
The binding is a capability granted only to trusted same-account caller code.
Callers must construct bounded fields before JSON serialization; do not stringify
an arbitrary mailbox object or raw MIME. `encodeBoundedJson` checks the length of
an already constructed JSON string before UTF-8 allocation. The receiver repeats
all checks. No attachment bytes belong in this contract.

### Caller behavior

`workers/consumer/integration.ts` is the disabled-by-default integration sample.
`SCORING_ENABLED` must explicitly equal `'true'`; off performs zero RPC calls.
It always returns `delivery: 'preserve'`. Missing/throwing/incompatible services,
invalid output and a 1000ms wait limit yield `inspection: 'unknown'`. Partial
results stay partial. Neither a zero score nor unknown means safe. No folder
moves, rejection, deletion, persistence, automatic rescans or feedback training
are supplied. Inbox owns storage, manual recovery and any later shadow policy.

The consumer timeout limits waiting only. Promise.race does not cancel synchronous
CPU, transport allocation, or the in-flight RPC; it is not the scorer's resource
boundary. Byte/cardinality/output/normalization bounds in the core limit work.
No asynchronous scanner or background task is scheduled by the scorer.

## Isolation and local configuration

Both `workers/private/wrangler.json` and `workers/consumer/wrangler.json` explicitly
disable workers.dev, preview URLs, routes, observability and CLI telemetry. The
scorer has **zero bindings**. The sample has only SCORER and the off switch: no
account IDs, secrets, R2, KV, mailbox DO, databases, send_email, AI, remote resources
or node compatibility. Both HTTP handlers return an empty 404 without inspecting
the request. No public HTTP scoring endpoint exists.

No per-message logs, traces, metrics, content cache or counters are emitted or
retained. This deliberately uses zero telemetry rather than introducing a new
metrics sink/binding. If future bounded aggregate telemetry is added, only finite
allowlisted rule/version/status/limit/timing buckets are permissible; content,
addresses, subjects, URLs, policy strings and stable IDs must stay absent.

Use Node 24.15.0/npm 11.12.1; lifecycle scripts stay disabled. Exact development
Wrangler/workerd/type packages are in the lock and SBOM. The portable core has no
Cloudflare import; only the Worker adapter imports `cloudflare:workers`.

```sh
npm ci
npm run check
npm run sbom
node scripts/schemas.mjs
npm run worker:benchmark
npm run benchmark
node scripts/receipt.mjs
```

`worker:build` checks strict config key allowlists and both actual Wrangler
`deploy --dry-run` bundles/metafiles, plus independent esbuild graphs. Actual workerd tests and benchmarks execute the
checked Wrangler dry-run output; mutation probes temporarily build changed sources
and then restore and retest that production bundle.
`worker:test` generates `.artifacts/worker/local.capnp`: an actual consumer Worker
invokes the scorer through a workerd service binding. No listening socket exists
in tests. A local deny service replaces outbound networking for **every Worker**;
no DNS/network service is configured. Existing core workerd probes verify denied
network calls, module initialization I/O and native/dynamic-code access. Mutations
must fail and pass after restoration. Static AST/module checks are regression
checks on reviewed source, not a claim of an arbitrary-code sandbox. The hosted
platform has fetch capability; reviewed code and bindings must continue to exclude
its use.

For interactive local multi-Worker startup (off by default):

```sh
npx --no-install wrangler dev --local --ip 127.0.0.1 \
  -c workers/consumer/wrangler.json -c workers/private/wrangler.json
```

Both HTTP paths remain 404. The executable harness is the way to exercise RPC.
`worker:benchmark` creates a loopback-only synthetic harness socket on an ephemeral
port. It accepts only fixed fixture names, never message bodies, and is excluded
from deployable bundles. All processes stop on completion/failure. No external
network is used for these fixture calls.

### Evidence and performance

`.artifacts/worker/` contains exact build graphs, dry-run logs, actual RPC result,
mutation results and benchmark JSON. `.artifacts/receipt.json` binds source SHA,
base pin and source digest; CI uploads these plus the SBOM/license inventory.
Committed `docs/evidence/worker-*` files are snapshots; CI receipts identify the
actual tested commit. All fixtures are authored synthetic `.test`/`.invalid`
content; no private mail is used.

Host wall measurements include loopback HTTP, serialization, consumer/scorer RPC
and host scheduling. Warm: ten warmups then 100 samples per fixture, reported as
median/p95/max. Cold: ten fresh workerd processes per selected fixture; first-call
and process startup distributions are separate. OS caches are uncontrolled. The
ordinary-fixture proposed p95 target is 25ms; misses and hostile-fixture tails
remain visible. These are not billed CPU, hosted cold starts, accuracy, memory
peaks or a zero-compute-cost/savings claim. See worker evidence JSON for results.

## Local DEV-877 measurement snapshot

Linux 6.1.0-52-amd64 x64 / Intel Xeon Gold 6152 @ 2.10GHz / Node 24.15.0 /
npm 11.12.1 / workerd 1.20261021.1 / Wrangler 4.151.3. The tested Wrangler scorer
bundle is **16,775 bytes / 6,169 gzip**, consumer **4,984 / 2,100 gzip**. Independent
esbuild output is also recorded separately; do not substitute its smaller size.

| Fixture/path | Median ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: |
| Ordinary warm RPC | 3.696 | 26.681 | 64.368 |
| Newsletter warm RPC | 3.478 | 5.735 | 46.195 |
| Deceptive warm RPC | 3.282 | 10.437 | 60.348 |
| Ceiling text warm RPC | 19.949 | 68.480 | 99.088 |
| Unicode expansion warm RPC | 11.229 | 30.185 | 48.749 |
| Ordinary cold first RPC | 11.745 | 30.418 | 30.418 |
| Ceiling text cold first RPC | 128.996 | 249.751 | 249.751 |

**The proposed ordinary 25ms p95 target was missed** for both warm and cold RPC.
The host round-trip includes serialization, local HTTP, both bindings and shared
host scheduling; this measurement does not isolate each component's cost. Warm
sample count is 100/fixture; cold is 10 fresh processes/fixture. Ordinary process
startup (separate from first RPC) has median 96.239ms, p95/max 126.566ms. All seven
warm/four cold fixture distributions and raw samples remain in
[evidence/worker-benchmark.json](evidence/worker-benchmark.json). No rerun was used
to replace these misses with better numbers. Independent CI samples are separate.

The snapshot was captured before commit (`worktreeDirty: true`); its headSha is
the prerequisite checkout, **not** a claim that new code existed in that commit.
Its exact tested scorer bundle SHA256 is
`2238e8bf4654d4010bedeb5ab06161532ccb7ab5b304edded8fa56232f2904e2`.
The final source commit/CI receipt binds the submitted code and matching bundle.
The pure Node core was separately measured: ordinary p95 0.275ms, 128KiB text
p95 171.243ms. Neither is a replacement for the end-to-end RPC measurements.

Local validation passed 29 test groups, 12 inherited core mutations, 8 Worker
mutations, 18 growth cases, strict graphs/configs and real service-binding tests.
After flat-context hardening and switching local tests to Wrangler output, fresh
npm ci/typecheck/tests/build/workerd/mutations passed again. Core source remains
identical to the reviewed prerequisite. Full checks run again in exact-head CI.

An initial benchmark startup failed because the scripts-disabled npm launcher
dropped control fd 3. The harness now uses the pinned package's exported native
binary path, preserving that descriptor. The successful samples above were taken
after this repair. The sanitized Jev advisory is retained in
[evidence/worker-startup-advice.json](evidence/worker-startup-advice.json); it did
not authorize any provider action. No failure was hidden by weakening a check.

## Release and rollback configuration (not executed)

After independent review, this ticket completes at the reviewed PR. A later
explicitly authorized owner release must first merge the stack in order, pin the
reviewed source/bundle digest and lock, rerun CI/dry-run/config tests and record the
previous scorer version ID and caller configuration. Keep the caller off; publish
only the scorer with zero bindings and the checked private exposure settings.
Verify provider effective configuration has no routes/custom domain, workers.dev
or preview URLs, including dashboard settings/drift. Do not inherit an unchecked
environment override. Bind only approved same-account callers.

Before enabling shadow scoring, separately verify real intake/header provenance,
caller delivery-on-error and manual recovery using owner-authorized private data
that never enters this repository/CI. Configure no quarantine/automatic actions.
Observe hosted CPU/resource behavior under separately authorized limits; local
measurements do not establish it. Confirm unsupported versions preserve delivery.

Rollback starts by setting the caller's SCORING_ENABLED to `'false'` (or removing
the optional binding with the caller handling absence). Preserve all mail and
existing assessments; no rescans or data migrations are required here. Restore
the recorded previous compatible scorer version/config, recheck private exposure,
and leave scoring off until the contract is reverified. No live rollback command,
publication, merge or provider configuration change is authorized by this ticket.

References: [Cloudflare RPC](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/)
and [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
checked 2026-10-21 and exercised against the locked tooling locally.
