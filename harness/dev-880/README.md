# DEV-880 reproducible source readiness checks

Copyright (c) 2026 Brian Crumrine. SPDX-License-Identifier: Apache-2.0.

The refreshed source checks pass at Inbox df4e70e65e91117ad8050b13a3a78e912d51c920
and scorer bb02819e4662e1d680805435dd886e3dc4728906. The dependencies have independent exact-head approvals. Independent review
of this report remains pending. Production activation
is not approved. See docs/release-readiness.md and evidence/dev-880/acceptance.json.

Use Node 24 / npm 11.12.1 and scripts-disabled installs in this repository and the
pinned sibling Inbox. Set DEV880_INBOX to its absolute path if it is not ../inbox.
The runner checks the exact Inbox head and normalized repository origins; it
exports immutable Git trees and never edits the dependency checkout. Its scorer
bundle is exported from the pinned reviewed commit, not current working files.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run sbom
node scripts/schemas.mjs
npm run worker:benchmark
npm run benchmark
node scripts/receipt.mjs
node harness/dev-880/run.mjs verified
CHROME_PATH=/usr/bin/google-chrome node harness/dev-880/browser.mjs
node harness/dev-880/audit.mjs
node harness/dev-880/parser-growth.mjs
```

For the full recorded sequence (including clean installs, Inbox typecheck/full tests,
disposable mutation controls and report generation), run `node harness/dev-880/verify.mjs`.
Set CHROME_PATH to an installed Chromium executable if needed. Keep full Git history
in both repositories: diagnostics controls also read Inbox b87650673815a9a7236303457435bb33a0e1d4ac. New receipts are written
to `docs/evidence/dev-880/reviewed-pins`; historical `resumed` receipts stay unchanged.
If a command fails, preserve its attempt directory before a bounded repair. The optional
command name argument resumes there using only preceding successful ledger entries;
never use it after changing the product or test code those entries validated.

The joined harness tests actual production email/JWT/REST/shared storage code and
a separate real private scoring Worker. Synthetic send/model bindings are inert,
remote bindings are false, JWKs are local and other outbound fetches are denied.
Unrelated SSR, Agent and MCP exports are inert. The public-route/config/bundle
capability checks and core/private-Worker negative controls run through npm check.
The bounded output and unknown/partial/error matrix never turns unavailable into
safe mail or automatic quarantine. A 180-second external runner deadline is not a
synchronous CPU bound.

The browser bridge serves actual SPA components and API client from the pinned
Inbox fixture, and forwards real requests to its JWT/API/R2/SQLite implementation
under local Miniflare. It adds only a loopback synthetic identity, authored seed
and counters. Desktop 1440 / mobile 390 exercise inert review, separate preferences
and manual rescue; backend state and zero read-rescore calls are asserted. No HTTP
fixture response replaces product business logic. Installed Chrome can be chosen
with CHROME_PATH; the harness downloads no browser. Servers/browsers/runtime are
closed in finally. This is not physical-device or live-provider acceptance.

The corpus generator contains 32 original authored cases: ordinary receipts,
newsletters/new contacts, multilingual and forwarded/replied mail, spoofed auth,
encoded links, hostile HTML, controls/bidi and malformed/oversized structures.
No harvested/private corpus, real contact data or attachment bytes are present.
Original fixtures are Apache-2.0; existing third-party licenses remain intact.
The recorded evaluation-only cutoff 30 yields 6 positives, 1 miss, 0 false positives
and 12 true negatives among the 19 labeled examples. The Japanese-language miss is
retained, not calibrated away or converted to a production claim.

Audit records exact locks, license expressions, enclosing-archive integrity for
bundled optional packages, installed versions and available notice hashes. Parser
measurements use eight safe text-only MIME cases with external child deadlines;
they do not secure the inherited 25 MiB MIME parser or measure hosted CPU.

Run Inbox scoring/quarantine mutation scripts only inside a disposable Git export;
they write their own evidence. scripts/check-scoring-contract.mjs also requires a
separate clean Git worktree at the scorer pin. report.mjs collects those receipts,
current joined/browser/audit/parser evidence and separated benchmark results.
The new CI integration job independently checks the pinned joined/browser/audit
and parser path; the existing job runs full core/private-RPC checks and benchmarks.

Preserved baseline/diagnostic-repair/restored receipts describe the original
source failure. To reproduce that historical experiment, use the original local
commit 81c76099d891967db307f338286b07973f6532d9 and its README, rather than applying
an overlay to corrected source. Current verified mode applies no product overlay.
Do not publish private mail or exploitable live reports; the inherited finding was
reported privately to the owner/existing DEV-878 before correcting source.

After staging evidence, run `node harness/dev-880/check-evidence.mjs` to verify every
manifest entry is both tracked and hash-correct. CI repeats this on the committed tree.
