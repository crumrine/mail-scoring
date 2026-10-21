# Mail Scoring

An open-source, explainable email scoring engine designed for Cloudflare Workers, with Agentic Inbox as its first consumer.

**Status: project and implementation plan created; no scanner has been implemented, deployed or evaluated yet.** No detection accuracy, latency or savings are claimed.

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

The first implementation task must evaluate the MIT-licensed `@sarv-in/mailguard` narrow modules in real workerd before deciding between a pinned dependency, attributed adaptation or original rules. Its top-level and whole-message scanner are not automatically approved.

## License

Apache-2.0 for this project's original work. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Third-party code, rules, datasets and model weights retain their own terms and require a recorded provenance review before inclusion. This bootstrap contains no copied scanner code or email dataset.
