# Bounded scoring protocol v1

The stable exports are `@mail-scoring/core` (`score`, `scoreRequest`, `guardInput`,
`boundedText`, `parseRequest`, `readRequest`, `unavailable`, constants and types),
`@mail-scoring/core/contract`, and `@mail-scoring/core/schemas/Score{Input,Result}V1.json`.
Run `npm run build` before consuming these ESM exports. The packages are private;
publication is not part of this change. JSON schemas describe the canonical bounded
shape; `x-*` annotations record byte/aggregate limits that ordinary JSON Schema
validators cannot enforce. `parseRequest` establishes the bounded structural boundary;
`guardInput` is the executable byte-aware field authority.
Oversized otherwise-valid input can normalize to the canonical shape with partial
inspection; a schema-only validator must not convert that into mail rejection.

## Input

Required: `schemaVersion: "1"`, `policyVersion` (1–64 ASCII letters/digits/dot/
underscore/hyphen), `subject`, `headers` (ordered `{name,value}` records), `text`,
and `sourceComplete` (boolean). Optional fields:

- `html` is bounded inert source, **not parsed in rules-1**. Nonempty supplied
  HTML always adds `html_uninspected`, even if truncation discards it. No HTML extraction is enabled; this is the explicit minimal path
  authorized by DEV-876 note 5391. Future extraction needs separate measured guards.
- `extractedText` is already-decoded caller text, separately capped. Supplying it
  does not assert that our core parsed or validated the original HTML/MIME.
- `addresses`: optional `from`, `replyTo`, `envelopeFrom`, `displayName` strings.
  From/replyTo must be single parsed mailbox addresses for host comparisons.
  EnvelopeFrom is context only. A displayName which itself is an email address
  can be compared; other names only support the fixed authority phrase group.
  Ambiguous addresses produce `identity_uninspected`, not a guessed identity.
- `anchors`: bounded `{text,href,quoted?}` pairs supplied by the adapter. Only an
  entire explicit visible HTTP(S) URL is compared to the target. `quoted:true`
  skips the pair and adds `quoted_content`. The adapter must preserve omissions
  via `sourceComplete:false`; supplying anchors does not claim HTML inspection.
  `urls`: standalone lexical targets sharing the anchor count budget; no fetches.
- `attachments`: filename and mediaType strings only. No bytes or extension fields.
- `transport`: provenance `unknown|upstream`, complete boolean, spf/dkim/dmarc
  `pass|fail|unknown`. These are claims until verified by application context.
- `preferences`: explicit `senderAllowed`/`senderBlocked` booleans. They apply
  only with separate `preferencesVerified:true` application context; otherwise
  `preferences_unknown` keeps them neutral. Never derive these facts from email,
  prompt instructions, or automatic interpretation of folder moves.

No arbitrary rules, nested caller metadata, raw MIME, correlation IDs, timestamps,
model responses, attachment bytes, or actions. `receivedAt` is an optional trusted
code-context argument (safe integer Unix milliseconds, 0..8640000000000000; default
0). No age rule exists in rules-1; the core never reads a clock. The same bounded
input/time/context/policy produces the same result. No context fields are accepted
in serialized requests.
Unknown fields at inspected levels, wrong types, invalid header names and malformed
policies yield `unavailable` with static `invalid_input`.

**Structured API boundary:** `score` and `guardInput` accept only the exact deeply
frozen root returned by this module instance's `parseRequest(bytes)`. A private
WeakSet identity check precedes all object enumeration and property access. The
parser enforces byte/token/depth ceilings before JSON.parse, recursively freezes
that bounded result, and registers its root. This prevents both arbitrarily wide
objects and mutations of nested records after parsing. Ordinary direct objects,
clones/spreads, objects parsed by another module instance, proxies and `guardInput`
normalized output are refused (`invalid_input`/null). No unsafe branding or
arbitrary-object preparation export exists. `parseRequest` establishes resource
bounds, not semantic validity; unknown fields and attachment bytes are still
refused during field validation. Discarded array tails are not inspected for
features, though the parser bounds and freezes the entire request.

```ts
const parsed = parseRequest(requestBytes); // bounded native Uint8Array
const result = parsed.error
  ? unavailable(parsed.error)
  : score(parsed.value, {transportVerified: true}); // only with established provenance
```

