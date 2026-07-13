# R-007 Result — Human Correction, Artifact Acceptance and Rollback

## Outcome

Protocol `1.1` now exposes nine canonical operations. `submit-correction`, `accept-artifacts`, and `rollback-package` extend the existing six without changing version `0.4.0-rc.1` or Schema `3.0.0`.

`submit-correction` accepts only project-owner or authorized-reviewer events. It validates the base package identity, `before` snapshot, target, Evidence refs, Claim refs, and operation type before writing. It rejects attempts to replace identity or provenance fields. Token, Component, Grid, Region, Conflict, confirm, and reject corrections are represented as overlays in a new Package; Evidence, Claims, and the first extraction snapshot remain unchanged. Correction and decision histories are JSONL append-only records.

`accept-artifacts` accepts only matching `PASS` or completed `PASS_WITH_CHANGES` decisions. Its Gate validates provenance, correction decision context, source currentness, blocked-source state, conflict status, output isolation, and Artifact hashes. Open high conflicts fail closed unless a project-owner decision binds the exact conflict to an explicit risk statement and accepted scope; the resulting conflict is recorded as `accepted-risk` with resolver and decision identity.

Every candidate and accepted Package receives a content-derived `package_id`, `artifact_set_id`, canonical SHA-256 map, and lineage event. R-007 never overwrites a base directory or marks historical packages superseded.

`rollback-package` requires accepted current and target packages. The Golden chain proves:

```text
package-A blocked
→ correction-1
→ package-B awaiting-review
→ decision-1 PASS
→ package-C accepted
→ correction-2
→ package-E awaiting-review
→ decision-2 PASS
→ package-F accepted
→ rollback F to C
→ package-G accepted
```

Package G has a new identity, parent F, restored-from C, a new rollback event, and canonical Artifact hashes equal to C. Directory hashes confirm A, C, and F remain unchanged after later operations.

## Contracts and validators

Added strict contracts for correction, artifact decision, rollback decision, Artifact Set, package lineage, and all three operation requests. Public validators cover correction integrity, acceptance, lineage, rollback, canonical hashes, provenance, currentness, and immutable extraction records.

Positive tests cover all ten correction types, candidate creation, PASS/PASS_WITH_CHANGES acceptance, explicit accepted-risk, accepted Artifact Sets, the complete Golden chain, rollback identity, and hash restoration. Negative tests cover before mismatch, unknown targets/refs, provenance rewrite, unauthorized Host acceptance, wrong candidate, open high conflict, stale Evidence, blocked sources, missing provenance, non-accepted rollback inputs, and output collision.

## Final verification

```text
npm test: 85/85 passed
validate:r001: passed
validate:r002: passed
validate:r003-preflight: passed
validate:r003-realization: passed
validate:r004: passed
validate:r005 immutable Build 5: passed
validate:r006: 7/7 passed
validate:r007: 10/10 passed
R-007 public validators: passed
development tarball clean install: passed
clean-install operations exposed: 9/9
tarball SHA-256: 4822f802e526f063b698c194047ba9362e9d62e765755eacbe66c82433ad524a
Build 5 diff: empty
CraftsOS/Layoutcrafts runtime import scan: empty
```

The clean-install fixture is explicitly labeled deterministic, non-live protocol evidence. It installs outside the source repository and executes capabilities, prepare, submit, correct, accept, validate, later correction/acceptance, rollback, and final validation without CraftsOS.

## Limitations and R-008 recommendation

R-007 does not close CF-01: a real public URL has not yet produced independently auditable browser DOM/CSS/computed-style, screenshot/region, font, and complete lifecycle Evidence. The dependency-free live adapter remains partial. R-007 also does not claim final cross-input closure, public RC readiness, or visual-quality certification from its deterministic clean-install fixture.

R-008 should run the full image/image-set/real-public-URL closure suite with an auditable Host/browser adapter, repeat correction/acceptance/rollback from the installed tarball, verify final release inventory and language, and obtain independent plus project-owner final acceptance.

> R-007 proves that Recrafts can apply decision-bound human corrections without overwriting source Evidence, Claims or extraction history, create a validated accepted Artifact Set, and rollback to a prior accepted state through a new immutable package identity. It does not yet prove the final cross-input independent MVP release qualification or real public URL complete capture.
