# R-008A — Linux Installed-RC Qualification Review Packet

## Review status

`BLOCKED — implementation ready; canonical Linux evidence absent`.

This packet is ready for implementation review but not for Linux qualification acceptance. There is no GitHub Actions run ID, uploaded artifact or Linux runner identity because the local repository has no configured remote.

## Files in review scope

- `.github/workflows/recrafts-r008a-linux-qualification.yml`
- `scripts/run-r008-linux-qualification.mjs`
- `scripts/validate-r008a-linux-evidence.mjs`
- `tests/r008a-linux-evidence.test.mjs`
- `dev-workflow/evidence/r-008a/local-qualification-diagnostic.json`
- `dev-workflow/results/R-008A-linux-installed-rc-qualification-result.md`

## Reviewer checks completed locally

- Frozen Build 2 SHA-256 matches `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`.
- The wrapper imports only Node standard-library modules and has no source runtime/realization/fidelity import.
- The workflow has `contents: read`, manual dispatch, `ubuntu-latest`, timeout, concurrency, no publish/release step, and executes copied inputs from `RUNNER_TEMP`.
- The non-Linux diagnostic proves the installed-Tarball orchestration works but is marked `diagnostic-only`; the validator refuses it as Linux evidence.
- Required mutation tests and complete repository regression pass.
- Build 1, Build 2, product runtime/contracts and CraftsOS/Layoutcrafts remain unchanged.

## Required canonical evidence before acceptance

After a remote is configured, push the branch and dispatch `.github/workflows/recrafts-r008a-linux-qualification.yml`. The reviewer must require:

1. A successful `ubuntu-latest` workflow run and immutable run ID.
2. An artifact named `recrafts-r008a-linux-qualification-<run-id>` containing only reports, logs, checksum manifest and workflow metadata.
3. `validate-r008a-linux-evidence.mjs` passing on the downloaded artifact.
4. The exact Build 2 SHA-256 in install, platform and isolation reports.
5. All nine Operations accounted for, complete real Craft URL Evidence, restored rollback hashes and all negative gates failed closed.
6. A separate evidence-only update that marks Linux passed and Build 2 ready for owner review without altering the Tarball or Darwin evidence.

## Current verdict boundary

- R-008A: `BLOCKED`, not failed and not passed.
- Independent Review: `PENDING`.
- Project-owner Verdict: `PENDING`.
- CraftsOS Holding: `PENDING`.

The only blocking input is a push-capable Git remote/runner path. No additional Recrafts product capability is requested.
