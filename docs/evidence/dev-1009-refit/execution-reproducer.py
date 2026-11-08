# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# All four old regressions must pass before third-cohort predictions in this execution.
from pathlib import Path
import os,sys,json,subprocess,datetime,hashlib
assert len(sys.argv)==8,'usage: from SCORER_REPO: python execution-reproducer.py INBOX_REPO SA_DATA ENRON_DATA FIRST_DATA SECOND_DATA THIRD_DATA OUTPUT_DIR'
root=Path.cwd();inbox=Path(sys.argv[1]).resolve();out=Path(sys.argv[7]).resolve();out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
runner_sha='62bc563aee626e1ff2e7ba146ef8eac8a9fbe9365d481f15c1158cee5c9c57cf'
assert sha(root/'harness/evaluation/run.mjs')==runner_sha
assert sha(root/'harness/evaluation/refit-legitimate-controls.json')=='667dc0c9052480d0e63a83b7097550c1f8d9550a575ed9a15bf5d7d515e84975'
assert sha(root/'harness/evaluation/recall-third-holdout-manifest.json')=='be8dd2cf1e0a2c6b288d57e26ea3f7dda94768d05b6555a9e0dd83715af6dac8'
env=os.environ.copy();env.update(PATH='/Users/brian/.cache/codex-tooling/node-v24.15.0-darwin-arm64/bin:/Library/Developer/CommandLineTools/usr/bin:'+env['PATH'],WRANGLER_SEND_METRICS='false',INBOX_LOCAL_ONLY='1')
data=list(zip(['refit-sa','refit-enron','refit-first','refit-second','refit-third'],sys.argv[2:7]))
receipts=[]
for i,(mode,path) in enumerate(data):
 if i==4:
  assert len(receipts)==4 and all(x['exitCode']==0 and x['regressionGatePassed'] and all(m['FP']==0 for m in x['metrics'].values()) for x in receipts)
  (out/'before-third-predictions.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'oldRegressions':receipts,'runnerSha256':runner_sha,'thirdManifestSha256':sha(root/'harness/evaluation/recall-third-holdout-manifest.json'),'scope':'Ordering receipt for this execution. The original author execution establishes first predictions; later unchanged-source reproductions do not restore untouched status.'},indent=2)+'\n')
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();target=out/mode
 with (out/(mode+'.log')).open('w') as log:p=subprocess.run(['node','harness/evaluation/run.mjs','--'+mode,path,str(inbox),str(root),str(target)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=300)
 report=target/'report.json';r=json.loads(report.read_text()) if report.exists() else {}
 receipts.append({'mode':mode,'startedAt':started,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':p.returncode,'reportSha256':sha(report) if report.exists() else None,'regressionGatePassed':r.get('release',{}).get('regressionGatePassed',False),'metrics':{k:v['metrics'] for k,v in r.get('variants',{}).items()}})
 (out/'execution.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(receipts[-1]),flush=True)
 if i<4 and (p.returncode or not receipts[-1]['regressionGatePassed']):raise SystemExit(p.returncode or 1)
 if not report.exists():raise SystemExit(p.returncode or 1)
cmd=['node','harness/evaluation/refit-gate.mjs',*[str(out/mode/'report.json') for mode,_ in data],str(out)]
with (out/'acceptance.log').open('w') as log:p=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=30)
print('Final unchanged refit gate exit',p.returncode,flush=True);raise SystemExit(p.returncode)
