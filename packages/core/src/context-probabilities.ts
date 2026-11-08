// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {contextKey} from './context-features.js';
/** Pooled legitimate TRAIN document frequencies shared by word and contextual evidence. */
export function contextProbabilities(counts:readonly (readonly [number,number,number,number,number])[],documents:readonly [number,number,number]){
 const probabilities=new Map<string,number>();
 for(const [first,second,easy,hard,spamCount] of counts){
  const ham=(easy+hard)/(documents[0]+documents[1]),spam=spamCount/documents[2],n=easy+hard+spamCount;
  probabilities.set(contextKey(first,second),Math.max(.01,Math.min(.99,(1.5+n*spam/(ham+spam))/(3+n))));
 }
 return probabilities;
}
