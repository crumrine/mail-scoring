# Architecture decision: v0.1

Decision date: 2026-10-21. This is a source and validation plan, not a production deployment.

## Product boundary

Mail Scoring is a reusable Apache-2.0 TypeScript evidence/scoring core plus a private Cloudflare Worker adapter. Agentic Inbox is the first application integration. The core is a candidate wrapper over audited narrow Mailguard modules, not a commitment to rewrite a full SpamAssassin competitor. Do not claim mature detection quality before a labeled evaluation.

No VPS daemon, public HTTP service, account management, billing, npm publication, trained Bayesian model, cross-mailbox reputation database, live DNS/URL lookup, attachment inspection or AI in v0.1.

## Request path

1. Cloudflare Email Routing performs its upstream receiving/authentication policy. Its detailed result availability and trusted-header behavior must be verified, not assumed.
2. Agentic Inbox resolves mailbox/alias as today. Existing mail acceptance, raw MIME storage and outbound/manual drafting behavior are preserved.
3. The adapter enforces inspection limits and passes minimal bounded structured fields, transport evidence, policy version and explicit mailbox preference facts to `score()` over a private service binding. It does not pass the mailbox database, raw message, attachment bytes or reusable credentials. Use ephemeral correlation only, not email identifiers in logs.
4. The core returns a versioned score/evidence/completeness object. No message body is stored by the scoring service. The assessment is not a routing instruction.
5. Agentic Inbox stores the score once with the message, initially in shadow mode. Regular UI/IMAP polling reads stored data and makes zero scorer calls.
6. Explicit application policy can later quarantine high scores. Error or unknown preserves delivery; no new spam-based SMTP rejection. Manual rescue and sender preference controls remain separate.

## Contract requirements

`ScoreInputV1`: finite bounded strings/arrays for subject, header fields, plain text and optional inert HTML; parsed sender/reply-to/envelope address fields; transport evidence with provenance/completeness; attachment filename/type metadata only; explicitly supplied preference facts; caller policy version. No arbitrary dynamic rule or regex input.

`ScoreResultV1`: schemaVersion, engineVersion, ruleSetVersion, status complete/partial/unavailable, heuristicScore finite and within a documented range, independent category evidence for spam/phishing/marketing, bounded stable rule IDs and contributions, safe static reason templates, truncation/limit reasons. No raw excerpts, code, URLs or model commands. Missing inspection is not a negative score. Do not label a heuristic number as percentage confidence.

Version request and response; caller must tolerate newer rule IDs and fail safely on incompatible schema. Deterministic rules with injected receive time; no Date.now-driven nondeterminism in core tests. Limit repeated/correlated rule contributions and make marketing-only signals insufficient for high-spam quarantine. A trusted authentication pass alone does not imply wanted mail; a reply-chain match alone does not imply a trusted correspondent.

## Core and Worker isolation

The first ticket proves usable exports and dependency licenses under real workerd. Do not import an umbrella entry point containing DNS/network/attachment features. The Worker has no R2/DO/mail/database bindings. Its only callable interface is private service RPC; no public route or workers.dev/preview exposure. An HTTP adapter for non-CF clients is future work with a separate security and abuse design.

The core's external I/O budget is zero. Start with 256 KiB request maximum and other SECURITY.md ceilings; preserve early bailouts and completeness metadata. Measure bundle size, cold/warm execution, median/p95/max and worst-case growth. Proposed performance target: p95 deterministic scoring below 25 ms wall on bounded ordinary synthetic fixtures in the stated test environment; report failure rather than hiding slow cases. This target is not a bill or provider CPU estimate. Establish actual Workers CPU measurements only in a separately authorized hosted test.

## Application integration

Agentic Inbox code: `workers/index.ts` receiveEmail; `workers/app.ts` email entrypoint; `workers/durableObject/index.ts`, migrations.ts and `workers/db/schema.ts`; `shared/folders.ts`; shared `workers/lib/tools.ts`; SPA list/panel/settings; IMAP SPECIAL-USE and move semantics. Repository: https://github.com/crumrine/agentic-inbox-imap.

Assessments persist in the mailbox DO with rule-set/version/completeness, explicit user disposition and original automatic assessment retained. Existing rows are unknown/unscored. No automatic historical scan or persistent summary needed initially. Store only what the application needs; avoid duplicating full message content. Backfills/re-evaluation are explicit bounded operations.

Migrations are append-only using storage.transactionSync (not SQL BEGIN); keep Drizzle schema in sync. Every folder move goes through existing UID-allocation rules. Application and gateway changes must be separate commits per that repository's CONTRIBUTING.md.

Feedback actions are mailbox-scoped and shared across REST/MCP/agent wrappers via the common business layer where appropriate. Agent instructions/email text do not count as a user action to train or create allow rules. Reading a Spam message must not fetch its resources. Spam must be a first-class system folder with recoverable Not spam action; quarantine is excluded from normal cross-folder threads, counts, search/context and notifications. Explicit Spam search/view can opt in. Preserve existing IMAP visibility and UID correctness, do not add a second mailbox store.

## Release gates

Source PRs only, with independent review and exact-head CI. First ship-ready configuration remains scoring off/shadow and quarantine off; no production activation is authorized by these tickets. AI is absent. Final evidence records source merge order and pinned prerequisite SHAs, safe rollback switch, synthetic/classification and performance limits, and the exact owner-run live intake/header verification steps still pending.

A later authorized observation run can collect private labels locally, measure false positives/misses and choose thresholds. Do not publish or send private email content anywhere as part of these tasks. No numeric production threshold is fixed before that evaluation.

## Primary references

- https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/ — private service binding and independent Workers.
- https://developers.cloudflare.com/email-service/reference/postmaster/ — upstream authentication and RBL policy; not a guarantee of safe delivered content.
- https://developers.cloudflare.com/email-service/api/route-emails/email-handler/ — actual transport interface.
- https://github.com/cloudflare/workerd/issues/6740 — reported authentication-result header absence; verify actual behavior before trusting a particular field.
