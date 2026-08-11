# R-012 v2 Validation Command Matrix

| Gate | Command | Required result |
|---|---|---|
| Parser/IR | `node --test tests/r012-design-parser.test.mjs` | PASS |
| Preview | `node --test tests/r012-preview-integrity.test.mjs` | PASS |
| Dual gates | `node --test tests/r012-dual-gates.test.mjs` | PASS |
| Governance | `node --test tests/r012-version-governance.test.mjs` | PASS |
| Isolation/compare | `node --test tests/r012-multi-agent-isolation.test.mjs tests/r012-semantic-visual-diff.test.mjs` | PASS |
| Consumer | `node --test tests/r012-consumer-compatibility.test.mjs` | PASS |
| Blind harness | `node --test tests/r012-blind-agent-qualification.test.mjs` | harness READY; real agent PENDING |
| Standalone | `node --test tests/r012-standalone.test.mjs` | Darwin PASS |
| Full regression | `npm test` | 0 failures |
| Linux diagnostic | `node scripts/run-r012-linux-qualification.mjs --diagnostic-non-linux true` | fail-closed / LINUX_PENDING |
| Linux evidence | `node scripts/validate-r012-linux-evidence.mjs <evidence>` | NOT RUN until separately authorized |
| Review bundle | `node scripts/build-r012-review-bundle.mjs` | checksum/integrity PASS |
