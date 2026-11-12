# Paired offline routing evaluation

Fresh frozen untouched fifth kitchen-l/GP research sample, 1,000 legitimate and 1,000 spam.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 211 | 0 | 1000 | 789 | 1 | 0.211 | 0 |
| candidate | 532 | 0 | 1000 | 468 | 1 | 0.532 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| holdout | baseline | 211 | 0 | 1000 | 789 | 0.211 |
| holdout | candidate | 532 | 0 | 1000 | 468 | 0.532 |

Replacement requires zero legitimate catches on every test and, on the fifth cohort, at least 50% recall and a gain of at least 20 points. Reference false positives remain recorded. Gate: PASSED.

Candidate misses remain 468. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
