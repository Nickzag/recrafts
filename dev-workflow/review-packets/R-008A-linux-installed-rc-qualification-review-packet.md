# R-008A — Linux Installed-RC Qualification Review Packet

## Review status

`READY`.

GitHub Actions Run `29388978971` completed successfully on `ubuntu-latest`. The downloaded portable Evidence passed the R-008A Validator before release metadata was updated and passed again with the final Build 2 release state.

## Evidence to inspect

- `dev-workflow/evidence/r-008a/github-runs/29388978971/github-run.json`: immutable run identity, attempt, Head SHA, timestamps and URL.
- `dev-workflow/evidence/r-008a/github-runs/29388978971/github-artifacts.json`: artifact ID `8332495924` and GitHub digest `sha256:12bade357ee6837385eb6b173a0d006e6c7116757beb71070aca54f1663932f6`.
- `dev-workflow/evidence/r-008a/github-runs/29388978971/github-run.log`: full GitHub job log.
- `dev-workflow/evidence/r-008a/linux/29388978971/`: downloaded reports, command log, payload checksum manifest and workflow metadata.
- `release-candidates/recrafts-0.4.0-rc.1-build2/validation/`: evidence-only Linux reports, platform matrix, closure matrix and readiness.

## Verified facts

- Frozen Build 2 SHA-256 is `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774` before install, in the clean-install report and in package isolation evidence.
- Linux runner identity is recorded as Linux `6.17.0-1018-azure` x64 with Node `v24.18.0`, npm `11.16.0`, Playwright `1.61.1` and Chromium `149.0.7827.55`.
- The installed package came from the Tarball and ran outside the checkout without `npm link` or source runtime imports.
- All nine Operations are present; `generate-realization` asserted the accepted stable fail-closed result.
- The live Craft URL capture is complete with all mandatory Evidence classes, valid hashes/freshness, separate DOM/CSS and screenshot records, and no raw Host output.
- Conflict blocking, authorized correction, Artifact acceptance, later acceptance and rollback-as-new-package passed. Seven canonical restore hashes match.
- Partial, blocked and stale lifecycle checks passed; 11 negative gates failed closed.
- Portable and release-aware Evidence validation, `103/103` repository tests and R-001 through R-007 validators passed.

## Boundary confirmation

Build 1, the Build 2 Tarball, Build 2 runtime/contracts, Darwin Evidence, product capabilities, CraftsOS and Layoutcrafts are unchanged. The project-owner release form and CraftsOS holding decision remain untouched.

## Required next review state

- R-008A: `PASS`
- Independent Review: `READY`
- Project-owner Verdict: `PENDING`
- CraftsOS Holding: `PENDING`

This packet authorizes review of the evidence; it does not itself supply the final independent verdict, Owner Verdict or CraftsOS holding release decision.
