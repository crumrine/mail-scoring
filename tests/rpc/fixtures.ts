// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
export const ordinary={schemaVersion:'1',policyVersion:'synthetic-1',subject:'A meeting',headers:[],text:'Hello, can we meet next week?',sourceComplete:true};
export const cases={
  ordinary, newsletter:{...ordinary,headers:[{name:'List-Id',value:'newsletter.test'}]},
  deceptive:{...ordinary,text:'Security team: verify your password',anchors:[{text:'https://account.example.test/',href:'https://other.invalid/'}]},
  unicode:{...ordinary,subject:'こんにちは',text:'Bonjour, مرحبا, 你好. 🌍'},
  ceiling:{...ordinary,text:'x'.repeat(131072)},
  expansion:{...ordinary,text:'\ufdfa'.repeat(10000)},
  tags:{...ordinary,html:'<div>'.repeat(8192)+'x<br>'.repeat(8192)},
};
export const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v));
