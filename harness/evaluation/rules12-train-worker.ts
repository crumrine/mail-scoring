// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import PostalMime from 'postal-mime';
import {assessArrival, inspectableRaw, shouldQuarantine, unavailable, project} from 'inbox-intake';
import {inspectHtml} from 'inbox-html';

export default {
  async fetch(request: Request, env: {MAIL_SCORER: {scoreV1: (version: string, bytes: Uint8Array, context: string) => Promise<string>}}): Promise<Response> {
    if (new URL(request.url).pathname==='/profile') {
      const bytes=Uint8Array.from([0x80,0x85,0x91,0x92,0x93,0x94,0x99]);
      return Response.json(Object.fromEntries(['windows-1252','latin1','iso-8859-1','ascii'].map(alias=>[alias,[...new TextDecoder(alias).decode(bytes)].map(c=>c.codePointAt(0))])));
    }
    if (new URL(request.url).pathname==='/network-probe') {
      const response=await fetch('https://never-fetch.invalid/');
      return new Response(null,{status:response.status});
    }
    const raw=new Uint8Array(await request.arrayBuffer());
    let assessment,parseUnavailable=false,unavailableCause:string|null=null;
    const flags:Record<string,boolean>={};
    if (!inspectableRaw(raw,true)) { assessment=unavailable(); unavailableCause='raw_preflight'; }
    else {
      try {
        const parsed=await PostalMime.parse(raw);
        const input=project(parsed);const html=input.html?await inspectHtml(input.html):null;
        const single=/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u;
        const multi=/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u;
        flags.subject=single.test(input.subject);flags.text=multi.test(input.text);flags.html=multi.test(input.html??'');
        flags.extractedText=multi.test(html?.text??'');
        flags.anchorText=Boolean(html?.anchors.some(a=>single.test(a.text)));
        flags.anchorTextUnsafe=Boolean(html?.anchors.some(a=>multi.test(a.text)));
        flags.anchorHref=Boolean(html?.anchors.some(a=>single.test(a.href)));
        flags.urls=input.urls.some(u=>single.test(u));flags.headers=input.headers.some(h=>single.test(h.value));
        flags.addresses=Object.values(input.addresses??{}).some(v=>single.test(v));
        assessment=await assessArrival({MAIL_SCORING_MODE:'filter',MAIL_SCORER:env.MAIL_SCORER},parsed,true,undefined,'none');
      } catch {assessment=unavailable();parseUnavailable=true;unavailableCause='mime_or_pipeline_error';}
    }
    if (assessment?.status==='unavailable'&&!unavailableCause) unavailableCause='scorer_unavailable';
    return Response.json({quarantined:shouldQuarantine(assessment,'none'),status:assessment?.status??'unavailable',
      policyVersion:assessment?.policyVersion??null,engineVersion:assessment?.result?.engineVersion??null,ruleSetVersion:assessment?.result?.ruleSetVersion??null,
      score:assessment?.result?.heuristicScore??null,reasons:assessment?.result?.reasons.map(r=>({id:r.id,contribution:r.contribution}))??[],
      limits:assessment?.result?.limitsHit??[],parseUnavailable,unavailableCause,flags});
  }
};