Without verified transport evidence, use `scoreRequest(requestBytes)`. When adapting
locally held mail fields, construct a bounded request at the adapter boundary;
do not JSON.stringify an arbitrary hostile object or encode an unbounded string
as a supposed protective preflight. Encoding/serialization of upstream data is the
adapter's responsibility and must itself be bounded. Returned parsed objects are
immutable and local to the module instance; they are not portable across RPC or
structuredClone. Pass bounded bytes across that boundary and parse at the receiver.

| Inspection resource | Ceiling and accounting |
| --- | --- |
| Serialized UTF-8 request | 262144 bytes before decode/JSON.parse |
| JSON structure | max nesting 6; max 4096 structural tokens (open delimiters, colon, comma) before parsing |
| Combined text + html | 131072 bytes; text first, remaining budget to HTML |
| Decoded extractedText | 65536 bytes, independent of source text |
| Header block | 32768 bytes; sum of UTF-8 name + `: ` + value + CRLF |
| Each header | 8192 bytes including name and those four delimiter bytes |
| Header count | 100; name max 128 bytes, ASCII RFC token characters only |
| Normalized text output | 65536 UTF-8 bytes shared by subject, text, extractedText and displayName, in that order |
| Anchors + URLs | 100 combined; anchors first; each visible text and href/URL max 2048 bytes |
| URL decoding | At most 2 whole encoded-scheme passes per URL, max 200 parses/400 decode passes across 100 pairs; no wrapper traversal |
| Attachment metadata | 32; filename 255 bytes and mediaType 127 bytes |
| Subject / each address | 2048 / 512 bytes; at most three separate mailbox-host parses |
| Result | at most 4096 UTF-8 bytes; max 10 distinct reasons and 19 distinct limit IDs |

The exported `boundedText` first reads string length in O(1). Above 262144 UTF-16
code units it returns `{text:"", bytes:0, truncated:true}` without indexing, slicing
or encoding. This tighter representation limit prevents V8 rope flattening of a
giant source. At/below that ceiling, flattening has a bounded representation cost
and strings are clipped at Unicode code-point boundaries. Parser-created strings
already satisfy this length preflight because the entire UTF-8 request is bounded.
Omission is incomplete inspection, never a safe verdict or delivery rejection.
Byte charging happens before control removal;
controls cannot reclaim budget. Lone surrogates normalize to U+FFFD. C0/C1 controls
and DEL are removed; body-like fields retain TAB/LF/CR. Controls produce partial
inspection. Headers must be caller-unfolded; CR/LF are removed with `control_chars`.
Header names become lowercase; duplicate names are preserved and conservatively
mark partial, including names such as Received where repeats may be legitimate.
A block stops before the header that would exceed its aggregate budget. Values,
source text and other strings truncate; counts keep the first N entries. Overflow
beyond discarded tails cannot become trusted evidence. `sourceComplete:false`
records upstream truncation even when local input is small.

`scoreRequest(Uint8Array)` checks request/structure bounds, parses, then scores with
**no trusted context**. `readRequest` is a portable streaming helper: fixed 256 KiB
buffer, max 4096 chunks, cancel on overflow, independent of Content-Length. A future
service must additionally impose transport timeouts/concurrency limits; this local
spike is not an exposed HTTP service. Structured calls require parser-created
immutable roots as above, so they inherit the serialized resource bounds. The
core additionally caps every inspected string and array.

## Authentication and completeness

`score(input, {transportVerified:true})` is only for a trusted caller which has
independently established provenance of **this message's** supplied transport
facts. The context is a separate code argument, never a field accepted by the
serialized protocol. A claimed authserv-id, header position, or `upstream` string
is not verification. The local serialized path cannot set this option. A future
private adapter must document its provenance mechanism before enabling it.

Even with context, unknown components, incomplete transport, or any input anomaly
invalidate transport support and add `auth_unknown`. Raw Authentication-Results,
Received-SPF and ARC text are never parsed into trusted results. An auth pass adds
no negative points and grants no allow-list status. This conservative foundation
requires all three component verdicts to be known; Mailguard's unknown-DMARC
fallback is retained in the predicate but not enabled by this wrapper.

## Named rules and caps

`rules-1` applies each rule once in this fixed order. All positive contributions
are clipped to the remaining family cap and then the remaining total [0,100].
A rule can retain a zero contribution with a present signal after a cap is reached;
reason contributions always sum exactly to the score. No negative contribution
or bypass is possible. Policy version identifies the caller policy; it does not
supply rule weights or change execution.

