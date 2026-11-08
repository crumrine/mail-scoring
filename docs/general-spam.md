# General spam evidence

## Current contextual correction (DEV-1002, source only)

The first DEV-999 paired measurement of rules-3/general-1 caught 629/1133 spam
but wrongly flagged 3/1603 legitimate messages. On its original holdout, it caught
453/813 spam and flagged2/1175 ham. The no-ham-regression gate failed; general-1
was **not deployed**. Its complete first report/misses/false positives are
preserved by DEV-999. That observed holdout is now regression evidence, not a
pristine independent test for this correction. No threshold, truth label or
sample exclusion was changed to erase the failure.

Rules-4/general-2 adds adjacent-word context and non-overlapping clue selection,
adapted from the same pinned PSF SpamBayes classifier.py `_getclues` implementation
(lines377-444). A word position can contribute to only one selected unigram or
bigram. Duplicate clues count once. Pair identities store two numeric word hashes,
with -1 marking a unigram, avoiding a second pair-hash collision domain. There
are no literal words, phrases, message text or per-message sequences in the model.

Training reads **only** the original fixed TRAIN partition. Runtime never learns
from mail, folders or preferences. The 1000-word-position cap excludes additional
long training inputs and adds explicit statistical uncertainty at inference;
there are at most1999 candidate features and64 selected clues. Subject/body and
omitted URL/address chunks do not form artificial crossing pairs. HTML/quote,
source, output and capability boundaries remain unchanged.

General-2 contains22443 aggregate records from2353 easy-ham,66 difficult-ham and320
spam training documents. Each feature counts once per document and needs at
least3 documents. Ham frequency uses the fixed square-root-count mixture:
`hardWeight = sqrt(nHard)/(sqrt(nEasy)+sqrt(nHard))`;
`hamFrequency = (1-hardWeight)*easyCount/nEasy + hardWeight*hardCount/nHard`.
The spam frequency, Robinson strength3/neutral0.5, clamp0.01..0.99, cutoff0.99,
minimum20 clues and maximum64 are unchanged. No arbitrary fitted mixture or
message/header/format exception is used.

This original mixture estimator was selected using5-fold hash-split TRAIN-only
cross-validation on the frozen numeric matrix, comparing three declared methods.
Pooled ham produced TP223/FP2/TN2453/FN109; equal ham strata TP91/FP0/TN2455/FN241;
square-root counts TP168/FP0/TN2455/FN164. These are development observations, not
independent acceptance. The selected method's previous validation-only scorer
check detects78/256 spam with0/300 ham flagged; it does not prove actual caller
routing or fresh held-out performance. Prototype models, CV results and first
failures remain preserved. No held-out word list or label entered training.

Rules-4 emits `statistical_context_spam`, capped60. Strict decoding retains the
old rules-3/general-1 reason and older assessments, but rejects a new contextual
reason under any older declared version. DEV-1003 owns compatible caller-first
integration and prevents automatic fallback to the failed general-1-only path.
GTUBE/ordinary phishing/preferences/recoverable delivery remain separate.
DEV-999 owns corrected actual-pipeline acceptance and its honest data-reuse
limits; OPS-614 is gated on reviewed merged correction/integration and passing
acceptance. This source change is not a deployment.

Reproduce with exact Node24.15.0, pinned locked dependencies and external data:

```
node harness/evaluation/context-counts.mjs --self-check
node harness/evaluation/train-context.mjs /external/frozen-data /installed/inbox --write-model
node harness/evaluation/context-cross-validation.mjs .artifacts/context/training-features.json .artifacts/context/cross-validation.json
npm run check
npm run sbom
```

The context training receipt records exact TRAIN read/eligible ID hashes,
model/partition/runtime identities, document totals and zero network attempts.
The numerical model source is SHA256
`c5cdbff4d63b98e9689013d6b9934635f445736657c65d854e867e6dd00a117c`;
the prior/inference source is separately pinned by the reviewed commit. Original
corpus rights, parser licenses and the full PSF license below remain applicable.

## Historical general-1 development (DEV-997)


