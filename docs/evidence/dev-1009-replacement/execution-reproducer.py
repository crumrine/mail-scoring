# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# The first fifth-cohort prediction can only follow a passing replay of all six observed corpora.
import datetime,hashlib,json,os,subprocess,sys
from pathlib import Path
assert len(sys.argv)==10,'from scorer root: INBOX SA ENRON FIRST SECOND THIRD FOURTH FIFTH NEW_OUTPUT'
inbox=Path(sys.argv[1]).resolve()
root=Path.cwd()
out=Path(sys.argv[9]).resolve()
assert not out.exists(),'use a new output directory'
assert all(not (p/'.git').exists() for p in (out,*out.parents)),'output must be outside Git'
out.mkdir()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
env=os.environ.copy()
env.update(PATH='/Users/brian/.cache/codex-tooling/node-v24.15.0-darwin-arm64/bin:/Library/Developer/CommandLineTools/usr/bin:'+env['PATH'],WRANGLER_SEND_METRICS='false',INBOX_LOCAL_ONLY='1')
runner=root/'harness/evaluation/run.mjs'
man=root/'harness/evaluation/recall-fifth-holdout-manifest.json'
assert sha(man)=='7e713aabc0adde0cc734cd7d73c3db13c919c96d6a765d42c7f468796bad1357'
head=lambda repo:subprocess.run(['git','-C',str(repo),'rev-parse','HEAD'],check=True,capture_output=True,text=True).stdout.strip()
source_head=head(root); inbox_head=head(inbox)
identities={'runnerSha256':sha(runner),'comparatorSha256':sha(root/'harness/evaluation/replacement-comparator.mjs'),'controlSha256':sha(root/'harness/evaluation/replacement-legitimate-controls.json'),'sourceRepositoryHead':source_head,'inboxRepositoryHead':inbox_head,'fifthManifestSha256':sha(man)}
for repo in (root,inbox):
 assert not subprocess.run(['git','-C',str(repo),'status','--porcelain','--untracked-files=no'],check=True,capture_output=True,text=True).stdout,'source must be committed'
receipts=[]
modes=['sa','enron','first','second','third','fourth','fifth']
for index,(mode,source) in enumerate(zip(modes,sys.argv[2:9])):
 if index==6:
  assert len(receipts)==6 and all(x['exitCode']==0 and x['regressionGatePassed'] and x['candidate']['FP']==0 for x in receipts)
  assert receipts[5]['baseline']['FP']==1
  (out/'before-fifth-predictions.json').write_text(json.dumps({'at':stamp(),**identities,'observedRegressions':receipts},indent=2)+'\n')
 start=stamp()
 target=out/('replacement-'+mode)
 with (out/(target.name+'.log')).open('w') as log:
  p=subprocess.run(['node',str(runner),'--'+target.name,source,str(inbox),str(root),str(target)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=300)
 report=target/'report.json'
 if not report.is_file():
  (out/'error.json').write_text(json.dumps({'mode':mode,'exitCode':p.returncode,'startedAt':start,'reportPresent':False})+'\n')
  raise SystemExit(p.returncode or 1)
 r=json.loads(report.read_text())
 assert r['runnerSha256']==identities['runnerSha256'] and r['sourceRepositoryHead']==source_head
 assert r['independentHoldout']==(index==6)
 assert r['checks']['networkAttempts']==0 and r['checks']['repeatedOrderInvariant']
 summary={'mode':mode,'startedAt':start,'completedAt':stamp(),'exitCode':p.returncode,'reportSha256':sha(report),'regressionGatePassed':r['release']['regressionGatePassed'],'baseline':r['generalGate']['baseline'],'candidate':r['generalGate']['candidate'],'baselineHamIds':r['generalGate']['baselineHamIds'],'failures':r['generalGate']['failure']}
 receipts.append(summary)
 (out/'execution.json').write_text(json.dumps(receipts,indent=2)+'\n')
 print(json.dumps(summary),flush=True)
 if index<6 and (p.returncode or not summary['regressionGatePassed']):
  raise SystemExit(p.returncode or 1)
eligible=len(receipts)==7 and all(r['exitCode']==0 and r['regressionGatePassed'] and r['candidate']['FP']==0 for r in receipts)
(out/'acceptance.json').write_text(json.dumps({**identities,'eligible':eligible,'studyReceipts':receipts,'minimumFreshRecall':0.5,'minimumAbsoluteFreshGain':0.2,'zeroCandidateLegitimateCatches':True},indent=2)+'\n')
raise SystemExit(0 if eligible else 1)
