// Adapted from Sarv/mailguard src/urls.ts at ae51a1ddee18649ef729a4195313cbf57db22e87.
// Copyright (c) 2026 Sarv
// SPDX-License-Identifier: MIT
// Full notice: THIRD_PARTY_NOTICES.md. Changes: exact host comparison, no tldts,
// domain corpus, extraction or dynamic output; guarded inputs, bounded whole-URL
// decoding and one lexical redirect hint, never following nested wrappers.
import { LIMITS, type LimitId } from '../contract.js';
export interface LinkTarget {host:string;hasUserinfo:boolean;redirectHost?:string}
export interface LinkWork {parses:number;decodePasses:number}
/** Internal bounded string, supplied by guardInput (<=2048 UTF-8 bytes). */
export function linkTarget(value:string,limits:Set<LimitId>,work:LinkWork):LinkTarget|null {
  let href=value.trim();
  // Only decode an entirely encoded scheme. A normally written URL's percent-
  // encoded path/query/userinfo retain their browser semantics unchanged.
  if(/^https?%/i.test(href)) {
    for(let i=0;i<LIMITS.urlDecodePasses && /^https?%/i.test(href);i++) {
      work.decodePasses++;
      try {href=decodeURIComponent(href);} catch {limits.add('url_uninspected');return null;}
    }
    if(/^https?%/i.test(href)) {limits.add('url_decode_limit');return null;}
  }
  if(href.length>LIMITS.urlBytes) {limits.add('url_uninspected');return null;}
  work.parses++;
  try {
    const url=new URL(href);
    if(url.protocol!=='http:' && url.protocol!=='https:') {limits.add('url_uninspected');return null;}
    const target:LinkTarget={host:url.hostname.toLowerCase(),hasUserinfo:url.username!=='' || url.password!==''};
    // Lexical hint only: one explicit HTTP redirect parameter, never fetch or recurse.
    const redirects:string[]=[];
    for(const [key,value] of url.searchParams) {
      if(['fallback','url','redirect','redirect_uri','redirect_url','target','destination'].includes(key.toLowerCase()) && /^https?:\/\//i.test(value))redirects.push(value);
    }
    if(redirects.length>1){limits.add('url_uninspected');return null;}
    if(redirects.length===1) {
      const redirect=new URL(redirects[0]!);work.parses++;
      if([...redirect.searchParams.keys()].some(k=>['fallback','url','redirect','redirect_uri','redirect_url','target','destination'].includes(k.toLowerCase()))) {
        limits.add('url_decode_limit');return null;
      }
      target.redirectHost=redirect.hostname.toLowerCase();
    }
    return target;
  } catch {limits.add('url_uninspected');return null;}
}
/** Only whole explicit visible HTTP URLs are compared. No prose-domain extractor. */
export function visibleTarget(text:string,limits:Set<LimitId>,work:LinkWork):LinkTarget|null {
  if(!/^https?(?::\/\/|%)/i.test(text.trim()))return null;
  return linkTarget(text,limits,work);
}
