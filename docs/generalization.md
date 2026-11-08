# Generalized bounded content model (DEV-1004)

Source only. DEV-1005 supplies the compatible Inbox caller; DEV-999 owns actual
paired acceptance; OPS-614 owns separately reviewed manual deployment and target
receipts. No source merge establishes activation. Actions and automatic Builds
remain paused. No message deletion, historical rescan, provider-mail send,
per-mail URL/DNS call, attachment inspection or paid product AI is added.

Rules-5 uses the new static `statistical_generalized_spam` reason (maximum60),
truthfully identifying public-data model general-3. Engine0.1.0, schema1 and RPC1
remain unchanged. Strict decoding preserves rules1–4 and their exact historical
reason texts; the new reason is accepted only under5. GTUBE is accepted only
under2–5. The historical general1/statistical_spam reason remains rules3-only,
and general2/statistical_context_spam remains rules4-only.

## Keep the safeguard; expand the training evidence

The first pooled-prior word/context experiments passed the small TRAIN-only
comparison but reintroduced known legitimate-mail errors. They were rejected,
not deployed. Their committed sources and negative receipts remain preserved.
The final implementation retains the approved square-root-count mixture of
ordinary and difficult legitimate TRAIN mail; it does not raise cutoffs to
hide an observed false positive. The classifier remains the existing PSF
SpamBayes-derived nonoverlapping-clue/Fisher combination at cutoff0.99,
minimum20/maximum64 clues, at least5 distinct body words,1000 word positions
and1999 candidate word/pair features. The source/routing/resource guards and
incomplete/unavailable outcomes are unchanged. New coverage comes from a
larger, independently partitioned public TRAIN dictionary.

The original frozen SpamAssassin TRAIN membership remains intact. An additional
2000 public Enron-Spam cases (1000ham/1000spam) were frozen before fitting,
from separate raw ham/farmer-d and spam/GP archives. SHA ordering and neutral
body-feature hashes exclude raw/body duplicates against every prior observed
corpus and the entire reserved independent archive pair. No validation or
holdout raw messages enter training. The training helper hash-checks both
manifests before reading selected TRAIN bytes, uses PostalMime2.7.3 with the
Node24.15.0 decoder profile and blocks fetches.

Original partitionSHA111a9d3a05120d099d48967a7e06ee8ca35eec26c95dea7d7ae1b989b626b803;
public addedTRAIN manifestSHA773885c5637978efcb1ff6a52bca7a07eec73ce6054470874ece00412ed2b131;
combined partitionSHA906c4e85f58bd40991acb724f36ab37f38eb74217b6cf673dc268f12c1933fd6.
The model contains37500 unique numeric aggregate word/pair counts with
TRAIN document totals[3351easyham,66hardham,1274spam]. It contains no literal
words, per-message order, subjects or addresses. The ordered per-message
numeric development matrix stays outside public source.

A predeclared finite comparison tests18 single heads (word/context, three
priors, three cutoffs) and27 same-prior OR pairs on five SHA-defined TRAIN
folds. The existing difficult-ham safeguard is retained as a required
compatibility condition after the pooled-prior failures. Within that guard,
context-only0.99 has274TP/0FP and equals the two-head recall while using less
code. Those are development counts over4757 feature-extraction rows, not independent performance. Of4804 frozen TRAIN members,47 fail the raw/text preflight before feature extraction and are not used to fit the model. Independent routing evaluation retains every selected case, including unavailable mail. All cohorts
that influenced diagnosis are regression data; a new independently frozen
2000-case raw Enron-Spam holdout (first official raw ham/beck-s and spam/BG
archives,1000perlabel after neutral deduplication) remains untouched until the
reviewed merged scorer and caller are pinned by DEV-999.

## Provenance and scope

Enron-Spam: V. Metsis, I. Androutsopoulos and G. Paliouras, “Spam Filtering with
Naive Bayes – Which Naive Bayes?”, CEAS2006. Primary raw-data and provenance
README: https://www2.aueb.gr/users/ion/data/enron-spam/readme.txt . Raw data
stays external, is never uploaded to language models or sent through live mail,
and is not redistributed with this project. Only this project's aggregate
numeric counts and content-free verification results are published. No new
runtime dependency or borrowed rule/weight list is introduced; existing
htmlparser2 and PSF notices/SBOM remain required.

The corpora are dated and selected public sources do not establish modern
mailbox accuracy, authentication or hosted CPU/cost. Uninspectable spam remains
a miss in actual acceptance denominators. Retained Inbox mail is insufficient
evidence, never a safe verdict. Known raw MIME parsing limits and conservative
quote abstention remain. Live provider incoming GTUBE, fresh remote scorer RPC
execution and physical mail-client recovery require separate authorized proof.


The source includes only the selected public Enron TRAIN IDs/labels and bounded
extraction metadata in `harness/evaluation/enron-train-manifest.json`. It does
not redistribute unrelated prior-study data. The explicit membership reproduces
the fixed counts without requiring those prior studies. The complete original
selection audit remains retained separately.

Reproduction with Node24.15.0 and installed locked Inbox PostalMime2.7.3:

```
python3 harness/evaluation/prepare-enron.py /external/enron-train --train
node harness/evaluation/train-context.mjs /external/original-frozen-SA /external/enron-train /installed/inbox
node harness/evaluation/context-counts.mjs --self-check
node harness/evaluation/context-cross-validation.mjs .artifacts/context/training-features.json .artifacts/context/cross-validation.json
```

Acquire only the two pinned TRAIN archives from the primary URLs listed in the
manifest into the external directory before preparation. Compressed archives
are bounded32MiB each; streaming expansion128MiB each/256MiB total,20000members
per archive,2MiB per message and30000 unique records. Unsafe paths, links,
special files, modified archives and changed existing outputs are rejected.
The original acquisition helpers keep their64MiB default expansion limit.
Raw data is never extracted to archive-supplied paths. No package installation
scripts or remote scanning services are involved. Reproduction compares the
model hash by default; `--write-model` is an explicit development-only change.
