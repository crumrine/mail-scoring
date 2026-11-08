# DEV-1017 source evidence

See [contextual-precision.md](../../contextual-precision.md) for the correction, declared TRAIN-only search and unchanged release gates. This is not independent acceptance or deployed operation.

`initial-grid.json` and `initial-failed.log` preserve the failed first35-point training search. `extended-grid.json`/`extended-training.json` retain the declared15-point extension and combined50candidates. `grid.json`/`training.json` reproduce all50from scratch, selecting C2000/H10 at2058TP0FP/5567TN2279FN; model SHAce506fc71c7b465ccf2fef1218c821739c381509c93abd7f8a98ec4da516d052. No row/label/cutoff changed, no new data or packages. Unavailable/ineligible misses remain.

`observed-regression-reproducer.mjs` takes CURRENT_CORE OLD_RULES8_CORE INBOXb5a OUTPUT SA_RAW ENRON_RAW FIRST_SH_RAW SECOND_SH_RAW THIRD_SH_RAW. Old629 and Inboxb5pins/modelSHA are checked. Output preserves all10736selected outcomes, labels, unavailable and misses. Both earlier false positives must abstain, all5603HAM stay unquarantined. Its explicit9-to8reason/policy mapping is proposed CORE regression, not joined caller acceptance. No fourth raw data/predictions. Every earlier failed acceptance report/gate remains unchanged.

Independent source review and caller DEV-1018 must merge before DEV-1009 runs all5observed corpora then the first fourth1e9predictions. Unchanged>=50%freshrecall AND>=20absolute point gain versus deployed606d/5ed, zeroHAM bothvariants/allstrata/authoredcontrols. OPS-615 exclusively owns subsequent reviewed manual release. No production mutation, Actions/Builds enablement, mail/privatecapture/rescan/deletion/rejection/network inspection.
