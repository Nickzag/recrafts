# Recrafts Extraction Draft

status: draft
readiness: extraction-complete
preview_readiness: pending
fidelity_readiness: not-started
source_coverage: multi-source
system_confidence: evidence-bounded
capture_id: capture-cd22687547cb5f95
analysis_id: analysis-01136c0c65ecaa81
package_id: package-bdbf56f23a7f7138

## Metadata
Host-Agent Skill Mode; deterministic composition from validated input evidence.

## Source Summary
13 source(s): appearance-settings (17c57163627e), style-gallery-modal (27f02c5a2b2d), editor-insert-inspector (2c296aad4d10), premium-pricing-modal (391cd569f049), library-card-view (6bab60b9d7dc), shared-empty-state (6ffd334fa21b), page-info-inspector (735247267ffa), editor-style-inspector (74fd845d662d), imagine-onboarding (7a5290fd7538), editor-focus-view (874a7a4fb09d), editor-format-inspector (a42fabdb65bb), library-list-view (cc3ca02fb6f7), library-masonry-view (d7af20148d49)

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
- MarketingPageSection: Represent a bounded public marketing-page section

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
