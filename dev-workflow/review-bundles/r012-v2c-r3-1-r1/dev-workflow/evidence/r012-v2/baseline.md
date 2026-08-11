# R-012 v2 Baseline

- Branch: `recrafts/r-012-v2-canonical-design-system-governance`
- HEAD: `b6c00e93694a74d3220265e18f96359e98fbece3`
- Node: `v24.15.0`
- npm: `11.12.1`
- Dependency install: 3 packages, 0 vulnerabilities.
- Full test baseline: 206 tests, 204 passed, 2 failed.

## Existing failures

1. `tests/r002-validator.test.mjs`: package `files` contains two validator names with the historical `no-oracle` marker.
2. `tests/r005-release.test.mjs`: the same two filenames are rejected by the dry-run package inventory rule.

Offending packaged paths:

- `scripts/validate-no-oracle-product-ui.mjs`
- `scripts/validate-r011r-a-no-oracle.mjs`

These failures predate R-012. The approved `package.json` packaging work will remove them from the installed runtime inventory without deleting the repository validators or weakening the checks.

## Environment boundary

- Darwin local execution is available.
- Docker is unavailable.
- Push and workflow dispatch are not authorized.
- Canonical Linux qualification therefore remains `LINUX_PENDING`.
