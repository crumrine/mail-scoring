// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {type ScoreInputV1,type LimitId} from './contract.js';
import {normalizeText,phraseSignals} from './vendor/text.js';
import {linkTarget,visibleTarget,type LinkWork} from './vendor/links.js';
import {marketingHeaders} from './vendor/bulk.js';
/** Conservative parsed mailbox host. No raw RFC address-list parsing or suffix trust. */
function mailboxHost(address:string|undefined,limits:Set<LimitId>):string|null {
  if(address===undefined)return null;
  const at=address.lastIndexOf('@');
  if(at<=0 || at!==address.indexOf('@') || /[\s<>"(),;\\]/u.test(address)) {limits.add('identity_uninspected');return null;}
  const domain=address.slice(at+1);
  try {
    const url=new URL('https://'+domain);
    if(!domain || url.username || url.password || url.port || url.pathname!=='/' || url.search || url.hash || /[/\\?#:]/.test(domain)) {
      limits.add('identity_uninspected');return null;
    }
    return url.hostname.toLowerCase();
  } catch {limits.add('identity_uninspected');return null;}
}
/** Internal only; never takes arbitrary objects, HTML or unbounded strings. */
export function inspect(input:ScoreInputV1,limits:Set<LimitId>) {
  const normalized=normalizeText([input.subject,input.text,input.extractedText??'',input.addresses?.displayName??'']);
  if(normalized.truncated)limits.add('normalized_bytes');
  if(normalized.quoted)limits.add('quoted_content');
  const content=phraseSignals(normalized.text);
  const work:LinkWork={parses:0,decodePasses:0};
  let mismatch=false,userinfo=false;
  for(const anchor of input.anchors??[]) {
    if(anchor.quoted) {limits.add('quoted_content');continue;}
    const actual=linkTarget(anchor.href,limits,work);
    const shown=visibleTarget(anchor.text,limits,work);
    if(actual?.hasUserinfo)userinfo=true;
    if(actual && shown && actual.host!==shown.host)mismatch=true;
  }
  for(const url of input.urls??[])if(linkTarget(url,limits,work)?.hasUserinfo)userinfo=true;
  const from=mailboxHost(input.addresses?.from,limits);
  const reply=mailboxHost(input.addresses?.replyTo,limits);
  const display=input.addresses?.displayName;
  const displayHost=display?.includes('@')?mailboxHost(display,limits):null;
  return {mismatch,userinfo,replyMismatch:!!(from && reply && from!==reply),
    displayMismatch:!!(from && displayHost && from!==displayHost),
    sensitive:content.sensitive,authority:content.authority,
    marketing:marketingHeaders(input.headers),work,normalized};
}
