# Contributing

The project starts with a plan and no implementation. Begin with the dependency-ordered Trellis work in docs/work-plan.md.

Use Node 24 and npm; commit the lockfile when tooling is introduced. Changes need focused tests, typecheck and a real workerd path where relevant. Add synthetic .test/.invalid-address fixtures only; do not upload real inbox content to public CI, issue trackers or source history. Security regressions must fail with the fix removed.

Preserve a portable core and keep deployment adapters thin. Source reuse must record upstream URL, exact revision/package version, license text, modifications and transitive/data licenses in THIRD_PARTY_NOTICES.md and a machine-readable SBOM. Dependencies should be locked and narrow imports verified by the bundled artifact. Default-deny network, dynamic code, native modules and attachment scanning.

Original source files carry `Copyright (c) 2026 Brian Crumrine` and `SPDX-License-Identifier: Apache-2.0`. Third-party notices are preserved exactly. Use reviewed PRs with exact-head checks; do not claim a synthetic test is hosted acceptance or a trained production accuracy estimate.
