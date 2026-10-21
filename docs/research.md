# Existing scanner research and reuse gate

Inspected 2026-10-21 using primary GitHub source/package manifests/license files. No packages installed, no scanner code copied, and no benchmark/accuracy or Cloudflare compatibility claim made by this research.

## Closest candidate: Mailguard

Repository: https://github.com/Sarv/mailguard
Revision: ae51a1ddee18649ef729a4195313cbf57db22e87
Package at that revision: @sarv-in/mailguard 0.4.3; MIT license.

This is a TypeScript offline email scorer with named reasons and narrow exports for verdicts, headers, content, links and identity. `src/scan.ts` separates offline scoring from opt-in authentication/reputation verification. `src/content/html-text.ts` uses non-rendering htmlparser2 parsing. It is the most relevant candidate for reuse instead of recreating those primitives.

It is NOT pre-approved as a whole. `src/index.ts` re-exports network, brand and attachment-related capabilities. Whole-message scan parses MIME and includes structural attachment inspection, including ZIP directory handling, outside our v0.1 scope. Its authentication trust defaults must be audited: recognizing an authserv-id text does not establish that a hostile sender could not inject it. Current package declares Node >=20 and optional mailauth/X509 peers; browser-compatible-looking code does not prove workerd compatibility. Root dependencies include email-addresses, htmlparser2, ipaddr.js, postal-mime and tldts. Transitive versions/data licenses and imported export graph still need verification. It is a small project, so do not equate availability with an established security track record.

Source links:
- https://github.com/Sarv/mailguard/blob/ae51a1ddee18649ef729a4195313cbf57db22e87/LICENSE
- https://github.com/Sarv/mailguard/blob/ae51a1ddee18649ef729a4195313cbf57db22e87/package.json
- https://github.com/Sarv/mailguard/blob/ae51a1ddee18649ef729a4195313cbf57db22e87/src/scan.ts
- https://github.com/Sarv/mailguard/blob/ae51a1ddee18649ef729a4195313cbf57db22e87/src/index.ts
- https://github.com/Sarv/mailguard/blob/ae51a1ddee18649ef729a4195313cbf57db22e87/src/content/html-text.ts

## Other references

**OhMyMsg**: https://github.com/reliverse/ohmymsg at 4201fa199bc8b73fd47aadca02fce7cbc4a6239a. TypeScript, package 1.0.3, root Apache-2.0 license. Broad Node/Bun-oriented dependencies include clamscan, mailparser, natural and superagent, plus a trained classifier requirement. Not a drop-in Workers dependency. Any adaptation must audit upstream/derived-code provenance and data/model rights, not just root LICENSE. No code is adopted here.

**SpamScanner**: https://github.com/spamscanner/spamscanner at a751a4ab28a225162632b2d77ca55da505dd8c9f. Node JavaScript with TypeScript declarations, package 7.0.10. Package metadata says BUSL-1.1. The LICENSE contains an additional service-use restriction, a historical Change Date and Apache-2.0 change-license provision. Exact-version applicability is unresolved in this research; do not assume either unrestricted Apache rights or perpetual restriction. Avoid code/rule/model reuse until provenance and effective terms are established. It is useful as an architectural reference only. Current source includes optional native RE2, DNS/auth/network and attachment paths that need separate Workers analysis. Search snippets described older dependency trees, so source manifests take precedence.

**Postal Mime**: https://github.com/postalsys/postal-mime at ac3cc43ca4f0175ab3f8f32876f2e84f7eb2de7c. Package 4.0.11 declares MIT-0; it is a MIME parser, not a spam classifier. Agentic Inbox already uses a different 2.x version. Do not silently upgrade its parser or make the scoring service reparse raw messages. Newer versions' safety or compatibility are not established by inspection of their manifest.

**SpamAssassin**: https://spamassassin.apache.org/ and https://github.com/apache/spamassassin. Learn from weighted named rules, contributions and separate caller routing. This is not a TypeScript implementation; importing its rule corpus or test mail requires its own license/provenance review. Published performance/accuracy claims are not ours.

## Required adoption decision (first ticket)

1. Fetch/pin exact candidate package and source versions; inspect LICENSE, NOTICE, dependencies, optional peers, scripts and redistributed lists/data.
2. Build a minimum narrow import in real workerd; demonstrate zero DNS/fetch/native/attachment capability on the actual import path, including module initialization. Do not install or execute upstream lifecycle scripts merely for inspection.
3. Verify input/CPU/allocation bounds and adversarial behavior at our declared ceilings. A size check after parsing is insufficient; an async timeout does not interrupt synchronous work.
4. Compare dependency wrapper, attributed adaptation and minimal original code on license clarity, bundle size, maintained surface, policy control and safety. Choose the smallest acceptable option and document why, with no requirement to recreate an existing engine.
5. Add THIRD_PARTY_NOTICES.md, exact lock and machine-readable SBOM/provenance when dependencies or code are adopted. Retain MIT notices if adapting Mailguard. Root Apache-2.0 never relicenses third-party components.
6. If no candidate satisfies the boundary, implement only the bounded contract and minimal original rule primitives needed by v0.1; record failed checks rather than expanding scope into native scanning or paid services.
