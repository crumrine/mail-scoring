// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {wordHash} from './statistical-text.js';
export interface ContextFeature {first:number;second:number;start:number;end:number}
export const contextKey=(first:number,second:number):string=>`${first}:${second}`;
/** Only bounded normalized subject/body text; pairs never cross omitted URL/address chunks or sources. */
export function contextFeatures(sources:readonly string[]) {
  const features:ContextFeature[]=[];
  let positions=0;
  for(const source of sources){
    let previous:number|undefined;
    for(const chunk of source.split(/\s+/)){
      if(chunk.length>40||chunk.includes('@')||chunk.includes('://')||chunk.startsWith('www.')){previous=undefined;continue;}
      for(const match of chunk.matchAll(/[a-z]+/g)){
        const word=match[0];if(word.length<3||word.length>20)continue;
        const first=wordHash(word),position=positions++;
        features.push({first,second:-1,start:position,end:position});
        if(previous!==undefined)features.push({first:previous,second:first,start:position-1,end:position});
        previous=first;
        if(positions===1000)return {features,positions,limited:true};
      }
    }
  }
  return {features,positions,limited:false};
}
