# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# Fixed TRAIN-only comparison using already-installed sklearn/scipy; no runtime dependency or network.
from pathlib import Path
from collections import Counter
import json,hashlib,math,warnings,sys,importlib.metadata as metadata
import numpy as np,scipy,sklearn
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.exceptions import ConvergenceWarning
warnings.simplefilter('error',ConvergenceWarning)
assert all(metadata.version(k)==v for k,v in {'numpy':'2.5.3','scipy':'1.17.1','scikit-learn':'1.9.0','joblib':'1.6.0','threadpoolctl':'3.6.0'}.items())
path=Path(sys.argv[1]);assert path.is_file() and not path.is_symlink()
with path.open('rb') as source:raw=source.read(128*1024*1024+1)
assert len(raw)<=128*1024*1024;assert hashlib.sha256(raw).hexdigest()=='5659424c5f135cc873eba6e7124def0983db07662730533563826cc0864822aa'
rows=json.loads(raw);assert len(rows)==9804 and all(r['partition']=='train' and len(r['features'])<=1999 for r in rows)
folds=np.array([int(r['id'][:8],16)%5 for r in rows]);y=np.array([r['label']=='spam' for r in rows],dtype=np.int32);eligible=np.array([r['eligible'] for r in rows]);fiteligible=np.array([r['textInspectable'] and r['rawInspectable'] for r in rows]);groups=np.array([r['group']=='hard_ham' for r in rows]);body=[set([k for k in r['features'] if k.endswith(':-1')][-r['bodyPositions']:]) if r['bodyPositions'] else set() for r in rows]
results=[]
for scope in ['unigram','context']:
 features=[set(k for k in r['features'] if scope=='context' or k.endswith(':-1')) for r in rows];cache=[]
 for f in range(5):
  train=(folds!=f)&fiteligible;df=Counter(k for i in np.flatnonzero(train) for k in features[i]);keys=sorted(k for k,n in df.items() if n>=3);assert len(keys)<100000;vocab={k:j for j,k in enumerate(keys)};indices=[];indptr=[0]
  for ks in features:indices.extend(sorted(vocab[k] for k in ks if k in vocab));indptr.append(len(indices))
  assert len(indices)<=20_000_000
  x=csr_matrix((np.ones(len(indices)),np.array(indices,dtype=np.int32),np.array(indptr,dtype=np.int32)),shape=(len(rows),len(vocab)))
  tf=TfidfTransformer(norm='l2',smooth_idf=True);tf.fit(x[train]);x=tf.transform(x);bodyknown=np.array([sum(k in vocab for k in ks)>=5 for ks in body]);cache.append((train,x,eligible&bodyknown,vocab))
 for C in [.1,1,10,100,1000]:
  for hardWeight in [1,10,20]:
   p=np.zeros(len(rows));can=np.zeros(len(rows),dtype=bool)
   for f,(train,x,ok,vocab) in enumerate(cache):
    model=LogisticRegression(C=C,solver='liblinear',tol=1e-7,max_iter=2000,random_state=7151)
    sample=np.where(groups[train],hardWeight,1);model.fit(x[train],y[train],sample_weight=sample);assert list(model.classes_)==[0,1]
    positive=np.array([sum(k in vocab and round(float(model.coef_[0][vocab[k]]),9)>0 for k in ks)>=5 for ks in body]);test=folds==f;p[test]=model.decision_function(x[test]);can[test]=(ok&positive)[test]
   for cut in [.9,.95,.99,.995,.999]:
    hits=can&(p>=math.log(cut/(1-cut)));m={'TP':int(np.sum(hits&(y==1))),'FP':int(np.sum(hits&(y==0))),'TN':int(np.sum(~hits&(y==0))),'FN':int(np.sum(~hits&(y==1))),'hardHamFP':int(np.sum(hits&groups))};results.append({'scope':scope,'C':C,'hardWeight':hardWeight,'cutoff':cut,'metrics':m})
   print(json.dumps(results[-5:]),flush=True)
results.sort(key=lambda r:(r['metrics']['FP'],-r['metrics']['TP'],r['C'],-r['cutoff'],r['scope']!='unigram'));receipt={'algorithm':'sklearn liblinear L2 logistic; binary unique content features; TRAIN-fold TFIDF/L2; exact actual-projection/guard matrix','versions':{'sklearn':sklearn.__version__,'numpy':np.__version__,'scipy':scipy.__version__},'matrixSha256':hashlib.sha256(raw).hexdigest(),'folds':5,'candidates':150,'positiveBodyWordsMinimum':5,'results':results}
Path(sys.argv[2]).write_text(json.dumps(receipt,indent=2)+'\n');assert results[0]=={'scope':'unigram','C':100,'hardWeight':20,'cutoff':.99,'metrics':{'TP':2288,'FP':0,'TN':5467,'FN':2049,'hardHamFP':0}};print('SELECTED',json.dumps(results[0]),flush=True)
