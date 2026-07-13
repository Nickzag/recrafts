# Corrected Recrafts Design Contract

status: draft
readiness: extraction-reviewed
preview_readiness: ready-with-warnings
fidelity_readiness: not-started
capture_id: capture-cd22687547cb5f95
analysis_id: analysis-0aabae953c97172e
package_id: package-ffa63ca8b0ea69af
owner_decision_set: owner-decision-r002-pass

## Visual Direction
Neutral, compact, softly rounded productivity shell with quiet surfaces, dark neutral text and restrained boundaries.

## Scope
Product shell tokens remain surface-scoped. Document artwork and marketing visuals remain isolated. No global accent is inferred; a selection accent may exist only as a labeled preview fallback.

## Tokens
- app.background: #F6F5F3 [observed; surface; broad-color-family]
- surface.primary: #FFFFFF [observed; surface; broad-color-family]
- surface.secondary: #F1F0EE [observed; surface; broad-color-family]
- text.primary: #20201E [observed; surface; broad-color-family]
- text.secondary: #6F6E69 [suggested; surface; preview-only-fallback]
- border.subtle: rgba(32,32,30,0.10) [suggested; surface; preview-only-fallback]
- accent.rule: no-global-accent; selection accent remains preview-only [confirmed; global; human-decision]
- radius.direction: soft-rounded [observed; surface; direction-only]
- spacing.direction: compact-system-rhythm [observed; surface; direction-only]
- typography.direction: neutral-system-sans [observed; surface; direction-only]
- shell.three-column: left-rail / flexible-canvas / right-inspector [confirmed; surface; human-decision]

## Layout Grammar
No global header; exactly three columns: left artboard rail, flexible center canvas with agent suggestions, right inspector.

## Component Contracts
- Button: default, active, disabled
- IconButton: default, active, disabled
- Tabs: default, active, disabled
- SegmentedControl: default, active, disabled
- SearchField: default, active, disabled
- Toggle: default, active, disabled
- Divider: default
- Badge: default
- Tooltip: default
- Popover: default
- Modal: default, active, disabled
- ScrollArea: default
- NavigationRail: default
- NavigationItem: default, active, disabled
- DocumentCard: default, active, disabled
- DocumentListRow: default, active, disabled
- ViewSwitcher: default
- ToolbarGroup: default
- InspectorPanel: default
- InspectorSection: default, active, disabled
- PropertyRow: default, active, disabled
- EditorCanvas: default
- FloatingControlIsland: default
- SettingsRow: default
- EmptyState: default, active, disabled
- LoadingSkeleton: default, active, disabled

## Decisions
Confirmed: accent.rule, shell.three-column. Rejected: document-artwork-green-as-global-accent, imagine-blue-as-global-background, exact-typography-from-blurred-fixture.

## Measurement Limits
Exact typography, micro spacing, icon geometry and pixel fidelity remain not-testable. Preview-only fallbacks are labeled and do not become canonical source claims.

## Open Questions
No unresolved high-impact Scope question. Production semantics and fidelity remain future work.
