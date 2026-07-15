# Recrafts Task 023A Main Reconciliation Result

## Conclusion

Task 023 functionality was reconciled onto current Recrafts `main` without cherry-picking the obsolete `0.2.0` implementation. Current main already superseded it with Protocol `1.1`, Schema `3.0.0`, nine canonical operations, Evidence Truth, immutable correction/acceptance/rollback, real browser capture, clean-install qualification, and an accepted Artifact Set contract. Reconciliation preserves those R-008 capabilities and adds only a bounded CraftsOS reader for accepted Schema 3 packages.

## Port Decisions

| Old Task 023 item | Current-main decision | Reason |
|---|---|---|
| `runtime/task023_artifacts.mjs` | replaced | Duplicates and weakens current Evidence Truth and Package Evolution runtimes. |
| old Artifact Set `1.0.0` | replaced by Schema `3.0.0` | Current main has accepted/lineage-bound Artifact Sets and canonical hashes. |
| old confidence enum | mapped through current Claims/status/confidence/evidence model | Current main preserves numeric confidence, claim class, source evidence and conflict state without aggregate accuracy. |
| independent CLI | kept current `recraft`, `recraft-interop`, `recraft-capture` | Current installed RC already qualifies image, image-set, URL, correction, acceptance and rollback. |
| Layoutcrafts import shape | merged as `runtime/craftsos_contract_adapter.mjs` | Thin accepted-package reader validates identity, complete sources, provenance and all canonical hashes without importing Layoutcrafts. |

No newer mainline module, test, schema, package artifact or release evidence was removed. No old implementation remains beside its newer equivalent.

## Live URL Evidence

On 2026-07-15 the current main browser capture ran against `https://www.craft.do/` using Chromium `149.0.7827.55`. It completed with no redirect and no missing evidence. DOM, CSS rules/variables, computed styles, viewport/full-page screenshots, screenshot regions, assets, fonts and network records were available. The repository stores only `dev-workflow/evidence/023A/live-url-summary.json`; full page content and pixels remain outside the repository.

State: `live-url-smoke: passed`; `universal-url-accuracy: not-established`; website replication accuracy and production readiness are not claimed. R-006/R-008 fixtures continue to cover partial, blocked, stale and screenshot fallback states.

## Validation

- Final implementation commit: `e9ca1d17cbe2d00f841490742d22404bd765cda5`.
- `npm test`: 105 passed, 0 failed, 0 skipped.
- `npm run validate:023a-craftsos`: 2 passed, including accepted export and incomplete/hash/evidence/identity negative cases.
- Live URL capture: complete, missing evidence 0.
- Recrafts dependency on Layoutcrafts: none.
- Workspace promotion: false; production ready: false.

The old Task 023 branch had 38 tests because it started before R-003B through R-008. Current main had 103 tests; 023A adds 2, producing 105. This is a superset rather than a reduced suite.

## Remaining Limits

This evidence does not establish unrestricted URL extraction, website replication accuracy, exact typography, customer preference, Provider performance, or production readiness. CraftsOS must consume the final reconciled commit and validate its own final head before Task 023 acceptance.
