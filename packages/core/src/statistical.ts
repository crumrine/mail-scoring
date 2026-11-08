// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { MODEL_COUNTS, MODEL_DOCUMENTS } from './general-model.js';
import { combineClues } from './vendor/chi.js';
import { statisticalText, statisticalTokens } from './statistical-text.js';
import type { ScoreInputV1, LimitId } from './contract.js';
// Frozen on validation only, before the independent holdout is scored. Not a calibrated probability.
export const SPAM_CUTOFF = 0.99;
export const MIN_CLUES = 20;
const probabilities=new Map<number,number>();
for(const [id,hamCount,spamCount] of MODEL_COUNTS){
  const ham=hamCount/MODEL_DOCUMENTS[0],spam=spamCount/MODEL_DOCUMENTS[1],n=hamCount+spamCount;
  probabilities.set(id,Math.max(.01,Math.min(.99,(1.5+n*spam/(ham+spam))/(3+n))));
}
/** Only guarded fields. Missing/limited/quoted text abstains; never learns from mail or preferences. */
export function generalSpam(input:ScoreInputV1,limits:Set<LimitId>):boolean {
  const content=statisticalText(input.subject,input.text,input.html??'');
  if(!content.complete){limits.add(input.text.trim()?'statistical_limit':'html_limit');return false;}
  if(content.quoted){limits.add('quoted_content');return false;}
  if(statisticalTokens(content.bodyText).length<5)return false;
  const tokens=statisticalTokens(content.text);
  if(tokens.length===1000){limits.add('statistical_limit');return false;}
  if([...limits].some(limit=>!['auth_unknown','source_incomplete','html_uninspected','identity_uninspected'].includes(limit)))return false;
  const clues:Array<[number,number]>=[];
  for(const id of tokens){const p=probabilities.get(id);if(p!==undefined&&Math.abs(p-.5)>=.1)clues.push([id,p]);}
  clues.sort((a,b)=>Math.abs(b[1]-.5)-Math.abs(a[1]-.5)||a[0]-b[0]);
  const selected=clues.slice(0,64);
  return selected.length>=MIN_CLUES&&combineClues(selected.map(c=>c[1]))>=SPAM_CUTOFF;
}
