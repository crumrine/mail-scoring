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

## Private Worker development tooling

Wrangler 4.151.3 (MIT OR Apache-2.0), @cloudflare/workers-types 5.20261021.1
(MIT) and their exact transitive/platform packages are development tooling only.
The lock/SBOM contains 112 package records; all declare licenses. Miniflare's
Sharp/libvips development dependencies include LGPL-3.0-or-later components;
their package licenses are preserved in the SBOM, not represented as Apache-only.
These image/native tooling modules are **not** imported by the scorer or consumer:
the checked bundle graphs contain only project modules and cloudflare:workers.
No image/attachment processing is enabled. No installed binary is committed here.

`npm run sbom` also emits `.artifacts/licenses/sbom.json` and
`installed-notices.json` (installed host packages' top-level license/notice texts
and hashes). CI uploads these inventory artifacts without node_modules or native
binaries. Other platform packages are inventoried from the lock, not claimed
executed or audited as runtime scorer dependencies. Preserve full component
notices/source obligations if separately distributing developer tooling binaries.
Exact upstream tooling sources: https://github.com/cloudflare/workers-sdk/tree/wrangler@4.151.3
and https://github.com/cloudflare/workerd/tree/v1.20261021.1.

## Standard GTUBE test marker and synthetic fixtures (DEV-988)

The 68-byte ASCII GTUBE test string
(`XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X`) and
reference explanatory paragraph in `fixtures/rules/gtube-positive.json` follow the
standard Generic Test for Unsolicited Bulk Email documented by the Apache
SpamAssassin project (`https://spamassassin.apache.org/gtube/` and
`https://github.com/apache/spamassassin/blob/773455eeebf40d4d265790365c2d893f7b340066/t/gtube.t`,
Apache-2.0 repository; the GTUBE documentation explicitly places the GTUBE string
and test text in the public domain for spam-filter testing). All envelope, header
and Message-ID fields in `fixtures/rules/gtube-*.json` are original synthetic
`.test` values authored for this repository. Using the standard GTUBE test marker
does not adopt any SpamAssassin rule corpus, weights or third-party email dataset,
and does not grant redistribution rights to unrelated corpora.

## SpamBayes Fisher combiner adaptation

Copyright (C) 2002-2007 Python Software Foundation; All Rights Reserved.
Copyright (c) 2002-2004 Python Software Foundation; All Rights Reserved.
Source: smontanaro/spambayes at 8ae169fde78371780019db5b7b7acfb4950bab8f, spambayes/spambayes/{classifier.py,chi2.py}.
Changes: bounded TypeScript numeric-only Fisher combiner in vendor/chi.ts; original bounded tokenizer, aggregate hashed-count model and static result policy. No Python runtime, database, URL retrieval, online learning, original SpamBayes tokenizer or model included.

Copyright (C) 2002-2007 Python Software Foundation; All Rights Reserved

The Python Software Foundation (PSF) holds copyright on all material
in this project.  You may use it under the terms of the PSF license:

PSF LICENSE AGREEMENT FOR THE SPAMBAYES PROJECT
-----------------------------------------------

1. This LICENSE AGREEMENT is between the Python Software Foundation
("PSF"), and the Individual or Organization ("Licensee") accessing and
otherwise using the spambayes software ("Software") in source or binary
form and its associated documentation.

2. Subject to the terms and conditions of this License Agreement, PSF
hereby grants Licensee a nonexclusive, royalty-free, world-wide
license to reproduce, analyze, test, perform and/or display publicly,
prepare derivative works, distribute, and otherwise use the Software
alone or in any derivative version, provided, however, that PSF's
License Agreement and PSF's notice of copyright, i.e., "Copyright (c)
2002-2004 Python Software Foundation; All Rights Reserved" are retained
the Software alone or in any derivative version prepared by Licensee.

3. In the event Licensee prepares a derivative work that is based on
or incorporates the Software or any part thereof, and wants to make
the derivative work available to others as provided herein, then
Licensee hereby agrees to include in any such work a brief summary of
the changes made to the Software.

4. PSF is making the Software available to Licensee on an "AS IS"
basis.  PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE SOFTWARE WILL NOT
INFRINGE ANY THIRD PARTY RIGHTS.

5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF THE
SOFTWARE FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS
A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING THE SOFTWARE,
OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any
relationship of agency, partnership, or joint venture between PSF and
Licensee.  This License Agreement does not grant permission to use PSF
trademarks or trade name in a trademark sense to endorse or promote
products or services of Licensee, or any third party.

8. By copying, installing or otherwise using the Software, Licensee
agrees to be bound by the terms and conditions of this License
Agreement.

## node_modules/dom-serializer 2.0.0 (MIT)

License

(The MIT License)

Copyright (c) 2014 The cheeriojs contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## node_modules/dom-serializer/node_modules/entities 4.5.0 (BSD-2-Clause)

Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## node_modules/domelementtype 2.3.0 (BSD-2-Clause)

Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## node_modules/domhandler 5.0.3 (BSD-2-Clause)

Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## node_modules/domutils 3.2.2 (BSD-2-Clause)

Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## node_modules/entities 6.0.1 (BSD-2-Clause)

Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## node_modules/htmlparser2 10.0.0 (MIT)

Copyright 2010, 2011, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
