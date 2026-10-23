# Third-party notices

Original Mail Scoring work is Apache-2.0. Third-party components retain their terms.

## Mailguard adapted leaf functions (MIT)

`authenticationFailed` from `src/verdict.ts`, package @sarv-in/mailguard 0.4.3,
repository https://github.com/Sarv/mailguard, revision
`ae51a1ddee18649ef729a4195313cbf57db22e87`, is adapted into
`packages/core/src/vendor/authentication-failed.ts`. Type narrowing and mandatory
non-null input are the only changes to the selected predicate; original Boolean
logic remains. The wrapper/guards are separately authored. No data/weights/corpus
is copied.

DEV-876 additionally adapts normalization and whole-phrase matching from
`src/text.ts`, once-per-group matching structure from `src/content/vocabulary.ts`,
HTTP target/mismatch logic from `src/urls.ts`, and the list/precedence predicates
from `src/headers/bulk.ts`, at the same immutable revision. Local files are
`packages/core/src/vendor/{text,links,bulk}.ts`. Original fixed supporting phrases
and rules are authored here; no upstream phrase/brand/freemail/wrapper corpus is
copied. Changes add bounded scalar normalization/output, linear quote handling,
code-point boundaries, exact host comparison without PSL, bounded decoding and
static results; omit ESP/auto-submitted signals. Exact upstream file hashes and
modifications: `docs/evidence/mailguard/rules-provenance.json`; adapted file hashes:
`docs/evidence/sbom.json`. No tldts or generated suffix data is distributed.

Preserve the following complete original notice with distributions:

```text
MIT License

Copyright (c) 2026 Sarv

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Development tooling only

The exact application lock and `docs/evidence/sbom.json` enumerate versions,
integrity hashes, package licenses and platform variants. TypeScript 5.9.3 and
workerd 1.20261021.1 declare Apache-2.0; esbuild 0.28.2 and its platform executables,
@types/node 24.19.2 and undici-types declare MIT. No tooling code is included in the
core bundle. Ajv 8.20.0 and its MIT transitive dependencies are development-only
schema validation tools, not part of the core graph. Installed npm packages carry their respective license files; the
workerd npm executable's native dependency notices are maintained at the exact
upstream source tag, not reclassified as original Mail Scoring code:
https://github.com/cloudflare/workerd/tree/v1.20261021.1

TypeScript also includes `ThirdPartyNoticeText.txt` in its installed package.
All install/lifecycle scripts are disabled in `.npmrc`, including esbuild and
workerd postinstall scripts. Their pinned optional platform binary packages work
without these scripts on the documented Linux x64 CI target. Other platforms are
locked but not claimed tested.

The Mailguard audit's separate dependency/data inventory is not runtime adoption;
see `docs/adoption-decision.md`. Unresolved corpus/list provenance is excluded,
not relicensed by this project's Apache license.
