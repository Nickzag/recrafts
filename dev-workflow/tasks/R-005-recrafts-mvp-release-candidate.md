# R-005 Task Authority

- Owner decision: `owner-decision-r004-pass`
- Independent R-004 review: `ACCEPT`
- Written spec review: `PASS WITH CHANGES`
- Corrected specification: `docs/superpowers/specs/2026-07-13-r005-standalone-packaging-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-13-r005-release-candidate.md`
- Release version: `0.3.0-rc.1`
- Status: authorized implementation

R-005 builds an npm tarball, portable RC bundle, two-phase Host-Agent JSON Envelope and clean-install evidence. Recrafts does not embed a vision provider. The release claim is protocol-level and excludes public publication, universal Host certification, full VIS, direct CraftsOS/Layoutcrafts integration and production readiness.

## Build 5 Correction Authority

- Independent Build 4 review: `REVISE`
- Mechanical packaging and clean install: `PASS`
- Host-Agent interoperability usefulness: `REWORK`
- Project-owner Release Verdict: `PENDING`
- Required immutable output: `recrafts-0.3.0-rc.1-build5`

Build 4 remains unchanged. Build 5 must copy sanitized inputs into a bounded Prepared Bundle, enforce `host-analysis.schema.json` before semantic validation, leave normal Host submissions at `awaiting-owner-review`, and require a bounded Owner Decision import before realization. The public Operation set remains the six R-005 Operations; `generate-realization` may import an explicit decision file, create a new approved package identity, then realize that approved package. Deterministic fixture approval is permitted only under an explicit interoperability-fixture option and must remain distinguishable from a real project-owner decision.

Decision identity must propagate through the approved source manifest, package manifest, compiled contract and realization manifest. Missing Host classification must remain `unknown` and must block canonical promotion. Build 5 must record all source and evidence commits without rewriting Build 4.
