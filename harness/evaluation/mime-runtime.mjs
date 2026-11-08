// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

// Older Node24 builds decode these MIME aliases differently; never silently change frozen features.
assert.equal(process.version, 'v24.15.0', 'Use the repository .nvmrc Node24.15.0 for reproducible MIME evaluation');
const bytes = Uint8Array.from([0x80, 0x85, 0x91, 0x92, 0x93, 0x94, 0x99]);
const expected = [0x20ac, 0x2026, 0x2018, 0x2019, 0x201c, 0x201d, 0x2122];
for (const alias of ['windows-1252', 'latin1', 'iso-8859-1', 'ascii']) {
  assert.deepEqual([...new TextDecoder(alias).decode(bytes)].map(char => char.codePointAt(0)), expected,
    'MIME legacy decoder profile mismatch: ' + alias);
}
export const MIME_RUNTIME = Object.freeze({node:process.version, icu:process.versions.icu,
  unicode:process.versions.unicode, legacyDecoder:'WHATWG windows-1252 aliases'});
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(MIME_RUNTIME));