The previous rules were a narrow phishing detector. On DEV-990's 192-message
known diagnostic slice, 34/64 spam messages had only HTML, which was omitted.
The other 30 mostly lacked the few sensitive-request/identity combinations.
61 spam messages scored zero, two scored 10 and one scored 15; none routed to
Spam. The pipeline was running, but it lacked general spam coverage.

`rules-3` adds bounded inert HTML lexical text and a fixed statistical content
signal. This source change requires the compatible caller in DEV-998 and the
independent evaluation in DEV-999. OPS-614 owns the separately reviewed manual
rollout. Do not deploy this scorer ahead of a caller accepting rules-3. Old
rules-1/rules-2 assessments remain readable; new evidence under old declared
versions is rejected. The ordinary 45-point phishing policy is unchanged here.
The scorer has no mailbox or folder capability.

## Reuse and provenance

HTML uses exactly `htmlparser2` 10.0.0 (MIT), installed from the npm registry
with lifecycle scripts disabled. Dependencies and integrity are pinned in the
lock and SBOM; complete installed licenses are in THIRD_PARTY_NOTICES.md.
Only the bundled pure parser graph is permitted. Actual workerd tests deny
network/native initialization and require the same explicit module allowlist.
No upstream engine, native scanner, Python runtime, database or model is installed.

The numeric Fisher combination in `vendor/chi.ts` adapts SpamBayes
`classifier.py` and `chi2.py` at
`8ae169fde78371780019db5b7b7acfb4950bab8f`, under its PSF license. The complete
license, copyright and change summary are retained in THIRD_PARTY_NOTICES.md
and docs/spambayes-LICENSE.txt. The bounded tokenizer, model preparation,
static evidence and routing integration are original work. No URL slurping,
upstream tokenizer, persistent classifier, learning from preferences or live
self-training is included.

Data comes from the official Apache SpamAssassin public-corpus developer/testing
offer at https://spamassassin.apache.org/old/publiccorpus/readme.html . That offer
retains original senders' copyrights and forbids sending the corpus into a live
mail system. The five fixed archives are the 20030228 easy_ham, hard_ham, spam,
easy_ham_2 and corrected 20050311 spam_2. No email corpus, literal token list,
addresses, subjects, message sequences or original message text is redistributed.
`general-model.ts` contains only this project's aggregate numeric hashed-feature
document counts, with source/split hashes and totals. Apache-2.0 covers the
authored code; it does not relicense the underlying corpus or PSF/MIT/BSD components.
Raw messages stay outside Git and are never uploaded to models or sent live.
The authored control in fixtures/statistical.ts was written for this project.

## Frozen experiment

Acquisition has 8 MiB compressed, 64 MiB per-archive expanded, 128 MiB aggregate,
2 MiB per-message, 10,000-member and 6,500-unique-message ceilings. It checks
exact official-source SHA256 values before parsing archives, rejects unsafe
paths, links and special members, writes opaque content-hash names, and verifies
existing output files. Model input files have byte/hash/structure checks.

6046 unique raw messages were prepared **before classifier development**.
The original 192 are a known diagnostic/regression set, never called a pristine
holdout. Raw IDs and normalized body-feature duplicates of those cases are
excluded from training/validation/holdout. Equal body word-feature sets are
conservatively deduplicated; conflicting labels are excluded explicitly. This
is exact normalized feature deduplication, not proof against all near-duplicate
or thread/template leakage. No predictions enter selection.

Frozen partition SHA256:
`111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803`.
Numeric feature-file SHA256:
`59d3915ab9b93943d3f454fa940e2d1da21f8ba0d766874dbc94f4b32b330e36`.

Independent reproduction caught an author-tooling mismatch: Node24.13 on Mac
decoded legacy Western MIME bytes differently from the repository's pinned
Node24.15.0. Repeating extraction under the pinned runtime gives byte-identical
Mac/VPS manifests and features. Every one of the 6046 original label/partition
assignments and every exclusion was unchanged; no holdout prediction had been made at that earlier runtime-repair stage.
Five body-feature hashes and six numeric feature arrays changed, while the
generated 9413 model count triples and document totals are identical. The old
inputs and receipts remain historical evidence. `mime-runtime.mjs` now checks
the exact runtime and synthetic Windows-1252 alias decoding before MIME extraction,
training or general validation. Thresholds were unchanged.

