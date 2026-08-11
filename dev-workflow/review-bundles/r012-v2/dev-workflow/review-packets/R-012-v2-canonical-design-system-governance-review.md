# R-012 v2 Review Packet

## Review question

Does the implementation establish a canonical, source-backed Design System governance runtime without manufacturing visual understanding, Owner acceptance, real blind-Agent qualification, or Linux readiness?

## Recommended verdict

`PASS FOR LOCAL IMPLEMENTATION / LINUX_PENDING`

## Evidence to inspect

1. `packages/recrafts-design/` — parser, compiler, types, SemVer compatibility.
2. `runtime/design_preview_renderer.mjs` — one-way preview projection and hash binding.
3. `runtime/design_governance.mjs` — separate Gate A/Gate B and three-part release hard gate.
4. `runtime/design_qualification.mjs` — blind allowlist/provenance and split harness/Agent status.
5. `runtime/r012_linux_evidence.mjs` and `.github/workflows/recrafts-r012-linux-qualification.yml` — Linux-only evidence boundary.
6. `schemas/recrafts-design-v1/` and `contracts/operations/` — fail-closed schemas.
7. `examples/golden-candidates/recrafts-design-v1/` — deterministic candidate, public/internal separation.
8. `tests/r012-*.test.mjs` and `dev-workflow/evidence/r012-v2/validation-summary.md` — positive and negative evidence.

## Required boundary confirmations

- Golden fixture: `candidate`, `agent_usable:false`.
- Gate A runtime: PASS; real-source Source Fidelity: NOT_RUN.
- Gate B: PASS and explicitly does not prove Gate A.
- Blind harness: READY; real Blind Agent: PENDING.
- Missing Owner Decision blocks promotion even when both runtime gates pass.
- Local Darwin execution leaves Linux status `LINUX_PENDING`.
- No CraftsOS or Layoutcrafts files were modified.
- No commit, push, merge, release, or workflow dispatch occurred.

## Known limitation

This packet proves the local governance runtime and deterministic harness. It does not prove that Recrafts has correctly recovered a real target visual system, that a blind external Agent can use it, or that the package passes on Linux. Those require the separately authorized qualification round.

