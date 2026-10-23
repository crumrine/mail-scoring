# DEV-875 adoption decision

Source baseline: `crumrine/mail-scoring` main
`66b7b08691ccd3061c6460ff7184ee3f76c3c080`. No prerequisites or stacked base; this PR
bases on main. DEV-876 must branch from the independently reviewed head recorded
on DEV-875, and eventually merge after this PR. Neither PR is authorized to merge
or deploy in this workflow.

Choose **attributed adaptation of `authenticationFailed` only**, from
[Mailguard src/verdict.ts at ae51a1ddee18649ef729a4195313cbf57db22e87](https://github.com/Sarv/mailguard/blob/ae51a1ddee18649ef729a4195313cbf57db22e87/src/verdict.ts).
Keep its MIT notice, retain its Boolean logic, narrow the argument to validated
pass/fail/unknown enums and a non-null value. The bounded wrapper, protocol and
foundation implementation are original Apache-2.0. No upstream score thresholds,
verdict labels, reason text, weights, lists, models or corpora are adopted.

## Reproducible comparison

`npm run audit:mailguard` downloads the exact published 0.4.3 tarball and pinned
source archive, verifies the registry SHA-512, compares the manifest and license,
and compares all 81 unique source-map contents to their pinned source files.
It installs the audit dependency closure using the separate committed audit lock
and **all lifecycle scripts disabled**, walks the ESM export graph with the
TypeScript parser, builds minimum browser bundles, then executes the published
narrow predicate during initialization and a test event in actual workerd.
Source-map equality is evidence of source correspondence, not a claim that the
entire release is a bit-for-bit reproducible build. Full file hashes, export graph,
package scripts and results are in [audit.json](evidence/mailguard/audit.json).

| Option / esbuild 0.28.2 minified ESM | Bytes | Result / limitation |
| --- | ---: | --- |
| Published narrow verdict predicate | 166 | Works in workerd, zero emitted external imports; installing the root package brings 12 other packages |
| Selected attributed predicate | 151 | Works inside the guarded core in workerd; no runtime packages or data |
| Original unknown-only result primitive | 139 | Executable baseline with no positive authentication evidence; less behavior, not an equivalent scanner |
| Published content export, requesting only extractHtml | 242385 | Includes htmlparser2, tldts/data and module initialization; not adopted |
| Umbrella exports | — | Browser bundling fails on `dns/promises`; scope also includes verification, attachment and ZIP inspection |

The 15-byte difference is not the main reason to adapt: avoiding unrelated install
surface and keeping the independently auditable predicate and provenance boundary
local is. Narrow verdict reuse is compatible, not falsely rejected. This ticket
does not recreate Mailguard's engine; the next rules ticket can separately propose
bounded adaptations using the same gate. See generated core size in validation
and CI artifacts; the predicate-only figures above do not include guards/protocol.

## Concrete failures in broader reuse

- `src/content/html-text.ts` pushes frames, links and anchor text without explicit
  nesting/output/cardinality limits; each text callback walks the open stack. An
  outer byte ceiling alone does not provide our tag/depth/output contract. No HTML
  parser is selected here: supplied HTML is marked uninspected and partial.
- `src/headers/auth-results.ts` defaults to topmost Authentication-Results when no
  trusted IDs are configured and otherwise matches header text IDs. Neither proves
  the header was inserted by an authenticated transport. Our wrapper never derives
  trust from these fields. Duplicate headers/incomplete input invalidate support.
- `verdict.parseSpamReasons` accepts arbitrary reason IDs/detail strings and numbers
  without finite/range/cardinality checks; assessmentOf reduces all supplied points.
  Those functions and upstream clean/spam routing labels are not adopted.
- The umbrella imports authentication/network/brand and attachment modules. The
  chosen published verdict export has only two ESM files and no external imports.
  Runtime import paths are checked, not inferred from export names.

## Dependency and data provenance

Published package and source LICENSE agree: MIT, Copyright (c) 2026 Sarv.
No NOTICE exists in the candidate package. Its lifecycle-bearing script is
`prepublishOnly: pnpm run build`; `verify:brands` requests a DNS resolver, so it is
never run. Runtime install pre/post scripts are absent for Mailguard itself.
Audit closure exact packages and license-file hashes are recorded in audit.json;
some dependencies have prepare/prepublish scripts, all disabled during this audit.
Optional mailauth/X509/asn1js/reflect-metadata peers are not installed or adopted.

| Audit closure (not runtime adoption) | Exact version | Package license |
| --- | --- | --- |
| email-addresses | 5.0.0 | MIT |
| htmlparser2 | 10.1.0 | MIT |
| dom-serializer | 2.0.0 | MIT |
| domelementtype | 2.3.0 | BSD-2-Clause |
| domhandler | 5.0.3 | BSD-2-Clause |
| domutils | 3.2.2 | BSD-2-Clause |
| entities | 7.0.1 and nested 4.5.0 | BSD-2-Clause |
| ipaddr.js | 2.5.0 | MIT |
| postal-mime | 3.0.1 | MIT-0 |
| tldts / tldts-core | 7.4.19 | MIT |

Package declarations alone do not clear redistributed data. Mailguard's freemail
file cites free-email-domains 1.12.1 (MIT) and aggregation of HubSpot/community lists;
this audit does **not** establish each source list's exact provenance/rights. Its
spam phrase/brand/extension tables are outside the selected graph; none is copied.
tldts includes generated public-suffix data; its package MIT declaration is not a
substitute for auditing the exact upstream PSL/data notices. htmlparser2/entities
include generated entity tables. These unresolved broader-data questions are
recorded as exclusions, not inferred permissions. Selected verdict predicate
imports **no data**, so its provenance is fully limited to the preserved MIT code.

Other research remains pinned to [docs/research.md](research.md): OhMyMsg
4201fa199bc8b73fd47aadca02fce7cbc4a6239a (root Apache is insufficient evidence for
its derived code/model), SpamScanner a751a4ab28a225162632b2d77ca55da505dd8c9f
(BUSL-labelled exact-version applicability unresolved), and Postal Mime
ac3cc43ca4f0175ab3f8f32876f2e84f7eb2de7c (4.0.11 MIT-0; not the audit dependency
3.0.1). None of their code, weights, data or fixtures is copied. No conclusion
about expired change dates or relicensing is made.

The application lock/SBOM contains only development tooling plus the private core
workspace. No dependency package ships inside the core. Runtime/tooling notices
and exact provenance are in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) and
[sbom.json](evidence/sbom.json). The separate Mailguard audit lock is research
input, not an application dependency lock.
