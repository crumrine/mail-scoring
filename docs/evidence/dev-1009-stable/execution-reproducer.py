# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# All old regressions must pass before the second cohort's first predictions.
from pathlib import Path
import os,sys,json,subprocess,datetime,hashlib
assert len(sys.argv)==7,'usage: from SCORER_REPO: python execution-reproducer.py INBOX_REPO SA_DATA ENRON_DATA FIRST_DATA SECOND_DATA OUTPUT_DIR'
root=Path.cwd();inbox=Path(sys.argv[1]).resolve();out=Path(sys.argv[6]).resolve();out.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env.update(PATH='/Users/brian/.cache/codex-tooling/node-v24.15.0-darwin-arm64/bin:/Library/Developer/CommandLineTools/usr/bin:'+env['PATH'],WRANGLER_SEND_METRICS='false',INBOX_LOCAL_ONLY='1')
data=list(zip(['stable-sa','stable-enron','stable-first','stable-second'],sys.argv[2:6]))
receipts=[]
for i,(mode,path) in enumerate(data):
 if i==3:
  assert len(receipts)==3 and all(x['exitCode']==0 and x['regressionGatePassed'] for x in receipts)
  (out/'before-second-predictions.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'oldRegressions':receipts,'secondManifestSha256':hashlib.sha256((root/'harness/evaluation/recall-second-holdout-manifest.json').read_bytes()).hexdigest()},indent=2)+'\n')
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();target=out/mode
 with (out/(mode+'.log')).open('w') as log:p=subprocess.run(['node','harness/evaluation/run.mjs','--'+mode,path,str(inbox),str(root),str(target)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 report=target/'report.json';r=json.loads(report.read_text()) if report.exists() else {}
 receipts.append({'mode':mode,'startedAt':started,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':p.returncode,'reportSha256':hashlib.sha256(report.read_bytes()).hexdigest() if report.exists() else None,'regressionGatePassed':r.get('release',{}).get('regressionGatePassed',False),'metrics':{k:v['metrics'] for k,v in r.get('variants',{}).items()}})
 (out/'execution.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(receipts[-1]),flush=True)
 if i<3 and (p.returncode or not receipts[-1]['regressionGatePassed']):raise SystemExit(p.returncode or 1)
 if not report.exists():raise SystemExit(p.returncode or 1)
cmd=['node','harness/evaluation/stable-gate.mjs',*[str(out/mode/'report.json') for mode,_ in data],str(out)]
with (out/'acceptance.log').open('w') as log:p=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Final fixed gate exit',p.returncode,flush=True);raise SystemExit(p.returncode)