| Partition | Ham | Spam | Hard ham |
| --- | ---: | ---: | ---: |
| Known diagnostic | 128 | 64 | 64 |
| Training | 2467 | 337 | 88 |
| Validation | 300 | 256 | 44 |
| Independent holdout | 1175 | 813 | 45 |
| Explicit exclusions | 80 | 426 | 9 |

Original easy_ham/spam supply training; hard_ham is SHA256-ordered into first
half training, next quarter validation, remainder holdout. New easy_ham_2/spam_2
cohorts use their first 256 retained hashes each for validation, remainder
holdout. Missing/limited inputs remain in evaluation denominators. Training
uses 2452 usable ham and 331 usable spam after raw/text/token ceilings; each
message counts a word once, with at least three training documents per feature.
There are 9413 numeric feature-count records. Training never consumes validation
or holdout labels as training truth. Quoted text itself is removed; legitimate
current reply text may contribute to training, while inference abstains on quotes.

Validation-only experiments are retained. Including normalized current reply
text in ham training improved coverage. The selected settings were fixed before
holdout predictions: Fisher cutoff 0.99, at least 20 informative distinct clues,
at most 64 selected clues, and body evidence. On the prototype validation-only
measurement these detect 140/256 spam with 0/300 ham flagged. This is a development
observation, not a claim of actual joined routing or held-out performance.
DEV-999 owns that exact-source paired measurement and keeps all misses/FPs.
With the pinned MIME runtime, actual scorer RPC plus the proposed bounded
HTML-only projection detects 139/256 validation spam and flags 0/300 ham;
this still does not test the new caller policy. The older 135/256 receipt used
the incompatible author runtime and remains historical evidence.

## Bounds and abstention

Prefer the plain-text alternative when present; use HTML text for HTML-only
messages. HTML has a 32 KiB UTF-8 source/output cap, 1024 start-tag cap and depth
32. Parser callbacks pause on exhausted work. Head/script/style/template,
embedded SVG/math/objects, blockquotes, common quoted-message wrappers and
simple explicit hidden attributes/styles are skipped. No rendering, DOM
execution, CSS evaluation, images, links or external resources are loaded.
This is lexical text, not a complete visibility/sanitization/malware assessment;
`html_uninspected` remains visible and status remains partial.

Existing bounded normalization skips quotes/forwarded blocks. Tokenization uses
bounded ASCII words of length 3-20 and at most 1000 distinct hashes. Whole
addresses, URLs and long chunks are excluded, not used as classifier features.
The English public model does not establish non-English detection or safety.
Limited, quoted, empty, single-word or short/ambiguous evidence abstains. Severe
input/control/normalization limits suppress the new signal. Lookup/model work
is fixed and cannot be changed by an email, label or caller-supplied model.

The Fisher value is not a calibrated confidence. Strong evidence adds one static
`statistical_spam` reason capped at 60, within the existing total cap 100. It never
returns message excerpts or token IDs. GTUBE stays a separate exact literal
installation control and does not acquire statistical contributions. Absence
of this reason means insufficient statistical evidence, never verified ham.

## Reproduction and release limits

Use the locked dependencies (scripts disabled), exact Node24.15.0 and Python3:

```
node harness/evaluation/mime-runtime.mjs
python3 harness/evaluation/prepare-general.py --self-check
python3 harness/evaluation/prepare-general.py /external/data
node harness/evaluation/freeze-general.mjs /external/data /installed/inbox
node harness/evaluation/train-general.mjs --self-check
node harness/evaluation/train-general.mjs /external/data --write-model
npm run check
npm run sbom
```

The generator verifies frozen input hashes before writing model source. No
public/production delivery, private labels, contemporary mailbox accuracy or
hosted CPU/billing is established by these local tests. The corpus is old and
mostly English, and statistical filtering still misses spam and can falsely
flag legitimate mail. Automatic routing stays recoverable, explicit allow and
Not spam remain available, and shadow/off rollback never deletes mail/history.
