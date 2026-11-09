# Paired offline routing evaluation

Previously observed public corpora REGRESSION ONLY.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 212 | 0 | 1000 | 788 | 1 | 0.212 | 0 |
| candidate | 551 | 0 | 1000 | 449 | 1 | 0.551 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| holdout | baseline | 212 | 0 | 1000 | 788 | 0.212 |
| holdout | candidate | 551 | 0 | 1000 | 449 | 0.551 |

Replacement requires zero legitimate catches on every test and, on the fifth cohort, at least 50% recall and a gain of at least 20 points. Reference false positives remain recorded. Gate: PASSED.

Candidate misses remain 449. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
