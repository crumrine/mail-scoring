// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// LOCAL TEST ENTRY ONLY. No listener, routes, deployment config, or service credentials.
import {score, scoreRequest, LIMITS} from '../../packages/core/src/index.js';
const ordinary={schemaVersion:'1',policyVersion:'synthetic-1',subject:'test',headers:[],text:'test',sourceComplete:true};
// Execute the selected path at module initialization, as well as inside the test event.
const initial=score(ordinary);
const check=(condition:unknown, id='spike_assertion'):void=>{if(!condition) throw new Error(id);};
export default {
  async test() {
    check(initial.status==='partial');
    const trusted={...ordinary,transport:{provenance:'upstream',complete:true,spf:'fail',dkim:'fail',dmarc:'fail'}};
    const result=score(trusted,{transportVerified:true});
    check(result.heuristicScore===20 && result.reasons[0]?.id==='auth_failed');
    check(score(trusted).heuristicScore===0);
    check(score({...ordinary,text:'x'.repeat(LIMITS.sourceBytes+1)}).limitsHit.includes('source_bytes'));
    check(score({...ordinary,attachments:[{filename:'test',mediaType:'text/plain',bytes:[1]}]}).status==='unavailable');
    check(scoreRequest(new Uint8Array(LIMITS.requestBytes+1)).error==='request_limit');
    if ('process' in globalThis) throw new Error('process_present');
    if ('require' in globalThis) throw new Error('require_present');
    if ('Buffer' in globalThis) throw new Error('buffer_present');
    // Both numeric and hostname destinations are handled by a local deny service before DNS.
    for(const url of ['https://example.invalid/','http://127.0.0.1/','file:///synthetic']) {
      let denied=false;
      try { await fetch(url); } catch { denied=true; }
      check(denied,'network_guard');
    }
  }
};
