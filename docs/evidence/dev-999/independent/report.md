# Paired offline routing evaluation

Fresh independent frozen Enron-Spam raw holdout2000 (1000ham/1000spam), before predictions; prior raw/body-feature matches excluded, membership explicit and fixed.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 0 | 0 | 1000 | 1000 | undefined | 0 | 0 |
| candidate | 212 | 0 | 1000 | 788 | 1 | 0.212 | 0 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| holdout | baseline | 0 | 0 | 1000 | 1000 | 0 |
| holdout | candidate | 212 | 0 | 1000 | 788 | 0.212 |

Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: PASSED. Actual gain: 21.20 percentage points.

Candidate misses remain 788. All sample changes and misses/false positives are retained by opaque content hash in report.json.

These research corpora are dated. These figures measure routing on the frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: PASSED on the declared frozen inputs.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
