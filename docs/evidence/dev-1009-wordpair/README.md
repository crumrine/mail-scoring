# DEV-1009 fourth independent acceptance: failed

Rules-9 is rejected. On the untouched fourth cohort, the candidate caught **479 of 1,000 spam** versus **188 of 1,000** for the original deployed rules-5 filter. The 29.1 percentage point gain passed, but 47.9% recall missed the required 50%. Both variants flagged the same legitimate message (opaque ID `dfc9acee291da921677d3d8f766ace54850498546dea43230e81e7650772f6af`), so both failed the zero legitimate mail gate. This happened on a public research sample offline; it does not establish an incident in a private mailbox.

| Cohort | Spam caught by rules-5 | Spam caught by rules-9 | Legitimate catches (each) |
| --- | ---: | ---: | ---: |
| SpamAssassin | 290 / 1,133 | 474 / 1,133 | 0 |
| Original Enron | 212 / 1,000 | 525 / 1,000 | 0 |
| First | 64 / 1,000 | 464 / 1,000 | 0 |
| Second | 67 / 1,000 | 449 / 1,000 | 0 |
| Third | 62 / 1,000 | 499 / 1,000 | 0 |
| Fourth | 188 / 1,000 | 479 / 1,000 | 1 |

All 12,736 selected cases, including unavailable cases and misses, remain in the six paired reports. All 143 authored legitimate controls passed in plain text and HTML for both variants. The fourth predictions started at 23:50:21.097675 UTC on November 8, 2026, after the five regression runs. The [ordering receipt](before-fourth-predictions.json), [execution](execution.json), and [failed acceptance](acceptance.json) preserve the original source and gates. The fourth cohort is now an observed regression, permanently.

Do not deploy or roll back to rules-6, rules-7, rules-8 or rules-9. The rejected rules-9 checked private artifact is `2255409bc192d088c0d3c6e0d6c7058f592a66c21b407f9026665e3e18dfe36c`. This archive does not authorize deployment. DEV-1019 freezes a fifth cohort, DEV-1020/1022 own the replacement source, DEV-1021 owns the prospective comparator contract, and DEV-1009 must pass before OPS-615 may deploy. The original rules-5 false positive must remain visible when measuring the replacement.

## Procedure frozen before the original predictions

Pair: independently reviewed merged Inbox35718322ea97e1c6cec6adee8b0483950bc65f99 and scorer453cc3423e222b0e853bf3d8e9d590ee01e44bf7, versus deployed606d0edee433fbf2aee517b1f1b61e631251a79a/5ed110e5cdfc9905fc5ee2940a4a39cd9e4864b0. New6modes use actual MIME/project/assessArrival/serializedRPC/strictdecoder/policy, never version translation. General7modelce506/grid d910/fixed143owncontrols are pinned. No runtime/model/lock changes.

Before ANYfourth predictions, commit the runner, wordpair-gate, gate-only tests and143controls. All five older paired studies must first pass zeroHAM in BOTHvariants/everypartition/stratum/allcontrols. Then evaluate the first fourth1e9cohort:1000HAM+1000spam, frozen before model development from unused SH/kaminski-v and BG/beck-s members, disjoint from TRAIN/previouspublicselections/clinical/authorcontrols/privateexclusion-only hashes. Additional24newauthoredcontrolbodyfingerprints were compared to metadata only, zero overlap; no fourth raw/MIME/features/model access occurred during source/review/preparation.

Unchanged release gate:>=50%freshspamrecall AND>=20absolute percentage point gain over deployed on that exact cohort, zeroobservedHAM bothvariants/everyold/fresh/partition/hardHAM/HTML/other/control. Allselected cases, labels, unavailable cases and misses remain in denominators. Newgate verifies exactcanonicalselectedID/labelvector digests, blocking relabel/IDswap/drop even with unchanged aggregatecounts, plusmodel/source/runtime/runner/control identities. There are143frozenownHAMcases/286plainHTML+25othercontrols=311controls pervariant perstudy, alloriginalsubjects/bodies/HAMlabels retained. Authoredfixtures are regression controls, not researchmail accuracy samples.

Gate-unit fixtures fabricate report predictions from public opaque metadata ONLY for validation of gate logic; they import no raw mail/MIME/features/model/scorer and are not fourth-cohort classifier predictions. Positive50%/+20pointboundary and allnegative cases remain mandatory. Historicalrefit-gate.test.ts now pins its original62bc runner instead of hashing the mutable extended shared runner; all historical conditions/negativeassertions/gatefiles/data/reports remain. Original463/fc1/62bcstudies are reproducible at their immutablehistoricalsourcecommits, and allfailed6/7/8results stayfailed.

`execution-reproducer.py` requires a new empty outsideGit outputdirectory, runsallfiveoldcohortsfirst/stopsanyfailure, savesbefore-fourth timestamp/sourcehead/orderreceipt, thenfourthoutcomes and finalgate result includinganyfailure. Later unchanged-source reproduction checks determinism/archive integrity, never restores untouchedstatus. Codeandcontrols mustfreeze beforeoriginalfirstauthorpredictions. No tuning, relabel/drop or cutoff/sample changes after outcomes.

Independent exact-head evidence review and normalmerge/nativeDone onlyifacceptancepasses. OPS615 exclusively owns a separately independentlyreviewed exactartifact/config/rollbackplan and caller-FIRSTmanualdeployment/allmoduleandprivatehash/fullsettings/100%receipts. Source or offlineacceptance alone is not live provider operation. Actions/Builds staypaused; neverfailed6/7/8deploy/rollback. No newmail/privatecapture/historyrescan/deletion/rejection/paidproductAI/DNS/mailURLfetch. Dated balanced research samples/zeroobservedFP do notguarantee modern/futuremailaccuracy; no physicalclient/freshproviderinboundtest is claimed.
