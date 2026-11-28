// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {type ScoreInputV1,type LimitId} from './contract.js';
import {type inspect} from './inspection.js';
import {linkTarget} from './vendor/links.js';
import {normalizeText} from './vendor/text.js';

export function credentialPhishing(input:ScoreInputV1,limits:Set<LimitId>,features:ReturnType<typeof inspect>):boolean {
  const {normalized,from,work}=features;
  if(!from || normalized.quoted || normalized.truncated)return false;
  const text=normalized.text;
  if(/\b(?:scam|phishing|fraud|fraudulent|never|no|not|won't|won’t|cannot|can't|can’t|without|don't|don’t)\b/u.test(text) ||
    /\bavoid\s+(?:entering|providing|submitting|sending|verifying)\b/u.test(text) || /["“”‘’]|'[^']*'/u.test(text))return false;
  if(!/\baccount\b.{0,40}\b(?:suspended|locked|disabled|restricted|closed)\b/u.test(text))return false;
  if(!/\b(?:verify|confirm|enter|provide|submit|send)\b.{0,50}\bpassword\b/u.test(text))return false;
  for(const anchor of input.anchors??[]) {
    if(anchor.quoted || !/\b(?:verify|confirm|sign in|log in|resolve|restore|secure)\b/u.test(normalizeText([anchor.text]).text))continue;
    try {
      const href=anchor.href.trim();if(!/^https?:\/\//i.test(href))continue;
      const url=new URL(href);if(url.search || url.hash || url.pathname.includes('%') || /https?:/i.test(url.pathname))continue;
      const target=linkTarget(href,limits,work);if(!target)continue;
      if(target.host!==from && !target.host.endsWith('.'+from) && !from.endsWith('.'+target.host))return true;
    } catch {limits.add('url_uninspected');}
  }
  return false;
}
