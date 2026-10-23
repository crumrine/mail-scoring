# DEV-880 joined-path diagnostic harness

Copyright (c) 2026 Brian Crumrine. SPDX-License-Identifier: Apache-2.0.

This is the first, deliberately narrow part of the release-readiness assessment.
It is **not a completed release-readiness suite**. Its mandatory confidentiality
assertion must pass on the reviewed source; a red baseline is not success.

Prerequisites: Node 24.15.0, npm 11.12.1, scripts-disabled `npm ci` in this
repository and a sibling clone of https://github.com/crumrine/agentic-inbox-imap
checked out at `b87650673815a9a7236303457435bb33a0e1d4ac`. Override its location
with `DEV880_INBOX`. The script rejects a different head/origin. It exports
immutable Git trees to `.artifacts/dev-880/<mode>/`, links installed dependencies,
and overlays only the test/config plus the actual pinned scorer bundle. It never
edits the dependency checkout or its branch. No credentials are required.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node harness/dev-880/run.mjs baseline
node harness/dev-880/run.mjs diagnostic-repair
node harness/dev-880/run.mjs restored
```

Each command reports its actual exit status, writes a JSON receipt, raw Vitest
JSON and a local runner log. A 180-second external process deadline contains a
hung test runner; this is not a synchronous CPU limit inside the scorer. Do not
run performance measurements concurrently with mutation suites.

The baseline and restored commands export identical reviewed product source.
The middle command makes one explicit scratch-only diagnostic repair; the
receipt labels that overlay. It is not a reviewed successor or a production fix.
The harness verifies the original production file digests before overlaying it.

The joined success case uses the actual `workers/app.ts` email export,
PostalMime, `receiveEmail`, R2, MailboxDO SQLite, a separate WorkerEntrypoint
scorer through a service binding, production JWT verification with local keys,
and REST list/thread/feedback/rescue/IMAP-read handlers. The wrapper counts and
forwards RPC calls; it does not substitute scoring results. Separate tests cover
off, missing binding and a local storage fault. The fault replaces only R2 put;
registry reads, scoring, raw-persistence catch and SQLite insertion remain real.

Only unrelated Agent/MCP exports and the SSR virtual module are inert. The
sender and AI bindings throw/count, remoteBindings is false, JWKS is synthetic,
and test fetch rejects every other address. The scorer's outbound service denies
requests; its actual bundled graph/config is checked with the existing strict
capability policy. These restrictions do not establish capability absence from
the entire Inbox product or prove the React UI rendering path. No attachments,
private messages, models, paid resources, live email, deployments or activation.

Fixture provenance: four test cases reuse one original synthetic plain-text
receipt authored for this repository. All identities are `.test`; no harvested
or third-party corpus, attachment bytes or real personal data is present. The
fixture, generator and test source are original Apache-2.0 work. This does not
relicense the pinned Inbox, Mailguard adaptations or npm tooling; their existing
licenses/notices continue to apply. The full dependency SBOM, adversarial
corpus/classification/growth/performance/UI checks remain required later work.

Do not publish vulnerability reproduction details before following the affected
repository's SECURITY.md private reporting policy. The current evidence and
finding are recorded locally and on the existing Trellis dependency, not a new
public fix ticket.
