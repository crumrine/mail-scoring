# Paired offline routing evaluation

Previously observed public corpora REGRESSION ONLY.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 290 | 0 | 1603 | 843 | 1 | 0.2559576345984113 | 0 |
| candidate | 534 | 0 | 1603 | 599 | 1 | 0.471315092674316 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| diagnostic | baseline | 20 | 0 | 128 | 44 | 0.3125 |
| diagnostic | candidate | 28 | 0 | 128 | 36 | 0.4375 |
| validation | baseline | 65 | 0 | 300 | 191 | 0.25390625 |
| validation | candidate | 126 | 0 | 300 | 130 | 0.4921875 |
| holdout | baseline | 205 | 0 | 1175 | 608 | 0.2521525215252153 |
| holdout | candidate | 380 | 0 | 1175 | 433 | 0.46740467404674046 |

Predeclared recall >=50% and gain >=20 points on fresh cohort; zero observed HAM in BOTH variants and every corpus/partition/stratum/control. Observed corpora are regression only.
Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: PASSED. Actual gain: 21.53 percentage points.

Candidate misses remain 599. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Observed-data regression gate (does not establish independent release acceptance): PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
