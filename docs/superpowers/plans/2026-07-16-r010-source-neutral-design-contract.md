# R-010 Source-neutral Design Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Recrafts with source-observation/portable-system separation, measurable source-distance and delivery-readiness gates, then prove those capabilities with a fresh no-Oracle Together/Spade rerun.

**Architecture:** Add focused R-010 schemas and pure validators under `contracts/` and `runtime/`, expose repository scripts around those validators, and keep the existing R-001–R-009 package/runtime behavior backward compatible. The real-case rerun lives under a new immutable `examples/golden-candidates/spade-source-neutral-v2/` root and records fresh capture, Host identity/prompt hash, package lineage, preview coverage and regression evidence.

**Tech Stack:** Node.js 20 ESM, built-in `node:test`, existing Recrafts schema validator, Playwright capture/runtime, HTML/CSS/SVG/PNG preview artifacts, JSON/Markdown contracts.

---

### Task 1: Contract schemas and validation API

**Files:**
- Create: `contracts/source-observation.schema.json`
- Create: `contracts/portable-system.schema.json`
- Create: `contracts/source-distance.schema.json`
- Create: `contracts/preview-coverage.schema.json`
- Create: `contracts/delivery-readiness.schema.json`
- Create: `runtime/source_neutral_contract.mjs`
- Test: `tests/r010-contracts.test.mjs`

- [ ] Write failing tests that load every R-010 schema, reject unknown/missing fields, keep exact source values in observations, and reject mandatory exact source values in Core Grammar.
- [ ] Run `node --test tests/r010-contracts.test.mjs`; expect failures because the files and exported validator API do not exist.
- [ ] Implement strict schemas and `validateSourceNeutralArtifactSet()` with explicit observation, portable-token, Core Grammar, theme, component-maturity and readiness checks.
- [ ] Re-run the directed test; expect all Task 1 assertions to pass.

### Task 2: Source-distance, topology and identity safety

**Files:**
- Create: `runtime/source_distance.mjs`
- Create: `scripts/validate-source-distance.mjs`
- Create: `scripts/validate-identity-safety.mjs`
- Test: `tests/r010-source-distance.test.mjs`
- Test: `tests/r010-identity-safety.test.mjs`

- [ ] Write failing tests for all ten distance dimensions, signature-trait combination risk, topology risk, the pilot-ready block, forbidden source names/copy and `TRACEFIELD®` without a legal record.
- [ ] Run the two tests and verify failures are caused by missing validators.
- [ ] Implement deterministic scoring and file scanning; allow source names only in declared Evidence/provenance/review paths.
- [ ] Re-run the two tests and verify positive and negative fixtures pass.

### Task 3: Agent, preview and accessibility gates

**Files:**
- Create: `scripts/validate-agent-contract.mjs`
- Create: `scripts/validate-preview-coverage.mjs`
- Create: `scripts/validate-preview-accessibility.mjs`
- Create: `runtime/preview_accessibility.mjs`
- Test: `tests/r010-agent-contract.test.mjs`
- Test: `tests/r010-preview-gates.test.mjs`

- [ ] Write failing tests proving two independent render requests resolve from JSON contracts, Core components require states/keyboard/preview coverage, Carousel/Slide require eight individual pages, real-image records are required, and semantic/focus/reduced-motion/contrast checks block readiness.
- [ ] Run directed tests and verify expected failures.
- [ ] Implement the minimal pure validators and CLI wrappers with JSON reports and non-zero exits on failure.
- [ ] Re-run directed tests and keep R-001–R-009 tests green.

### Task 4: Package evolution and delivery status compatibility

**Files:**
- Modify: `runtime/package_evolution.mjs`
- Modify: `runtime/interop_operations.mjs`
- Modify: `package.json`
- Test: `tests/r010-package-evolution.test.mjs`

- [ ] Write failing tests showing optional R-010 canonical artifacts survive `submit-correction` and `accept-artifacts`, accepted R-010 Packages may be `pilot-ready`, and `production-ready` is rejected without production evidence.
- [ ] Run the directed test and verify the current fixed canonical-file behavior fails it.
- [ ] Extend package evolution only when an R-010 contract manifest is present; preserve legacy status and artifact sets unchanged.
- [ ] Re-run R-010, R-007 and full tests.

### Task 5: Fresh capture and no-Oracle bundle

**Files:**
- Create: `examples/golden-candidates/spade-source-neutral-v2/input/source-manifest.json`
- Create: `examples/golden-candidates/spade-source-neutral-v2/captures/**`
- Create: `examples/golden-candidates/spade-source-neutral-v2/validation/no-oracle-rerun-report.json`
- Create: `scripts/build-r010-no-oracle-report.mjs`
- Test: `tests/r010-no-oracle.test.mjs`

