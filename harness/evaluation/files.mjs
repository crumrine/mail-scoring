// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function readBounded(path,limit){
 const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const stat=await file.stat();if(!stat.isFile()||stat.size>limit)throw new Error('file_limit');
  const buffer=Buffer.alloc(limit+1);let used=0;
  for(let reads=0;reads<1024;reads++){
   const {bytesRead}=await file.read(buffer,used,buffer.length-used,used);
   if(!bytesRead)return buffer.subarray(0,used);
   used+=bytesRead;if(used>limit)throw new Error('file_limit');
  }
  throw new Error('read_limit');
 }finally{await file.close();}
}
