# R-012 v2A Validation Command Matrix

| Capability | Required test/evidence |
|---|---|
| Schema authority | `tests/r012-schema-authority.test.mjs` |
| Referential integrity | `tests/r012-referential-integrity.test.mjs` |
| Preview compiler/integrity | `tests/r012-preview-compiler.test.mjs`, browser screenshots and computed styles |
| Gate A/B | `tests/r012-gate-a-artifact-binding.test.mjs`, `tests/r012-gate-b-deep.test.mjs` |
| Owner/Release/Rollback | `tests/r012-owner-binding.test.mjs`, `tests/r012-release-store.test.mjs` |
| Semantic Compare/Isolation | `tests/r012-semantic-compare.test.mjs`, `tests/r012-multi-agent-isolation.test.mjs` |
| Consumer | `tests/r012-consumer-release-invariant.test.mjs` |
| Linux harness | `tests/r012-linux-installed-harness.test.mjs`; local status remains `LINUX_PENDING` |
| Regression | `npm test` with zero failures |
| Packaging | `npm pack`, clean temp install, installed CLI and consumer smoke |
| Review Bundle | checksum, dependency-closure and extracted-bundle reproducibility validation |
