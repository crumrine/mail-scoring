# Recall correction (DEV-1007)

Rules-6/general-4 is source only. DEV-1008 supplies compatible recoverable routing,
DEV-1009 owns independent acceptance, and OPS-615 owns manual deployment. Actions
and automatic Builds remain paused. No deletion, expiry, historical rescan, mail
send, private capture, attachment inspection, URL/DNS fetch or paid product AI.

The old actual MIME/projection/RPC/policy evaluation caught 212/1000 Enron spam.
Its 788 misses comprise 322 with fewer than20 selected clues,325 below the Fisher
cutoff,69 raw preflight exclusions,46 short bodies,15 feature ceilings,6 quoted
messages,4 other guards and1 projection/RPC failure. Of the69 raw exclusions,
68 were within128KiB but contained NUL. The caller must track actual stream byte
completeness rather than infer it from NUL; DEV-1008 owns that correction. Core
text control, quote and resource guards remain authoritative.

## One fixed model, supported body evidence

One L2 logistic unigram TFIDF head replaces the runtime Fisher/clue combiner.
Unique words cannot multiply evidence through repetition. TRAIN-fold IDF, L2
normalization, C100, hard-ham loss weight20 and logit(.99) were selected in a finite
150-candidate fivefold TRAIN comparison. The number is a margin threshold, not
calibrated confidence. Existing normalized source/HTML/quote/control limits,
1000 word-position and1999 candidate-feature ceilings remain. At least five
distinct positive-coefficient BODY words are required: a strong subject or
unknown/repeated body cannot satisfy the support guard.

An initial known-body-only guard failed two authored short legitimate-mail unit
controls despite zero TRAIN-CV false positives. That rejected checkpoint and
failure logs are retained; assertions and labels were unchanged. The supported
body guard corrects that defect. Quantized fivefold TRAIN counts are2288TP,
0FP,5467TN,2049FN, including zero hard-ham FP. These are development counts,
not independent accuracy. The old observed Enron and SA cohorts are regression
only. The newly frozen kaminski-v/SH cohort remains unseen until both reviewed
merged sources are pinned for DEV-1009. Its predeclared gate is at least50%
recall and20 absolute points over deployed rules-5 on the same cohort, with zero
observed legitimate-mail quarantines in every regression/acceptance stratum.
Unavailable cases remain in denominators. A failed cohort cannot be tuned away.

The model contains25429 own numeric word-hash/IDF/weight triples, nine-decimal
coefficients, bias2.383994269 and cutoff4.59511985. No literal words, ordered
per-message features, third-party pretrained weights or raw mail are published.
The old context/Fisher implementation remains a historical reference for earlier
reproduction tests; it is absent from the current Worker graph. No runtime
dependency, learner, feedback training or second classification head is added.

Rules-6 returns only the static `statistical_linear_spam` reason, maximum60.
Engine0.1.0/schema1/RPC1 stay unchanged. Strict decoding preserves rules1–5 and
their exact historical reasons; generalized evidence is5-only, context4-only,
original statistical3-only, linear6-only, GTUBE2–6. Unknown7 fails closed.

## Frozen TRAIN and reproduction

Original SA TRAIN2804 and separate public Enron TRAIN2000 are retained. Another
5000 unused public farmer-d/GP/beck-s/BG messages were selected by neutral SHA
ordering before fitting, excluding raw/body fingerprints from all selected old
tests, existing TRAIN and the entire reserved fresh archive pair. Prior private
study fingerprints are exclusion-only, never training or published results.
All9804 frozen members remain recorded;9593 have inspectable raw/projected text
for fitting. Known incomplete files are never treated as safe or successful.

Partition hashes:

- Original SA: `111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803`.
- Existing Enron: `773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131`.
- Added TRAIN manifest: `e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67`.
- Neutral TRAIN matrix: `5659424c5f135cc873eba6e7124def0983db07662730533563826cc0864822aa`.
- Published model: `65ec78614d2c7b231af3d416519f31ca12f21fba03de7d07549f8c32ee0a5528`.

With existing frozen external TRAIN directories and a locked Inbox checkout at
606d0edee433fbf2aee517b1f1b61e631251a79a, use Node24.15.0/ICU78.2 and PostalMime2.7.3:

```
node harness/evaluation/extract-linear-training.mjs /external/sa /external/enron-train /external/additional-train /installed/frozen-inbox /external/reproduced-features
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /installed/python3.12 harness/evaluation/compare-linear.py /external/reproduced-features/complete-training-features.json .artifacts/linear-comparison.json
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /installed/python3.12 harness/evaluation/train-linear.py /external/reproduced-features/complete-training-features.json .artifacts/linear-reproduction
```

Optional offline training versions are pinned in requirements-training.txt.
Extraction checks fixed manifests and every raw SHA/size, bounds reads, imports
neutral projection/guards only, denies fetches and asserts the exact matrix hash.
The fitter checks that matrix before use, learns only TRAIN folds, checks metrics,
and compares committed model bytes by default. `--write-model` is explicit local
development only. Ordered numeric message features stay external. No package
installation or corpus download occurs in the default check.

Enron provenance: Metsis, Androutsopoulos and Paliouras, CEAS2006, [primary
README](https://www2.aueb.gr/users/ion/data/enron-spam/readme.txt). Raw mail is
external and is neither redistributed nor uploaded to language models. Public
selected IDs/labels, own aggregate coefficients and aggregate evidence do not
relicense original messages. Existing notices and SBOM remain required.

Zero observed false positives does not promise zero future false positives.
Public corpora are dated. Hosted CPU/cost, actual provider inbound execution and
physical mail-client recovery require their own authorized evidence. Folder
movement and Not spam recovery remain required; unknown/error retains Inbox.
