// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { REASONS, type ScoreResultV1, type ScoreContext } from './contract.js';
import { guardInput, parseRequest } from './guards.js';
import { authenticationFailed } from './vendor/authentication-failed.js';
export * from './contract.js';
export { guardInput, boundedText, parseRequest, readRequest } from './guards.js';
export function unavailable(error: Exclude<ScoreResultV1['error'],null>): ScoreResultV1 {
  return {schemaVersion:'1',engineVersion:'0.1.0',ruleSetVersion:'foundation-1',status:'unavailable',heuristicScore:0,
    signals:{spam:'unknown',phishing:'unknown',marketing:'unknown'},reasons:[],limitsHit:[],error};
}
/** Pure, bounded foundation. No verdict/routing label, negative points, or trust from header text. */
export function score(value:unknown, context:ScoreContext={}):ScoreResultV1 {
  const guarded=guardInput(value);
  if(!guarded) return unavailable('invalid_input');
  const {input,limitsHit}=guarded;
  const result=unavailable('invalid_input'); result.error=null;
  result.limitsHit=limitsHit;
  const t=input.transport;
  // Any inspection ambiguity invalidates transport support conservatively.
  const trusted=context.transportVerified===true && t?.provenance==='upstream' && t.complete &&
    t.spf!=='unknown' && t.dkim!=='unknown' && t.dmarc!=='unknown' && limitsHit.length===0;
  if(!trusted) limitsHit.push('auth_unknown');
  else if(authenticationFailed(t)) {
    result.heuristicScore=20; result.signals.spam='present';
    result.reasons.push({id:'auth_failed',contribution:20,reason:REASONS.auth_failed});
  }
  result.status=limitsHit.length?'partial':'complete';
  return result;
}
export function scoreRequest(bytes:Uint8Array):ScoreResultV1 {
  const parsed=parseRequest(bytes);
  return parsed.error ? unavailable(parsed.error) : score(parsed.value);
}
