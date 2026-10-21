# Mail Scoring

An open-source, explainable email scoring engine designed for Cloudflare Workers, with Agentic Inbox as its first consumer.

**Status: bounded v0.1 deterministic core (`rules-1`), private RPC adapter and local workerd validation.** Named link, identity, combined-content and explicit preference rules maintain independent marketing evidence. HTML remains uninspected/partial. No hosted deployment, real-mail evaluation, detection accuracy or savings are claimed.

The engine returns evidence, scores and inspection completeness. The application decides where mail belongs. The initial release uses deterministic, bounded rules. AI, attachment scanning, live reputation lookups and public hosted APIs are outside v0.1.

## Architecture

Cloudflare Email Routing → Agentic Inbox adapter → private Mail Scoring Worker → assessment → application policy → Inbox or Spam.

The scoring core accepts bounded structured features. It is independent of Cloudflare, mailbox storage and routing. It never fetches message URLs, executes content or opens attachments. Use upstream authentication evidence only where its provenance is established; absent evidence is unknown. Do not repeat SPF/DKIM/DMARC or DNS blocklist lookups.

## Start here

- [Architecture and v0.1 scope](docs/architecture.md)
- [Security contract](SECURITY.md)
- [Existing scanners and reuse assessment](docs/research.md)
- [Implementation work](docs/work-plan.md)
- [Agent instructions](AGENTS.md)
- [Contributing](CONTRIBUTING.md)

The [adoption decision](docs/adoption-decision.md) selects attributed MIT
Mailguard leaf adaptations behind original bounded guards. The [v1 protocol](docs/protocol-v1.md)
freezes exports, schemas, completeness and limits. See the [rule contract and limits](docs/protocol-v1.md). This is the portable
core plus a [private Worker RPC adapter and off-by-default consumer sample](docs/private-worker.md); it is not a deployed endpoint.

## Local verification

Use Node 24.15.0 and npm 11.12.1 (`nvm use`; `npm install -g npm@11.12.1 --ignore-scripts`).

```sh
npm ci
npm run typecheck
npm test
npm run workerd-spike
npm run mutation-test
npm run benchmark
npm run direct-growth
```

`npm run check` runs typecheck/build/tests/workerd/mutations/growth checks. Tests build and consume
actual package exports. `score`/`guardInput` require immutable roots returned by
`parseRequest`; use `scoreRequest` for bounded serialized input (see protocol).
`.npmrc` disables lifecycle scripts; do not override it.
The workerd spike has no listening sockets or production configuration. It runs
local test events and checks initialization, denied outbound calls and absent
native imports. `.artifacts/` contains generated bundles, logs and measurements.

`npm run audit:mailguard` is a separate explicit public-source research command:
it downloads pinned GitHub/npm artifacts, installs the separate audit lock with
scripts disabled, and regenerates `docs/evidence/mailguard/audit.json`. It does not
run upstream tests or lifecycle scripts. `npm run sbom` and `node scripts/schemas.mjs`
(after build) reproduce the committed inventory and schema artifacts.

CI uses fresh `npm ci` and the same checks, publishing synthetic evidence under the
exact source SHA. See [validation scope and evidence](docs/validation.md).

## License

Apache-2.0 for this project's original work. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Third-party code, rules, datasets and model weights retain their own terms and require a recorded provenance review before inclusion. Selected Mailguard adaptations retain MIT notices; no email dataset is included.
