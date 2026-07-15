# R-008A — Linux Installed-RC Qualification Result

## Outcome

`BLOCKED — canonical Linux workflow not executed`.

The reusable qualification implementation is complete, and a non-Linux diagnostic successfully exercised the exact Build 2 Tarball end to end. This diagnostic is explicitly ineligible for release qualification. The repository has no configured Git remote and no matching GitHub repository was discoverable under the authenticated account, so the `ubuntu-latest` workflow could not be pushed or dispatched and no real workflow run ID or Linux artifact exists.

Build 2 remains immutable and blocked:

- RC: `recrafts-0.4.0-rc.1-build2`
- SHA-256: `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`
- `rc-readiness`: unchanged, `blocked`
- Independent Review: `PENDING`
- Project-owner Verdict: `PENDING`
- CraftsOS Holding: `PENDING`

## Implemented qualification surface

- Added a manual, read-only `ubuntu-latest` GitHub Actions workflow with timeout, concurrency protection, temporary-directory execution, exact Tarball checksum gate and portable artifact upload.
- Added a Node-standard-library-only wrapper that installs the Tarball outside the checkout and invokes only installed package entry points.
- Added an evidence validator covering exact RC identity, Linux identity, nine Operations, URL Evidence classes/separation/freshness/hashes, conflict/acceptance/rollback, negative gates, package isolation, payload checksums and optional final release metadata.
- Added thirteen harness tests, including all ten required evidence mutations and static wrapper/workflow boundary checks.

## Executed verification

The local diagnostic used Darwin only and therefore cannot close R-008A. It nevertheless passed package-local `npm test`, all nine Operations, a complete `https://www.craft.do` capture at `1440x900`, 789 hashed Evidence records across every mandatory class, deterministic image/image-set flow, high-impact conflict block, correction, two accepted packages, rollback-as-new-package with seven canonical hashes restored, partial/blocked/stale lifecycle checks and 11 fail-closed negative gates. `generate-realization` returned the expected stable `REALIZATION_NOT_AUTHORIZED` result.

The evidence validator rejected that diagnostic only for the four intended platform reasons: Linux clean-install status, Linux platform report status, Linux platform identity and Linux workflow runner identity.

Repository validation passed:

- Full tests: `103/103`
- R-001: passed
- R-002: passed
- R-003 Preflight and Realization: passed
- R-004: passed
- R-005: passed
- R-006: `7/7`
- R-007: `10/10`
- Workflow YAML parse and `git diff --check`: passed
- Build 2 Tarball SHA-256 recheck: exact match

## Boundary confirmation

No Recrafts product/runtime capability, Build 1, Build 2 Tarball/contract/runtime, CraftsOS or Layoutcrafts file was changed. Existing untracked R-008 diagnostic material was not deleted or included. No Owner Verdict was synthesized.

## Blocking condition

A Git remote with permission to push this branch is required before the workflow can be dispatched. Only a successful real `ubuntu-latest` run may populate Linux evidence and authorize the evidence-only updates to the Build 2 platform matrix, closure matrix, readiness, R-008 Result and R-008 Review Packet.
