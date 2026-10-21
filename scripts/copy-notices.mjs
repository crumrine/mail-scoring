// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('packages/core/dist',{recursive:true});
await mkdir('.artifacts',{recursive:true});
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md']) {
  await copyFile(file,`packages/core/dist/${file}`);
  await copyFile(file,`.artifacts/${file}`);
}
