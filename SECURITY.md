# Security policy and threat model

## Reporting

Use GitHub private vulnerability reporting if enabled. Do not submit private messages, credentials, working exploits against live mail or personal data in public issues. If private reporting is unavailable, open a minimal issue requesting a private reporting channel without exploit details. No private email contact is published by this bootstrap.

## Assets and attackers

An unauthenticated email sender controls headers, body, URLs, encodings, MIME structure, attachment names and bytes. A sender may spoof authentication-result headers, inject prompts, forge reply chains, produce pathological parser input, or poison feedback if normal folder movement is interpreted as training. A future model's output is untrusted too.

Protect message confidentiality, mailbox integrity, source/deployment credentials, predictable CPU/memory, and recoverable mail delivery. A Cloudflare isolate is not a substitute for input bounds and least privilege.

## v0.1 mandatory boundaries

1. The scoring core accepts a bounded structured message, not arbitrary raw MIME. Enforce serialized input size before JSON parsing/allocation in adapters where possible, and per-field/cardinality limits before feature extraction. Preserve explicit truncation/incomplete states.
2. Provisional ceilings: 256 KiB serialized scoring request; 128 KiB combined body/HTML bytes; 64 KiB decoded extracted text; 32 KiB header block; 100 header fields; 8 KiB per header; 100 lexical URLs; 32 cheap attachment-name/type metadata entries. Count bytes as well as characters. These are initial *inspection* limits, not a new mail delivery rejection limit. A tighter bound may be selected with recorded evidence; a raised bound needs adversarial measurement.
3. No attachment bytes enter the scorer. No archive extraction, document/image rendering, OCR, macro analysis, executable inspection or network fetching. Attachment metadata is optional untrusted text only. The scorer must not claim it detects malware.
4. HTML is processed by a bounded non-rendering parser with tag/depth/output limits. No DOM rendering, scripts, CSS execution, remote images, stylesheets, forms or link navigation. URL analysis is lexical only, with bounded decoding. Do not recursively dereference wrapper URLs.
5. Prove bounded synchronous work; timeout wrappers alone do not stop parser CPU or regex backtracking. Test adversarial Unicode, encodings, huge tokens, deep tags, malformed structures, duplicate headers and deceptive links.
6. Scorer has no mailbox/R2/send bindings, tools, shell, secrets or background tasks. No message persistence. No content-bearing logs/traces/error strings. Private binding-only worker with workers.dev/preview public exposure disabled; no public domain/routes.
7. Trust only configured transport evidence with established provenance. Duplicate/missing/untrusted Authentication-Results or ARC headers remain unknown. Passing SPF/DKIM/DMARC is supporting evidence, not permission to bypass content checks. Cloudflare auth/RBL behavior is not a guarantee that all delivered mail is safe.
8. Return a strict versioned bounded schema: finite heuristic score (not a calibrated probability), category signals, rule IDs, safe reasons, inspection completeness and limits hit. No HTML, instructions, raw-content echoes or model-generated actions.
9. The caller owns thresholds, user preferences, folder moves and storage. No auto-delete/reject/bounce, automatic reply, automatic allow rule, link click or feedback training based on scanner output.
10. Failure of optional inspection must preserve the original message and current delivery behavior, record unknown/incomplete and allow later deliberate re-evaluation. Re-scanning is explicit and bounded, never triggered by routine polling.

## Integration security

Quarantined messages must be absent from normal conversation content, participants, unread counts, needs-reply state, notifications, default search and agent/MCP context. Explicit Spam views remain recoverable. Forged thread headers must not promote trust or leak spam into normal views. Do not rewrite raw MIME to insert scores; store assessments separately.

Mark spam/not-spam is an explicit authenticated user action, separate from normal moves/deletes. Sender allow/block is a distinct action and must not be inferred from one rescued message. Address-only allow rules cannot override an established spoofing warning. Feedback is mailbox-scoped; do not aggregate private sender reputation across tenants.

## Future extensions

AI, native scanners, link retrieval, attachment inspection and multi-tenant public APIs require separate threat models and explicit work. Future AI must have no tools, browsing, secrets, mail access or action capability, with strict output validation and absolute call/token/time limits. They are not part of the initial release.
