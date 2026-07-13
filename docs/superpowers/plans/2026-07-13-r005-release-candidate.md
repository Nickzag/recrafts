# R-005 Standalone Packaging and Interoperability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagents are prohibited by repository instructions unless separately approved.

**Goal:** Build a clean-installable Recrafts npm release candidate with a stable two-phase Host-Agent JSON Envelope and auditable portable bundle.

**Architecture:** A dependency-free ESM interoperability adapter reads exactly one JSON request from stdin, validates the envelope and operation-specific contract, applies canonical filesystem safety, and delegates to focused operation handlers. A release builder uses `npm pack --json`, assembles a versioned portable bundle, runs an isolated install/smoke flow and writes fail-closed RC evidence without publishing externally.

**Tech Stack:** Node.js ESM, JSON Schema artifacts, npm pack/install, Node test runner, SHA-256.

---

### Task 1: Record authority and release identities

**Files:**
- Create: `dev-workflow/tasks/R-005-recrafts-mvp-release-candidate.md`
- Modify: `manifest.json`
- Modify: `package.json`

- [ ] Record `owner-decision-r004-pass`, independent R-004 ACCEPT, protocol-level RC scope and non-goals.
- [ ] Set prerelease version `0.3.0-rc.1`, Node engine and `recraft-interop` bin entry.
- [ ] Expand npm `files` allowlist only for runtime, realization, contracts, schemas, prompts, templates and labeled interoperability fixtures required by the declared operations.
- [ ] Run `npm pack --json --dry-run`; expect no review files, raw source images, historical outputs, `.DS_Store`, Playwright files or private absolute paths.

### Task 2: Add envelope and operation-specific contracts

**Files:**
- Create: `contracts/envelope-request.schema.json`
- Create: `contracts/envelope-response.schema.json`
- Create: `contracts/host-analysis.schema.json`
- Create: `contracts/release-manifest.schema.json`
- Create: `contracts/operations/capabilities.request.schema.json`
- Create: `contracts/operations/prepare-analysis.request.schema.json`
- Create: `contracts/operations/submit-analysis.request.schema.json`
- Create: `contracts/operations/validate-package.request.schema.json`
- Create: `contracts/operations/generate-realization.request.schema.json`
- Create: `contracts/operations/verify-fidelity.request.schema.json`
- Test: `tests/r005-contracts.test.mjs`

- [ ] Write failing tests that parse every Schema, require the six exact operations and allow only `completed`, `completed_with_warnings`, `needs_host_action`, `failed`.
- [ ] Define strict operation inputs, write behavior, output policy, capability requirements, Artifact types and stable error codes.
- [ ] Define Host Analysis evidence refs, Scope, confidence, findings, token candidates, component candidates and execution identity; prohibit an empty vision claim.
- [ ] Run `node --test tests/r005-contracts.test.mjs`; expect pass.

### Task 3: Implement canonical filesystem safety

**Files:**
- Create: `runtime/path_security.mjs`
- Test: `tests/r005-path-security.test.mjs`

- [ ] Write failing tests for traversal, symlink escape, Oracle/expected after resolution, input/output containment, non-empty output, URL input, FIFO/socket/device and repository-private path leakage.
- [ ] Implement `resolveSafeInput({ value, workingRoot, allowedTypes })`, `resolveSafeOutput({ value, workingRoot, inputs })` and `toArtifactPath({ file, outputRoot })` using `realpath`, `lstat` and containment checks.
- [ ] Ensure response paths are relative POSIX paths and never machine-specific absolute paths.
- [ ] Run `node --test tests/r005-path-security.test.mjs`; expect pass.

### Task 4: Implement the JSON Envelope adapter

**Files:**
- Create: `runtime/interop_contract.mjs`
- Create: `runtime/interop_cli.mjs`
- Test: `tests/r005-interop.test.mjs`

- [ ] Write failing tests for one-request stdin, one-response stdout, stderr-only diagnostics, protocol negotiation, unknown fields, stable error codes, limits and exact operation dispatch.
- [ ] Implement `handleEnvelope(request, context)` with deterministic response construction and artifact hashing.
- [ ] Implement `capabilities` without filesystem writes.
- [ ] Return non-zero `failed` responses for invalid JSON, Schema/protocol/operation/capability/path/limit failures; return exit `0` for `needs_host_action`.
- [ ] Run `node --test tests/r005-interop.test.mjs`; expect pass.

### Task 5: Implement two-phase Host analysis

**Files:**
- Create: `runtime/analysis_exchange.mjs`
- Create: `fixtures/interop/sanitized-analysis-fixture.svg`
- Create: `fixtures/interop/host-analysis.fixture.json`
- Create: `fixtures/interop/README.md`
- Test: `tests/r005-analysis-exchange.test.mjs`

