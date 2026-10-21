// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {parseRequest, score, LIMITS, type ScoreContext} from '../../packages/core/src/index.js';
import {CONTEXT_BYTES, RPC_VERSION, RPC_OUTPUT_BYTES, decodeResponse, failure} from './protocol.js';
function contextFromWire(wire:unknown):ScoreContext|null {
  if(typeof wire!=='string'||wire.length>CONTEXT_BYTES||new TextEncoder().encode(wire).byteLength>CONTEXT_BYTES)return null;
  let depth=0,quoted=false,escaped=false;
  for(const ch of wire){if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue;}if(ch==='"')quoted=true;if(ch==='['||ch===']')return null;if(ch==='{')if(++depth>1)return null;if(ch==='}')depth--;}
  const c:unknown=JSON.parse(wire);
  if(!c||typeof c!=='object'||Array.isArray(c))return null;
  const r=c as Record<string,unknown>;
  if(Object.keys(r).length>3||Object.keys(r).some(k=>!['transportVerified','preferencesVerified','receivedAt'].includes(k)))return null;
  if(r.transportVerified!==undefined&&typeof r.transportVerified!=='boolean')return null;
  if(r.preferencesVerified!==undefined&&typeof r.preferencesVerified!=='boolean')return null;
  if(r.receivedAt!==undefined&&(!Number.isSafeInteger(r.receivedAt)||typeof r.receivedAt!=='number'||r.receivedAt<0||r.receivedAt>8640000000000000))return null;
  return r as ScoreContext;
}
export function scoreRpc(version:unknown, bytes:unknown, context:unknown='{}'):string {
  try {
    if(version!==RPC_VERSION)return failure('unsupported_version');
    if(!(bytes instanceof Uint8Array))return failure('invalid_input');
    if(bytes.byteLength>LIMITS.requestBytes)return failure('request_limit');
    let trusted:ScoreContext|null;
    try {trusted=contextFromWire(context);}catch{return failure('invalid_input');}
    if(!trusted)return failure('invalid_input');
    const parsed=parseRequest(bytes);
    if(parsed.error)return failure(parsed.error);
    if(parsed.value&&typeof parsed.value==='object'&&'schemaVersion' in parsed.value&&parsed.value.schemaVersion!=='1')return failure('unsupported_version');
    const result=score(parsed.value,trusted);
    if(result.error)return failure(result.error);
    const wire=JSON.stringify({rpcVersion:RPC_VERSION,ok:true,result});
    if(wire.length>RPC_OUTPUT_BYTES||!decodeResponse(wire))return failure('internal_failure');
    return wire;
  }catch{return failure('internal_failure');}
}
