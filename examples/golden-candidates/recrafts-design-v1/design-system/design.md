---
schema: recrafts.design/v1
id: deterministic-qualification-fixture
name: Deterministic Qualification Fixture
version: 0.1.0
status: candidate
release_id: null
parent_release: null
evidence_revision: E-FIXTURE-1
decision_revision: null
derived_from: [C-FIXTURE-1]
generated_by: recrafts-deterministic-harness
generated_at: "2026-08-09T00:00:00.000Z"
confidence: { overall: 0.8 }
agent_usable: false
---
# Design System

## 1. Overview
Deterministic qualification fixture. This is not an Accepted Design System and is not evidence of real visual understanding.

## 2. Foundations
```yaml recrafts:foundations
color:
  - { id: color.surface, role: canvas background, value: "#f7f7f5", certainty: measured, confidence: 0.9, source_relationship: deterministic fixture, usage: canvas, forbidden_usage: acceptance claim }
  - { id: color.panel, role: component surface, value: "#ffffff", certainty: measured, confidence: 0.93, source_relationship: deterministic fixture, usage: component, forbidden_usage: real-source claim }
  - { id: color.text, role: primary text, value: "#20201e", certainty: measured, confidence: 0.94, source_relationship: deterministic fixture, usage: text, forbidden_usage: decorative fill }
  - { id: color.border, role: subtle boundary, value: "#d8d8d3", certainty: observed, confidence: 0.86, source_relationship: deterministic fixture, usage: border, forbidden_usage: emphasis }
  - { id: color.accent, role: selected state, value: "#dce8ff", certainty: observed, confidence: 0.84, source_relationship: deterministic fixture, usage: selected, forbidden_usage: brand claim }
spacing:
  - { id: spacing.row, role: row rhythm, value: 12px, range: [10px, 14px], certainty: inferred, confidence: 0.7, source_relationship: deterministic fixture, usage: row gaps, forbidden_usage: precise measurement claim }
  - { id: spacing.section, role: section rhythm, value: 24px, certainty: observed, confidence: 0.82, source_relationship: deterministic fixture, usage: composition, forbidden_usage: compact row }
radius:
  - { id: radius.control, role: control corner, value: 8px, certainty: observed, confidence: 0.8, source_relationship: deterministic fixture, usage: component boundary, forbidden_usage: shell topology }
border:
  - { id: border.hairline, role: subtle boundary width, value: 1px, certainty: observed, confidence: 0.86, source_relationship: deterministic fixture, usage: border width, forbidden_usage: emphasis }
typography:
  - { id: typography.body, role: body text, value: "14px/1.5 system-ui", certainty: inferred, range: [13px, 15px], confidence: 0.7, source_relationship: deterministic fixture, usage: component text, forbidden_usage: exact font claim }
```

## 3. Layout & Composition
```yaml recrafts:compositions
- id: composition.workspace
  role: workspace
  required_regions: [sidebar, canvas]
  optional_regions: [inspector]
  constraints: [canvas remains primary]
  layout:
    display: grid
    columns: ["minmax(180px, 0.32fr)", "minmax(0, 1fr)"]
    gap_token: spacing.row
    region_order: [canvas, sidebar]
  regions:
    - { id: sidebar, role: navigation, component_refs: [component.row] }
    - { id: canvas, role: primary content, component_refs: [component.row] }
    - { id: inspector, role: secondary detail, component_refs: [] }
    - { id: navigation, role: mobile navigation, component_refs: [component.row] }
```

## 4. Components
```yaml recrafts:components
- id: component.row
  role: navigation row
  maturity: candidate
  anatomy: [title, metadata]
  required_parts: [title]
  optional_parts: [metadata]
  allowed_children: [text]
  forbidden_children: [marketing-banner]
  variants: [default, dense]
  states: [state.default, state.selected]
  token_usage: [color.surface, spacing.row, color.panel, color.text, color.border, color.accent, spacing.section, radius.control, border.hairline, typography.body]
  content_archetypes: [text-heavy]
  layout_constraints: [single row]
  responsive_behavior: hides metadata on mobile
  accessibility_behavior: exposes selection
  allowed_variation: neutral content
  unknowns: [hover transition]
  specimen:
    element: article
    sample_content: [Fixture row, Deterministic sample]
    token_bindings: { background: color.panel, text: color.text, border: color.border, border_width: border.hairline, radius: radius.control, padding: spacing.row, font: typography.body }
    state_bindings:
      state.selected: { background: color.accent }
    layout:
      flow: horizontal
      slot_order: [title, metadata]
      alignment: center
      internal_gap: spacing.row
```

## 5. States & Interaction
```yaml recrafts:states
- { id: state.default, trigger: initial render, transition: none, precedence: base, mutual_exclusion: [disabled], keyboard_behavior: focusable, state_persistence: none, visual_delta: base, accessibility_semantics: none, certainty: observed, visual_tokens: {} }
- { id: state.selected, trigger: selection, transition: unknown, precedence: focus then selected, mutual_exclusion: [disabled], keyboard_behavior: Enter selects, state_persistence: session, visual_delta: subtle surface, accessibility_semantics: aria-selected, certainty: observed, visual_tokens: { background: color.accent } }
```

## 6. Responsive & Content
```yaml recrafts:responsive
desktop: { preserved_regions: [sidebar, canvas, inspector], collapsed_regions: [], relocated_regions: [], priority_order: [canvas, sidebar, inspector], min_width: 1024 }
compact: { preserved_regions: [sidebar, canvas], collapsed_regions: [inspector], relocated_regions: [], priority_order: [canvas, sidebar], min_width: 640, max_width: 1023 }
mobile: { preserved_regions: [canvas], collapsed_regions: [sidebar, inspector], relocated_regions: [navigation], priority_order: [canvas, navigation], max_width: 639 }
content_archetypes: [text-heavy, image-led, table/data, mixed, link-preview, empty, loading, error]
```

## 7. Agent Rules
```yaml recrafts:agent-rules
- choose compositions before components
- preserve unknown values as unknown
- do not introduce unsupported hover states
```

## 8. Do's, Don'ts & Unknowns
```yaml recrafts:constraints
forbidden_patterns: [generic dashboard]
known_unknowns: [exact font, hover transition]
allowed_deviation: [neutral fixture content]
unsupported_behaviors: [unobserved animation]
```
