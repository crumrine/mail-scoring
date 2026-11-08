// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { MODEL_COUNTS, MODEL_DOCUMENTS } from './context-model.js';
import { combineClues } from './vendor/chi.js';
import { statisticalText, statisticalTokens } from './statistical-text.js';
import {contextFeatures} from './context-features.js';
import {contextProbabilities} from './context-probabilities.js';
import {tiledClues} from './vendor/tiling.js';
import type { ScoreInputV1, LimitId } from './contract.js';
// Existing hard-ham safeguard retained; original plus disjoint added TRAIN only. Not calibrated.
export const SPAM_CUTOFF = 0.99;
export const MIN_CLUES = 20;
const probabilities=contextProbabilities(MODEL_COUNTS,MODEL_DOCUMENTS);
/** Only guarded fields. Missing/limited/quoted text abstains; never learns from mail or preferences. */
export function generalSpam(input:ScoreInputV1,limits:Set<LimitId>):boolean {
  const content=statisticalText(input.subject,input.text,input.html??'');
  if(!content.complete){limits.add(input.text.trim()?'statistical_limit':'html_limit');return false;}
  if(content.quoted){limits.add('quoted_content');return false;}
  if(statisticalTokens(content.bodyText).length<5)return false;
  const tokens=contextFeatures([content.subjectText,content.bodyText]);
  if(tokens.limited){limits.add('statistical_limit');return false;}
  if([...limits].some(limit=>!['auth_unknown','source_incomplete','html_uninspected','identity_uninspected'].includes(limit)))return false;
  const selected=tiledClues(tokens.features,probabilities);
  return selected.length>=MIN_CLUES&&combineClues(selected)>=SPAM_CUTOFF;
}
