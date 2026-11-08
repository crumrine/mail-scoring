# Copyright (c) 2026 Brian Crumrine
# SPDX-License-Identifier: Apache-2.0
"""Prepare the fixed offline SpamAssassin slice outside Git repositories."""
from pathlib import Path, PurePosixPath
import bz2, hashlib, io, json, re, signal, sys, tarfile, tempfile, urllib.request

BASE = "https://spamassassin.apache.org/old/publiccorpus/"
SOURCES = {
    "readme.html": "9f8cc0c8be6f32b25226d3ece26da775a6e008581b8fb061a679e3acee6b64be",
    "20030228_easy_ham.tar.bz2": "2b7b65904bcfcc31d2b5f51946f2d261370b257402cbbd62930b46ab83367438",
    "20030228_hard_ham.tar.bz2": "ce2ce67880643dbde65ea7f85bffbfe4417349c4bd80b6b0de56262ae6b0a9c9",
    "20030228_spam.tar.bz2": "c08debc32413804949a866be45ef78195cec2cbafd1da744ed76cdb860589743",
}
MANIFEST_SHA = "4ff6356a2a674467d1d8ea6f97adf11d0cce04e12d03e6e22ea2f1b8e6ab7354"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def timeout(_signum, _frame):
    raise TimeoutError("download_timeout")

class ExpandedLimit:
    def __init__(self, source, max_bytes=64 * 1024 * 1024):
        self.source, self.total, self.max_bytes = source, 0, max_bytes

    def read(self, size):
        if size < 0 or self.total + size > self.max_bytes:
            raise ValueError("expanded_limit")
        data = self.source.read(size)
        self.total += len(data)
        return data

def prepare(root):
    root = root.resolve()
    if any((p / ".git").exists() for p in [root, *root.parents]):
        raise ValueError("choose_directory_outside_git")
    root.mkdir(parents=True, exist_ok=True)
    messages = root / "messages"
    if messages.is_symlink():
        raise ValueError("unsafe_output")
    messages.mkdir(exist_ok=True)
    sources = []
    signal.signal(signal.SIGALRM, timeout)
    for name, expected in SOURCES.items():
        target = root / name
        if target.is_symlink():
            raise ValueError("unsafe_output")
        if target.exists():
            if target.stat().st_size > 8 * 1024 * 1024:
                raise ValueError("download_limit")
            data = target.read_bytes()
        else:
            signal.alarm(60)
            try:
                with urllib.request.urlopen(BASE + name, timeout=20) as response:
                    if not response.url.startswith(BASE):
                        raise ValueError("unexpected_source")
                    data = response.read(8 * 1024 * 1024 + 1)
            finally:
                signal.alarm(0)
        if len(data) > 8 * 1024 * 1024 or digest(data) != expected:
            raise ValueError("source_hash_or_limit")
        if not target.exists():
            target.write_bytes(data)
        sources.append({"file": name, "url": BASE + name, "bytes": len(data), "sha256": digest(data)})
    records, seen = [], {}
    for group in ["easy_ham", "hard_ham", "spam"]:
        candidates, count = [], 0
        with bz2.BZ2File(root / ("20030228_" + group + ".tar.bz2")) as source:
            with tarfile.open(fileobj=ExpandedLimit(source), mode="r|") as archive:
                for member in archive:
                    count += 1
                    if count > 10000 or member.size > 2 * 1024 * 1024:
                        raise ValueError("member_limit")
                    path = PurePosixPath(member.name)
                    if path.is_absolute() or ".." in path.parts or member.issym() or member.islnk():
                        raise ValueError("unsafe_member")
                    if member.isdir():
                        continue
                    if not member.isfile():
                        raise ValueError("unsupported_member")
                    if not re.fullmatch(group + r"/[0-9]+\.[a-f0-9]{32}", member.name):
                        continue
                    data = archive.extractfile(member).read(member.size + 1)
                    if len(data) != member.size:
                        raise ValueError("member_size")
                    sample_id = digest(data)
                    label = "spam" if group == "spam" else "ham"
                    if sample_id in seen and seen[sample_id] != label:
                        raise ValueError("conflicting_labels")
                    seen[sample_id] = label
                    candidates.append((sample_id, data, label))
        selected = set()
        for sample_id, data, label in sorted(candidates):
            if sample_id in selected:
                continue
            selected.add(sample_id)
            target = messages / (sample_id + ".eml")
            if target.is_symlink() or (target.exists() and (not target.is_file() or target.stat().st_size > 2 * 1024 * 1024 or digest(target.read_bytes()) != sample_id)):
                raise ValueError("unsafe_existing_message")
            if not target.exists():
                target.write_bytes(data)
            records.append({"id": sample_id, "sha256": sample_id, "bytes": len(data),
                            "label": label, "group": group, "path": "messages/" + sample_id + ".eml",
                            "labelAuthority": "SpamAssassin public corpus directory; 20030228 dataset"})
            if len(selected) == 64:
                break
    if len(records) != 192 or len({r["id"] for r in records}) != 192:
        raise ValueError("selection_count_or_duplicate")
    manifest = {"version": 1, "source": BASE + "readme.html",
                "selection": "64 unique SHA256-sorted messages per group; no classifier-based selection",
                "usage": "Offline filter testing offered by source. Sender copyrights retained. Raw messages held outside public repositories. Never send into live mail.",
                "archives": sources, "records": sorted(records, key=lambda r: r["id"])}
    data = (json.dumps(manifest, indent=2) + "\n").encode()
    if digest(data) != MANIFEST_SHA:
        raise ValueError("manifest_drift")
    target = root / "manifest.json"
    if target.is_symlink() or (target.exists() and (not target.is_file() or target.stat().st_size > 256 * 1024 or target.read_bytes() != data)):
        raise ValueError("unsafe_existing_manifest")
    target.write_bytes(data)
    print(json.dumps({"samples": 192, "ham": 128, "spam": 64, "manifestSha256": digest(data)}))

def self_check():
    def rejects(expected, action):
        try:
            action()
        except ValueError as error:
            assert str(error) == expected
        else:
            raise AssertionError(expected)

    bounded = ExpandedLimit(io.BytesIO(b"fixture"))
    assert bounded.read(7) == b"fixture" and bounded.total == 7
    rejects("expanded_limit", lambda: bounded.read(64 * 1024 * 1024))
    rejects("expanded_limit", lambda: bounded.read(-1))
    with tempfile.TemporaryDirectory(prefix="spam-preparation-check-") as name:
        root = Path(name)
        (root / ".git").mkdir()
        rejects("choose_directory_outside_git", lambda: prepare(root))
        (root / ".git").rmdir()
        (root / "messages").symlink_to(root, target_is_directory=True)
        rejects("unsafe_output", lambda: prepare(root))
        (root / "messages").unlink()
        (root / "readme.html").write_bytes(b"tampered")
        rejects("source_hash_or_limit", lambda: prepare(root))
    print(json.dumps({"passed": True, "cases": ["expanded_bytes", "expanded_limit", "unbounded_read", "git_directory", "output_symlink", "source_hash"]}))

if __name__ == "__main__":
    if sys.argv[1:] == ["--self-check"]:
        self_check()
        raise SystemExit(0)
    if len(sys.argv) != 2:
        raise SystemExit("usage: python3 prepare.py EXTERNAL_DATA_DIRECTORY")
    prepare(Path(sys.argv[1]))
