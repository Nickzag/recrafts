# R-007 Independent Review Packet

## Review target

Branch `recrafts/r-007-correction-acceptance-rollback`, development version `0.4.0-rc.1`, Protocol `1.1`, Schema `3.0.0`. R-006 is the accepted base. R-005 Build 5 and all prior release-candidate files are unchanged. CraftsOS/Layoutcrafts remain outside the diff and clean-install runtime.

## Evidence map

- Nine-operation protocol: `contracts/envelope-request.schema.json`, `runtime/interop_contract.mjs`, `runtime/interop_operations.mjs`
- Correction/acceptance/rollback implementation: `runtime/package_evolution.mjs`
- Independent package validation: `runtime/r007_validation.mjs`
- Human decision and history contracts: `contracts/correction.schema.json`, `contracts/artifact-decision.schema.json`, `contracts/rollback-decision.schema.json`, `contracts/artifact-set.schema.json`, `contracts/package-lineage.schema.json`
- Golden chain and fail-closed mutations: `tests/r007-package-evolution.test.mjs`
- Contract mutations: `tests/r007-contracts.test.mjs`
- Installed-package closure flow: `scripts/run-r007-clean-install.mjs`
- Public validators: `scripts/validate-r007-*.mjs`

## Highest-risk answers

1. Correction operations cannot write Evidence/Claims fields; runtime rejects provenance and identity keys, and packages retain an immutable extraction snapshot.
2. Raw extraction is copied into `extraction-snapshot/`; later domain files are overlays, not replacements of that snapshot.
3. Every correction derives a new package and Artifact Set identity and requires an empty output.
4. Decision Schemas reject Host roles. Acceptance requires project-owner or authorized-reviewer authority; high accepted-risk is project-owner-only.
5. An open high conflict blocks acceptance unless the exact conflict has explicit project-owner risk, scope, resolver, and decision binding.
6. Stale mandatory Evidence and blocked mandatory sources fail acceptance.
7. Accepted Artifact Sets contain canonical descriptors and verified SHA-256 hashes; `validate-package` recomputes them.
8. Rollback copies target canonical content into a new Package, then verifies every canonical hash against the target Artifact Set.
9. Golden tests snapshot A/C/F directory hashes and confirm later correction/acceptance/rollback leaves them unchanged.
10. Clean install runs the nine-operation protocol and full correction/acceptance/rollback chain without CraftsOS, Layoutcrafts, private repository paths, or Oracle answers.

## Submitted validation evidence

```text
repository tests: 85/85 passed
R-001 → R-006 regressions: passed
R-007 directed tests: 10/10 passed
R-007 correction/acceptance/lineage/rollback validators: passed
standalone development tarball clean install: passed
tarball SHA-256: 4822f802e526f063b698c194047ba9362e9d62e765755eacbe66c82433ad524a
Build 5 path diff: empty
```

## Carry-forward limitation

Do not interpret controlled URL `complete` or deterministic correction fixtures as real public URL completeness or visual-quality certification. R-008 must close CF-01 with an auditable real browser/Host capture and perform final cross-input release qualification.

## Requested verdict

```text
Human correction integrity: PASS / PASS WITH CHANGES / REWORK
Accepted Artifact gate: PASS / PASS WITH CHANGES / REWORK
Rollback correctness: PASS / PASS WITH CHANGES / REWORK
R-007: ACCEPT / REVISE
```
