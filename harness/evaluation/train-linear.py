# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# Optional offline training only. Never reads validation/holdout messages or learns from mailbox feedback.
import sys,json,math,hashlib,warnings,platform
from pathlib import Path
from collections import Counter
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
features=[set(k for k in r['features'] if k.endswith(':-1')) for r in rows]
body=[set([k for k in r['features'] if k.endswith(':-1')][-r['bodyPositions']:]) if r['bodyPositions'] else set() for r in rows]
y=np.array([r['label']=='spam' for r in rows],dtype=np.int32)
folds=np.array([int(r['id'][:8],16)%5 for r in rows])
fit_ok=np.array([r['rawInspectable'] and r['textInspectable'] for r in rows])
eligible=np.array([r['eligible'] for r in rows]);hard=np.array([r['group']=='hard_ham' for r in rows])

def fit(train,evaluate=None):
    df=Counter(k for i in np.flatnonzero(train) for k in features[i])
    keys=sorted(k for k,n in df.items() if n>=3);assert 0<len(keys)<100000
    vocabulary={k:j for j,k in enumerate(keys)};indices=[];offsets=[0]
    for ks in features:
        indices.extend(sorted(vocabulary[k] for k in ks if k in vocabulary));offsets.append(len(indices))
    assert len(indices)<=9904*1000
    x=csr_matrix((np.ones(len(indices)),np.array(indices,dtype=np.int32),np.array(offsets,dtype=np.int32)),shape=(len(rows),len(keys)))
    transform=TfidfTransformer(norm='l2',smooth_idf=True);transform.fit(x[train]);model=LogisticRegression(C=100,solver='liblinear',tol=1e-7,max_iter=2000,random_state=7151)
    model.fit(transform.transform(x[train]),y[train],sample_weight=np.where(hard[train],20,1))
    assert list(model.classes_)==[0,1]
    # Fixed decimal quantization makes the published artifact independent of insignificant solver tails.
    idf=np.round(transform.idf_,9);weights=np.round(model.coef_[0],9);bias=round(float(model.intercept_[0]),9)
    assert np.all(np.isfinite(weights)) and np.max(np.abs(weights))<10000 and np.all((idf>=1)&(idf<12)) and math.isfinite(bias)
    known=np.array([sum(k in vocabulary and weights[vocabulary[k]]>0 for k in ks)>=5 and sum(k in vocabulary for k in ks)*100>=len(ks)*50 for ks in body])
    weighted=x.multiply(idf).tocsr();squared=np.asarray(weighted.multiply(weighted).sum(axis=1)).ravel();norm=np.sqrt(squared);norm[norm==0]=1
    dots=np.asarray(weighted@weights).ravel();margins=bias+dots/norm
    stable=np.ones(len(rows),dtype=bool)
    if evaluate is not None:
        for i in np.flatnonzero(evaluate&eligible&known&(margins>=threshold)):
            for j in weighted.indices[weighted.indptr[i]:weighted.indptr[i+1]]:
                if weights[j]<=0:continue
                remainder=squared[i]-idf[j]*idf[j]
                if remainder<=0 or bias+(dots[i]-idf[j]*weights[j])/math.sqrt(remainder)<threshold:
                    stable[i]=False;break
    return keys,idf,weights,bias,margins,known,stable

threshold=round(math.log(.99/.01),9)
hits=np.zeros(len(rows),dtype=bool);original_hits=np.zeros(len(rows),dtype=bool)
for f in range(5):
    test=folds==f;_,_,_,_,margins,known,stable=fit((folds!=f)&fit_ok,test)
    original_hits[test]=(eligible&known&(margins>=threshold))[test]
    hits[test]=(eligible&known&stable&(margins>=threshold))[test]
assert not np.any(hits&~original_hits),'stability_guard_added_positive'
original_metrics={'TP':int(np.sum(original_hits&(y==1))),'FP':int(np.sum(original_hits&(y==0))),'TN':int(np.sum(~original_hits&(y==0))),'FN':int(np.sum(~original_hits&(y==1))),'hardHamFP':int(np.sum(original_hits&hard))}
assert original_metrics=={'TP':2092,'FP':0,'TN':5567,'FN':2245,'hardHamFP':0},'unguarded_TRAIN_reference_changed'
metrics={'TP':int(np.sum(hits&(y==1))),'FP':int(np.sum(hits&(y==0))),'TN':int(np.sum(~hits&(y==0))),'FN':int(np.sum(~hits&(y==1))),'hardHamFP':int(np.sum(hits&hard))}
assert metrics=={'TP':1746,'FP':0,'TN':5567,'FN':2591,'hardHamFP':0},'quantized_TRAIN_CV_regression'
keys,idf,weights,bias,_,_,_=fit(fit_ok)
entries=sorted([[int(k.split(':')[0]),float(a),float(b)] for k,a,b in zip(keys,idf,weights)])
partitions=['111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803','773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131','e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67','8241ee48539317a9834974202e767ef56e5648c164e499653e794d8ebe9ff75e']
source='// Copyright (c) 2026 Brian Crumrine\n// SPDX-License-Identifier: Apache-2.0\n// Own numeric TRAIN-only subject/body unigram IDF/coefficients. No literal words or per-message order.\n'
source+='export const MODEL_VERSION = "general-5";\nexport const MODEL_TRAIN_MATRIX_SHA256 = '+json.dumps(EXPECTED)+';\n'
source+='export const MODEL_PARTITIONS = '+json.dumps(partitions)+' as const;\n'
source+='export const MODEL_MIN_KNOWN_BODY_PERCENT = 50;\n'
source+='export const MODEL_BIAS = '+json.dumps(bias)+';\nexport const MODEL_LOGIT_CUTOFF = '+json.dumps(threshold)+';\n'
source+='export const MODEL_FEATURES:ReadonlyArray<readonly [number,number,number]> = [\n'+',\n'.join('  '+json.dumps(row,allow_nan=False) for row in entries)+'\n];\n'
assert hashlib.sha256(source[source.index('export const MODEL_BIAS'):].encode()).hexdigest()=='efcf3625ce74ad461998661980eb70d74e18a71d0c701adb0352bcc94f182a6b','frozen_numeric_coefficients_changed'
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True);(out/'linear-model.ts').write_text(source)
if '--write-model' in sys.argv[3:]:Path('packages/core/src/linear-model.ts').write_text(source)
else:assert Path('packages/core/src/linear-model.ts').read_text()==source,'model_reproduction_mismatch'
receipt={'frozenNumericModelSha256':'efcf3625ce74ad461998661980eb70d74e18a71d0c701adb0352bcc94f182a6b','coefficientSource':'2705d0e41a992e30b626010115a681f027d61424','model':'general-5','algorithm':'one L2 logistic subject/body unigram TFIDF head','C':100,'hardHamWeight':20,'cutoff':.99,'minimumPositiveBodyWords':5,'minimumKnownBodyFraction':.5,'maxWordPositions':1000,'quantizedDigits':9,'rows':len(rows),'fitRows':int(np.sum(fit_ok)),'entries':len(entries),'matrixSha256':EXPECTED,'sourcePartitions':partitions,'modelSha256':hashlib.sha256(source.encode()).hexdigest(),'singlePositiveFeatureRemovalStability':True,'unguardedReferenceFiveFoldTraining':original_metrics,'quantizedFiveFoldTraining':metrics,'versions':VERSIONS,'python':platform.python_version(),'scope':'TRAIN-only development; never an independent accuracy or production deployment claim'}
(out/'training.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
