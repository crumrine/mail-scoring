// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {LIMITS} from '../../packages/core/src/contract.js';
import {decodeResponse, RPC_VERSION, type ScorerBinding, type ScoreResultV1} from '../private/protocol.js';
export interface ConsumerEnv {SCORER?:ScorerBinding; SCORING_ENABLED?:string}
export type Assessment = {delivery:'preserve'; inspection:'disabled'|'unknown'|'assessed'; result?:ScoreResultV1};
/** Application code owns bounded serialization and verified context; email never sets these facts. */
export async function assess(env:ConsumerEnv, bytes:Uint8Array, verifiedContext='{}'):Promise<Assessment> {
  if(env.SCORING_ENABLED!=='true')return {delivery:'preserve',inspection:'disabled'};
  if(!(bytes instanceof Uint8Array)||bytes.byteLength>LIMITS.requestBytes||typeof verifiedContext!=='string'||verifiedContext.length>256)return {delivery:'preserve',inspection:'unknown'};
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    if(!env.SCORER)return {delivery:'preserve',inspection:'unknown'};
    // Limits waiting only. This does not cancel synchronous scorer CPU or its RPC.
    const response=decodeResponse(await Promise.race([env.SCORER.scoreV1(RPC_VERSION,bytes,verifiedContext),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),1000);})]));
    if(!response?.ok||response.result.status==='unavailable')return {delivery:'preserve',inspection:'unknown'};
    return {delivery:'preserve',inspection:'assessed',result:response.result};
  }catch{return {delivery:'preserve',inspection:'unknown'};}
  finally{if(timer!==undefined)clearTimeout(timer);}
}
