# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
# Offline bounded acquisition normalization; no scoring or training.
from pathlib import Path,PurePosixPath
import sys,importlib.util,gzip,tarfile,json,hashlib
HELPERS=Path(__file__).resolve().parent
sys.path.insert(0,str(HELPERS))
spec=importlib.util.spec_from_file_location('prepare_general',HELPERS/'prepare-general.py');helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
from prepare import ExpandedLimit
SOURCES=[('beck-s.tar.gz','ham','28ad9e6b40a323fba13ece2e63a0aee6f66435ac3f1fd2974a6777eeb39456a2','ham/beck-s.tar.gz'),('BG.tar.gz','spam','4a4eb6e9c1bcd899d21ae09bbd4d880f541b5d42d967a47b10198c304e110f8c','spam/BG.tar.gz')]
TRAIN_MODE='--train' in sys.argv[1:]
def digest(data):return hashlib.sha256(data).hexdigest()
def safe(m):
 p=PurePosixPath(m.name)
 if p.is_absolute() or '..' in p.parts or m.issym() or m.islnk() or not(m.isdir() or m.isfile()):raise ValueError('unsafe_member')
 if m.size>2*1024*1024 or m.size<0:raise ValueError('member_limit')
def prepare(root):
 if root.is_symlink():raise ValueError('root_symlink')
 root=root.resolve()
 if any((p/'.git').exists() for p in [root,*root.parents]):raise ValueError('outside_git_required')
 messages=root/'messages'
 if messages.is_symlink():raise ValueError('output_symlink')
 messages.mkdir(exist_ok=True)
 records={};archives=[];total=0
 for name,label,expected,relative in SOURCES:
  path=root/name;data=helpers.read_bounded(path,32*1024*1024)
  if digest(data)!=expected:raise ValueError('archive_hash')
  archives.append({'file':name,'sha256':expected,'bytes':len(data),'url':'https://www2.aueb.gr/users/ion/data/enron-spam/raw/'+relative})
  with gzip.open(path,'rb') as source:
   with tarfile.open(fileobj=ExpandedLimit(source,128*1024*1024),mode='r|') as archive:
    for count,m in enumerate(archive,1):
     if count>20000:raise ValueError('member_count')
     safe(m)
     if m.isdir():continue
     raw=archive.extractfile(m).read(m.size+1)
     if len(raw)!=m.size:raise ValueError('member_size')
     total+=len(raw)
     if total>256*1024*1024:raise ValueError('aggregate_limit')
     key=digest(raw)
     if key in records:
      if records[key]['label']!=label:raise ValueError('conflicting_raw_labels')
      continue
     target=messages/(key+'.eml')
     if target.exists() or target.is_symlink():
      if helpers.read_bounded(target,2*1024*1024)!=raw:raise ValueError('cached_message_drift')
     else:helpers.write_new(target,raw)
     records[key]={'id':key,'sha256':key,'bytes':len(raw),'label':label,'group':'enron_'+label,'path':'messages/'+key+'.eml','labelAuthority':'Official raw archive ham/spam directory labels'}
     if len(records)>30000:raise ValueError('record_count')
 manifest={'version':1,'source':'https://www2.aueb.gr/users/ion/data/enron-spam/readme.txt','terms':'Public Enron-Spam research corpus. Acknowledge Metsis, Androutsopoulos and Paliouras, CEAS2006. No raw redistribution, model upload, training or live mail sending.','scope':('Fixed official raw ham/spam archives listed in archives; no preprocessed view or classifier selection.' if TRAIN_MODE else 'First official raw ham and spam archives; no preprocessed view or classifier selection.'),'archives':archives,'records':sorted(records.values(),key=lambda r:r['id'])}
 data=(json.dumps(manifest,indent=2)+'\n').encode();target=root/'all.json'
 if target.exists() or target.is_symlink():
  if helpers.read_bounded(target,32*1024*1024)!=data:raise ValueError('manifest_drift')
 else:helpers.write_new(target,data)
 print(json.dumps({'uniqueRaw':len(records),'rawHam':sum(r['label']=='ham' for r in records.values()),'rawSpam':sum(r['label']=='spam' for r in records.values()),'expandedBytes':total,'manifestSha256':digest(data),'predictions':0}))
if __name__=='__main__':
 if sys.argv[1:]==['--self-check']:
  for name,type in [('../escape',tarfile.REGTYPE),('/escape',tarfile.REGTYPE),('link',tarfile.SYMTYPE),('device',tarfile.CHRTYPE)]:
   m=tarfile.TarInfo(name);m.type=type
   try:safe(m)
   except ValueError:pass
   else:raise AssertionError('unsafe_member_accepted')
  m=tarfile.TarInfo('bounded');m.size=2*1024*1024;safe(m);m.size+=1
  try:safe(m)
  except ValueError:pass
  else:raise AssertionError('oversized_member_accepted')
  from io import BytesIO
  stream=ExpandedLimit(BytesIO(b'test'),4);assert stream.read(4)==b'test'
  try:stream.read(1)
  except ValueError:pass
  else:raise AssertionError('custom_expansion_limit_ignored')
  print('6 bounded archive/expansion self-checks passed')
 else:
  if len(sys.argv)>2 and sys.argv[2]=='--train':
   SOURCES=[('farmer-d.tar.gz','ham','e7aedf0a0ace79f088ecbefeb2070999e5c4d874058150878d0d17d558af4d6f','ham/farmer-d.tar.gz'),('GP.tar.gz','spam','b3d60059c1d17d8cbc1c9f42c7070ad41768cf0c7efa7055bce9af96e40f3a5a','spam/GP.tar.gz')]
  prepare(Path(sys.argv[1]))
