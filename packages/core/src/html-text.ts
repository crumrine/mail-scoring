// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { Parser } from 'htmlparser2';
const SKIP = new Set(['head','script','style','template','noscript','svg','math','iframe','object']);
const BLOCK = new Set(['p','div','br','hr','table','tr','td','th','li','ul','ol','blockquote']);
export const HTML_BYTES = 32768;
/** Inert lexical text only: never a rendered-visibility or complete-HTML claim. */
export function htmlText(source:string):{text:string;complete:boolean;quoted:boolean;tags:number;depth:number} {
  if(source.length>HTML_BYTES || new TextEncoder().encode(source).byteLength>HTML_BYTES)
    return {text:'',complete:false,quoted:false,tags:0,depth:0};
  let text='',bytes=0,complete=true,quoted=false,tags=0,depth=0;
  const stack:boolean[]=[];
  const stop=()=>{complete=false;parser.pause();};
  const append=(value:string)=>{
    if(!complete)return;
    const size=new TextEncoder().encode(value).byteLength;
    if(bytes+size>HTML_BYTES){stop();return;}
    text+=value;bytes+=size;
  };
  const parser=new Parser({
    onopentag(name,attributes){
      if(!complete)return;
      if(++tags>1024 || stack.length===32){stop();return;}
      const classes=(attributes.class??'').toLowerCase().split(/\s+/);
      const quote=name==='blockquote'||classes.some(c=>c==='gmail_quote'||c==='yahoo_quoted');
      if(quote)quoted=true;
      const style=(attributes.style??'').toLowerCase().replace(/\s/g,'');
      const skip=!!stack.at(-1)||SKIP.has(name)||quote||Object.hasOwn(attributes,'hidden')||
        attributes['aria-hidden']==='true'||style.includes('display:none')||style.includes('visibility:hidden');
      if(BLOCK.has(name))append('\n');
      stack.push(skip);depth=Math.max(depth,stack.length);
    },
    ontext(value){if(!stack.at(-1))append(value);},
    onclosetag(name){if(!complete)return;stack.pop();if(BLOCK.has(name))append('\n');},
    onerror(){stop();},
  },{decodeEntities:true,lowerCaseTags:true,lowerCaseAttributeNames:true});
  parser.end(source);
  return {text,complete,quoted,tags,depth};
}
