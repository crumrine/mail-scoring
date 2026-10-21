// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {writeFile} from 'node:fs/promises';
import {LIMITS,LIMIT_IDS,REASONS} from '../packages/core/dist/index.js';
const string=(bytes)=>({type:'string',maxLength:bytes,'x-maxUtf8Bytes':bytes});
const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const bool={type:'boolean'};
const auth={enum:['pass','fail','unknown']};
const input=obj({
  schemaVersion:{const:'1'},policyVersion:{type:'string',pattern:'^[a-zA-Z0-9._-]{1,64}$'},subject:string(LIMITS.subjectBytes),
  headers:{type:'array',maxItems:100,items:obj({name:{...string(128),pattern:"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$"},value:string(8192)}),'x-totalWireBytes':32768,'x-fieldWireBytes':8192},
  text:string(131072),html:string(131072),extractedText:string(65536),
  addresses:obj({from:string(512),replyTo:string(512),envelopeFrom:string(512)},[]),
  urls:{type:'array',maxItems:100,items:string(2048)},
  attachments:{type:'array',maxItems:32,items:obj({filename:string(255),mediaType:string(127)})},
  transport:obj({provenance:{enum:['unknown','upstream']},complete:bool,spf:auth,dkim:auth,dmarc:auth}),
  preferences:obj({senderAllowed:bool,senderBlocked:bool}),sourceComplete:bool,
},['schemaVersion','policyVersion','subject','headers','text','sourceComplete']);
input['x-combinedSourceBytes']=131072;input['x-requestBytes']=262144;input['x-jsonDepth']=6;input['x-jsonTokens']=4096;
const output=obj({schemaVersion:{const:'1'},engineVersion:{const:'0.1.0'},ruleSetVersion:{const:'foundation-1'},
  status:{enum:['complete','partial','unavailable']},heuristicScore:{type:'number',minimum:0,maximum:100},
  signals:obj({spam:{enum:['present','unknown']},phishing:{enum:['present','unknown']},marketing:{enum:['present','unknown']}}),
  reasons:{type:'array',maxItems:1,items:obj({id:{const:'auth_failed'},contribution:{const:20},reason:{const:REASONS.auth_failed}})},
  limitsHit:{type:'array',maxItems:LIMIT_IDS.length,uniqueItems:true,items:{enum:LIMIT_IDS}},
  error:{enum:[null,'invalid_input','request_limit','invalid_json']},
});output['x-maxUtf8Bytes']=4096;
for(const [name,schema] of [['ScoreInputV1',input],['ScoreResultV1',output]]) {
  await writeFile(`packages/core/schemas/${name}.json`,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$id:`urn:mail-scoring:${name}`,title:name,...schema},null,2)+'\n');
}
