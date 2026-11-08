# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# Neutral metadata/raw hashing only. No fourth-cohort MIME, model or predictions.
from pathlib import Path
import sys,os,subprocess,json,hashlib
assert len(sys.argv)==10,'usage: from SCORER_REPO: python reproduce-freeze.py SA TRAIN ADDITIONAL OLD FIRST SECOND THIRD PRIVATE_EXCLUSIONS NEW_OUTPUT_DIR'
out=Path(sys.argv[9]).resolve();out.mkdir(exist_ok=False)
env=os.environ.copy();env['PATH']='/Users/brian/.cache/codex-tooling/node-v24.15.0-darwin-arm64/bin:/Library/Developer/CommandLineTools/usr/bin:'+env['PATH'];env['WRANGLER_SEND_METRICS']='false'
subprocess.run(['node','harness/evaluation/freeze-recall-second.mjs',*sys.argv[1:9],str(out)],env=env,check=True,timeout=60)
raw=(out/'manifest.json').read_bytes();sha=hashlib.sha256(raw).hexdigest();assert sha=='1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d'
j=json.loads(raw);assert len(j['records'])==2000 and len(list((out/'messages').iterdir()))==2000
assert len({r['id'] for r in j['records']})==len({r['bodyFeatureSha256'] for r in j['records']})==2000
assert all(sum(r['label']==label for r in j['records'])==1000 for label in ['ham','spam'])
total=0
for r in j['records']:
 assert r['path']=='messages/'+r['id']+'.eml' and 0<r['bytes']<=2*1024*1024
 p=out/r['path'];assert not p.is_symlink()
 with p.open('rb') as f:data=f.read(r['bytes']+1)
 assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['id'];total+=len(data)
assert total==6413198
print(json.dumps({'manifestSha256':sha,'verifiedRawFiles':2000,'selectedBytes':total,'predictions':0}))
