// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { MODEL_FEATURES, MODEL_BIAS, MODEL_LOGIT_CUTOFF, MODEL_MIN_KNOWN_BODY_PERCENT } from './linear-model.js';
import {contextKey,type ContextFeature} from './context-features.js';

const weights = new Map(MODEL_FEATURES.map(([first,second,idf,weight]) => [contextKey(first,second),{idf,weight}]));
/** Fixed numeric TRAIN model; repeated words never multiply evidence. No learning or I/O. */
export function linearSpam(features:readonly ContextFeature[],bodyWords:readonly number[]):boolean | undefined {
  if(features.length>1999 || bodyWords.length>1000)return false;
  const body=[...new Set(bodyWords)];
  // Ignoring most unfamiliar words can make a sparse vector look confidently positive.
  if(body.length>=5 && body.filter(hash=>weights.has(contextKey(hash,-1))).length*100<body.length*MODEL_MIN_KNOWN_BODY_PERCENT)return undefined;
  // A strong subject cannot turn an unknown body into supported spam evidence.
  if(body.filter(hash=>(weights.get(contextKey(hash,-1))?.weight??0)>0).length<5)return false;
  const unique=[...new Map(features.map(feature=>[contextKey(feature.first,feature.second),feature])).values()].sort((a,b)=>a.first-b.first||a.second-b.second);
  const positive=new Map<number,number>();
  let dot=0,norm=0,strongest=0,secondStrongest=0;
  for(const feature of unique){
    const clue=weights.get(contextKey(feature.first,feature.second));if(!clue)continue;
    const contribution=clue.idf*clue.weight;
    dot+=contribution;norm+=clue.idf*clue.idf;
    if(contribution>0){
      positive.set(feature.first,(positive.get(feature.first)??0)+contribution);
      if(feature.second!==-1&&feature.second!==feature.first)positive.set(feature.second,(positive.get(feature.second)??0)+contribution);
    }
  }
  for(const contribution of positive.values()){
    if(contribution>strongest){secondStrongest=strongest;strongest=contribution;}
    else if(contribution>secondStrongest)secondStrongest=contribution;
  }
  // Remove all positive clues incident to two words; shared pairs subtract twice, conservatively.
  // Keeping negative evidence and the full norm bounds any two-word removal from below.
  const remaining=dot-strongest-secondStrongest;
  if(norm<=0 || remaining<=0 || MODEL_BIAS+remaining/Math.sqrt(norm)<MODEL_LOGIT_CUTOFF)return false;
  return true;
}
