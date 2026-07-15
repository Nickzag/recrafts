# R-008 — Independent MVP Closure Review Packet

Review target: `release-candidates/recrafts-0.4.0-rc.1-build2/`

Build 1 is preserved as failed because partial sources could be accepted. Build 2 fixes that Gate and has now passed installed qualification on Darwin and Linux using the same immutable Tarball. `validation/rc-readiness.json` is `ready-for-owner-review` with no blockers.

## Evidence to inspect

- `bundle/release-manifest.json`: source/evidence commits, R-006/R-007 review hashes, Host/capture/matrix IDs and Tarball hash.
- `validation/package-contents.json` and `distribution-audit.json`: recompute inventory and leakage checks.
- `bundle/evidence/real-url/`: compare the public screenshot/regions with separate DOM, CSS and computed-style records.
- `validation/real-url-complete-report.json`: verify freshness, content and pixel hashes.
- `bundle/evidence/real-host/` and `validation/real-host-run-report.json`: raw output must remain outside Evidence; structured Claims must be Evidence-bound.
- `validation/conflict-gate-report.json` and `acceptance-gate-report.json`: reproduce open-conflict, partial/stale source, provenance, raw-output and Host-authority failures.
- `bundle/evidence/rollback/` and `validation/rollback-qualification-report.json`: recompute C/G canonical hashes and inspect F → G lineage.
- `validation/mvp-closure-matrix.json`: confirm every row is installed-Tarball evidence.
- `dev-workflow/evidence/r-008a/linux/29388978971/`: inspect the downloaded Linux reports, payload checksums and workflow metadata.
- `dev-workflow/evidence/r-008a/github-runs/29388978971/`: inspect the immutable GitHub run metadata, artifact metadata and full log.
- `validation/platform-matrix.json`: confirm both Darwin and Linux passed against the same Build 2 SHA-256.

## Executed validation

- Source regression: `npm test` → `103/103` pass.
- Installed Build 2: single image, multi-image real Host conflict/correction/two acceptances/rollback, real URL real Host correction/acceptance, partial/blocked/stale, negative gates, package inventory and Darwin platform metadata.
- Linux installed Build 2: GitHub Actions Run `29388978971`, nine Operations, complete Craft URL, conflict/correction/acceptance, rollback hash restoration, partial/blocked/stale and 11 negative gates; portable and release-aware Evidence validation passed.
- Tarball SHA-256: `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`.
- CraftsOS/Layoutcrafts: unchanged and not imported.

Requested verdicts:

- Cross-input independent loop: PASS / PASS WITH CHANGES / REWORK
- Real public URL evidence: PASS / PASS WITH CHANGES / REWORK
- Real Host interoperability: PASS / PASS WITH CHANGES / REWORK
- Installed RC and rollback: PASS / PASS WITH CHANGES / REWORK
- R-008: ACCEPT / REVISE

All frozen mechanical gates are now satisfied. R-008 is ready for final independent review and project-owner closure review. The project-owner release form and CraftsOS holding decision remain `PENDING`; this packet does not synthesize either decision.
