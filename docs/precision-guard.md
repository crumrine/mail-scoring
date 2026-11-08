# Precision guard (DEV-1010)

The first untouched SH/kaminski-v acceptance of merged rules-6/general-4 caught547/1000spam and1/1000HAM, failing the predeclared zero-HAM gate. The deployed rules-5 pair caught64spam and0HAM on that same cohort. All original records, labels, misses and unavailable cases remain in `evidence/dev-1009`; that entire cohort is now observed regression only. Rules-6 is ineligible for deployment. The second1000HAM/1000spam cohort was neutrally frozen before this correction at SHAfd22eeb502f108f688e1bee70e389c8f11e83e569dad87211f71361d4459fc19, independently reproduced/reviewed and merged through DEV-1011/PR14. It remains unscored during this source ticket.

## General correction

The observed failure is a complete548-byte supported, unquoted plain-text message, with no NUL. It has19eligible distinct words,17known,10positive and7negative coefficients. Its full/body-only logit5.347 exceeds the unchanged4.595 cutoff; a single word contributes0.989 in the normalized vector. Requiring another subject/body vote would not correct it because both views have the same known feature vector. The message text, words and subject are never published or passed to an LLM.

Rules-7/general-5 requires the fixed classifier to remain above its original cutoff after removing ANY one positive word feature. The base threshold check still runs first. For each known positive word, subtract its IDF-weight contribution and squared IDF from the existing dot/norm totals, then test the same cutoff. This is one bounded pass over the already capped, deduplicated unigram vector. Repetition supplies no new evidence; negative evidence remains in the vector. No runtime learning, extra model, new numeric threshold, topic/sender exception, hash exception, network or attachment inspection is added. This guard can only remove former positive outcomes.

The existing five distinct positive BODY words, at least50% known eligible body features, supported normalized letters, quote/control/HTML and source/work ceilings still apply. A failed guard means insufficient evidence, not safe mail. Other independent deterministic evidence and explicit preferences retain their existing behavior. Unknown/error delivery is recoverable Inbox; the application owns routing.

## Frozen numeric provenance

The same9904-row TRAIN matrix remains1e86b9a7f97af06517a7bb00faeb42d5f4e6ba264678c7548e714a1b471dfd49. C100, hard-HAM weight20, cutoff0.99,25439quantized coefficients, bias2.367301919 and logit cutoff4.59511985 are unchanged. The numeric source suffix beginning `MODEL_BIAS` still hashesefcf3625ce74ad461998661980eb70d74e18a71d0c701adb0352bcc94f182a6b. Only model-version metadata changes the model-file hash to e696518b43c30ce9df8275956542d5113fe53ddb20243f15c23740cfb6ffec8c.

The single stability policy was declared before its TRAIN analysis; no alternative thresholds were tried on heldout data. The fitter reproduces the original unguarded fivefold reference2092TP0FP5567TN2245FN, and the guarded1746TP0FP5567TN2591FN, hard-HAMFP0. It asserts no newly positive TRAIN row and the same numeric-model digest. The historic450-candidate reference comparison remains archived as the original general-4 fit selection; it is not a new guard search. Synthetic and TRAIN results are development checks, not independent accuracy.

## Contract and verification

Engine0.1.0, schema1 and RPC1 remain. Current rules-7 emits only `statistical_robust_spam` for statistical evidence. Historical `statistical_linear_spam` remains valid only under rules-6, and older reasons keep their exact versions/text/caps. Unknown rules-8 is rejected. A compatible caller must route generic content only on the new reason/version, retain historical assessments/policies, and continue GTUBE for rules-2–7. DEV-1012 supplies that separately reviewed caller; source merge alone never activates filtering.

A numeric synthetic fragile vector proves the unguarded formula crosses the cutoff but the guard rejects it. A14-word prefix of the original authored promotional control likewise scores60 with frozen rules-6 and0 with this guard, in plain text/HTML and the actual private Worker RPC. It is deliberately insufficient spam evidence, not a legitimate-mail accuracy control. Removing the guard must fail both core and Worker checks. Existing full promotional/pharmacy positives and all37fixed legitimate notices remain asserted; no previous failure is removed or relabeled.

Full applicable checks, exact source/artifact review and old observed regressions precede downstream integration. DEV-1009 must then evaluate both reviewed merged sources on every earlier regression (including the first false-positive case) and the untouched second cohort. Gates remain >=50%fresh recall AND >=20absolute points over the deployed606d/5ed pair, with zero observed HAM in every old/fresh/authored stratum. All unavailable spam staysFN. OPS-615 alone owns the subsequent independently reviewed caller-first manual deployment and actual-target verification; Actions and automatic Builds stay paused. Neither source tests nor dated public research corpora guarantee zero future false positives.

## Second independent acceptance failed recall

The corrected reviewed143 scorer plus reviewedc9bb288 caller caught482/1000spam and0/1000HAM on the untouched secondfd22 cohort, vs67/1000spam0HAM for deployedrules5. This fails the unchanged50%recall requirement despite41.5pointgain. Do not deploy this artifact. See [preserved study](evidence/dev-1009-stable/README.md). The third untouched neutral freeze precedes any further TRAIN-only refinement; all old failures remain regression evidence.
