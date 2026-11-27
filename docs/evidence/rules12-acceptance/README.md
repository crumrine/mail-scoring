# Seventh cohort acceptance plan

The candidate is Inbox commit `1011cb0f925e1dffa78d0f4e2ad94788441121bf` and scorer commit `fbf6feae2815b401253cb2783d7eddaf4c9c3e84`. The original rules-5 reference is unchanged. No seventh-cohort predictions may be made until this evaluator and its source pins are independently reviewed and frozen.

The evaluator requires all eight prior cohorts to pass first, preserving their baseline row digests, zero candidate legitimate quarantines, and the authored controls. It verifies each receipt and source/runner hash before admitting the seventh. The seventh cohort requires zero candidate legitimate quarantines, at least 50% spam recall, and at least 20 percentage points gain over the original reference. Unavailable spam remains a miss. Inputs are SHA-verified; evaluation runs the actual caller and scorer in Workers with no network or mailbox mutation. The balanced dated public research sample is not a production accuracy estimate.

Reproduce with Node 24.15.0 and workerd 2026-10-21; run the evaluator self-check and `node --test tests/rules12-comparator.test.ts tests/rules12-prior.test.ts`. Independent review, safe release verification and an approved exact-source deployment remain separate gates.

## Acceptance result

All eight observed regressions passed with zero candidate legitimate quarantines. On the untouched seventh sample, the candidate caught 529/1,000 spam (52.9%) versus 220/1,000 (22.0%) for the original reference: a 30.9 percentage point gain. Candidate legitimate quarantines were 0/1,000. Twenty-nine candidate spam and 21 legitimate assessments were unavailable; unavailable spam remains in the denominator as a miss.

The independently audited local reports and raw-input reconstruction stay outside the repository. The checked receipt chain and recorded timestamps establish internal consistency but do not authenticate execution or timing. The public research sample is balanced and dated, and the supplied private exclusion metadata could not be independently established as historically complete. This is acceptance evidence, not proof of production accuracy or deployment.
