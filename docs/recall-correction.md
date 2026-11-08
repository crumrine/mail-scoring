# Recall correction (DEV-1007)

Post-merge independent acceptance failed:547/1000spam and1/1000HAM. The candidate is not eligible for deployment. See `evidence/dev-1009/README.md` for immutable failed reports and `evidence/dev-1011/README.md` for the new untouched freeze. Earlier figures below describe source/TRAIN/observed regressions, not a passed release gate.

Rules-6/general-4 is source only. DEV-1008 supplies recoverable routing, DEV-1009
owns independent acceptance, and OPS-615 owns manual deployment. Actions and
Builds remain paused. No deletion, expiry, rescan, mail send, private capture,
attachment inspection, URL/DNS fetch or paid product AI.

The deployed actual MIME/projection/RPC/policy caught212/1000 observed Enron spam.
The788 misses comprise322 with fewer than20 selected clues,325 below the Fisher
cutoff,69 raw preflight exclusions,46 short bodies,15 feature ceilings,6 quoted
messages,4 other guards and1 projection/RPC failure. Of69 raw exclusions,68 were
within128KiB but contained NUL. DEV-1008 must track actual stream byte completeness
rather than infer it from NUL. Core control/quote/resource guards remain.

## Body evidence and legitimate-mail coverage

One fixed L2 logistic subject/body unigram TFIDF head replaces the Fisher/clue combiner.
Subject context is retained, but cannot replace the required body support.
Repetition never multiplies evidence.
Existing source/HTML/quote/control bounds,1000 combined word-position and1999
candidate-feature ceilings remain; the subject still consumes inspection budget.
At least five distinct positive-coefficient body words and the fixed margin are
required. Unsupported, limited, quoted or error outcomes never mean safe mail.

The first combined subject/body head passed public TRAIN CV but failed authored
short-ham controls. Positive-body support fixed those controls, but independent
review exposed a legitimate clinical notice scoring60. The reviewer subsequently
removed that case and approved with a limitation. That approval was rejected by
the author: the original failing case is retained with expected0. A body-only
candidate corrected it but failed3/20 broader routine-care notices, both plain and
HTML. That candidate was also rejected. All failure receipts remain under
`docs/evidence/dev-1007/rejected-*`; none establishes release readiness.

A later clinical-augmented body-only candidate passed all clinical controls but
misclassified one old Enron ham case after omitting useful negative subject
context. That candidate is also retained as rejected. A brief authored internal
meeting notice now checks useful subject context as well.

The clinical root gap was insufficient legitimate-mail representation: public ham
is largely corporate while pharmacy spam supplies medical vocabulary. A separate
frozen100-case original synthetic clinical TRAIN supplement supplies routine
prescription, formulary, dispensing, consultation, monitoring and benefits notices.
It is disjoint from the37 regression notices, never substitutes for independent
accuracy, and introduces no medical/topic whitelist or trusted-sender shortcut.
These TRAIN examples teach relative word weights; they do not bypass scoring.

The initial150-candidate fivefold TRAIN comparison (body versus subject/body words,
five C values, three difficult-ham weights and five cutoffs) selects one
subject/body head: C100, hard-ham weight20, cutoff.99.
TFIDF is fitted within each TRAIN fold. Nine-decimal quantized counts are2092TP,
0FP,5567TN,2245FN, including zero difficult-ham FP. These are development counts.
The cutoff is logit(.99), not a calibrated99% probability. Thirty-seven authored
regression notices remain expected0 in both plain text and HTML, including the
original rejected clinical case. No failed assertion or label was weakened.

A second independent review froze16 additional legitimate controls before scoring
(SHAa314f3d2796607d2ceada310e2bf9c4222d8bf04f2631796e2cabff71fe4ea2d).
Its Spanish appointment reminder failed plain and HTML. The cases and labels
remained unchanged and approval was blocked. All16 are now retained alongside
the earlier21 controls. The original and accentless Spanish versions remain
expected0 with partial/statistical_limit provenance.

An ASCII-word model must not infer confidence from fragments of unsupported
letters/combining marks or from mostly unfamiliar eligible body words. Compatibility
normalization is retained; unsupported letters/marks cause statistical abstention.
At least50% of distinct eligible body word features must be represented in the
model, in addition to five distinct positive body words. Low coverage is partial
with statistical_limit, never a safe verdict. This is representation checking,
not language identification; quoted/hidden text and existing limits still abstain.

The precision correction keeps the exact C100/hard-ham20/cut.99 coefficients from
2705d0e. Numeric bias/cutoff/weight digest
is recorded in training.json (full SHAefcf3625ce74ad461998661980eb70d74e18a71d0c701adb0352bcc94f182a6b).
A450-record TRAIN reference comparison includes50/65/80% coverage profiles.
Only the three profiles retaining that full head are eligible: changing weights
would introduce new positives after a precision fix. Within that constraint50%
maximizes TRAIN recall at0FP; unrestricted reference winners are recorded and
not adopted. The fitter asserts unchanged numeric coefficients. Bounded feature
observations remain available for the fixed fit, while a separate supported flag
controls prediction eligibility. Unsupported cases stay in counts as misses.

