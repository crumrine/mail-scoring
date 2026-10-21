# v0.1 implementation plan

Six dependency-ordered implementation tickets. Trellis IDs and full briefs will be added before the work is made ready. All are assigned to Codex after body, repository, prerequisites and acceptance are verified.

| Step | Deliverable | Depends on | Source repository |
| --- | --- | --- | --- |
| 1 | Reuse audit, workerd feasibility, bounded versioned contract and tooling | — | mail-scoring |
| 2 | Deterministic explainable scoring core using the selected reuse strategy | 1 | mail-scoring |
| 3 | Private Cloudflare Worker RPC, strict input/output bounds and privacy checks | 2 | mail-scoring |
| 4 | Agentic Inbox shadow scoring, assessment storage, explicit preferences/feedback | 3 | agentic-inbox-imap |
| 5 | Spam UI, rescue and isolation across normal threads/search/agent/IMAP | 4 | agentic-inbox-imap |
| 6 | Independent adversarial, performance and integrated release-readiness evidence | 3, 4, 5 | mail-scoring (with pinned inbox PR fixtures) |

The scorer returns evidence; the application owns policy and recovery. Zero URL/DNS requests, zero attachment-byte inspection and zero paid AI calls in v0.1. AI remains a future separate decision.

Every implementation ticket stops at a reviewable, independently reviewed PR. Do not merge or deploy. A finished prerequisite means its reviewed PR/evidence exists, not that main contains it. Reuse the recorded prerequisite head(s), stack dependent source PRs where needed and report the exact pins and eventual merge order. Final source delivery stays off/shadow; automatic quarantine and production activation require later verified owner authorization.

Production efficacy, real Cloudflare CPU/billing and actual inbound header provenance require a later authorized live test. Source-only tasks must document those pending checks instead of claiming them complete or treating them as a reason to stop source work.
