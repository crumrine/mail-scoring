// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { htmlText } from './html-text.js';
import { normalizeText } from './vendor/text.js';
/** Subject and body only; never headers, addresses, labels, URLs, filenames or corpus IDs. */
export function statisticalText(subject:string,text:string,html='') {
  const extracted=text.trim()?{text,complete:true,quoted:false}:htmlText(html);
  const normalized=normalizeText([subject,extracted.text]);
  return {subjectText:normalizeText([subject]).text,bodyText:normalizeText([extracted.text]).text,text:normalized.text,complete:extracted.complete&&!normalized.truncated,quoted:extracted.quoted||normalized.quoted};
}
export function wordHash(word:string):number {
  let value=2166136261;
  for(let i=0;i<word.length;i++)value=Math.imul(value^word.charCodeAt(i),16777619)>>>0;
  return value;
}
export function statisticalTokens(text:string):number[] {
  const hashes=new Set<number>();
  // Input is bounded normalized text. Ignore whole URL/address/oversized chunks before word scanning.
  for(const chunk of text.split(/\s+/)) {
    if(chunk.length>40||chunk.includes('@')||chunk.includes('://')||chunk.startsWith('www.'))continue;
    for(const match of chunk.matchAll(/[a-z]+/g)) {
      const word=match[0];if(word.length<3||word.length>20)continue;
      hashes.add(wordHash(word));
      if(hashes.size===1000)return [...hashes];
    }
  }
  return [...hashes];
}
