# R-007 — Human Correction, Artifact Acceptance and Rollback

Source: `Recrafts Task Pack.zip`, authorized by the R-006 independent review on 2026-07-13.

Target `0.4.0-rc.1`, Protocol `1.1`, Schema `3.0.0`, branch `recrafts/r-007-correction-acceptance-rollback`. Preserve every prior package and release candidate. Do not modify or depend on CraftsOS/Layoutcrafts.

Add canonical operations `submit-correction`, `accept-artifacts`, and `rollback-package` beside the existing six. Human corrections, artifact decisions, and rollback decisions must be Schema-validated, restricted to project-owner or authorized-reviewer authority, append-only, Evidence/Claim-bound, and applied only into a new empty package directory.

Corrections support Token, Component, Grid, Region, Conflict, and generic candidate replace/reject/confirm actions. `before` must exactly match the base candidate. Original Evidence, Claims, and initial domain extraction remain immutable. Correction output is `awaiting-review` or `blocked`, never accepted.

Acceptance creates a new `accepted` package only after a matching PASS or completed PASS_WITH_CHANGES decision. It must reject open high conflicts, stale or blocked mandatory sources, invalid provenance, missing hashes, unauthorized actors, and mismatched package identities. High accepted-risk requires explicit project-owner scope, risk statement, conflict ID, and decision binding.

Rollback requires accepted current and target packages, creates a new accepted identity, restores the target canonical artifact hashes, records current as parent and target as restored-from, and leaves every earlier package byte-for-byte unchanged.

Required artifacts include correction/decision JSONL, correction diff, artifact set, lineage, integrity/readiness validation, and canonical design/domain/conflict artifacts. Add operation, record, artifact-set, lineage, and rollback contracts; four public validators; positive/negative coverage; deterministic Golden chain; standalone tarball smoke; R-001→R-007 regression; Result and Review Packet.
