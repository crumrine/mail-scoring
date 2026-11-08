# Paired offline routing evaluation

Fresh frozen untouched SH/kaminski-v,1000spam/1000ham. Fixed before development and predictions, deduplicated against all previous sources; original exclusions retained.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 62 | 0 | 1000 | 938 | 1 | 0.062 | 0 |
| candidate | 556 | 1 | 999 | 444 | 0.9982046678635548 | 0.556 | 0.001 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| holdout | baseline | 62 | 0 | 1000 | 938 | 0.062 |
| holdout | candidate | 556 | 1 | 999 | 444 | 0.556 |

Predeclared recall >=50% and gain >=20 points on fresh cohort; zero observed HAM in BOTH variants and every corpus/partition/stratum/control. Observed corpora are regression only.
Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: FAILED. Actual gain: 49.40 percentage points.

Candidate misses remain 444. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: FAILED: one or more declared acceptance conditions failed; corrective source and fresh review required.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
