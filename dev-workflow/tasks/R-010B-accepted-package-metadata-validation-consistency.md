# R-010B Accepted Package Metadata and Validation Consistency

## Status

Approved by the project-owner instruction to execute `Recrafts Final Review Pack (1).zip`.

## Scope

Apply the bounded post-acceptance consistency hardening defined by `R-010B-accepted-package-consistency-patch.md` to the existing R-010 source-neutral Recrafts worktree.

## Required outcomes

- Preserve `package-c2a9b64984ab6d02` and all earlier Packages byte-for-byte.
- Compose future `accept-artifacts` accepted `design.md` metadata from current Package, Artifact Set, delivery-readiness, and Owner Decision lineage.
- Generate a new immutable accepted Package whose `design.md` declares version `0.1.0-r010-accepted`, status `accepted`, delivery readiness `pilot-ready`, parent `package-c2a9b64984ab6d02`, owner decision `decision-r010-owner-pass-20260716`, and its own Package/Artifact Set IDs.
- Remove unresolved review-stage authorization wording from the accepted human-readable contract; retain only a clearly labeled history note.
- Package an authoritative PASS identity-safety report with `validation/index.json`, report SHA-256, superseded report path/reason, and validation run ID.
- Fail closed when accepted metadata, lineage, delivery readiness, or validation authority diverge.
- Preserve non-metadata R-010 contract hashes, 36 preview hashes, source-distance output, owner decision bytes, and pilot-ready state.
- Produce a final regression report, result record, and review packet.

## Boundaries

Only Recrafts R-010 lifecycle/runtime, tests, validation evidence, and the Spade fixture are in scope. Historical Packages are immutable. CraftsOS and Layoutcrafts are not modified. No source re-capture, visual redesign, production-readiness claim, Git commit, or Git push is authorized by this task.

## Verification

Run the focused R-010B tests, `npm run validate:r010`, `npm test`, the source-neutral validator, the acceptance-finalization validator, and the accepted-package validator. Record exact commands, exit codes, tested worktree, Package IDs, Artifact Set IDs, hash comparisons, preview count, and known limitations in the result and review packet.
