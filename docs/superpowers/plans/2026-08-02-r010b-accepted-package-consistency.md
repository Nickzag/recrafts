# R-010B Accepted Package Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a self-describing immutable accepted Package from the frozen R-010 accepted Package while preserving all portable contracts and previews.

**Architecture:** Keep the existing immutable Package lifecycle and add a focused accepted-metadata composer/validator. Metadata-only acceptance derives its final parent from the first bounded correction's frozen base Package, so a staging correction cannot become the human-readable parent of the final accepted Package. Artifact Set IDs are pre-derived before writing `design.md` to avoid a self-hash cycle.

**Tech Stack:** Node.js ESM, `node:test`, JSON/Markdown Package contracts, SHA-256 evidence.

---

### Task 1: Lock the parent-lineage requirement with a failing test

**Files:**
- Modify: `tests/r010b-package-flow.test.mjs`

- [x] Add an assertion that a metadata-only final accepted Package declares `package-c2a9b64984ab6d02` as its parent.
- [x] Run `node --test tests/r010b-package-flow.test.mjs` and observe the expected failure: the implementation currently reports the staging candidate Package as parent.

### Task 2: Correct metadata-only acceptance lineage

**Files:**
- Modify: `runtime/package_evolution.mjs`

- [x] Derive `acceptanceParentPackageId` from the first `finalize-accepted-metadata` correction's `base_package_id`.
- [x] Include the candidate Package ID in the new identity seed while keeping the frozen base as manifest, lineage, Artifact Set, and human-readable design parent.
- [x] Use the same parent in the self-describing Artifact Set seed and finalization validator inputs.
- [x] Run focused package-evolution and R-010B tests and confirm PASS.

### Task 3: Generate the immutable final Package

**Files:**
- Create: `scripts/finalize-r010b-accepted-package.mjs`
- Create: `examples/golden-candidates/spade-source-neutral-v2/packages/package-bfe3df8bc92fd7ad/`

- [x] Refuse to overwrite an existing output directory.
- [x] Accept the existing corrected candidate using the existing final consistency decision.
- [x] Confirm the generated header, manifest, lineage, Artifact Set, validation index, current PASS report, superseded blocked report, metadata report, and authority report agree.

### Task 4: Record regression and review evidence

**Files:**
- Create: `examples/golden-candidates/spade-source-neutral-v2/validation/r010b-final-regression-integrity-report.json`
- Create: `dev-workflow/results/R-010B-accepted-package-consistency-result.md`
- Create: `dev-workflow/review-packets/R-010B-accepted-package-consistency-review-packet.md`

- [x] Run focused and full tests plus all package validators.
- [x] Compare 14 non-metadata contract hashes, source-distance hash, owner decision bytes, and 36 preview entries.
- [x] Record historical Package immutability, boundary confirmation, full test count, and production-readiness limitation.
