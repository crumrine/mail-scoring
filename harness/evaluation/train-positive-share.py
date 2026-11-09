# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# Offline TRAIN only. No MIME, heldout inputs, network or mailbox feedback.
import sys,json,math,hashlib,warnings,platform
from pathlib import Path
from collections import Counter,defaultdict
import importlib.metadata as metadata
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.exceptions import ConvergenceWarning

EXPECTED='1e86b9a7f97af06517a7bb00faeb42d5f4e6ba264678c7548e714a1b471dfd49'
VERSIONS={'numpy':'2.5.3','scipy':'1.17.1','scikit-learn':'1.9.0','joblib':'1.6.0','threadpoolctl':'3.6.0'}
assert all(metadata.version(k)==v for k,v in VERSIONS.items()),'training_dependency_version'
warnings.simplefilter('error',ConvergenceWarning)
path=Path(sys.argv[1]);assert not path.is_symlink() and path.is_file()
with path.open('rb') as source:raw=source.read(128*1024*1024+1)
assert len(raw)<=128*1024*1024 and hashlib.sha256(raw).hexdigest()==EXPECTED,'TRAIN_matrix_hash'
rows=json.loads(raw)
assert len(rows)==9904 and len({r['id'] for r in rows})==9904
assert all(r['partition']=='train' and r['label'] in ['ham','spam'] and isinstance(r['eligible'],bool) and isinstance(r['supported'],bool) and (not r['eligible'] or r['supported']) and 0<=r['bodyPositions']<=1000 and len(r['features'])<=1999 for r in rows)
features=[set(r['features']) for r in rows]
body=[set([k for k in r['features'] if k.endswith(':-1')][-r['bodyPositions']:]) if r['bodyPositions'] else set() for r in rows]
y=np.array([r['label']=='spam' for r in rows],dtype=np.int32)
folds=np.array([int(r['id'][:8],16)%5 for r in rows])
fit_ok=np.array([r['rawInspectable'] and r['textInspectable'] for r in rows])
eligible=np.array([r['eligible'] for r in rows]);hard=np.array([r['group']=='hard_ham' for r in rows])
threshold=round(math.log(.99/.01),9)
def pair(k):return tuple(map(int,k.split(':')))

def design(train):
    df=Counter(k for i in np.flatnonzero(train) for k in features[i])
    words=[k for k,n in df.items() if n>=3 and k.endswith(':-1')]
    assert 0<len(words)<50000
    pairs=sorted((k for k,n in df.items() if n>=3 and not k.endswith(':-1')),key=lambda k:(-df[k],pair(k)))
    keys=sorted(words+pairs[:50000-len(words)],key=pair)
    vocabulary={k:j for j,k in enumerate(keys)};indices=[];offsets=[0]
    for ks in features:
        indices.extend(sorted(vocabulary[k] for k in ks if k in vocabulary));offsets.append(len(indices))
    assert len(indices)<=9904*1999
    x=csr_matrix((np.ones(len(indices)),np.array(indices,dtype=np.int32),np.array(offsets,dtype=np.int32)),shape=(len(rows),len(keys)))
    transform=TfidfTransformer(norm='l2',smooth_idf=True);transform.fit(x[train])
    idf=np.round(transform.idf_,9);weighted=x.multiply(idf).tocsr()
    norm=np.sqrt(np.asarray(weighted.multiply(weighted).sum(axis=1)).ravel());norm[norm==0]=1
    return keys,vocabulary,transform.transform(x[train]),weighted,idf,norm

def fit(train,evaluate,design_values,C,H):
    keys,vocabulary,training_x,weighted,idf,norm=design_values
    model=LogisticRegression(C=C,solver='liblinear',tol=1e-7,max_iter=2000,random_state=7151)
    model.fit(training_x,y[train],sample_weight=np.where(hard[train],H,1));assert list(model.classes_)==[0,1]
    weights=np.round(model.coef_[0],9);bias=round(float(model.intercept_[0]),9)
    assert np.all(np.isfinite(weights)) and np.max(np.abs(weights))<10000 and np.all((idf>=1)&(idf<12)) and math.isfinite(bias)
    known=np.array([sum(k in vocabulary and weights[vocabulary[k]]>0 for k in ks)>=5 and sum(k in vocabulary for k in ks)*100>=len(ks)*50 for ks in body])
    dots=np.asarray(weighted@weights).ravel();margins=bias+dots/norm
    unguarded=evaluate&eligible&known&(margins>=threshold);positive_percent=np.zeros(len(rows))
    for i in np.flatnonzero(unguarded):
        positive=defaultdict(float);positive_mass=0.;negative_mass=0.
        for j in weighted.indices[weighted.indptr[i]:weighted.indptr[i+1]]:
            contribution=idf[j]*weights[j]
            if contribution<=0:
                negative_mass-=contribution;continue
            positive_mass+=contribution
            first,second=pair(keys[j]);positive[first]+=contribution
            if second!=-1 and second!=first:positive[second]+=contribution
        discount=sum(sorted(positive.values(),reverse=True)[:2])
        remaining=dots[i]-discount
        if remaining>0 and bias+remaining/norm[i]>=threshold:
            positive_left=positive_mass-discount
            assert positive_left>0
            positive_percent[i]=100*positive_left/(positive_left+negative_mass)
    return positive_percent,unguarded,(keys,idf,weights,bias)

