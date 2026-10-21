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

- `html` is bounded inert source, **not parsed in foundation-1**. Nonempty supplied
  HTML always adds `html_uninspected`, even if truncation discards it. The later
  rules ticket owns safe tag/depth/output-limited extraction.
- `extractedText` is already-decoded caller text, separately capped. Supplying it
  does not assert that our core parsed or validated the original HTML/MIME.
- `addresses`: optional `from`, `replyTo`, `envelopeFrom` strings; no parsing or trust
  inference yet. `urls`: lexical strings only, with no dereferencing/decoding here.
- `attachments`: filename and mediaType strings only. No bytes or extension fields.
- `transport`: provenance `unknown|upstream`, complete boolean, spf/dkim/dmarc
  `pass|fail|unknown`. These are claims until verified by application context.
- `preferences`: explicit `senderAllowed`/`senderBlocked` booleans. Reserved facts;
  foundation-1 does not apply preference-based bypasses or routing.

No arbitrary rules, nested caller metadata, raw MIME, correlation IDs, timestamps,
model responses, attachments, or actions. No receive-time-dependent rule exists yet.
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
| URLs | 100; each 2048 bytes |
| Attachment metadata | 32; filename 255 bytes and mediaType 127 bytes |
| Subject / each address | 2048 / 512 bytes |
| Result | at most 4096 UTF-8 bytes; max 1 reason and 13 distinct limit IDs |

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

`foundation-1` executes only the selected authentication-failure predicate after
guards. A verified failure contributes 20 to spam evidence. Phishing and marketing
remain unknown. There are no vocabulary, link, MIME, malware, reputation or HTML
classification claims. `complete` means this **named rule set** finished against
complete input, not that the email is safe or that every possible signal ran.
Missing/partial evidence remains unknown, and a score of zero is not a safe verdict.

## Output and versioning

The output always has schemaVersion `1`, engineVersion `0.1.0`, ruleSetVersion
`foundation-1`; status `complete|partial|unavailable`; finite heuristicScore in
[0,100]; independent spam/phishing/marketing `present|unknown` signals; reasons;
limitsHit; and error. This is a heuristic number, **not a calibrated probability**.

Current static reason: `auth_failed`, contribution 20, text
“Verified transport evidence reports authentication failure.” There is no arbitrary
reason string, echoed subject/address/URL, routing command or raw error. Current
limits are exported by `LIMIT_IDS`: source_bytes, extracted_bytes, header_bytes,
header_count, header_field_bytes, url_count, attachment_count, field_bytes,
duplicate_header, control_chars, source_incomplete, html_uninspected, auth_unknown.
Errors are null, invalid_input, request_limit or invalid_json. An unavailable result
has score 0, unknown signals, empty reasons/limits; its error carries the outcome.

Any limit or unknown authentication makes the assessment partial. Later rules must
use new ruleSetVersion/engineVersion, deduplicate/cap contributions, and extend the
finite reason registry and output bounds deliberately. Schema 1 consumers must
handle new reason IDs as unknown without evaluating their text; incompatible schema
versions fail to unavailable. The foundation JSON schema intentionally pins the
current engine/rule set and reason registry for reproducibility; later versions
must publish corresponding schema revisions.

These are inspection limits. Callers preserve original delivery/storage, recovery
and explicit re-evaluation on partial/unavailable. No reject, bounce, delete,
automatic reply, allow rule or background rescan follows from this result.
