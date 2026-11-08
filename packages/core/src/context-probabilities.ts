// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {contextKey} from './context-features.js';
/** Fixed square-root-count mixture of easy/difficult legitimate TRAIN mail; no per-message group or learned preference. */
export function contextProbabilities(counts:readonly (readonly [number,number,number,number,number])[],documents:readonly [number,number,number]){
 const probabilities=new Map<string,number>();
 const hardWeight=Math.sqrt(documents[1])/(Math.sqrt(documents[0])+Math.sqrt(documents[1]));
 for(const [first,second,easy,hard,spamCount] of counts){
  const ham=(1-hardWeight)*easy/documents[0]+hardWeight*hard/documents[1],spam=spamCount/documents[2],n=easy+hard+spamCount;
  probabilities.set(contextKey(first,second),Math.max(.01,Math.min(.99,(1.5+n*spam/(ham+spam))/(3+n))));
 }
 return probabilities;
}
