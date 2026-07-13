# R-006 Independent Review Packet

## Review target

Branch `recrafts/r-006-evidence-truth-url-lifecycle`, development version `0.4.0-rc.1`, Protocol `1.1`, Schema `3.0.0`. R-005 Build 5 is historical and unchanged. CraftsOS/Layoutcrafts code is outside the diff and is not used by clean install.

## Evidence map

- Protocol and operation dispatch: `runtime/interop_contract.mjs`, `runtime/interop_operations.mjs`
- Capture, Evidence, Claims, domains, conflicts, and Gate: `runtime/evidence_truth.mjs`
- Runtime package validation: `runtime/r006_validation.mjs`
- Record and artifact contracts: `schemas/*-record.schema.json`, `contracts/{evidence,claims,tokens,components,grid-rules,layout-rules,visual-grammar,conflicts}.schema.json`
- Lifecycle fixtures and negative tests: `fixtures/r006/`, `tests/r006-evidence-truth.test.mjs`
- Standalone smoke: `scripts/run-r006-clean-install.mjs`
- Public validators: `scripts/validate-r006-*.mjs`

## Highest-risk review answers

1. Raw Host output is written to `claims.json`, never to Evidence.
2. DOM/CSS/computed-style and screenshot/screenshot-region are distinct typed records; regions require a screenshot parent.
3. Blocked, partial, and stale URL runs retain explicit lifecycle artifacts. False lifecycle declarations fail closed.
4. Blocked Evidence is not fabricated; stale Evidence forces `blocked` and cannot become canonical.
5. Every Token, Component, and Grid Rule is validated against existing Evidence and Claims.
6. Conflicts are retained in `conflicts.json`; duplicate multi-source candidates and stale/current state are automatic, while semantic DOM/screenshot disagreements are explicit inputs.
7. Any open high-severity conflict forces package `blocked`; readiness remains unauthorized.
8. The tarball installs and runs without CraftsOS/Layoutcrafts or private project imports.
9. `git diff` for `release-candidates/recrafts-0.3.0-rc.1-build5` is empty.
10. R-006 stops before correction, acceptance, rollback, or final closure claims.

## Known review focus

The complete URL state is proven with a controlled capture fixture. The dependency-free live adapter is deliberately partial; independent review should not interpret this as a real-browser complete capture. R-008 must provide that real public URL proof through an auditable Host/browser adapter.

## Submitted validation evidence

```text
repository tests: 75/75 passed
R-001 → R-005 validators: all passed
standalone development tarball clean install: passed
URL states observed after clean install: complete / partial / blocked / stale
tarball SHA-256: 7ceb6629720230c46b2998cc25045659c7960ef6fe5867fd7164d4b495a5e112
Build 5 path diff: empty
```

## Requested verdict

```text
Evidence truth: PASS / PASS WITH CHANGES / REWORK
URL lifecycle: PASS / PASS WITH CHANGES / REWORK
Domain provenance: PASS / PASS WITH CHANGES / REWORK
R-006: ACCEPT / REVISE
```