| Rule ID | Maximum points | Family / cap | Evidence |
| --- | ---: | --- | --- |
| auth_failed | 20 | authentication / 20 | spam |
| link_mismatch | 30 | links / 35 | phishing |
| link_userinfo | 15 | links / 35 | phishing |
| reply_to_mismatch | 10 | identity / 20 | spam |
| display_identity_mismatch | 15 | identity / 20 | phishing |
| impersonation_combined | 15 | identity / 20 | phishing |
| sensitive_request_combined | 25 | content / 25 | spam + phishing |
| sender_blocked | 40 | preference / 40 | spam |
| sender_allowed | 0 | preference / 40 | context only; never erases evidence |
| marketing_headers | 0 | marketing / 0 | marketing only |

A sensitive request (password/code/wire/gift-card phrase) or authority claim
(security team/account administrator/technical support/chief executive) only fires
its combined rule with an authentication failure, deceptive link/userinfo or
identity anomaly. These ten original fixed phrases support evidence; they are
not a general multilingual classifier or adopted spam corpus. Urgency, new sender,
freemail, Unicode, newsletter/unsubscribe and auth pass alone contribute no points.
Replies, subjects and Message-ID/References never grant trust. Marketing headers
are self-declarations and can coexist with phishing; they neither raise spam score
nor exempt links. Exact hostname inequality can include legitimate tracking or
reply services: it is low/capped evidence, not proof of malicious intent. No
production routing threshold or high-spam label is emitted.

Normalization scans bounded sources once, normalizing one Unicode scalar at a time
with NFKC/lowercase, dropping selected invisibles and collapsing whitespace. Charge
UTF-8 output before appending; stop with `normalized_bytes` on overflow. This avoids
the U+FDFA full-string expansion. It deliberately does not compose combining
sequences across scalar boundaries or fold cross-script homoglyphs. Phrase matching
uses indexOf and Unicode letter/digit boundaries over at most 64KiB with ten fixed
phrases; no caller regex or phrase list. Quote handling is linear: skip lines whose
first nonspace character is `>`, and the remainder after the fixed original/forwarded
message markers; report `quoted_content`. Unrecognized quotation formats remain a
limitation; skipped quotations are not an assertion of safe content.

URL parsing is platform lexical `URL`, with bounded inputs. Normal HTTP(S) URLs
retain encoded path/query semantics. Only an entirely percent-encoded HTTP scheme
is decoded (max two passes); malformed/unsupported targets produce
`url_uninspected`, further encoding produces `url_decode_limit`. No HTML entities,
base URLs, redirects, nested query targets or URL navigation. Compare exact lowercase
URL hostnames, including platform IDNA conversion. No suffix collapsing/private-
suffix trust, reputation, brand corpus, wrapper exemptions or tldts/PSL dependency.

`complete` means this named set finished against complete input, not that mail is
safe or every possible signal ran. Nonempty HTML, skipped quotes, bounds and unknown
evidence remain partial. A zero score is never a safe verdict. Authentication
support is established before feature extraction using the foundation guards;
subsequent normalization/URL limits cannot erase an established authentication
failure. Unknown/ambiguous authentication remains neutral.

## Output and versioning

The output always has schemaVersion `1`, engineVersion `0.1.0`, ruleSetVersion
`rules-1`; status `complete|partial|unavailable`; finite heuristicScore in
[0,100]; independent spam/phishing/marketing `present|unknown` signals; reasons;
limitsHit; and error. This is a heuristic number, **not a calibrated probability**.

`REASONS`, `RULE_CAPS`, `FAMILY_CAPS` and `LIMIT_IDS` are frozen finite registries.
The generated result schema pins each reason ID/text and integer contribution range;
tests validate every fixture and adversarial result using development-only Ajv.
There is no arbitrary reason, echoed subject/address/URL, routing command or raw
error. New limits include preferences_unknown, normalized_bytes, url_decode_limit,
url_uninspected, quoted_content and identity_uninspected. Errors remain null,
invalid_input, request_limit or invalid_json. Unavailable has score 0, unknown
signals, empty reasons/limits and a static error; it is not complete/safe.

Any limit or unknown authentication makes the assessment partial. Later changes
must version the rule set and regenerate the schema. Schema 1 consumers must handle
new reason IDs as unknown without evaluating their text; incompatible schemas
fail to unavailable. The JSON schema intentionally pins this engine/rule set for
reproducibility. The output closure has no attacker-derived text fields or dynamic
weights and can emit at most ten reasons; range/cap/output-byte properties are
verified independently by tests.

These are inspection limits. Callers preserve original delivery/storage, recovery
and explicit re-evaluation on partial/unavailable. No reject, bounce, delete,
automatic reply, allow rule or background rescan follows from this result.