A paired old-data check compares4736 actual scorer results under the same
proposed compatible policy: zero newly positive cases. The updated scorer replay
catches537/1000 observed Enron spam with0/2603 ham quarantines across all old
Enron/SA cases. These are regressions, not joined caller or independent acceptance.

The model contains25439 own numeric word-hash/IDF/coefficient triples. No literal
words, ordered per-message features, raw corpus mail or third-party pretrained
weights are published. There is no runtime dependency, learning, feedback
training, ensemble or network operation. Historical context/Fisher reference
code remains for old reproduction tests but is absent from the current Worker.

Rules-6 uses the static `statistical_linear_spam` reason, maximum60. Engine0.1.0,
schema1 and RPC1 stay unchanged. Strict decoding preserves rules1–5 and their exact
historical reasons: generalized5-only, context4-only, statistical3-only,
linear6-only, GTUBE2–6. Unknown7 is refused. DEV-1008 permits generic automatic
routing only for the current model, preserving historical stored readability.

## Frozen data and reproduction

Original SA TRAIN2804 and public Enron TRAIN2000 remain fixed. Another5000 unused
farmer-d/GP/beck-s/BG cases were SHA-selected before fitting, excluding raw/body
fingerprints from all selected old tests/TRAIN and the entire reserved fresh
archive pair. Prior private-study fingerprints are exclusion-only, never training
or published results. The100 authored clinical TRAIN rows bring the total to9904:
5567ham/4337spam;9693 have inspectable projected text for fitting. Unknown/error
cases remain recorded. The37 regression notices never enter training.

- Original SA partition: `111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803`.
- Existing Enron TRAIN: `773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131`.
- Added public TRAIN: `e12fc4a6015350407d63925b9929f0cae3d4d93bc91d9d627aeddf03884f5b67`.
- Authored clinical TRAIN: `8241ee48539317a9834974202e767ef56e5648c164e499653e794d8ebe9ff75e`.
- Neutral TRAIN matrix: `1e86b9a7f97af06517a7bb00faeb42d5f4e6ba264678c7548e714a1b471dfd49`.
- Published model: `52c58c189621f5f1ad74d28103d18b803d609af5a8a48c6dab52239435652473`.

With existing frozen external TRAIN directories and locked Inbox606d0edee433fbf2aee517b1f1b61e631251a79a,
use Node24.15.0/ICU78.2 and PostalMime2.7.3:

```
node harness/evaluation/extract-linear-training.mjs /external/sa /external/enron-train /external/additional-train /installed/frozen-inbox /external/reproduced-features
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /installed/python3.12 harness/evaluation/compare-linear.py /external/reproduced-features/complete-training-features.json .artifacts/linear-comparison.json
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /installed/python3.12 harness/evaluation/train-linear.py /external/reproduced-features/complete-training-features.json .artifacts/linear-reproduction
```

Optional offline dependency versions are pinned in requirements-training.txt.
Extraction checks fixed manifests and every raw SHA/size, bounds reads, imports
neutral projection/guards only, denies fetches and asserts the exact output hash.
The fitter checks that matrix before use, fits TRAIN only, checks quantized CV,
and compares committed model bytes by default. `--write-model` is explicit local
development only. Ordered message features stay external. Default checks do not
install software or download corpora. The authored TRAIN source is original
synthetic content under this project's license; it contains no patient records.

Enron provenance: Metsis, Androutsopoulos and Paliouras, CEAS2006, [primary
README](https://www2.aueb.gr/users/ion/data/enron-spam/readme.txt). Raw data stays
external, is not redistributed and is never uploaded to language models. Published
selected metadata and own numeric coefficients do not relicense original mail.
Existing notices and SBOM remain required.

The old observed Enron and SA cohorts are regression only. The fresh kaminski-v/SH
cohort was frozen before development and remains unseen until both reviewed
merged sources are pinned by DEV-1009. Predeclared release gates: at least50%
fresh recall and20 absolute points over deployed rules-5 on the same cohort;
zero observed ham/hard-ham quarantines in every old/fresh/authored stratum; all
unavailable mail remains in denominators. Failed cohorts cannot be tuned away.

Zero observed FP does not promise zero future FP. Dated public corpora and
synthetic clinical examples do not establish modern clinical/mailbox accuracy.
Hosted CPU/cost, actual fresh provider inbound RPC and physical mail-client
recovery need separate authorized evidence. Unknown/error retains Inbox; folder
movement and Not spam recovery remain required.
