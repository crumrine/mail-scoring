# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# All five old regressions must pass before fourth-cohort predictions in this execution.
from pathlib import Path
import os,sys,json,subprocess,datetime,hashlib
assert len(sys.argv)==9,'usage: from SCORER_REPO: python execution-reproducer.py INBOX_REPO SA_DATA ENRON_DATA FIRST_DATA SECOND_DATA THIRD_DATA FOURTH_DATA OUTPUT_DIR'
root=Path.cwd();inbox=Path(sys.argv[1]).resolve();out=Path(sys.argv[8]).resolve();assert not out.exists() or not any(out.iterdir()),'output_must_be_empty';out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
runner_sha='41379c9bc8562fd67190c30deed314e269d3e9e76eeaa447c67d0c8c5936627f'
assert sha(root/'harness/evaluation/run.mjs')==runner_sha
assert sha(root/'harness/evaluation/wordpair-legitimate-controls.json')=='973f7dd28694bc1b98a4be601a253a3fd1913da9eebbb187555b3d6622dbc3e2'
assert sha(root/'harness/evaluation/recall-fourth-holdout-manifest.json')=='1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d'
env=os.environ.copy();env.update(PATH='/Users/brian/.cache/codex-tooling/node-v24.15.0-darwin-arm64/bin:/Library/Developer/CommandLineTools/usr/bin:'+env['PATH'],WRANGLER_SEND_METRICS='false',INBOX_LOCAL_ONLY='1')
data=list(zip(['wordpair-sa','wordpair-enron','wordpair-first','wordpair-second','wordpair-third','wordpair-fourth'],sys.argv[2:8]))
receipts=[]
for i,(mode,path) in enumerate(data):
 if i==5:
  assert len(receipts)==5 and all(x['exitCode']==0 and x['regressionGatePassed'] and all(m['FP']==0 for m in x['metrics'].values()) for x in receipts)
  (out/'before-fourth-predictions.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceRepositoryHead':subprocess.run(['git','rev-parse','HEAD'],check=True,capture_output=True,text=True).stdout.strip(),'oldRegressions':receipts,'runnerSha256':runner_sha,'fourthManifestSha256':sha(root/'harness/evaluation/recall-fourth-holdout-manifest.json'),'scope':'Ordering receipt for this execution. The original author execution establishes first predictions; later unchanged-source reproductions do not restore untouched status.'},indent=2)+'\n')
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();target=out/mode
 with (out/(mode+'.log')).open('w') as log:p=subprocess.run(['node','harness/evaluation/run.mjs','--'+mode,path,str(inbox),str(root),str(target)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=300)
 report=target/'report.json';r=json.loads(report.read_text()) if report.exists() else {}
 receipts.append({'mode':mode,'startedAt':started,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':p.returncode,'reportSha256':sha(report) if report.exists() else None,'regressionGatePassed':r.get('release',{}).get('regressionGatePassed',False),'metrics':{k:v['metrics'] for k,v in r.get('variants',{}).items()}})
 (out/'execution.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(receipts[-1]),flush=True)
 if i<5 and (p.returncode or not receipts[-1]['regressionGatePassed']):raise SystemExit(p.returncode or 1)
 if not report.exists():raise SystemExit(p.returncode or 1)
cmd=['node','harness/evaluation/wordpair-gate.mjs',*[str(out/mode/'report.json') for mode,_ in data],str(out)]
with (out/'acceptance.log').open('w') as log:p=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=30)
print('Final unchanged wordpair gate exit',p.returncode,flush=True);raise SystemExit(p.returncode)
