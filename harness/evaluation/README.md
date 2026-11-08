# Paired offline routing evaluation

DEV-990 compares the previously enabled filter source (Inbox `08b9245`, scorer
`2fab406`) with reviewed candidate Inbox `d498185` and runtime scorer `faa15bea`.
Full immutable pins are in `run.mjs`. The candidate includes the reviewed GTUBE,
plain-text URL and delivery/recovery conformance work. Later scorer documentation
commits leave the pinned runtime bytes unchanged. OPS-599 verifies actual live
versions separately before deployment.

Use Node 24, Python 3 on macOS/Linux, Git/tar, and the consumer's installed locked
dependencies. Acquisition and evaluation are separate commands:

```sh
python3 harness/evaluation/prepare.py --self-check
python3 harness/evaluation/prepare.py /absolute/external-data-directory
node harness/evaluation/run.mjs --self-check
node harness/evaluation/run.mjs /absolute/external-data-directory /absolute/inbox-repository /absolute/mail-scoring-repository /absolute/report-directory
```

Preparation accepts a directory outside Git checkouts. It downloads only the
official readme and three fixed SpamAssassin `20030228` public-corpus archives,
with pinned SHA-256 values, 8 MiB compressed bounds, 60-second download alarms,
64 MiB expanded bounds, 10,000-member and 2 MiB message bounds. It rejects unsafe
archive members and output symlinks, verifies existing files, then selects the
first 64 unique content hashes in each easy-ham, hard-ham and spam group. The
result is 192 unique messages (128 ham, 64 spam), with a fixed manifest hash and
independent corpus-directory labels. Selection never uses classifier results.
Fresh acquisition and cached preparation produce the same manifest.

The [original corpus readme](https://spamassassin.apache.org/old/publiccorpus/readme.html)
offers these messages for filter testing, retains the original senders'
copyrights, and forbids sending the corpus into live mail systems. Raw messages
and archives stay in the external directory. This repository contains authored
tools and content-free aggregate/hash evidence. No corpus content is uploaded
to models or copied into public fixtures. The 2003 sample has substantial age
and representativeness limits.

Evaluation is offline. It exports immutable production intake and scorer source,
uses actual PostalMime plus `assessArrival`, serialized `scoreRpc` and
`shouldQuarantine`, and forbids fetches. It has no mailbox mutation capability.
Raw-size/zero-byte preflight failures remain unavailable; parse/scorer failures
remain visible. Every sample stays in routing denominators. MIME parsing has
the inherited product limits. Real separate workerd service, R2/DO/REST/IMAP and
browser behavior are verified by the companion conformance suite, rather than
being simulated by this measurement command.

The machine-readable report includes all source/module hashes and versions,
labels/selection, confusion counts and correct undefined denominators, inspection
coverage, unavailable causes, score/reason/limit distributions, hard-ham metrics,
paired sample/evidence changes, and every miss/false positive by opaque hash.
Repeated evaluation in reverse order must produce identical per-sample results.
Inspection completeness and classification uncertainty are reported separately.
Retained mail remains insufficient evidence; it is never relabeled safe or used
as training truth. There is no training or threshold tuning.

Standard GTUBE installation controls and authored hard-ham contracts stay outside
real-corpus metrics. Authored ham covers security notices, receipts/newsletters,
ordinary links, new correspondents, Unicode and quoted/forwarded suspicious
content. A separately labeled authored userinfo-only miss reproduces the weak
signal observed in the corpus. Its expected current routing is Inbox, and its
spam truth label remains explicit as a known miss.

On this slice both source versions have TP=0, FP=0, TN=128, FN=64. One spam sample
adds `link_userinfo` evidence (0 to 15) without changing its folder decision.
Inspection is partial for 191 messages and unavailable for one hard-ham message
at raw preflight. All 64 spam misses remain in each variant's ledger. Precision
is undefined because neither version quarantines a real-corpus sample; recall
is zero. These figures demonstrate a detection gap in the current narrow rules.

The regression gate requires passing installation/hard-ham contracts and no
increase in observed ham quarantined, including the hard-ham subset. Existing
misses remain documented. A failing gate exits nonzero and requires corrective
source with fresh review on the same frozen inputs. Passing is bounded
source-regression evidence for OPS-599; the remaining manual review/deployment
gates and the observed detection limitations remain explicit.
