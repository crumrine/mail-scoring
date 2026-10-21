// Adapted from Sarv/mailguard src/text.ts and src/content/vocabulary.ts
// at ae51a1ddee18649ef729a4195313cbf57db22e87. Copyright (c) 2026 Sarv
// SPDX-License-Identifier: MIT
// Full notice: THIRD_PARTY_NOTICES.md. Changes: streaming scalar normalization,
// shared output budget, bounded linear quote skipping, fixed original phrase groups,
// code-point-aware boundaries; no upstream corpora, weights or dynamic phrase API.
import { LIMITS } from '../contract.js';
const INVISIBLE = /[\u00ad\u200b-\u200d\u2060\ufeff]/u;
const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/u;
export interface TextInspection { text:string; bytes:number; units:number; truncated:boolean; quoted:boolean }
/** Internal: sources come ONLY from guardInput, at most subject/text/extractedText. */
export function normalizeText(sources: readonly string[]): TextInspection {
  const out:string[]=[];
  let bytes=0,units=0,space=true,quoted=false;
  for(const [index,source] of sources.entries()) {
    let lineStart=true,skip=false,forwarded=false;
    for(let i=0;i<source.length;) {
      const point=source.codePointAt(i)!; const width=point>0xffff?2:1;
      units+=width;
      const char=String.fromCodePoint(point);
      if(char==='\n' || char==='\r') {lineStart=true;skip=false;}
      else if(lineStart && char!==' ' && char!=='\t') {
        // Fixed-length comparisons, no regex over the remaining suffix.
        if(char==='>' || source.slice(i,i+26).toLowerCase().startsWith('-----original message-----') ||
          source.slice(i,i+29).toLowerCase().startsWith('---------- forwarded message')) {
          skip=true;quoted=true;if(char!=='>') forwarded=true;
        }
        lineStart=false;
      }
      i+=width;
      if(skip || forwarded) continue;
      // A single Unicode scalar has bounded NFKC/lowercase expansion. Never
      // normalize the full source then slice. Cross-scalar canonical composition
      // is intentionally not attempted; non-English text is not negative evidence.
      // ASCII is already NFKC; avoid an ICU call for every ordinary byte.
      const foldedText=point<128?(point>=65 && point<=90?String.fromCodePoint(point+32):char):char.normalize('NFKC').toLowerCase();
      for(const folded of foldedText) {
        if(INVISIBLE.test(folded)) continue;
        const isSpace=SPACE.test(folded);
        if(isSpace && space) continue;
        const c=isSpace?' ':folded;
        const cp=c.codePointAt(0)!;
        const cost=cp<=0x7f?1:cp<=0x7ff?2:cp<=0xffff?3:4;
        if(bytes+cost>LIMITS.normalizedBytes) return {text:out.join(''),bytes,units,truncated:true,quoted};
        out.push(c);bytes+=cost;space=isSpace;
      }
    }
    if(!space && sources.slice(index+1).some(s=>s.length>0)) {
      if(bytes+1>LIMITS.normalizedBytes) return {text:out.join(''),bytes,units,truncated:true,quoted};
      out.push(' ');bytes++;space=true;
    }
  }
  return {text:out.join('').trim(),bytes,units,truncated:false,quoted};
}
function containsPhrase(haystack:string,phrase:string):boolean {
  let from=0;
  while(from<=haystack.length) {
    const at=haystack.indexOf(phrase,from);if(at<0)return false;
    const beforeAt=at>1 && haystack.charCodeAt(at-1)>=0xdc00 && haystack.charCodeAt(at-1)<=0xdfff?at-2:at-1;
    const before=at===0?'':String.fromCodePoint(haystack.codePointAt(beforeAt)!);
    const after=at+phrase.length===haystack.length?'':String.fromCodePoint(haystack.codePointAt(at+phrase.length)!);
    if(!WORD.test(before) && !WORD.test(after))return true;
    from=at+1;
  }
  return false;
}
// Small original phrase groups: supporting evidence only, never standalone spam.
// Once per group, independent of frequency. No caller-supplied patterns or lists.
const SENSITIVE=Object.freeze(['verify your password','confirm your password','send your password','verification code','wire transfer','buy gift cards']);
const AUTHORITY=Object.freeze(['security team','account administrator','technical support','chief executive']);
export function phraseSignals(text:string):{sensitive:boolean;authority:boolean} {
  return {sensitive:SENSITIVE.some(p=>containsPhrase(text,p)),authority:AUTHORITY.some(p=>containsPhrase(text,p))};
}
