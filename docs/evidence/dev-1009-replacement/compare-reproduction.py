# Compare stored original outcomes with an unchanged source reproduction; no sampling or scoring here.
from pathlib import Path
import hashlib,json,sys
assert len(sys.argv)==3
archive,replay=map(Path,sys.argv[1:])
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def normalize(report):
 report.pop('sourceRepositoryHead',None)
 for identity in report['identities'].values():identity.pop('bundleSha256',None)
 return report
def validate_evidence(root):
 results=load(root/'execution.json')
 assert [r['mode'] for r in results]==['sa','enron','first','second','third','fourth','fifth']
 ordering=load(root/'before-fifth-predictions.json')
 assert ordering['at']<results[-1]['startedAt']
 assert ordering['observedRegressions']==results[:6]
 assert all(r['candidate']['FP']==0 and r['regressionGatePassed'] for r in results[:6])
 a=load(root/'acceptance.json')
 assert a['studyReceipts']==results
 assert a['minimumFreshRecall']==.5 and a['minimumAbsoluteFreshGain']==.2 and a['zeroCandidateLegitimateCatches']
 for r in results:
  assert sha(root/('replacement-'+r['mode'])/'report.json')==r['reportSha256']
 return a,results
original,history=validate_evidence(archive)
actual,reproduced=validate_evidence(replay)
assert original['eligible']==actual['eligible']
for item,repeat in zip(history,reproduced):
 name='replacement-'+item['mode']
 for key in ('baseline','candidate','baselineHamIds','regressionGatePassed','failures'):
  assert item[key]==repeat[key]
 assert normalize(load(archive/name/'report.json'))==normalize(load(replay/name/'report.json')),name
 assert (archive/name/'report.md').read_bytes()==(replay/name/'report.md').read_bytes(),name
print(json.dumps({'sevenStudiesByteEquivalentExceptRunIdentity':True,'eligible':actual['eligible'],'fifthBaseline':reproduced[-1]['baseline'],'fifthCandidate':reproduced[-1]['candidate']}))
