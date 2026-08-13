# Schema deltas

- New Canonical Schema: `packages/recrafts-design/schemas/design-intelligence.schema.json`; root file is a `$ref` alias.
- `verify-source-fidelity`: optional Overlay and Intelligence inputs; `r013-evidence-grounded` profile requires Intelligence.
- `validate-design`: optional Intelligence input; `r013-evidence-grounded` profile requires it.
- Gate reports may bind the Intelligence report and Gate B downstream result.
- Candidate comparison now requires a non-authorizing Decision Ledger Candidate.
- Geometry visual binding can carry an Overlay SHA for three-artifact consistency.

Ajv remains the sole structural authority. Runtime validates only cross-object identity, evidence semantics, authority, maturity, coverage, and hashes.