- [ ] Write failing tests proving `prepare-analysis` writes only an Evidence Bundle, instructions and Host Analysis Schema reference, returns `needs_host_action`, and never claims semantic completion.
- [ ] Implement preparation with source hash/type/size, bounded source count/bytes and explicit Host action descriptor.
- [ ] Label the Host fixture `deterministic interoperability fixture`, `not a live model result`, `not proof of visual quality`.
- [ ] Write failing tests for invalid refs, missing Scope/confidence, fabricated execution identity and submission/output collisions.
- [ ] Implement `submit-analysis` validation and composition of a versioned standalone Package with design.md, Tokens, Components, evidence, provenance, review and readiness artifacts sufficient for declared downstream operations.
- [ ] Run `node --test tests/r005-analysis-exchange.test.mjs`; expect pass.

### Task 6: Implement package, realization and fidelity handlers

**Files:**
- Create: `runtime/interop_operations.mjs`
- Test: `tests/r005-operations.test.mjs`

- [ ] Write failing tests that `validate-package` delegates to package validation without writes, `generate-realization` delegates to `createRealization` with collision protection, and `verify-fidelity` delegates to bounded R-004 validation.
- [ ] Implement operation handlers using existing modules; do not duplicate extraction, realization or fidelity business logic.
- [ ] Return compact relative Artifact descriptors with type, path, SHA-256, media type and Schema version.
- [ ] Run `node --test tests/r005-operations.test.mjs`; expect pass.

### Task 7: Build npm tarball and portable RC bundle

**Files:**
- Create: `scripts/build-r005-release-candidate.mjs`
- Create: `scripts/validate-r005-release-candidate.mjs`
- Create: `scripts/run-r005-clean-install.mjs`
- Generate: `release-candidates/recrafts-0.3.0-rc.1/`
- Test: `tests/r005-release.test.mjs`

- [ ] Write failing inventory tests for required packaged files and forbidden development/private files.
- [ ] Run `npm pack --json`, copy the tarball into a new RC directory and generate a manifest containing `owner-decision-r004-pass`, source commit, versions, platform/engine metadata and checksums.
- [ ] Assemble portable README, contracts, generic/Codex-style/Claude-style protocol examples with explicit non-certification labels, fixture declarations and evidence directories.
- [ ] In a new temporary directory install the tarball and run help/version, capabilities, prepare-analysis, submit-analysis, validate-package, generate-realization, verify-fidelity and the three required negative cases.
- [ ] Write package contents, interop validation, clean-install report and RC readiness reports.
- [ ] Run `node --test tests/r005-release.test.mjs`; expect pass.

### Task 8: Complete workflow evidence and verification

**Files:**
- Create: `review/r005-release-review.md`
- Create: `dev-workflow/results/R-005-recrafts-mvp-release-candidate-result.md`
- Create: `dev-workflow/review-packets/R-005-recrafts-mvp-release-candidate-review-packet.md`

- [ ] Record RC identity, tarball/bundle hashes, clean-install evidence, Host boundary, packaged fixture labeling, security results, limitations and project-owner release Verdict `PENDING`.
- [ ] Request independent verdicts for mechanical packaging, Host interoperability usefulness and R-005 ACCEPT/REVISE.
- [ ] Run `npm run validate:r001`, `npm run validate:r002`, `npm run validate:r003-preflight`, `npm run validate:r003-realization`, `npm run validate:r004`, `npm run validate:r005`, `npm test` and `git diff --check`.
- [ ] Confirm no CraftsOS/Layoutcrafts business code changed and no unrelated existing files are staged.
- [ ] Commit with required Chinese `问题或需求描述｜修复或实现思路` format.

## Self-Review

- Spec coverage: all P0-01 through P0-07, operation-specific contracts, resource limits, stable errors, forward compatibility, package inventory and bounded claim map to explicit tasks.
- Scope: no embedded provider, MCP, public publish, hosted service, universal Host certification, direct CraftsOS integration or production claim.
- Placeholder scan: no TBD/TODO/incomplete implementation step.
- Type consistency: six operations, four response statuses, `owner-decision-r004-pass` and the RC version are consistent across tasks.

## Build 5 Review-correction Addendum

- [x] Copy sanitized sources to deterministic `prepared/sources/source-N.ext` paths and expose them through the returned Host contract.
- [x] Revalidate prepared source hashes during `submit-analysis` and keep duplicate basenames unambiguous.
- [x] Enforce the complete Host Analysis Schema before semantic checks; add all independent-review mutation cases.
- [x] Compose normal submissions as `awaiting-owner-review` with no fabricated PASS or realization authorization.
- [x] Add bounded Owner Decision import to `generate-realization`, requiring a new approved package identity before realization.
- [x] Isolate deterministic fixture approval behind `options.interoperability_fixture`.
- [x] Propagate decision ID, status and source through package and realization artifacts.
- [x] Preserve Host classifications; missing classification remains `unknown` and cannot become canonical.
- [x] Generate immutable `recrafts-0.3.0-rc.1-build5`, rerun clean install, focused negatives and R-001 through R-005 regression, then update Result and Review Packet while Owner Verdict remains `PENDING`.
