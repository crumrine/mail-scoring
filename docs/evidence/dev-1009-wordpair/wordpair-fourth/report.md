# Paired offline routing evaluation

Fresh frozen untouched SH/kaminski-v,1000spam/1000ham. Fixed before development and predictions, deduplicated against all previous sources; original exclusions retained.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 188 | 1 | 999 | 812 | 0.9947089947089947 | 0.188 | 0.001 |
| candidate | 479 | 1 | 999 | 521 | 0.9979166666666667 | 0.479 | 0.001 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| holdout | baseline | 188 | 1 | 999 | 812 | 0.188 |
| holdout | candidate | 479 | 1 | 999 | 521 | 0.479 |

Predeclared recall >=50% and gain >=20 points on fresh cohort; zero observed HAM in BOTH variants and every corpus/partition/stratum/control. Observed corpora are regression only.
Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: FAILED. Actual gain: 29.10 percentage points.

Candidate misses remain 521. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: FAILED: one or more declared acceptance conditions failed; corrective source and fresh review required.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
