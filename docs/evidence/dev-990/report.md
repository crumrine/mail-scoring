# Paired offline routing evaluation

Fixed public-corpus slice: 192 messages, 128 ham and 64 spam. Standard installation controls are excluded.

| Variant | TP | FP | TN | FN | Precision | Recall | False-positive rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 0 | 0 | 128 | 64 | undefined | 0 | 0 |
| candidate | 0 | 0 | 128 | 64 | undefined | 0 | 0 |

Candidate misses remain 64. All sample changes and misses/false positives are retained by opaque content hash in report.json.

The 2003 corpus is dated. These figures measure routing on this frozen slice. Inspection status and insufficient-evidence outcomes are reported separately.

Release regression gate: no observed increase in ham quarantined on this frozen slice.

Source pins, runtime, ordinary threshold 45, coverage, score/rule/limit distributions, hard-ham subset and separate controls are in report.json.
