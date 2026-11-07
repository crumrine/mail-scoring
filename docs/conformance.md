# Delivery and quarantine conformance

DEV-994 checks the scanner/policy boundary, delivery preservation and recovery.
The expected decisions below come from the declared rules and routing contract.
Fixtures are original synthetic `.test` examples. Amavis's scanner/policy and
quarantine/release separation informed the matrix; no upstream code or messages
were copied. Rspamd's symbol/action approach is represented by exact reason,
contribution and folder assertions in the existing consumer suite.

The runtime scorer remains `faa15bea06db52f2dc240257d5335a66a933f909`.
The consumer prerequisite is merged Inbox
`e3124d9bbf104315639cc2630f7cdd42bf2e700a`; the conformance consumer pin and
verification hashes are recorded in `docs/evidence/dev-994/receipt.json`.
This documentation adds no scorer rule, threshold or runtime capability.

| Contract input or fault | Expected result | Executable coverage in Inbox |
| --- | --- | --- |
| Literal unquoted GTUBE, including supported MIME encodings | `gtube` 100, partial provenance, Spam; raw/attachments retained and recoverable | `shadow-scoring.test.ts`, joined GTUBE integration |
| Near/quoted/forwarded marker and mixed original/control-stripped occurrences | 0, Inbox; control/quote limits remain visible | `suite delivery and quarantine conformance`; joined GTUBE controls |
| Ordinary security notice, receipt, new contact and multilingual reply | 0 or the explicitly asserted weak reasons, Inbox | Conformance and URL composite groups |
| Userinfo URL alone; sensitive request without identity evidence | 15 or 40, Inbox | Joined plain-text URL symbols and capped composites |
| Userinfo plus reply mismatch plus sensitive request | Exact 15 + 10 + 25; Spam under the existing 45-point policy | Same real MIME/scorer group; repeats remain capped |
| Alias envelope with Bcc/multiple header recipients | Resolve once to the intended mailbox, then score once; GTUBE 100 in Spam | Alias/Bcc conformance test and existing routing suite |
| Explicit allow/block and clear; forged auth/spam headers | Existing preference precedence, unknown transport authority; no inferred trust | Real GTUBE preference and spoofed-header groups |
| Missing/malformed/incompatible/throwing/timed-out scorer | Unavailable, Inbox, retained mail; no send/model action | Existing shadow/filter failure matrix; injection is at the faulty binding |
| Preference lookup throws while the real scorer detects GTUBE | Score 100 retained, Inbox because preference state is unknown | Upgraded preference-failure test with actual scorer RPC |
| Optional assessment INSERT fails | Mail remains in Spam, assessment reads unknown; raw and Not spam recovery work, no rescore | SQL-trigger conformance test |
| Raw R2 PUT fails while actual scoring succeeds | Stored body survives, `raw_key=null`, IMAP serves supported synthesized MIME | Raw fallback conformance test; exact original raw bytes are unavailable in this fault |
| Feedback transaction fails | Folder and destination UID allocation roll back together | `quarantine.test.ts`, destination UID/folder rollback test |
| Rescue/retry/read/search/thread/agent operations | Stable UID semantics, no repeated scoring/training/drafts; Spam excluded from ordinary context | Existing quarantine and quarantine-context suites |
| Desktop 1440 and mobile 390 | Inert bounded preview, explicit sender controls and Not spam recovery | Existing `scripts/quarantine-browser.mjs` with actual SPA components |

Run the existing consumer suite from its exact conformance pin. Use an immutable
checkout of the runtime scorer because the consumer deliberately verifies that
pin; later documentation/evaluator commits do not change those runtime bytes.

```sh
# In an installed Inbox checkout at the consumer pin in receipt.json:
export MAIL_SCORING_DIR=/absolute/path/to/scorer-at-faa15bea
export INBOX_LOCAL_ONLY=1
export WRANGLER_SEND_METRICS=false
npm test -- test/shadow-scoring.test.ts test/quarantine.test.ts test/quarantine-context.test.ts --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000
npm test -- --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000
npm run typecheck
npm run build
```

The browser command uses the existing synthetic HTTP fixture bridge. Start
`node_modules/.bin/vite --config test/browser/vite.config.mjs --host 127.0.0.1 --port 5189`
in that checkout, then run `EVIDENCE_DIR=/absolute/evidence/path node scripts/quarantine-browser.mjs`.
`CHROME_PATH` may select an already installed Chromium executable. Backend
MIME/RPC/R2/SQLite/REST/IMAP coverage remains in the joined workerd suite.
The older `harness/dev-880` receipts remain historical source-readiness evidence;
its preservation/fault patterns and existing suites are reused here.

These local checks do not establish provider-level fresh inbound delivery,
physical mail-client rescue, hosted CPU, or current-mailbox efficacy. Unknown
transport, omitted HTML/attachment inspection, inherited MIME-parser limits and
the supported raw-storage fallback stay explicit. Missing/oversized recipients
and permanent size rejects retain their existing pre-scoring contract.
OPS-599 owns the separately reviewed manual deployment and target verification.
