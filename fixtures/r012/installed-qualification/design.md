---
schema: recrafts.design/v1
id: installed-qualification
name: Installed Qualification
version: 0.1.0
status: candidate
release_id: null
parent_release: null
evidence_revision: E-INSTALLED
decision_revision: null
derived_from: [C-INSTALLED]
generated_by: installed-qualification-harness
generated_at: "2026-08-09T00:00:00.000Z"
confidence: { overall: 0.8 }
agent_usable: false
---
# Design System

## 1. Overview
Deterministic installed-package qualification fixture; never an Accepted Design Release.

## 2. Foundations
```yaml recrafts:foundations
color:
  - { id: color.surface, role: application background, value: "#f7f7f5", certainty: measured, confidence: 0.95, source_relationship: deterministic fixture, usage: primary canvas, forbidden_usage: real-source claim }
  - { id: color.panel, role: component surface, value: "#ffffff", certainty: measured, confidence: 0.93, source_relationship: deterministic fixture, usage: component specimen, forbidden_usage: real-source claim }
  - { id: color.text, role: primary text, value: "#20201e", certainty: measured, confidence: 0.94, source_relationship: deterministic fixture, usage: text, forbidden_usage: decorative fill }
  - { id: color.border, role: subtle boundary, value: "#d8d8d3", certainty: observed, confidence: 0.86, source_relationship: deterministic fixture, usage: component border, forbidden_usage: emphasis }
  - { id: color.accent, role: selected state, value: "#dce8ff", certainty: observed, confidence: 0.84, source_relationship: deterministic fixture, usage: selected state, forbidden_usage: brand claim }
spacing:
  - { id: spacing.row, role: row rhythm, value: 12px, range: [10px, 14px], certainty: inferred, confidence: 0.72, source_relationship: deterministic fixture, usage: row gaps, forbidden_usage: exact measurement claim }
  - { id: spacing.section, role: section rhythm, value: 24px, certainty: observed, confidence: 0.82, source_relationship: deterministic fixture, usage: composition, forbidden_usage: compact row }
radius:
  - { id: radius.control, role: control corner, value: 8px, certainty: observed, confidence: 0.8, source_relationship: deterministic fixture, usage: component boundary, forbidden_usage: shell topology }
border:
  - { id: border.hairline, role: subtle boundary width, value: 1px, certainty: observed, confidence: 0.86, source_relationship: deterministic fixture, usage: component border width, forbidden_usage: emphasis }
typography:
  - { id: typography.body, role: body text, value: "14px/1.5 system-ui", certainty: inferred, range: [13px, 15px], confidence: 0.7, source_relationship: deterministic fixture, usage: component text, forbidden_usage: exact font claim }
```

## 3. Layout & Composition
```yaml recrafts:compositions
- id: composition.workspace
  role: document workspace
  required_regions: [sidebar, canvas]
  optional_regions: [inspector, navigation]
  constraints: [sidebar remains subordinate]
  layout:
    display: grid
    columns: ["minmax(180px, 0.32fr)", "minmax(0, 1fr)"]
    gap_token: spacing.section
    region_order: [canvas, sidebar]
  regions:
    - { id: sidebar, role: navigation, component_refs: [component.document-row] }
    - { id: canvas, role: primary content, component_refs: [component.document-row] }
    - { id: inspector, role: secondary detail, component_refs: [] }
    - { id: navigation, role: mobile navigation, component_refs: [component.document-row] }
```

## 4. Components
```yaml recrafts:components
- id: component.document-row
  role: document navigation
  maturity: candidate
  anatomy: [thumbnail, title, metadata]
  required_parts: [title]
  optional_parts: [thumbnail, metadata]
  allowed_children: [text, image]
  forbidden_children: [marketing-banner]
  variants: [default, dense]
  states: [state.default, state.selected]
  token_usage: [color.panel, color.text, color.border, color.accent, spacing.row, radius.control, border.hairline, typography.body]
  content_archetypes: [text-heavy, image-led]
  layout_constraints: [single row]
  responsive_behavior: collapses metadata on mobile
  accessibility_behavior: exposes row selection
  allowed_variation: neutral content only
  unknowns: [hover transition]
  specimen:
    element: article
    sample_content: [Document title, Updated recently]
    token_bindings: { background: color.panel, text: color.text, border: color.border, border_width: border.hairline, radius: radius.control, padding: spacing.row, font: typography.body }
    state_bindings:
      state.selected: { background: color.accent }
    layout:
      flow: horizontal
      slot_order: [thumbnail, title, metadata]
      alignment: center
      internal_gap: spacing.row
```

## 5. States & Interaction
```yaml recrafts:states
- { id: state.default, trigger: initial render, transition: none, precedence: base, mutual_exclusion: [disabled], keyboard_behavior: focusable row, state_persistence: none, visual_delta: base tokens, accessibility_semantics: no selection announcement, certainty: observed, visual_tokens: {} }
- { id: state.selected, trigger: explicit selection, transition: unknown, precedence: focus then selected, mutual_exclusion: [disabled], keyboard_behavior: Enter selects, state_persistence: workspace session, visual_delta: accent surface, accessibility_semantics: aria-selected, certainty: observed, visual_tokens: { background: color.accent } }
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
- do not introduce generic dashboard cards
```

## 8. Do's, Don'ts & Unknowns
```yaml recrafts:constraints
forbidden_patterns: [generic SaaS dashboard, unsupported accent]
known_unknowns: [exact font file, hover transition]
allowed_deviation: [neutral content substitution]
unsupported_behaviors: [unobserved hover animation]
```
