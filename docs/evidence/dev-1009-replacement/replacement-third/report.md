# Paired offline routing evaluation

Previously observed public corpora REGRESSION ONLY.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 62 | 0 | 1000 | 938 | 1 | 0.062 | 0 |
| candidate | 553 | 0 | 1000 | 447 | 1 | 0.553 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| holdout | baseline | 62 | 0 | 1000 | 938 | 0.062 |
| holdout | candidate | 553 | 0 | 1000 | 447 | 0.553 |

Replacement requires zero legitimate catches on every test and, on the fifth cohort, at least 50% recall and a gain of at least 20 points. Reference false positives remain recorded. Gate: PASSED.

Candidate misses remain 447. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
