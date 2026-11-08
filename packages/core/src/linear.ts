// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { MODEL_FEATURES, MODEL_BIAS, MODEL_LOGIT_CUTOFF } from './linear-model.js';
import type { ContextFeature } from './context-features.js';

const weights = new Map(MODEL_FEATURES.map(([hash,idf,weight]) => [hash,{idf,weight}]));
/** Fixed numeric TRAIN model; repeated words never multiply evidence. No learning or I/O. */
export function linearSpam(features:readonly ContextFeature[],bodyWords:readonly number[]):boolean {
  if(features.length>1999 || bodyWords.length>1000)return false;
  // A strong subject cannot turn an unknown body into supported spam evidence.
  if(new Set(bodyWords.filter(hash=>(weights.get(hash)?.weight??0)>0)).size<5)return false;
  const words=[...new Set(features.filter(feature=>feature.second===-1).map(feature=>feature.first))].sort((a,b)=>a-b);
  let dot=0,norm=0;
  for(const hash of words){
    const clue=weights.get(hash);if(!clue)continue;
    dot+=clue.idf*clue.weight;norm+=clue.idf*clue.idf;
  }
  return norm>0 && MODEL_BIAS+dot/Math.sqrt(norm)>=MODEL_LOGIT_CUTOFF;
}
