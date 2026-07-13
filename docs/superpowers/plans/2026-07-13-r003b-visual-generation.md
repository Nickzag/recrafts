# R-003B Canonical Visual Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagents are prohibited by project rules unless separately approved.

**Goal:** Generate standalone, inspectable System Board, Component Gallery and three-state CraftsOS Workbench previews from corrected package `package-ffa63ca8b0ea69af`, with required screenshots and mechanical compliance evidence.

**Architecture:** A framework-neutral renderer loads the corrected package, compiles package tokens into CSS custom properties, normalizes component contracts, and writes unminified HTML/CSS/JS into a new versioned realization directory. Shared runtime assets drive all pages; page templates contain structure and trace attributes but no independent canonical design system. Playwright captures required viewports after validators prove token, component, state and trace coverage.

**Tech Stack:** Node.js ESM, HTML5, CSS custom properties, vanilla JavaScript, Playwright CLI, Node test runner.

---

### Task 1: Record authorized R-003B specification

**Files:**
- Create: `dev-workflow/tasks/R-003B-recrafts-mvp-canonical-visual-generation.md`
- Modify: `dev-workflow/results/R-003-recrafts-mvp-visual-realization-result.md`

- [ ] Record the authorized package, artifact scope, viewport list, non-goals and no-overwrite rule.
- [ ] Record that R-003A is complete and R-003B is authorized but not yet visually reviewed.
- [ ] Run `rg -n "fidelity|production readiness|complete website" dev-workflow/tasks/R-003B-recrafts-mvp-canonical-visual-generation.md` and confirm every occurrence is a non-goal.

### Task 2: Test and implement the versioned realization loader

**Files:**
- Create: `tests/r003b-renderer.test.mjs`
- Create: `realization/realization_runtime.mjs`
- Modify: `realization/package_loader.mjs`

- [ ] Write a failing test that loads `package-ffa63ca8b0ea69af`, creates a new empty realization directory and expects `preview/runtime/compiled-contract.json`.
- [ ] Run `node --test tests/r003b-renderer.test.mjs`; expect failure because the runtime does not exist.
- [ ] Implement `createRealization({ packageDirectory, outputDirectory })` with version collision and non-empty-directory rejection.
- [ ] Compile package IDs, tokens, components, states and evidence into one deterministic intermediate contract.
- [ ] Run the single test; expect pass.

### Task 3: Test and implement token-driven shared runtime assets

**Files:**
- Create: `realization/render_runtime_assets.mjs`
- Generate: `preview/runtime/tokens.css`
- Generate: `preview/runtime/base.css`
- Generate: `preview/runtime/components.css`
- Generate: `preview/runtime/surfaces.css`
- Generate: `preview/runtime/preview.js`
- Generate: `preview/runtime/asset-map.json`

- [ ] Write failing assertions that all package token IDs compile to CSS variables and every preview-only fallback is labeled in `compiled-contract.json`.
- [ ] Implement CSS variable generation exclusively through `compileTokenVariables()`.
- [ ] Put dimensional preview fallbacks under `--preview-*` variables with `data-fallback-status="preview-only"`; never add them to package tokens.
- [ ] Implement quiet neutral surfaces, restrained system-blue interaction states, compact controls and progressive disclosure using compiled variables.
- [ ] Run the renderer test; expect token assertions to pass.

### Task 4: Render System Board

**Files:**
- Create: `realization/render_system_board.mjs`
- Generate: `preview/system-board.html`

- [ ] Write failing assertions for the 14 required board sections, package/analysis/decision IDs, rejected decisions, capability limits and evidence trace attributes.
- [ ] Render all sections from the compiled contract without embedding package token values in the template.
- [ ] Visibly distinguish confirmed, observed, suggested preview-only, rejected and not-testable rows.
- [ ] Run the renderer test; expect System Board assertions to pass.

### Task 5: Render Component Gallery and state matrices

**Files:**
- Create: `realization/render_component_gallery.mjs`
- Generate: `preview/component-gallery.html`

