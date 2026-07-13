# Recrafts Extraction Draft

status: draft
readiness: extraction-complete
preview_readiness: pending
fidelity_readiness: not-started
source_coverage: multi-source
system_confidence: evidence-bounded
run_id: run-1f13a391f3f5

## Metadata
Host-Agent Skill Mode; deterministic composition from validated input evidence.

## Source Summary
13 source(s): library-card-view (6bab60b9d7dc), library-list-view (cc3ca02fb6f7), library-masonry-view (d7af20148d49), editor-insert-inspector (2c296aad4d10), editor-format-inspector (a42fabdb65bb), editor-style-inspector (74fd845d662d), style-gallery-modal (27f02c5a2b2d), page-info-inspector (735247267ffa), imagine-onboarding (7a5290fd7538), appearance-settings (17c57163627e), premium-pricing-modal (391cd569f049), shared-empty-state (6ffd334fa21b), editor-focus-view (874a7a4fb09d)

## Source Classification
Region-level classes are stored in source-classification.json.

## Scoped Token Candidates
- surface.hierarchy.direction: layered-neutral-shell [surface; inferred; broad-only]
- marketing.visual-family: feature-specific [marketing; observed; broad-only]

## Layout Grammar
App shell: multi-region; responsive behavior remains unknown.

## Component Candidates
- ApplicationSurface: Organize persistent product regions
- StateContainer: Represent an observed UI state

## Provenance
Every observed candidate references evidence-map.json; excluded regions do not feed inference.

## Content Isolation
User-generated content and marketing surfaces cannot become global tokens.

## Measurement Limits
Exact typography, micro spacing, icon geometry and pixel fidelity are not-testable for blurred evidence.

## Open Questions
See open-questions.md.

## Known Limitations
No preview, production component, fidelity, full-site reconstruction, VIS, CraftsOS integration or production-readiness claim.
