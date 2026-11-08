# Paired offline routing evaluation

Observed public diagnostic192/validation556/oldholdout1988 REGRESSION ONLY. Fresh independent acceptance required.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 0 | 0 | 1603 | 1133 | undefined | 0 | 0 |
| candidate | 290 | 0 | 1603 | 843 | 1 | 0.2559576345984113 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| diagnostic | baseline | 0 | 0 | 128 | 64 | 0 |
| diagnostic | candidate | 20 | 0 | 128 | 44 | 0.3125 |
| validation | baseline | 0 | 0 | 300 | 256 | 0 |
| validation | candidate | 65 | 0 | 300 | 191 | 0.25390625 |
| holdout | baseline | 0 | 0 | 1175 | 813 | 0 |
| holdout | candidate | 205 | 0 | 1175 | 608 | 0.2521525215252153 |

Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: PASSED. Actual gain: 25.22 percentage points.

Candidate misses remain 843. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Observed-data regression gate (does not establish independent release acceptance): PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
