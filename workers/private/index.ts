// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
/// <reference types="@cloudflare/workers-types" />
import {WorkerEntrypoint} from 'cloudflare:workers';
import {scoreRpc} from './adapter.js';
/** Private service binding only. No environment bindings, retained state or background work. */
export default class Scorer extends WorkerEntrypoint {
  scoreV1(version:unknown, bytes:unknown, context:unknown='{}'):string {return scoreRpc(version,bytes,context);}
  fetch():Response {return new Response(null,{status:404});}
}
