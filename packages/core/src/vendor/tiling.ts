// Adapted from SpamBayes classifier.py _getclues at 8ae169fde78371780019db5b7b7acfb4950bab8f.
// Copyright (C) 2002-2007 Python Software Foundation; All Rights Reserved.
// PSF license: THIRD_PARTY_NOTICES.md. Changes: bounded numeric pairs/positions, fixed 64-clue cap and deterministic ties; no I/O or learning.
import {contextKey,type ContextFeature} from '../context-features.js';
export function tiledClues(features:readonly ContextFeature[],probabilities:ReadonlyMap<string,number>):number[]{
  if(features.length>1999)return [];
  const seen=new Set<string>(),raw:Array<{feature:ContextFeature;probability:number}>=[];
  for(const feature of features){
    const key=contextKey(feature.first,feature.second);if(seen.has(key))continue;seen.add(key);
    const probability=probabilities.get(key);
    if(probability!==undefined&&Math.abs(probability-.5)>=.1)raw.push({feature,probability});
  }
  raw.sort((a,b)=>Math.abs(b.probability-.5)-Math.abs(a.probability-.5)||a.feature.first-b.feature.first||a.feature.second-b.feature.second);
  const used=new Set<number>(),selected:number[]=[];
  for(const {feature,probability} of raw){
    if(used.has(feature.start)||used.has(feature.end))continue;
    used.add(feature.start);used.add(feature.end);selected.push(probability);
    if(selected.length===64)break;
  }
  return selected;
}
