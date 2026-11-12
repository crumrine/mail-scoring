# Paired offline routing evaluation

Fixed disjoint public data: diagnostic192, validation556 and independent holdout1988. Training/exclusions and authored/installation controls are excluded from metrics.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 0 | 0 | 1603 | 1133 | undefined | 0 | 0 |
| candidate | 629 | 3 | 1600 | 504 | 0.995253164556962 | 0.5551632833186231 | 0.0018714909544603868 |

| Partition | Variant | TP | FP | TN | FN | Recall |
| --- | --- | --- | --- | --- | --- | --- |
| diagnostic | baseline | 0 | 0 | 128 | 64 | 0 |
| diagnostic | candidate | 38 | 1 | 127 | 26 | 0.59375 |
| validation | baseline | 0 | 0 | 300 | 256 | 0 |
| validation | candidate | 138 | 0 | 300 | 118 | 0.5390625 |
| holdout | baseline | 0 | 0 | 1175 | 813 | 0 |
| holdout | candidate | 453 | 2 | 1173 | 360 | 0.5571955719557196 |

Predeclared held-out recall gain >=20 percentage points, no ham/hard-ham FP increase in every partition and zero authored-ham false positives: FAILED. Actual gain: 55.72 percentage points.

Candidate misses remain 504. All sample changes and misses/false positives are retained by opaque content hash in report.json.

The 2003 corpus is dated. These figures measure routing on this frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: FAILED: one or more declared acceptance conditions failed; corrective source and fresh review required.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
