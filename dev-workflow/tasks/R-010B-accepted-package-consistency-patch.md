# R-010B — Accepted Package Metadata and Validation Consistency Patch

> Scope: bounded post-acceptance consistency hardening  
> Base accepted Package: `package-c2a9b64984ab6d02`  
> Frozen Package mutation: forbidden  
> Recrafts Source Neutrality capability changes: out of scope  
> CraftsOS/Layoutcrafts changes: forbidden

## Goal

Create a new immutable Package that preserves all accepted R-010 design contracts and previews while making the Package self-describing and internally consistent for human and Agent consumers.

## Required Changes

1. Generate accepted `design.md` metadata from immutable lineage. It must identify accepted version/status, current and parent Package, pilot-ready delivery, original Owner Decision and current Artifact Set. Review-stage authorization language must be removed or moved to a clearly labeled history appendix.
2. Add `validation/index.json` containing authoritative report path, status, SHA-256, superseded report paths/reason and validation run ID.
3. Add an acceptance-finalization validator that checks human-readable state against Package, delivery, lineage, Owner Decision and authoritative PASS reports.
4. Update future `accept-artifacts` finalization to compose accepted metadata instead of retaining stale review headers.
5. Preserve all R-010 contracts except canonical metadata, all 36 preview hashes, source-distance output, original Owner Decision and pilot-ready state.

## Output

- new corrected Package
- new accepted Package
- new Artifact Set
- `metadata-consistency-report.json`
- `validation-authority-report.json`
- R-010B result
- R-010B review packet

## Acceptance

- `design.md` is self-consistent;
- package-only consumers can identify authoritative validation;
- no historical Package is mutated;
- no design or preview regression;
- full repository tests pass.
