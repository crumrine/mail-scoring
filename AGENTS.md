# Mail Scoring contributor instructions

Read README.md, SECURITY.md, docs/architecture.md, docs/research.md and the exact Trellis ticket before editing. This is an Apache-2.0 open-source project; do not introduce secrets, private email, private mail metadata, customer domains, account identifiers, model weights or fixtures without documented redistribution rights.

## Scope and authority

- Initial deliverable: source code, synthetic fixtures, measured local/workerd evidence and reviewed PRs. No production deployment, live routing change, public API, npm publication or paid model call is authorized by the implementation tickets.
- Keep the scorer and mailbox application separate. The scorer has no mailbox database, R2, send-email binding, credentials, tools or folder-mutation capability.
- All ticket deliverables stop at independently reviewed PRs. No merge or deployment. Downstream work must branch from/reuse the exact reviewed prerequisite PR SHA (or verified merged successor), record pins, and preserve existing work. Do not assume a finished prerequisite has merged to main. For cross-repo work preserve separate branches/commits/PRs and explicitly record both SHAs.
- A dependency is finished when its requested reviewed-PR artifact and evidence exist; do not manufacture a deployment gate for source-only work. The final integration report must state the merge order and any pending live verification.

## Implementation

- Node 24 for tooling, npm with committed lockfile; TypeScript ESM. No runtime framework beyond what the ticket needs. The initial feasibility ticket establishes package layout and reproducible check commands.
- Prefer audited narrow modules from existing permissively licensed libraries over duplicating equivalent code. Follow the reuse gate in docs/research.md. Never import network/attachment/verification modules through an umbrella entry point by accident.
- Every untrusted-input loop and allocation must have an enforceable bound. Promise.race is not a way to interrupt synchronous parsing or a catastrophic regular expression.
- Do not fetch URLs or DNS from email data, execute HTML/JS, invoke shell/native scanning, unzip archives, inspect attachment bytes, render documents, OCR or call an LLM in v0.1.
- Headers, authentication-result strings, Message-ID/References, display names and model outputs are untrusted. A claimed authserv-id by itself does not authenticate a header. Do not globally trust a sender based on an address or a thread match.
- Incomplete/error is a distinct outcome, never synonymous with safe. Application policy must preserve delivery and recovery; no silent discard or automatic delete.
- Static rule IDs and safe reason templates; never embed unescaped attacker text into UI, logs or terminal output. Logs contain bounded aggregates, not message text, addresses, subjects, raw URLs or attacker-supplied identifiers.

## Verification and handoff

Run the ticket's focused checks, typecheck, core tests and workerd boundary tests as applicable. Security regressions must fail against a deliberately unfixed implementation. Test outbound fetch/DNS capability violations, malformed inputs and CPU/memory growth, not just labels. Pin all dependencies and capture license notices/SBOM. Do not run fetched project install scripts merely to research reuse.

Store durable evidence with fixture provenance, runtime versions, exact commit, request limits, samples and scope limits. Synthetic classification accuracy is not real mailbox efficacy; local wall time is not Cloudflare billed CPU. All started processes must finish or be stopped. Never reset another runner's workspace or create duplicate tickets/workers.
