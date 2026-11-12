// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {type ScoreInputV1, type LimitId} from './contract.js';
import {linkTarget, type LinkWork} from './vendor/links.js';
import {normalizeText} from './vendor/text.js';

// shortcut: small explicit brand coverage, extend only with primary domain evidence and negative controls.
const BRANDS = [
  {names:['quickbooks','intuit'], domains:['intuit.com','quickbooks.com']},
  {names:['paypal'], domains:['paypal.com']},
] as const;
const aligned = (host:string, domains:readonly string[]) => domains.some(d => host===d || host.endsWith('.'+d));

/** Guarded, bounded features only. A brand mention or a tracker alone never fires. */
export function brandImpersonation(input:ScoreInputV1, limits:Set<LimitId>, work:LinkWork):boolean {
  const display=normalizeText([input.addresses?.displayName??'']).text;
  const brand=BRANDS.find(b=>b.names.some(n=>display===n || display===n+' security' || display===n+' support'));
  if(!brand)return false;
  const from=input.addresses?.from;
  if(!from || !/^[^\s@<>]+@[^\s@<>]+$/u.test(from))return false;
  const sender=from.slice(from.lastIndexOf('@')+1).toLowerCase();
  if(aligned(sender,brand.domains))return false;
  const text=normalizeText([input.subject,input.text,input.extractedText??'']);
  // Third-party discussion/forwarded warnings and ordinary branded marketing are not identity proof.
  if(text.quoted || text.truncated)return false;
  const lure=/\b(?:negative (?:review|feedback|comment)|bad review|verify your (?:account|password)|account (?:suspended|locked)|security team)\b/u.test(text.text);
  if(!lure)return false;
  for(const anchor of input.anchors??[]) {
    if(anchor.quoted)continue;
    const action=normalizeText([anchor.text]).text;
    if(!/\b(?:respond|review|verify|sign in|log in|resolve|restore|secure)\b/u.test(action))continue;
    const target=linkTarget(anchor.href,limits,work);
    if(!target || aligned(target.host,brand.domains))continue;
    try {
      const href=anchor.href.trim();
      // Encoded scheme handling remains with linkTarget; do not infer redirect destinations from it.
      if(!/^https?:\/\//i.test(href)){limits.add('url_uninspected');continue;}
      const redirects=[...new URL(href).searchParams].filter(([key,value])=>['fallback','url','redirect','redirect_uri','redirect_url','target','destination'].includes(key.toLowerCase()) && /^https?:\/\//i.test(value));
      if(redirects.length>1){limits.add('url_uninspected');continue;}
      if(redirects.length===1) {
        work.parses++;
        const redirect=new URL(redirects[0]![1]);
        if([...redirect.searchParams.keys()].some(key=>['fallback','url','redirect','redirect_uri','redirect_url','target','destination'].includes(key.toLowerCase()))) {limits.add('url_decode_limit');continue;}
        if(aligned(redirect.hostname.toLowerCase(),brand.domains))continue;
      }
      return true;
    } catch {limits.add('url_uninspected');}

  }
  return false;
}
