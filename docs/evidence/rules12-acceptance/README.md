# Seventh cohort acceptance plan

The candidate is Inbox commit `1011cb0f925e1dffa78d0f4e2ad94788441121bf` and scorer commit `fbf6feae2815b401253cb2783d7eddaf4c9c3e84`. The original rules-5 reference is unchanged. No seventh-cohort predictions may be made until this evaluator and its source pins are independently reviewed and frozen.

The evaluator requires all eight prior cohorts to pass first, preserving their baseline row digests, zero candidate legitimate quarantines, and the authored controls. It verifies each receipt and source/runner hash before admitting the seventh. The seventh cohort requires zero candidate legitimate quarantines, at least 50% spam recall, and at least 20 percentage points gain over the original reference. Unavailable spam remains a miss. Inputs are SHA-verified; evaluation runs the actual caller and scorer in Workers with no network or mailbox mutation. The balanced dated public research sample is not a production accuracy estimate.

Reproduce with Node 24.15.0 and workerd 2026-10-21; run the evaluator self-check and `node --test tests/rules12-comparator.test.ts tests/rules12-prior.test.ts`. Independent review, safe release verification and an approved exact-source deployment remain separate gates.