def confusion(hits):
    return {'TP':int(np.sum(hits&(y==1))),'FP':int(np.sum(hits&(y==0))),'TN':int(np.sum(~hits&(y==0))),'FN':int(np.sum(~hits&(y==1))),'hardHamFP':int(np.sum(hits&hard))}

out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
designs=[design((folds!=f)&fit_ok) for f in range(5)]
candidates=[]
for C in [1000,2000,5000,10000]:
    for H in [5,10,20,50,100]:
        share=np.zeros(len(rows));original=np.zeros(len(rows),dtype=bool)
        for f in range(5):
            fold_share,unguarded,_=fit((folds!=f)&fit_ok,folds==f,designs[f],C,H)
            share=np.maximum(share,fold_share);original|=unguarded
        for P in [55,60,65,70,75]:
            hits=share>=P
            assert not np.any(hits&~original)
            result={'C':C,'hardHamWeight':H,'minimumPositivePercent':P,'metrics':confusion(hits),'twoWordOnly':confusion(share>0),'unguardedMetrics':confusion(original)}
            candidates.append(result);print(json.dumps(result),flush=True)
valid=sorted((r for r in candidates if r['metrics']['FP']==0 and r['metrics']['hardHamFP']==0),key=lambda r:(-r['metrics']['TP'],r['C'],-r['minimumPositivePercent'],-r['hardHamWeight']))
chosen=valid[0] if valid else None
grid={'matrixSha256':EXPECTED,'candidates':candidates,'selected':chosen,'requiredTP':2058,'vocabularyCap':50000,'cutoff':.99,'positiveBodyWords':5,'knownBodyPercent':50,'twoWordIncidentPositiveBound':True,'versions':VERSIONS,'python':platform.python_version(),'scope':'TRAIN only; per-fold vocabulary/IDF; no heldout inputs or threshold selection'}
(out/'grid.json').write_text(json.dumps(grid,indent=2)+'\n')
assert chosen is not None and chosen['metrics']['TP']>=2058,'no_TRAIN_improvement'
del designs
_,_,(keys,idf,weights,bias)=fit(fit_ok,np.zeros(len(rows),dtype=bool),design(fit_ok),chosen['C'],chosen['hardHamWeight'])
entries=[[*pair(k),float(a),float(b)] for k,a,b in zip(keys,idf,weights)]
partitions=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131','e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67','8241ee48539317a9834974202e767ef56e5648c164e499653e794d8ebe9ff75e']
source='// Copyright (c) 2026 Brian Crumrine\n// SPDX-License-Identifier: Apache-2.0\n// Own numeric TRAIN-only word and adjacent-pair coefficients. No literal words or message order.\n'
source+='export const MODEL_VERSION = "general-8";\nexport const MODEL_TRAIN_MATRIX_SHA256 = '+json.dumps(EXPECTED)+';\n'
source+='export const MODEL_PARTITIONS = '+json.dumps(partitions)+' as const;\nexport const MODEL_MIN_KNOWN_BODY_PERCENT = 50;\n'
source+='export const MODEL_MIN_POSITIVE_PERCENT = '+str(chosen['minimumPositivePercent'])+';\n'
source+='export const MODEL_BIAS = '+json.dumps(bias)+';\nexport const MODEL_LOGIT_CUTOFF = '+json.dumps(threshold)+';\n'
source+='export const MODEL_FEATURES:ReadonlyArray<readonly [number,number,number,number]> = [\n'+',\n'.join('  '+json.dumps(row,allow_nan=False) for row in entries)+'\n];\n'
(out/'linear-model.ts').write_text(source)
receipt={**{k:v for k,v in grid.items() if k!='candidates'},'gridSha256':hashlib.sha256((out/'grid.json').read_bytes()).hexdigest(),'modelSha256':hashlib.sha256(source.encode()).hexdigest(),'rows':len(rows),'fitRows':int(np.sum(fit_ok)),'entries':len(entries),'wordEntries':sum(r[1]==-1 for r in entries),'pairEntries':sum(r[1]!=-1 for r in entries),'sourcePartitions':partitions,'model':'general-8'}
(out/'training.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True)
