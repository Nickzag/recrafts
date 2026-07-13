# R-007 Correction, Acceptance and Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the independent MVP loop with immutable human correction, validated artifact acceptance, and rollback-as-new-package.

**Architecture:** Add a focused package-evolution runtime beside R-006 capture/extraction. It copies immutable records into a new empty output, applies validated overlays to canonical domain files, derives content-addressed artifact sets and lineage, and exposes fail-closed correction, acceptance, and rollback operations through Protocol 1.1. Validation independently re-hashes artifacts and checks authority, provenance, conflicts, source currency, and lineage.

**Tech Stack:** Node.js 20 ESM, dependency-free JSON Schema subset, `node:test`, SHA-256, JSON/JSONL artifacts, npm tarball smoke.

---

### Task 1: Protocol and decision contracts

**Files:** create operation and decision Schemas under `contracts/operations/`, `contracts/`, and `schemas/`; modify envelope contracts and operation registry; test in `tests/r007-contracts.test.mjs`.

- [ ] Write tests asserting exactly nine operations, required fields, authority enums, allowed correction types, and mutation rejection.
- [ ] Run the contract test and verify RED because the three operations/Schemas do not exist.
- [ ] Add the minimal strict contracts and registry entries.
- [ ] Run the contract test and existing R-005/R-006 contract tests; verify GREEN.

### Task 2: Immutable correction runtime

**Files:** create `runtime/package_evolution.mjs`; modify `runtime/interop_operations.mjs`; test in `tests/r007-package-evolution.test.mjs`.

- [ ] Build a deterministic R-006 package fixture in the test, snapshot every base-file hash, and submit Token/Grid/Conflict corrections.
- [ ] Verify RED because `submit-correction` is unsupported.
- [ ] Implement safe package loading, immutable Evidence/Claims copying, exact `before` matching, reference checks, overlay application, new identity, correction JSONL/diff, artifact-set, lineage, and blocked/awaiting-review derivation.
- [ ] Add focused RED/GREEN cases for replace/reject Token, Component and Grid, region overlay, conflict resolution, confirm/reject candidate, unauthorized actor, unknown target/ref, before mismatch, collision, and unchanged base hashes.

### Task 3: Acceptance Gate

**Files:** extend `runtime/package_evolution.mjs`; create `runtime/r007_validation.mjs`; test acceptance cases in `tests/r007-package-evolution.test.mjs`.

- [ ] Write RED tests for project-owner PASS acceptance, wrong candidate, Host self-acceptance, open high conflict, stale/blocked evidence, missing provenance, and explicit high accepted-risk.
- [ ] Implement decision validation, readiness checks, immutable accepted package creation, decisions JSONL, complete canonical artifact hashes, and accepted lineage.
- [ ] Verify accepted input remains unchanged and the accepted package has a new package/artifact-set identity.

### Task 4: Rollback semantics

**Files:** extend evolution and validation runtimes; add rollback tests.

- [ ] Create the deterministic A→B→C→E→F chain and write RED tests for rollback F→C→G.
- [ ] Implement accepted current/target validation, canonical content restoration, new rollback identity, rollback decision/event, restored-from lineage, and integrity validation.
- [ ] Verify G canonical hashes equal C while identity/lineage differ and A/B/C/E/F hashes remain unchanged.
- [ ] Add RED/GREEN negatives for non-accepted current/target, identity reuse, output collision, and later-history preservation.

### Task 5: Validators, standalone smoke and documentation

**Files:** create `scripts/validate-r007-{corrections,acceptance,lineage,rollback}.mjs`, `scripts/run-r007-clean-install.mjs`, Result and Review Packet; update manifests, README, SKILL, and package inventory.

- [ ] Expose all nine operations and package every required runtime/Schema/fixture/script.
- [ ] Run targeted tests, then full `npm test` and R-001→R-006 validators.
- [ ] Pack to `/tmp`, install outside the repository, and execute capabilities→prepare→submit→correct→accept→validate→rollback→validate.
- [ ] Verify no CraftsOS/Layoutcrafts imports, no prior RC diff, empty worktree after the repository-required commit, and record exact command evidence and limitations.
