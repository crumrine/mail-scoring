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


## General-spam paired acceptance (DEV-999)

`--general` reuses the same actual MIME/intake/private-adapter/routing evaluator.
It compares the previously deployed Inbox D498/scorer FAA with independently
reviewed merged Inbox `5e694c7108e25437b5cd85f2cf1df6818f18e0ef` and scorer
`041e79c5f56880b8eff0e210968569461cb95fc0`. Full pins are immutable in run.mjs;
both repositories/pins and the actual installed PostalMime version are checked
before any real sample is classified. Legacy mode/pins remain reproducible.

Use exactly Node24.15.0; the synthetic MIME decoder profile is mandatory in
this mode. Scorer dependencies come from its committed npm lock (scripts off).
The model is frozen general-1 with cutoff0.99, minimum20 and maximum64 clues;
the runner neither trains nor adjusts it. The exact numerical model source is
hash checked; runtime/parser/lock, model/partition, source archives, complete
pipeline bundles, runner and authored fixture digests are recorded.

```
node harness/evaluation/run.mjs --general --self-check
node harness/evaluation/run.mjs --general /absolute/frozen-data /absolute/inbox /absolute/mail-scoring /absolute/report-output
```

Inputs are the already-frozen partitions.json with SHA256
`111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803`.
Of 6046 raw-message identities, only diagnostic192, validation556 and
holdout1988 (2736 total) enter evaluation. Train2804 and excluded506 do not.
Original192 cases are diagnostic, not independent performance evidence. Every
selected message remains in confusion denominators, including unavailable,
HTML-only and difficult legitimate mail. Frozen acquisition-time HTML-only
strata are reported separately from other messages and do not claim rendered
visibility. The holdout has 813 spam and1175 ham, including45 hard-ham cases.
Exact raw hashes/sizes/regular-file bounds are checked on every read; fetch is
forbidden and repeated reverse-order predictions must match for each sample.

The acceptance gate was declared before the first held-out predictions:
absolute held-out spam recall gain at least20 percentage points; no increase in
ham or hard-ham routing false positives in each of diagnostic, validation and
holdout; zero authored-ham quarantines. Small self-checks prove below-boundary
recall, per-partition legitimate-mail regressions and authored false positives
fail the gate. Installation/authored controls are separate from corpus metrics.
The historical baseline's authored inline-forward report false positives are
explicit known baseline defects (score45/Spam), fixed by candidate quoting or
unavailable-body handling; they are not relabeled spam to make controls pass.

The report retains every FP/FN, paired decision/evidence change, inspection and
uncertainty counts by opaque hash without raw content/subjects/addresses/URLs.
A failure exits nonzero; preserve it and return actual semantic defects to the
owning source ticket with fresh review. Do not tune against the held-out result,
remove difficult cases or weaken the gate. This dated public English-focused
sample does not establish current private mailbox accuracy. OPS-614 still needs
its separate reviewed manual deployment and target verification.


## Corrected model regression and independent acceptance

`--general` deliberately reproduces the first rules3/general1 candidate and its
failed legitimate-mail gate; immutable full results remain in
`docs/evidence/dev-999/first-failed`. Changing a model does not overwrite this
history. Historical source pins and authored fixtures are exported from Git;
current workspace fixture additions cannot silently alter old controls.

`--context` measures the final reviewed rules5/general3 scorer and compatible
caller on the original diagnostic192/validation556/observedholdout1988 cases.
These are regression data. In this mode `release.eligible` stays false even if
all numerical conditions pass; independent acceptance is still required.
`--fresh` measures the same exact frozen pair on2000 independently reserved
public Enron-Spam raw cases (1000ham/1000spam). Membership was frozen before
predictions and before final model fitting; explicit IDs and extraction metadata
are in `enron-holdout-manifest.json`. All selected cases, including unavailable
inspection, remain in confusion denominators. There is no separately labeled
hard-ham subset in this cohort; all its ham is gated and the old hard-ham
regression gate remains required.

The unchanged gate requires at least20percentage points of absolute independent
spam recall gain versus the production baseline D498/FAA; no additional ham
or old hard-ham false positives in every applicable partition; and zero authored
ham quarantines. Both final old-data regression and independent gates must pass,
with identical candidate/baseline pins. OPS-614 separately reviews the exact
release artifacts and plan, then verifies the actual manual deployment. A
single eligible slice or source merge does not establish production activation.

Enron-Spam provenance: V. Metsis, I. Androutsopoulos and G. Paliouras,
"Spam Filtering with Naive Bayes - Which Naive Bayes?", CEAS2006;
https://www2.aueb.gr/users/ion/data/enron-spam/readme.txt . Only the first official
raw ham/beck-s and spam/BG archives are used for this independent cohort; added
TRAIN uses different archives. Prior raw/body-feature matches and within-cohort
duplicates/conflicting labels were excluded by neutral extraction and SHA order
before any prediction, with a fixed1000perlabel quota. No classifier-dependent
selection, raw redistribution, raw-message model upload or live email sending.
Other supplemental study inputs/results remain private and do not enter model
training or this published independent measurement.

Use exactly Node24.15.0 and its mandatory synthetic decoder profile. The runner
never trains, changes thresholds, calls mailbox mutation APIs or fetches mail
URLs. The dated research samples do not establish current private-mailbox
accuracy, complete HTML visibility, authentication or hosted CPU/cost.

```
node harness/evaluation/run.mjs --general --self-check
node harness/evaluation/run.mjs --context /external/original-SA /installed/inbox /installed/scorer /external/regression-report
node harness/evaluation/run.mjs --fresh /external/reserved-Enron /installed/inbox /installed/scorer /external/independent-report
```

No prediction runs until both new source pins are actual independently reviewed
merged commits; placeholders fail before reading samples. The standard GTUBE
installation controls, original general-spam controls, authored pharmacy ad,
legitimate security/medical/financial notices, quoted/hiddenHTML and repeated
unknown-body-word controls stay separate from real-corpus metrics. Their labels
and known baseline misses/false positives are not changed to make tests pass.

Final frozen result: rules5/general3 with merged Inbox606d0ed catches20/64 diagnostic
spam,65/256 validation spam and205/813 observed old-holdout spam, with0/1603 ham
quarantined across these partitions. These cases are now regression evidence.
The untouched Enron holdout catches212/1000 spam versus0/1000 baseline, with
0/1000 ham quarantined. The fixed20-point improvement/no-added-ham-FP gates pass;
788 spam misses and all70 unavailable cases remain in the final denominator and
opaque ledger. Zero observed false positives is not a guarantee for current mail.
Exact reports, source/runtime pins and prior failure are in docs/evidence/dev-999.
No production deployment is asserted by this source acceptance report.
