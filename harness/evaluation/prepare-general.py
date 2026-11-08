# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
"""Bounded public corpus acquisition for disjoint general-spam experiments."""
from pathlib import Path, PurePosixPath
import bz2, hashlib, json, os, re, signal, stat, sys, tarfile, tempfile, urllib.request
from prepare import BASE, SOURCES, ExpandedLimit, digest, timeout

EXTRA = {
    '20030228_easy_ham_2.tar.bz2': 'b4bd3dc5ae5b40f38e99a0e41ad7d16b428b56e818e3a6ffa07330d62004dd38',
    '20050311_spam_2.tar.bz2': '44280a0e28bf7645b2279e8e42659271ad82c6f40bf8d364dbda7f1df344a765',
}

def read_bounded(path, limit):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, 'rb') as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode): raise ValueError('regular_file_required')
        data = source.read(limit + 1)
    if len(data) > limit: raise ValueError('file_limit')
    return data

def write_new(path, data):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644)
    with os.fdopen(descriptor, 'wb') as target: target.write(data)

def prepare(root):
    root = root.resolve()
    if any((p / '.git').exists() for p in [root, *root.parents]):
        raise ValueError('outside_git_required')
    root.mkdir(parents=True, exist_ok=True)
    messages = root / 'messages'
    if messages.is_symlink(): raise ValueError('output_symlink')
    messages.mkdir(exist_ok=True)
    records, archives, seen, total = [], [], {}, 0
    signal.signal(signal.SIGALRM, timeout)
    for name, expected in {**SOURCES, **EXTRA}.items():
        target = root / name
        if target.is_symlink(): raise ValueError('source_symlink')
        if target.exists():
            data = read_bounded(target, 8*1024*1024)
        else:
            signal.alarm(60)
            try:
                with urllib.request.urlopen(BASE+name, timeout=20) as response:
                    if not response.url.startswith(BASE): raise ValueError('source_origin')
                    data = response.read(8*1024*1024+1)
            finally: signal.alarm(0)
        if len(data)>8*1024*1024 or digest(data)!=expected: raise ValueError('source_hash')
        if not target.exists(): write_new(target, data)
        archives.append({'file':name, 'sha256':expected, 'bytes':len(data), 'url':BASE+name})
        if not name.endswith('.tar.bz2'): continue
        group = name.removesuffix('.tar.bz2')[9:]
        label = 'spam' if group.startswith('spam') else 'ham'
        with bz2.BZ2File(target) as source:
            with tarfile.open(fileobj=ExpandedLimit(source), mode='r|') as archive:
                for count, member in enumerate(archive, 1):
                    path = PurePosixPath(member.name)
                    if count>10000 or member.size>2*1024*1024: raise ValueError('member_limit')
                    if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk(): raise ValueError('unsafe_member')
                    if member.isdir(): continue
                    if not member.isfile(): raise ValueError('unsupported_member')
                    if not re.fullmatch(group+r'/[0-9]+\.[a-f0-9]{32}', member.name): continue
                    raw = archive.extractfile(member).read(member.size+1)
                    if len(raw)!=member.size: raise ValueError('member_size')
                    total += len(raw)
                    if total>128*1024*1024: raise ValueError('total_expanded_limit')
                    sample = digest(raw)
                    if sample in seen:
                        if seen[sample] != label: raise ValueError('conflicting_raw_labels')
                        continue
                    seen[sample] = label
                    target_message = messages / (sample+'.eml')
                    if target_message.is_symlink(): raise ValueError('message_symlink')
                    if target_message.exists():
                        if digest(read_bounded(target_message,2*1024*1024))!=sample: raise ValueError('message_hash')
                    else: write_new(target_message,raw)
                    records.append({'id':sample,'sha256':sample,'bytes':len(raw),'label':label,'group':group,'path':'messages/'+sample+'.eml'})
                    if len(records)>6500: raise ValueError('message_count')
    manifest = {'version':1,'source':BASE+'readme.html','terms':'Filter-development/testing offer; original sender copyrights retained. Raw mail stays external; never send live or upload to models.','archives':archives,'records':sorted(records,key=lambda r:r['id'])}
    data=(json.dumps(manifest,indent=2)+'\n').encode()
    target=root/'all.json'
    if target.is_symlink() or (target.exists() and (read_bounded(target,2*1024*1024)!=data)): raise ValueError('manifest_drift')
    if not target.exists(): write_new(target, data)
    print(json.dumps({'samples':len(records),'expandedBytes':total,'manifestSha256':digest(data)}))

if __name__=='__main__':
    if sys.argv[1:]==['--self-check']:
        from prepare import self_check
        self_check()
        assert len(EXTRA)==2 and all(len(value)==64 for value in EXTRA.values())
        with tempfile.TemporaryDirectory() as name:
            root=Path(name); sample=root/'sample'; sample.write_bytes(b'test')
            assert read_bounded(sample,4)==b'test'
            for target in [sample,root/'fifo']:
                if target!=sample: os.mkfifo(target)
                try: read_bounded(target,3)
                except ValueError: pass
                else: raise AssertionError('unsafe_or_oversized_file_accepted')
            try: write_new(sample,b'overwrite')
            except FileExistsError: pass
            else: raise AssertionError('existing_file_overwritten')
        raise SystemExit(0)
    if len(sys.argv)!=2: raise SystemExit('usage: prepare-general.py EXTERNAL_DIRECTORY')
    prepare(Path(sys.argv[1]))
