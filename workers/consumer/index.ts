// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
/// <reference types="@cloudflare/workers-types" />
import {WorkerEntrypoint} from 'cloudflare:workers';
import {assess, type ConsumerEnv} from './integration.js';
export default class Consumer extends WorkerEntrypoint<ConsumerEnv> {
  inspectV1(bytes:Uint8Array) {return assess(this.env,bytes);}
  fetch():Response {return new Response(null,{status:404});}
}
