# R-008A — Linux Installed-RC Qualification Result

## Outcome

`PASS`.

The same immutable `recrafts-0.4.0-rc.1-build2` Tarball has completed installed qualification on Darwin and Linux. R-008 is ready for final independent and project-owner closure review. No Owner Verdict or CraftsOS holding decision has been synthesized.

- RC: `recrafts-0.4.0-rc.1-build2`
- Tarball SHA-256: `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`
- Workflow: `Recrafts R-008A Linux Qualification`
- Run ID / attempt: `29388978971` / `1`
- Run URL: `https://github.com/Nickzag/recrafts/actions/runs/29388978971`
- Head branch: `recrafts/r-008-independent-mvp-closure`
- Head SHA: `9448ebfb391b73ba00e794ec1e6baf12efd985dc`
- Artifact: `recrafts-r008a-linux-qualification-29388978971`
- GitHub artifact digest: `sha256:12bade357ee6837385eb6b173a0d006e6c7116757beb71070aca54f1663932f6`
- Payload checksum-manifest digest: `121abcfa04f66f00a3927a57a37feb0773bd7baad91168308b9d71a7ce2fad8f`
- Evidence: `dev-workflow/evidence/r-008a/linux/29388978971`

## Linux environment and operations

The GitHub-hosted `ubuntu-latest` runner reported Linux `6.17.0-1018-azure` x64, Node `v24.18.0`, npm `11.16.0`, Playwright `1.61.1`, Chromium `149.0.7827.55`, Protocol `1.1` and Schema `3.0.0`. Installation came from the frozen Tarball into a temporary project outside the checkout; `npm link`, source runtime imports and checkout runtime dependencies were absent.

All nine Operations were accounted for. `capabilities`, `prepare-analysis`, `submit-analysis`, `validate-package`, `verify-fidelity`, `submit-correction`, `accept-artifacts` and `rollback-package` passed. `generate-realization` returned the expected stable `REALIZATION_NOT_AUTHORIZED` fail-closed result.

## URL, acceptance and rollback

The installed browser adapter captured `https://www.craft.do` at `1440x900` with status `complete`. The report contains 824 verified hashed Evidence records across capture metadata, network, DOM, CSS rules/variables, computed styles, viewport screenshot, screenshot regions, assets and fonts. Structured DOM/CSS and screenshot Evidence remain separate; raw Host output is absent.

The deterministic non-live image/image-set fixture produced a high-impact conflict, blocked acceptance before correction, accepted after an authorized correction, created a later accepted package and rolled back through a new immutable package. All seven canonical hashes in rollback package `package-147b1cd350ab0d1e` match restore target `package-cc4d02570d36e44e`. Partial and stale sources failed acceptance with `REALIZATION_NOT_AUTHORIZED`; blocked input stopped before semantic analysis. All 11 negative gates failed closed with stable error categories.

## Validation

- Portable Linux Evidence Validator: `pass`
- Release-aware Linux Evidence Validator: `pass`
- Full repository tests: `103/103` passed
- R-001 through R-007 validators: passed
- `actionlint`: passed
- `git diff --check`: passed
- Build 1 and Build 2 Tarball SHA-256 recheck: passed

## Final state

- R-008A: `PASS`
- Build 2 Darwin qualification: `PASS`
- Build 2 Linux qualification: `PASS`
- RC readiness: `ready-for-owner-review`
- Independent Review: `READY`
- Project-owner Verdict: `PENDING`
- CraftsOS Holding: `PENDING`

No Build 1, Build 2 Tarball, Build 2 runtime/contract, Darwin Evidence, Recrafts product capability, CraftsOS or Layoutcrafts content was changed.
