# Mail Scoring contributor instructions

## Finish completed work on the shared default branch (Brian, 2026-10-23)

Brian's request to implement or fix something authorizes the routine Git workflow
needed to finish it: review the diff, run the required checks, integrate current
upstream, commit, push, and merge the PR without asking him to repeat permission.
Unless Brian explicitly requests a draft, review-only work, or an unmerged branch,
a pushed feature branch or open PR is not completion. Follow this repository's
branch conventions and required reviews/checks, then finish the path to its actual
shared default branch, including stacked PR dependencies.

Before every push, pull and integrate the current remote target branch in the
repository being pushed with `git pull --no-rebase --no-recurse-submodules
<remote> <branch>`. For a new branch, integrate its current remote base before the
first push. A session-start pull never substitutes for this pre-push pull.
Resolve ordinary conflicts and push races, verify the integrated result, and
retry normally. Preserve unrelated work; never force-push or bypass hooks/checks.
Publish dependent repositories and submodule commits before their consumers or
parent pointers.

Before reporting completion, verify that the remote default branch contains the
result and that any associated PR is merged. Update working checkouts when safe;
preserve dirty work and report any checkout that cannot be updated safely. If a
concrete blocker remains, preserve the work and record the exact blocked step
and recovery information instead of silently leaving a branch or PR behind.

This standing instruction supersedes older guidance that ends routine work at a
suggested commit, pushed branch, or reviewed PR, or asks for separate merge
permission. Required reviews, failing checks, production cutover gates, and
uncertain provider submissions retain their own evidence requirements. A source
merge alone does not establish deployment or production activation.

Read README.md, SECURITY.md, docs/architecture.md, docs/research.md and the exact Trellis ticket before editing. This is an Apache-2.0 open-source project; do not introduce secrets, private email, private mail metadata, customer domains, account identifiers, model weights or fixtures without documented redistribution rights.

## Scope and authority

- Initial deliverable: source code, synthetic fixtures, measured local/workerd evidence and reviewed PRs. No production deployment, live routing change, public API, npm publication or paid model call is authorized by the implementation tickets.
- Keep the scorer and mailbox application separate. The scorer has no mailbox database, R2, send-email binding, credentials, tools or folder-mutation capability.
- Complete independently reviewed source PRs through merge to the shared default branch after required checks. Production deployment remains outside these implementation tickets. Downstream work must branch from/reuse the exact reviewed prerequisite PR SHA (or verified merged successor), record pins, and preserve existing work. Do not assume a finished prerequisite has merged to main. For cross-repo work preserve separate branches/commits/PRs and explicitly record both SHAs.
- A source dependency is finished when its reviewed implementation and evidence are on the shared default branch; do not manufacture a deployment gate for source-only work. The final integration report must state the merge order and any pending live verification.

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