- [ ] Write a failing fixture test that rejects old `design.md`, previous preview PNGs or previous Package files in Host inputs.
- [ ] Capture Together and Spade at desktop and mobile using the real browser runtime, recording URLs, lifecycle, DOM/CSS/computed styles, regions, fonts, motion/resource evidence and hashes.
- [ ] Build an allowlisted Host input manifest from fresh Evidence plus generic schemas/instructions only.
- [ ] Generate and validate the no-Oracle report; record any inaccessible Evidence class as a limitation rather than fabricating it.

### Task 6: Auditable Host analysis and domain extraction

**Files:**
- Create: `prompts/r010-source-neutral-host-analysis.md`
- Create: `examples/golden-candidates/spade-source-neutral-v2/analysis/host-run.json`
- Create: `examples/golden-candidates/spade-source-neutral-v2/analysis/host-analysis.json`
- Create: `examples/golden-candidates/spade-source-neutral-v2/source-observations/*.json`
- Create: `examples/golden-candidates/spade-source-neutral-v2/portable-system/*.json`

- [ ] Hash the generic Host prompt and every Fresh Evidence input before analysis.
- [ ] Inspect source screenshots with the vision-capable Host and record actual agent, engine/model disclosure, capabilities, prompt hash, timestamps and uncertainty.
- [ ] Produce separate source observations, Claims, Core Grammar, three themes, semantic tokens, component/template candidates, source-distance risks and high-impact questions.
- [ ] Validate that exact values and signature traits stay source-locked and that alternative themes preserve the same Core Grammar.

### Task 7: Machine-readable Package and preview suite

**Files:**
- Create: `examples/golden-candidates/spade-source-neutral-v2/packages/<new-package-id>/**`
- Create: `examples/golden-candidates/spade-source-neutral-v2/previews/**`
- Create: `examples/golden-candidates/spade-source-neutral-v2/validation/{source-distance-report,preview-coverage,accessibility-report,font-metrics-report}.json`

- [ ] Create the new immutable analysis Package and complete Agent Artifact Set with lineage identities.
- [ ] Build System Board, Core Component sheet, theme/source-distance sheets, Web A/B at 320/390/768/1024/1440, two posters, eight Carousel pages/contact sheet, eight 16:9 Slides/contact sheet and two licensed/original real-image previews.
- [ ] Render screenshots and run source-distance, identity, Agent-contract, preview-coverage and accessibility validators.
- [ ] Keep delivery status `reviewable` until project-owner correction and visual review are recorded.

### Task 8: Human correction and acceptance gate

**Files:**
- Create: `examples/golden-candidates/spade-source-neutral-v2/review/owner-review-packet.html`
- Create after owner input: `examples/golden-candidates/spade-source-neutral-v2/review/owner-correction.json`
- Create after owner input: `examples/golden-candidates/spade-source-neutral-v2/review/owner-decision.json`
- Create after owner input: `examples/golden-candidates/spade-source-neutral-v2/packages/<corrected-package-id>/**`
- Create after owner input: `examples/golden-candidates/spade-source-neutral-v2/packages/<accepted-package-id>/**`

- [ ] Present shell/brand separation, Core Grammar, distance report, themes, Core promotions, topology, legal/accessibility limits and coverage in Chinese.
- [ ] Stop at the owner gate; do not synthesize a project-owner verdict.
- [ ] After explicit owner input, execute normal `submit-correction` and `accept-artifacts` to create new immutable identities.
- [ ] Validate `pilot-ready`; never claim `production-ready`.

### Task 9: Realization, comparison and closure

**Files:**
- Create after acceptance: `examples/golden-candidates/spade-source-neutral-v2/realizations/<realization-id>/**`
- Create: `examples/golden-candidates/spade-source-neutral-v2/comparison/old-vs-new/{contract-diff.json,source-distance-diff.json,preview-contact-sheet.png,review-summary.md}`
- Create: `dev-workflow/results/R-010-recrafts-source-neutral-design-contract-result.md`
- Create: `dev-workflow/review-packets/R-010-recrafts-source-neutral-design-contract-review-packet.md`

- [ ] Generate realization from the accepted portable contract and verify fidelity against that contract rather than source closeness.
- [ ] Only now load the prior run/review and build the old-vs-new regression comparison.
- [ ] Run all R-010 validators, `npm test`, identity/no-Oracle/hash checks, and frozen-RC/CraftsOS/Layoutcrafts boundary checks.
- [ ] Record exact evidence, limitations and the bounded R-010 statement in the result and independent-review packet.

## Self-review

- Spec coverage: Tasks 1–4 cover general schemas/runtime/gates; Tasks 5–7 cover Fresh Evidence, Host analysis and previews; Task 8 preserves the human gate; Task 9 covers acceptance-dependent closure and regression.
- Boundary: no CraftsOS/Layoutcrafts or frozen RC path is modified; historical Spade output is read only after the new accepted output exists.
- TDD: every new runtime behavior begins with a directed failing test; generated evidence/artifacts are validated by those APIs and separate integrity checks.
- Known checkpoint: Task 8 requires explicit project-owner input and cannot be completed autonomously.
