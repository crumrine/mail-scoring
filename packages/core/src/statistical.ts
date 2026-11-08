// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { statisticalText, statisticalTokens } from './statistical-text.js';
import {contextFeatures} from './context-features.js';
import {linearSpam} from './linear.js';
import type { ScoreInputV1, LimitId } from './contract.js';
/** Only guarded fields. Missing/limited/quoted text abstains; never learns from mail or preferences. */
export function generalSpam(input:ScoreInputV1,limits:Set<LimitId>):boolean {
  const content=statisticalText(input.subject,input.text,input.html??'');
  if(!content.complete){limits.add(input.text.trim()?'statistical_limit':'html_limit');return false;}
  if(content.quoted){limits.add('quoted_content');return false;}
  const tokens=contextFeatures([content.subjectText,content.bodyText]);
  if(tokens.limited){limits.add('statistical_limit');return false;}
  if([...limits].some(limit=>!['auth_unknown','source_incomplete','html_uninspected','identity_uninspected'].includes(limit)))return false;
  if(!content.supported){limits.add('statistical_limit');return false;}
  const result=linearSpam(tokens.features,statisticalTokens(content.bodyText));
  if(result===undefined)limits.add('statistical_limit');
  return result===true;
}
