# Word-pair precision correction (DEV-1017)

Rules-9/general-7 is rejected by the [fourth paired study](evidence/dev-1009-wordpair/README.md). Rules-6 and8
each caught legitimate mail in independent acceptance; rules-7 missed the fixed
recall gate. Those failures, models and reports remain archived and none may be
deployed or used for rollback. Production remains the approved rules-5 pair.
DEV-1016's independently reviewed merge ac801bf froze the fourth cohort before
this classifier work. Its manifest remains
`1e9b81b5275989be10b5685695700ccc3a92ee163517fd45eedf0bd92395e15d`;
there are zero fourth-cohort predictions during source development and review.

## Correction and limits

The third failed legitimate case parsed normally and had sufficient known BODY
words. Numeric-only diagnosis showed that removing its subject did not correct
either correlated unigram margin. Its adjacent-word features were ignored.
No public message text, addresses, subjects, URLs or literal words were read into
the reviewer, published, used as exceptions or added to training.

Replace the two correlated unigram heads with one fixed binary word and adjacent
word-pair TF-IDF logistic model. Reuse the existing bounded extractor: pairs never
cross sources or skipped address/URL chunks; 1,000 word positions and1,999 feature
positions remain the ceilings. Duplicate features contribute once. Negative
pair evidence now affects the margin instead of being discarded. There is no
runtime dependency, network, learning, corpus identifier, allowlist or topic rule.

For each positive existing feature, accumulate its contribution at both distinct
incident words (once for a self-pair). Subtract the two largest word totals from
the dot product, retaining every negative feature and the original norm. A shared
pair can be subtracted twice, conservatively. Require a positive remaining dot
and the unchanged logit(.99/.01) cutoff. This is a lower bound on removing any
two words' existing incident features: fewer positive terms are removed, removing
negative terms only raises the dot, and a smaller positive denominator raises
the margin. This is **not** a guarantee about edited text that creates new pairs,
or a calibrated confidence probability. The static reason states the actual
discounting operation.

At least five distinct positive unigram BODY words and50%known BODY vocabulary
remain mandatory. Strong subjects cannot supply body support. Supported letters,
quotes/forwards, normalization, raw/source/HTML/control-character budgets,
completeness, preferences and deterministic rules retain their guards. Abstention
and unavailable mean incomplete inspection, never proof of safety.

## TRAIN-only selection and reproducibility

Only the frozen matrix
`1e86b9a7f97af06517a7bb00faeb42d5f4e6ba264678c7548e714a1b471dfd49`
is read:9,904original rows,5,567HAM/4,337spam,9,693fit-eligible. Existing source
rights and clinical TRAIN provenance are unchanged. No observed/heldout row or
review control enters TRAIN. Every row and unavailable miss stays in denominators.

Each fixed SHA fold builds its own vocabulary and IDFs from its training folds.
Keep all unigram document frequencies>=3 and highest-frequency adjacent pairs
withDF>=3 up to50,000total; pair ties use numeric first/second hashes. Binary
features, L2norm, pinned liblinear/seed7151/tolerance1e-7/max2,000iterations and
nine-decimal quantization are fixed. Python3.12.13 and the installed pinned
scientific stack in requirements-training.txt are used without new packages.

Before fitting, C[.001,.01,.1,1,10,100,1000] ×hard-HAM[1,5,10,20,50] was declared.
Select maximum robust fivefold TP among zero HAM/hard-HAM FP, ties lower C then
higher hard-HAM weight, requiring improvement over the previous1,975TP/0FP.
That35-point search failed: best1,930TP/0FP. The original failed receipt and log
remain in evidence/dev-1017. Before more fits, the TRAIN-only extension
C[2000,5000,10000] ×the same weights was declared. All50candidates are retained;
C2000/H10 wins with2,058TP/0FP/5,567TN/2,279FN. Its unguarded2,698TP/5FP result
shows why the guard is necessary. Larger-C candidates with legitimate catches
are rejected. The same cutoff, body support, bounds and gates were not weakened.

The final50,000entries contain25,439unigrams/24,561pairs as
`[firstHash,secondHashOrMinusOne,idf,weight]`. Model source SHA
`ce506fc71c7b465ccf2fef1218c821739c381509c93abd7f8a98ec4da516d052`;
canonical bias/entries SHA
`55716233cf854b8ca2d4156d1f198b7d96fd22b0b9b8532a4b20c377b6db5be8`.
Full grid SHA`d9105721552555568fd4f387654bcda5029190dc93fe6a201ac81af86c2cbfae`.

Reproduce with the installed pinned Python, one BLAS/OMP thread:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /installed/python3.12 harness/evaluation/train-context-linear.py /external/complete-training-features.json /external/new-output
```

Ordinary reproduction asserts byte equality to the current model. Explicit
`--write-model` generates it. The previous train-linear.py and robust-refit.md
describe the rejected rules-8 source and must be run only at that historical pin.

## Verification and release sequence

All119frozen authored legitimate subjects/bodies/labels are retained byte for
byte and checked in plain text and escaped HTML as valid current partial zero
scores. New numerical tests isolate negative-pair evidence, word-incident losses,
two-word versus one-word discount, deduplication, body support and resource
bounds. Obsolete two-head reference arithmetic is replaced by current one-head
arithmetic; historical source/tests/results remain in Git. Genuine legitimate
cases and the historical authored SPAM-prefix abstentions are preserved.

Observed CORE replay preserves all10,736cases, including5,603HAM, and catches0HAM.
Spam counts: SA474/1,133; original Enron525/1,000; firstSH464/1,000;
secondSH449/1,000; thirdSH499/1,000. Both earlier false positives abstain. No
sampling, labels, unavailable cases or failures are dropped. The portable
reproducer uses actual MIME/projection/serialized RPC plus an explicitly proposed
rules9/reason mapping to the old policy; this is not joined new-caller acceptance.
These observations do not select the TRAIN model or restore untouched status.

Engine0.1.0/schema1/RPC1 remain. New evidence is valid only under rules-9;
historical reasons remain valid only at their exact versions1–8. GTUBE works at
2–9; unknown10 is rejected. DEV-1018 owns the compatible caller/policy8,
historical recovery, current9-only generic routing and nine actual Workers.
Full checks, schema/SBOM, meaningful mutants, actual private Worker capabilities,
growth, benchmarks and independent exact-head review precede normal merge.

Both reviewed merged sources must pass all FIVE earlier regressions before
DEV-1009 makes the first fourth-cohort predictions. Unchanged gates:>=50%fresh
recall AND>=20absolute points over deployed606d/5ed on that same cohort, zero
observed HAM both variants/every old/fresh/authored stratum, all selected misses
and unavailable cases retained. OPS-615 alone owns independently reviewed
caller-first manual release and actual-target artifact/settings/100% receipts.
Actions/Builds stay paused. No new mail, private capture, historical rescan,
folder mutation, deletion/rejection, paid AI or mail-URL/DNS lookup is added.
Dated balanced research data and zero observed FP cannot guarantee no future FP.
