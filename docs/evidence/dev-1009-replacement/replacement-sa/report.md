# Paired offline routing evaluation

Previously observed public corpora REGRESSION ONLY.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 290 | 0 | 1603 | 843 | 1 | 0.2559576345984113 | 0 |
| candidate | 475 | 0 | 1603 | 658 | 1 | 0.41924095322153576 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| diagnostic | baseline | 20 | 0 | 128 | 44 | 0.3125 |
| diagnostic | candidate | 26 | 0 | 128 | 38 | 0.40625 |
| validation | baseline | 65 | 0 | 300 | 191 | 0.25390625 |
| validation | candidate | 115 | 0 | 300 | 141 | 0.44921875 |
| holdout | baseline | 205 | 0 | 1175 | 608 | 0.2521525215252153 |
| holdout | candidate | 334 | 0 | 1175 | 479 | 0.4108241082410824 |

Replacement requires zero legitimate catches on every test and, on the fifth cohort, at least 50% recall and a gain of at least 20 points. Reference false positives remain recorded. Gate: PASSED.

Candidate misses remain 658. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Observed-data regression gate (does not establish independent release acceptance): PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
