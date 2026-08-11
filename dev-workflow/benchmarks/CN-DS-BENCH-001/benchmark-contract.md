# CN-DS-BENCH-001 — Crafts Notes Multi-Model Design System Benchmark

## Shared Contract

### Recrafts Runtime
- Commit: will be set after push
- Package: recrafts@0.5.0-rc.1
- Tarball SHA: da0ba9ee4012028d55e7e975140fabf7705b59a624b6b085d339dac77636efcf
- Protocol: 1.2
- Schema: recrafts.design/v1
- Operations: 11 (parse-design-md, compile-design-ir, validate-design, verify-source-fidelity, render-design-preview, compare-design-candidates, import-design-owner-decision, create-design-release, validate-design-release, rollback-design-release, compare-design-releases)

### Source Hierarchy
TIER A — PRIMARY PRODUCT INTERFACE TRUTH
User-provided Craft screenshots.

TIER B — PRODUCT UNDERSTANDING
Official Craft product/help/documentation pages.

TIER C — BRAND / LANDING-PAGE REFERENCE ONLY
https://www.craft.do/

### Required Outputs Per Model
1. design.md (canonical 8-section format)
2. preview.html (IR-driven, Design IR → CSS tokens → HTML)
3. Candidate Receipt (candidate_id, run_id, agent, input_manifest_sha256, output_sha256)
4. Evidence Bundle (host-instructions.md, evidence-bundle.json, source coverage)

### Benchmark Rules
- ALL_SCREENSHOTS_REVIEWED = YES before Design System extraction
- NO partial-source start
- Landing page is brand reference only; not primary UI evidence
- Authority Manifest binds all model runs
- Target Lock: crafts-notes-v1
- Evidence Revision: E1

### Evaluation
1. Source Fidelity (Gate A)
2. Design System Coherence (Gate B)
3. Layoutcrafts Utility (Layoutcrafts Consumer Gate)