- [ ] Write failing assertions for at least 27 component families and the 12 priority state matrices.
- [ ] Render each family with scope, anatomy, token dependencies, states, evidence refs, confidence and unknowns.
- [ ] Use `data-component-contract-id`, `data-token-ids`, `data-scope`, `data-state` and `data-evidence-refs` on rendered examples.
- [ ] Run the renderer test; expect component/state assertions to pass.

### Task 6: Render three priority Workbench states

**Files:**
- Create: `realization/render_workbench.mjs`
- Generate: `preview/surface-preview.html`

- [ ] Write failing assertions for no global header, exactly three persistent columns and state selectors `default`, `selected-object`, `agent-suggestion`.
- [ ] Render left Artboard Rail, center Canvas workflow and right Inspector from component contracts.
- [ ] Keep suggestion cards contextual in the center workflow; do not create chat history or a fourth column.
- [ ] Use a generic local sample composition whose colors never enter compiled global tokens.
- [ ] Run the renderer test; expect all surface assertions to pass.

### Task 7: Implement mechanical compliance validators

**Files:**
- Create: `scripts/check-r003-token-compliance.mjs`
- Create: `scripts/validate-r003-realization.mjs`
- Generate: `validation/token-compliance.json`
- Generate: `validation/component-coverage.json`
- Generate: `validation/state-coverage.json`
- Generate: `validation/traceability-report.json`
- Update: `validation/realization-readiness.json`

- [ ] Write negative tests for Oracle input, output overwrite, missing component/state, unresolved trace ref, remote asset URL, direct CraftsOS import, fidelity claim and canonical color/radius outside token compilation.
- [ ] Validate that canonical CSS declarations reference variables; allow only explicitly inventoried preview fallback variables.
- [ ] Validate 27 component families, 12 state matrices, three Workbench states and every trace ID.
- [ ] Run `npm test`; expect all tests pass.

### Task 8: Capture required screenshots

**Files:**
- Create: `scripts/capture-r003-previews.mjs`
- Generate: `preview/screenshots/system-board-1440x900.png`
- Generate: `preview/screenshots/component-gallery-1440x900.png`
- Generate: `preview/screenshots/surface-preview-2048x1280.png`
- Generate: `preview/screenshots/surface-preview-1440x900.png`
- Generate: `preview/screenshots/surface-preview-1280x800.png`

- [ ] Serve the versioned realization directory locally with a read-only static server.
- [ ] Use Playwright to capture the declared files and viewports without interacting with external sites.
- [ ] Confirm all screenshots are non-empty PNG files and Surface columns do not overlap at 1280×800.
- [ ] Run `node scripts/validate-r003-realization.mjs <realization-dir>`; expect pass.

### Task 9: Visual inspection and mechanical fixes

**Files:**
- Modify generated renderer source files only; regenerate versioned output instead of patching generated HTML directly.

- [ ] Inspect the five screenshots for hierarchy, canvas dominance, three-column integrity, fallback labels and contextual suggestions.
- [ ] Fix only mechanical inconsistencies such as overlap, clipping, illegible contrast or missing trace labels.
- [ ] Regenerate into a new realization version if renderer inputs change; preserve prior output.
- [ ] Re-run screenshots and all validators.

### Task 10: Update Result and Review Packet

**Files:**
- Modify: `dev-workflow/results/R-003-recrafts-mvp-visual-realization-result.md`
- Modify: `dev-workflow/review-packets/R-003-recrafts-mvp-visual-realization-review-packet.md`
- Create: `review/visual-realization-review.md`

- [ ] Record realization ID, package chain, visual artifacts, screenshot hashes, compliance results and limitations.
- [ ] Keep project-owner visual Verdict `PENDING`; Codex must not self-approve taste or fidelity.
- [ ] Run `npm run validate:r003-realization`, `npm test` and `git diff --check`.
- [ ] Commit with the required Chinese `问题或需求描述｜修复或实现思路` format.

## Self-Review

- Spec coverage: all authorized artifacts, first three Workbench states, five required screenshots, trace fields, compliance outputs and non-goals map to explicit tasks.
- Scope: secondary states and website preview remain after first visual review, as required.
- No placeholders: every implementation step names concrete files, commands and expected outcomes.
- Type consistency: renderer entrypoint is `createRealization({ packageDirectory, outputDirectory })`; validators consume the same versioned realization directory.
