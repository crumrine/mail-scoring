// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { MODEL_FEATURES, MODEL_BIAS, MODEL_REFERENCE_BIAS, MODEL_LOGIT_CUTOFF, MODEL_MIN_KNOWN_BODY_PERCENT } from './linear-model.js';
import type { ContextFeature } from './context-features.js';

const weights = new Map(MODEL_FEATURES.map(([hash,idf,weight,referenceWeight]) => [hash,{idf,weight,referenceWeight}]));
/** Fixed numeric TRAIN model; repeated words never multiply evidence. No learning or I/O. */
export function linearSpam(features:readonly ContextFeature[],bodyWords:readonly number[]):boolean | undefined {
  if(features.length>1999 || bodyWords.length>1000)return false;
  const body=[...new Set(bodyWords)];
  // Ignoring most unfamiliar words can make a sparse vector look confidently positive.
  if(body.length>=5 && body.filter(hash=>weights.has(hash)).length*100<body.length*MODEL_MIN_KNOWN_BODY_PERCENT)return undefined;
  // A strong subject cannot turn an unknown body into supported spam evidence.
  if(body.filter(hash=>(weights.get(hash)?.weight??0)>0).length<5)return false;
  if(body.filter(hash=>(weights.get(hash)?.referenceWeight??0)>0).length<5)return false;
  const words=[...new Set(features.filter(feature=>feature.second===-1).map(feature=>feature.first))].sort((a,b)=>a-b);
  let dot=0,referenceDot=0,norm=0,strongest=0,secondStrongest=0;
  for(const hash of words){
    const clue=weights.get(hash);if(!clue)continue;
    const contribution=clue.idf*clue.weight;
    dot+=contribution;referenceDot+=clue.idf*clue.referenceWeight;norm+=clue.idf*clue.idf;
    if(contribution>strongest){secondStrongest=strongest;strongest=contribution;}
    else if(contribution>secondStrongest)secondStrongest=contribution;
  }
  if(norm<=0 || MODEL_REFERENCE_BIAS+referenceDot/Math.sqrt(norm)<MODEL_LOGIT_CUTOFF)return false;
  // Keeping the full norm gives a lower bound after losing any two positive words.
  const remaining=dot-strongest-secondStrongest;
  if(norm<=0 || remaining<=0 || MODEL_BIAS+remaining/Math.sqrt(norm)<MODEL_LOGIT_CUTOFF)return false;
  return true;
}
