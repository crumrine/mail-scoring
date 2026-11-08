// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
export function contextCounts(rows){
 const documents=[0,0,0],counts=new Map();
 for(const row of rows.filter(r=>r.partition==='train'&&r.rawInspectable&&r.textInspectable&&r.features.length<2000)){
  const type=row.label==='spam'?2:row.group==='hard_ham'?1:0;documents[type]++;
  for(const key of new Set(row.features)){
   const count=counts.get(key)??[0,0,0];count[type]++;counts.set(key,count);
  }
 }
 const entries=[...counts].filter(([,c])=>c[0]+c[1]+c[2]>=3)
  .map(([key,c])=>[...key.split(':').map(Number),...c]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 return {documents,entries};
}

if(process.argv[2]==='--self-check'){
 const {default:assert}=await import('node:assert/strict');
 const row={partition:'train',rawInspectable:true,textInspectable:true,features:['7:-1','7:-1']};
 const rows=[{...row,label:'ham',group:'easy_ham'},{...row,label:'ham',group:'hard_ham'},{...row,label:'spam',group:'spam'},
  {...row,label:'spam',group:'spam',partition:'holdout'},{...row,label:'spam',group:'spam',partition:'validation'},
  {...row,label:'spam',group:'spam',rawInspectable:false}];
 assert.deepEqual(contextCounts(rows),{documents:[1,1,1],entries:[[7,-1,1,1,1]]});
 assert.deepEqual(contextCounts(rows),contextCounts([...rows].reverse()));
 console.log(JSON.stringify({passed:true,cases:['TRAIN_only','no_validation_or_holdout','no_unavailable','document_not_word_frequency','ham_strata','order_invariance']}));
}
