// Adapted from SpamBayes classifier.py / chi2.py at 8ae169fde78371780019db5b7b7acfb4950bab8f.
// Copyright (C) 2002-2007 Python Software Foundation; All Rights Reserved.
// PSF license and change summary: THIRD_PARTY_NOTICES.md.
// Changes: bounded TypeScript numeric-only Fisher combiner; no I/O, database, learning or URL retrieval.
export function chiTail(logProduct:number,count:number):number {
  if(!Number.isFinite(logProduct)||logProduct>0||!Number.isInteger(count)||count<1||count>64)return 1;
  const m=-logProduct;
  let term=Math.exp(-m),sum=term;
  for(let i=1;i<count;i++){term*=m/i;sum+=term;}
  return Math.min(sum,1);
}
export function combineClues(probabilities:readonly number[]):number {
  if(probabilities.length===0||probabilities.length>64||probabilities.some(p=>!Number.isFinite(p)||p<.01||p>.99))return 0.5;
  let spamLog=0,hamLog=0;
  for(const p of probabilities){spamLog+=Math.log(1-p);hamLog+=Math.log(p);}
  const spam=1-chiTail(spamLog,probabilities.length),ham=1-chiTail(hamLog,probabilities.length);
  return (spam-ham+1)/2;
}
