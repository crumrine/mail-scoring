# DEV-1002 contextual correction evidence

This root directory preserves revision0. Its review was stopped without a
verdict after an authored distinct-body evidence regression was reproduced.
Current corrected acceptance is in `revision1/`; no revision0 approval or
deployment is claimed.

Source/runtime, exact numerical model and checked private Worker artifact hashes
are in `receipt.json`. This is source work, not deployment. The original general-1
acceptance failed (3 hard-ham false positives); DEV-999 preserves that complete
first report, changes and every miss/false positive. All three observed core
regressions now return0 with no contextual-spam reason. Whole-corpus joined
acceptance remains separate.

General-2 uses PSF-attributed SpamBayes non-overlapping unigram/bigram tiling and
an original square-root-count prior for easy/difficult legitimate TRAIN strata.
The fixed prior was selected using TRAIN-only5foldCV; the pooled/equal prototypes
and all three estimator metrics are retained. Cutoff0.99/min20/max64, smoothing3,
minimum3documents, quoted/HTML/capability boundaries remain explicit. No held-out
words/labels enter the model; no cutoff grid, sample exclusion, allowlist or
per-message decision shortcut was added. Prior observed holdout is regression
only, not pristine independent evidence for this new design.

`training.json` records all original TRAIN read/eligible-ID hashes and numeric
model hash. `cross-validation.json` records the frozen numeric matrix hash.
`validation-only.json` is provisional scorer+projection coverage, not caller4
routing. First-failure regression scripts verify pinned original report/data,
actualMIME/coreRPC/currentdecoder, immutable caller projection hash, and zero
fetches, with only opaque IDs/static reason IDs returned. No raw corpus is stored
in this directory or uploaded to models.

`full-checks.log`: typecheck/build,43coregroups, workerd graph/capability spike,
22core removal/restored mutations,18allocation/growth cases, checkedprivate/
consumer builds, realworkerdRPC tests and8Worker removal/restored mutations pass.
`benchmark.json` and worker logs separate warm/cold/process timing; local wall
time and memory deltas do not establish hosted CPU/cost or peak allocation.
No test was skipped or assertion weakened. Schemas/SBOM/notices are regenerated.

Reproduce from the exact source with Node24.15.0 and pinned npm11.12.1:

```
node harness/evaluation/context-counts.mjs --self-check
node harness/evaluation/train-context.mjs /external/frozen-data /installed/inbox --write-model
node harness/evaluation/context-cross-validation.mjs .artifacts/context/training-features.json .artifacts/context/cross-validation.json
npm run check
npm run benchmark
npm run worker:benchmark
node scripts/context-fp-regressions.mjs /external/frozen-data /installed/inbox /external/first-failed-report.json /external/regressions.json
```

Source4 requires DEV-1003 compatible caller before its private Worker rollout;
legacy1/2/3 stored contracts remain readable. DEV-999 owns whole-pipeline paired
acceptance with honest data-reuse limits, and OPS-614 owns the independently
reviewed exact-artifact/plan and actual manual production verification. Actions
and automatic Builds stay paused. No live mail, deletion/rescan or runtime
network/AI/attachment processing was added.
