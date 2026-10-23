// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { REASONS, RULE_CAPS, FAMILY_CAPS, type ReasonId, type ScoreResultV1, type ScoreContext } from './contract.js';
import { guardInput, parseRequest } from './guards.js';
import { authenticationFailed } from './vendor/authentication-failed.js';
import { inspect } from './inspection.js';
export * from './contract.js';
export { guardInput, boundedText, parseRequest, readRequest } from './guards.js';
export function unavailable(error: Exclude<ScoreResultV1['error'],null>): ScoreResultV1 {
  return {schemaVersion:'1',engineVersion:'0.1.0',ruleSetVersion:'rules-1',status:'unavailable',heuristicScore:0,
    signals:{spam:'unknown',phishing:'unknown',marketing:'unknown'},reasons:[],limitsHit:[],error};
}
/** Immutable parser roots only. Context is trusted application code, never request data.
 * receivedAt is injected Unix milliseconds (default 0); rules-1 has no age rule. */
export function score(value:unknown, context:ScoreContext={}):ScoreResultV1 {
  const guarded=guardInput(value);
  if(!guarded) return unavailable('invalid_input');
  const receivedAt=context.receivedAt??0;
  if(!Number.isSafeInteger(receivedAt) || receivedAt<0 || receivedAt>8640000000000000) return unavailable('invalid_input');
  const {input,limitsHit}=guarded;
  const result=unavailable('invalid_input'); result.error=null;
  const limits=new Set(limitsHit);
  const t=input.transport;
  // Preserve foundation's conservative provenance/ambiguity boundary. Content
  // inspection limits added later cannot erase established authentication failure.
  const trusted=context.transportVerified===true && t?.provenance==='upstream' && t.complete &&
    t.spf!=='unknown' && t.dkim!=='unknown' && t.dmarc!=='unknown' && limitsHit.length===0;
  const authFailed=!!(trusted && authenticationFailed(t));
  if(!trusted)limits.add('auth_unknown');
  const features=inspect(input,limits);
  const totals={authentication:0,links:0,identity:0,content:0,preference:0,marketing:0};
  const add=(id:ReasonId,family:keyof typeof FAMILY_CAPS,signals:Array<keyof ScoreResultV1['signals']>)=>{
    // Rules fire at most once; correlated families and total have independent caps.
    const contribution=Math.min(RULE_CAPS[id],FAMILY_CAPS[family]-totals[family],100-result.heuristicScore);
    totals[family]+=contribution;result.heuristicScore+=contribution;
    result.reasons.push({id,contribution,reason:REASONS[id]});
    for(const signal of signals)result.signals[signal]='present';
  };
  if(authFailed)add('auth_failed','authentication',['spam']);
  if(features.mismatch)add('link_mismatch','links',['phishing']);
  if(features.userinfo)add('link_userinfo','links',['phishing']);
  if(features.replyMismatch)add('reply_to_mismatch','identity',['spam']);
  if(features.displayMismatch)add('display_identity_mismatch','identity',['phishing']);
  const suspicious=authFailed || features.mismatch || features.userinfo || features.replyMismatch || features.displayMismatch;
  if(features.authority && suspicious)add('impersonation_combined','identity',['phishing']);
  if(features.sensitive && suspicious)add('sensitive_request_combined','content',['spam','phishing']);
  if(input.preferences) {
    if(context.preferencesVerified!==true)limits.add('preferences_unknown');
    else {
      if(input.preferences.senderBlocked)add('sender_blocked','preference',['spam']);
      if(input.preferences.senderAllowed)add('sender_allowed','preference',[]);
    }
  }
  if(features.marketing)add('marketing_headers','marketing',['marketing']);
  result.limitsHit=[...limits];result.status=limits.size?'partial':'complete';
  return result;
}
export function scoreRequest(bytes:Uint8Array):ScoreResultV1 {
  const parsed=parseRequest(bytes);
  return parsed.error ? unavailable(parsed.error) : score(parsed.value);
}
