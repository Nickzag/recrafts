# R-010 — Recrafts Source-Neutral Design Contract Hardening and Spade Re-run

> Repository: `/Users/Nick/Documents/Recrafts`  
> Recommended branch: `recrafts/r-010-source-neutral-design-contract`  
> Task type: general Recrafts capability enhancement + controlled real-case re-run  
> Priority: P1 post-MVP quality enhancement  
> Source targets:
> - `https://together.agency/work/spade/?ref=rebrand`
> - `https://spade.com/`
> Prior review package: `chatgpt-review-package-spade-visual-system-2026-07-15.zip`
> CraftsOS/Layoutcrafts modification: forbidden  
> Frozen RC modification: forbidden  
> Full website cloning: out of scope

---

# 0. Objective

Improve Recrafts so that a repeated analysis of the same source produces a more source-neutral, machine-executable and production-aware visual system.

The new run must preserve the transferable design logic:

```text
sparse explanation
→ dense evidence
→ semantic data attachment
→ measured boundaries
→ one visual protagonist
→ explicit proof
```

while avoiding the previous run’s over-concentration of source-specific traits:

```text
exact source greens
+ cut corners
+ viewport measurement rails
+ centered sparse hero topology
+ contour object
+ transaction chip
```

The task has two inseparable outcomes:

1. implement general Recrafts improvements that apply to future sources;
2. rerun the Together/Spade sources from fresh Evidence and prove the improvements through a new immutable Package and preview suite.

This is not a one-off manual redesign of `Tracefield`.

---

# 1. Review Findings Converted Into Product Requirements

## 1.1 Accepted strengths to preserve

Recrafts correctly identified:

```text
Together case-study shell ≠ Spade brand layer
sparse explanation ≠ dense proof canvas
data graphics require semantic attachment
full proof canvas ≠ universal card grid
cross-media consistency ≠ one shared template
```

These remain required capabilities.

## 1.2 P0 defects to remove

```text
source-specific traits combined into a near-signature formula
exact source colors promoted directly as portable core tokens
source-like hero topology retained
unverified registered-trademark symbol generated
```

## 1.3 P1 defects to remove

```text
component inventory larger than component contracts
design.md primarily natural language rather than machine-readable contract
accessibility described but not validated
font strategy lacks tested legal alternatives
carousel and slide claims exceed preview evidence
image-treatment rules are not validated with real imagery
exportable status is stronger than actual validation
```

## 1.4 P2 improvements

```text
extended color families need evidence or candidate status
icon grammar needs measurable rules
content and multilingual stress tests are missing
preview and release statuses are inconsistent
```

---

# 2. Hard Boundary: No-Oracle Re-run

The previous Package, `design.md`, generated previews and ChatGPT review may be used only for:

```text
requirements definition
regression comparison after generation
validator fixtures
independent review
```

They must not be used as source-analysis input.

Forbidden during the new extraction and Host analysis:

```text
feeding the old design.md to the Host
feeding old preview PNGs to the Host
telling the Host the expected alternative Hero
telling the Host the exact P0/P1 answers
requiring a particular new palette
requiring a particular component inventory
using the prior review as expected visual output
```

The analysis input must be limited to:

```text
fresh source Evidence
capture policy
generic Recrafts schemas
generic source-neutrality instructions
declared target media
```

Create:

```text
validation/no-oracle-rerun-report.json
```

It must record input files and hashes and prove that prior output artifacts were excluded from the analysis bundle.

---

# 3. Preserve Historical Runs

Do not overwrite the first run or review package.

Create a new run identity and output root, for example:

```text
examples/golden-candidates/spade-source-neutral-v2/
```

Required lineage:

```text
previous_review_reference
new_capture_id
new_analysis_id
new_package_id
new_correction_id
new_accepted_package_id
new_artifact_set_id
new_realization_id
```

The old and new Package directories must remain immutable.

---

# 4. New Contract Layer: Source Observation vs Portable System

The previous run promoted exact source observations directly into the portable system. R-010 must introduce a strict separation.

## 4.1 Source-observed layer

Create:

```text
source-observations/
  observed-colors.json
  observed-typography.json
  observed-layout.json
  observed-shapes.json
  observed-motion.json
  observed-topology.json
  observed-motifs.json
```

Each observation must contain:

```text
observation_id
domain
value
source_scope
Evidence refs
Claim refs
confidence
source-specificity
portability risk
```

`source-specificity`:

```text
low
medium
high
```

Exact source Hex values, font names, measured cuts and source Hero geometry belong here.

## 4.2 Portable design layer

Create:

```text
portable-system/
  core-grammar.json
  semantic-tokens.json
  theme-contracts.json
  component-contracts.json
  template-contracts.json
  accessibility-contract.json
  source-distance-policy.json
```

Portable objects must describe transferable roles and mechanisms rather than simply copying source values.

Example:

```json
{
  "token_id": "color.signal.primary",
  "role": "single prioritized signal",
  "constraints": {
    "max_area_ratio": 0.1,
    "text_use_requires_contrast": true
  },
  "derived_from_observation_refs": ["obs-color-12"],
  "transformation": "role-preserved-value-transformed",
  "source_distance": "medium"
}
```

---

# 5. Core Grammar and Theme Separation

Create two explicit layers.

## 5.1 Core Instrument Grammar

`core-grammar.json` contains only transferable mechanisms:

```text
explanation/proof density rhythm
semantic attachment of data
one visual protagonist
measured relationship
evidence before decoration
flat structural hierarchy
limited simultaneous signals
proof-canvas preference
medium-aware narrative sequence
```

Core Grammar must not require:

```text
forest green
lemongrass green
13px or 17px corner cuts
left/right viewport rails
a contour circle
a transaction chip
centered two-line Hero
condensed wordmark
```

## 5.2 Theme contracts

Create at least three theme contracts:

```text
theme-derived
theme-alternative-a
theme-alternative-b
```

Requirements:

- `theme-derived` may retain transformed family resemblance.
- `theme-alternative-a` must use a non-green primary family.
- `theme-alternative-b` must avoid cut corners and use a different measured-boundary form.
- all three must preserve the same Core Grammar.
- no theme may use the source logo, source copy or proprietary contour graphics.

The final `design.md` must clearly distinguish:

```text
Core Grammar
Theme selected for previews
Other valid themes
Source-locked observations not promoted
```

---

# 6. Source-Distance Model

Create:

```text
contracts/source-distance.schema.json
runtime/source_distance.mjs
scripts/validate-source-distance.mjs
```

Required assessment dimensions:

```text
identity and trademark
copy and naming
exact color dependence
typography dependence
shape/motif dependence
page topology
component combination
imagery and proprietary assets
motion signature
overall combination risk
```

Each dimension:

```text
score: 0–100 similarity risk
status: low / medium / high
Evidence refs
observed source traits
portable output traits
mitigation
review status
```

## 6.1 Combination risk

Do not evaluate each trait only in isolation.

A high-risk combination must be detected when multiple signature traits co-occur in one surface.

Example high-risk combination:

```text
near-exact source green palette
+ centered sparse full-height Hero
+ edge measurement rails
+ cut-corner canvas
+ contour object
+ transaction data chip
```

## 6.2 Topology signature

Create a structural representation for each major source and preview surface:

```text
region order
relative area
alignment
density
primary object location
CTA location
measurement boundary location
background transitions
```

The validator does not need pixel matching.

It must detect when the generated Hero preserves too many source relationships.

Required gate:

```text
high topology risk + high motif-combination risk
→ output cannot be pilot-ready
```

---

# 7. Identity and Legal-Symbol Gate

Create:

```text
scripts/validate-identity-safety.mjs
```

Scan all generated text, HTML, SVG, JSON and Markdown for:

```text
source brand names in reusable artifacts
source slogans
unapproved trademarks
®
™
℠
copied legal statements
```

Rules:

- `®` is blocked unless an explicit legal-status record authorizes it.
- generated working names must not imitate the source logo’s distinctive lockup.
- source names are allowed only in Evidence, provenance, review and source-reference files.
- source names are forbidden in portable preview content unless the task explicitly requires a source comparison label.

Required negative test:

```text
TRACEFIELD® without legal record → blocked
```

---

# 8. Semantic Token Contract

Create machine-readable:

```text
tokens/source-observed.json
tokens/semantic.json
tokens/theme-derived.json
tokens/theme-alternative-a.json
tokens/theme-alternative-b.json
tokens/accessibility-pairs.json
```

## 8.1 Required token domains

```text
color
typography role
spacing
grid
boundary
corner treatment
border
shadow
motion
focus
image treatment
icon geometry
z-index
content density
```

## 8.2 Token fields

```text
token_id
domain
role
value or range
scope
status
confidence
Evidence refs
Claim refs
source-observation refs
portability classification
allowed usages
forbidden usages
validation method
```

Statuses:

```text
observed
candidate
portable
theme-only
preview-only
rejected
```

Extended colors with no preview or Evidence support must remain `candidate`.

## 8.3 Accessibility pairs

Calculate and store:

```text
foreground token
background token
contrast ratio
normal-text status
large-text status
non-text status
allowed contexts
```

Required gates:

```text
WCAG AA for normal text
3:1 for large text and essential non-text UI
no accent token used as white-background body text when failing
```

---

# 9. Typography and Font Licensing Contract

Source font names remain in the observation layer.

Portable output must provide:

```text
font role
required metrics
licensed or open alternatives
fallback stack
Latin/CJK pairing
numeric behavior
condensation range
line-break test
platform status
```

Create:

```text
typography/font-role-contracts.json
typography/font-alternative-matrix.json
validation/font-metrics-report.json
```

Test at minimum:

```text
macOS system fallback
Windows system fallback
one open-license Web Font stack
Chinese/English mixed heading
long English heading
long Chinese heading
financial numbers
code/data labels
```

No font file may be redistributed without authorization.

---

# 10. Component Contract Maturity

Replace the flat component list with maturity levels:

```text
core
candidate
media-primitive
rejected
```

Only `core` components are reusable Agent contracts.

Every Core Component must contain:

```text
component_id
purpose
scope
anatomy
required slots
optional slots
variants
states
interaction
keyboard
responsive behavior
accessibility semantics
token dependencies
content constraints
allowed compositions
forbidden compositions
Evidence refs
Claim refs
validation rules
```

The previous approximately 34 named components must not remain Core by default.

Promote only components that are fully specified and previewed.

Required validators:

```text
Core component missing state contract → fail
Core interactive component missing keyboard semantics → fail
Core component not represented in preview → fail or downgrade to candidate
```

---

# 11. Agent-executable Artifact Set

The accepted output must include:

```text
design.md
source-observations.json
core-grammar.json
tokens.json
themes.json
components.json
templates.json
accessibility.json
source-distance-report.json
preview-coverage.json
artifact-set.json
```

`design.md` is the readable synthesis, not the sole executable contract.

Every important rule needs:

```text
rule_id
scope
status
rationale
Evidence refs
Claim refs
allowed
forbidden
validation method
```

Add:

```text
scripts/validate-agent-contract.mjs
```

It must prove that two independent render requests can use the same contracts without relying on hidden prose assumptions.

---

# 12. Delivery-readiness Status Model

Replace the single `exportable` label with:

```text
draft
reviewable
pilot-ready
production-ready
blocked
```

## reviewable

Requires valid contracts and previews.

## pilot-ready

Requires:

```text
no P0 source-distance issue
identity/legal gate pass
Core Component contracts complete
machine-readable Artifact Set
desktop/mobile validation
basic accessibility validation
owner visual review
```

## production-ready

Additionally requires:

```text
licensed font decision
full accessibility audit
production implementation validation
performance budget
real interaction testing
complete responsive/content stress testing
```

R-010 is expected to target:

```text
pilot-ready
```

It must not claim `production-ready`.

---

# 13. Preview Coverage Contract

Create:

```text
contracts/preview-coverage.schema.json
validation/preview-coverage.json
```

Required preview set:

## 13.1 System previews

```text
system board
Core Component contract sheet
theme comparison sheet
source-distance comparison sheet
```

## 13.2 Web

Create at least two genuinely different website structures:

```text
Web A: selected derived theme
Web B: alternative theme and alternative Hero topology
```

Web B must not use:

```text
centered full-height Hero
left/right viewport rails
same object/CTA positions as source
```

Render at:

```text
320
390
768
1024
1440
```

## 13.3 Poster

At least two independent posters:

```text
one derived-theme poster
one alternative-theme poster
```

They must not both use the same contour-circle composition.

## 13.4 Carousel

Generate eight individual pages plus a contact sheet.

Validate:

```text
cover
problem
insight
mechanism
evidence
use case
result
CTA
```

## 13.5 Slide

Generate eight individual 16:9 slides plus a contact sheet.

Validate projection-size typography separately from social-media typography.

## 13.6 Real imagery

At least two previews must use licensed, original or internally supplied imagery:

```text
one commerce/physical object
one infrastructure/place scene
```

Data overlays must plausibly describe the depicted object or event.

CSS contour shapes alone are insufficient.

---

# 14. Accessibility and Semantic Implementation Gate

Create:

```text
scripts/validate-preview-accessibility.mjs
validation/accessibility-report.json
```

Required checks:

```text
semantic navigation links
buttons are buttons
links have valid href
code uses code/pre semantics
figure/figcaption where applicable
visible focus
focus not clipped by masks
keyboard navigation
minimum touch target
contrast pairs
prefers-reduced-motion implementation
marquee disabled or replaced in reduced motion
heading hierarchy
landmark structure
image alt behavior
```

Use automated tooling when available and record unavailable checks explicitly.

Required viewport/content stress:

```text
320px
390px
200% text zoom
long English heading
long Chinese heading
large currency value
negative value
empty data
error state
no-image state
```

---

# 15. Icon and Image Grammar

## 15.1 Icon contract

Define:

```text
16 / 20 / 24 grid
stroke width
corner behavior
line caps
filled vs outline policy
directional marker policy
data icon vs action icon
active/disabled states
optical correction
```

## 15.2 Image contract

Define and preview:

```text
crop behavior
subject placement
lighting preference
texture
color grading
data-overlay safe zones
caption relation
source/license record
```

Image rules must be demonstrated, not prose-only.

---

# 16. Controlled Re-run Sequence

## Stage A — Fresh capture

Capture the Together case page and current Spade site again.

Required:

```text
source manifest
URL lifecycle
DOM/CSS/computed-style Evidence
desktop/mobile screenshots
case-study media/regions
font declarations
motion references
source hashes
```

Separate:

```text
Together shell
Spade brand system
platform UI
case-study presentation
content examples
```

## Stage B — Host analysis

Use a fresh vision-capable Host run.

Required Host instruction principles:

```text
extract mechanisms before values
separate source observation from portable recommendation
identify signature combinations
propose Core Grammar independent of theme
identify at least two valid transformation paths
avoid legal/trademark assumptions
state uncertainty
```

Do not mention the expected final colors, Hero layout or previous generated system.

## Stage C — Domain extraction

Produce:

```text
source observations
Claims
portable Core Grammar
semantic tokens
theme candidates
component candidates
template contracts
source-distance risks
conflicts
```

High-impact questions must include at least:

```text
which exact values are source-locked
which combinations create identity risk
which topology traits are portable
which components are generic mechanisms vs brand signatures
which image/motion traits are unverified
```

## Stage D — Human correction

Project owner reviews:

```text
shell/brand separation
Core Grammar
source-distance report
theme selection
Core Component promotions
Hero topology
legal symbols
accessibility limitations
preview coverage
```

Use normal `submit-correction`.

Do not edit Package files manually.

## Stage E — Acceptance

Use normal `accept-artifacts`.

The accepted Package must be `pilot-ready`, not `production-ready`.

## Stage F — Realization

Generate the complete preview coverage set.

## Stage G — Fidelity and source-distance verification

Run:

```text
verify-fidelity
validate-source-distance
validate-agent-contract
validate-preview-accessibility
validate-preview-coverage
```

Fidelity means consistency with the accepted portable contract, not closeness to the source.

---

# 17. Required Source-distance Acceptance

The rerun cannot pass when any is true:

```text
source brand asset appears in portable output
source copy appears in portable output
unapproved ®/™/℠ appears
exact source colors are the only valid theme
Core Grammar requires source-specific corner values
generated primary Hero has high topology risk
a preview combines four or more high-specificity source traits
all visual previews rely on one contour-circle motif
```

At least two of the following must visibly differ from the source on every primary preview:

```text
palette family
Hero topology
boundary form
primary object form
typography proportion
measurement placement
CTA placement
image strategy
```

The output should retain mechanism-level family resemblance without signature-level replication.

---

# 18. Regression Comparison With the First Run

Only after the new accepted output is generated, compare it with the old package.

Create:

```text
comparison/old-vs-new/
  contract-diff.json
  source-distance-diff.json
  preview-contact-sheet.png
  review-summary.md
```

Compare:

```text
shell/brand separation
Core vs Theme separation
exact-source-token dependence
topology risk
identity/legal safety
component contract completeness
Agent contract completeness
accessibility coverage
cross-media preview coverage
real-image validation
delivery-readiness accuracy
```

Do not score the new run on whether it matches a predetermined appearance.

---

# 19. Required Tests

## Positive tests

```text
source observation kept separate from portable Token
three themes preserve one Core Grammar
non-green theme validates
non-cut-corner theme validates
alternative Hero topology validates
legal name without registered symbol validates
Core Component full contract validates
machine-readable Agent Artifact Set validates
real-image data attachment validates
eight-page carousel validates
eight-slide deck validates
pilot-ready status validates
```

## Negative tests

```text
exact source Hex promoted as mandatory Core value
source font filename packaged
TRACEFIELD® without legal record
source-like Hero topology plus signature motifs
Core Grammar requires forest/lemongrass
Core Component missing states
interactive component missing keyboard behavior
failing contrast pair used for body text
reduced-motion rule present only in prose
carousel represented only by contact sheet
Slide claim without individual slides
image rule without image preview
old design.md included in Host analysis inputs
previous preview PNG included in Host analysis inputs
production-ready without production validation
```

---

# 20. Required Result Files

Create:

```text
dev-workflow/results/R-010-recrafts-source-neutral-design-contract-result.md
dev-workflow/review-packets/R-010-recrafts-source-neutral-design-contract-review-packet.md
```

Result must include:

```text
general Recrafts changes
schema/runtime/validator changes
fresh source capture
Host run identity
no-Oracle proof
new Package lineage
source observation / portable system separation
Core Grammar and themes
source-distance scores
identity/legal validation
component maturity
Agent Artifact Set
preview inventory
accessibility results
old-vs-new regression
known limitations
```

Required bounded statement:

> R-010 improves Recrafts’ ability to distinguish source observations from portable design rules, separate Core Grammar from theme expression, detect signature-level source proximity, export machine-readable Agent contracts and validate pilot-ready cross-media previews. The new Together/Spade run demonstrates these capabilities without treating the previous output or review as an expected visual answer.

---

# 21. Independent Review Request

Requested verdict:

```text
Source understanding: PASS / PASS WITH CHANGES / REWORK
Source-neutrality and originality distance: PASS / PASS WITH CHANGES / REWORK
Token and Agent contract quality: PASS / PASS WITH CHANGES / REWORK
Component contract maturity: PASS / PASS WITH CHANGES / REWORK
Cross-media preview coverage: PASS / PASS WITH CHANGES / REWORK
Accessibility and implementation readiness: PASS / PASS WITH CHANGES / REWORK
No-Oracle rerun integrity: PASS / PASS WITH CHANGES / REWORK
R-010: ACCEPT / REVISE
Delivery readiness: REVIEWABLE / PILOT-READY / BLOCKED
```

Highest-risk questions:

1. Are exact source values retained only as observations rather than mandatory portable Core?
2. Can the same Core Grammar produce visibly different valid themes?
3. Does the source-distance model detect combined signature similarity?
4. Is the new Hero structurally independent from the source?
5. Are legal symbols and source names correctly gated?
6. Are Core Components fully specified rather than merely named?
7. Can an Agent execute the system from JSON contracts without hidden prose assumptions?
8. Do previews validate real imagery, Carousel, Slide and responsive behavior?
9. Are accessibility rules implemented and tested rather than mentioned?
10. Was the old output excluded from analysis inputs?

---

# 22. Completion Checklist

```text
[ ] Historical run preserved
[ ] Fresh source capture completed
[ ] No-Oracle report passes
[ ] Source-observation schemas implemented
[ ] Portable-system schemas implemented
[ ] Core Grammar separated from themes
[ ] Three themes created
[ ] Non-green theme created
[ ] Alternative boundary theme created
[ ] Source-distance model implemented
[ ] Topology signature implemented
[ ] Combination-risk Gate implemented
[ ] Identity/legal Gate implemented
[ ] ® negative test passes
[ ] Semantic tokens exported
[ ] Accessibility pairs exported
[ ] Font alternative matrix exported
[ ] Component maturity implemented
[ ] Core Components have full contracts
[ ] Agent Artifact Set exported
[ ] Delivery-readiness status model implemented
[ ] Web A and Web B rendered
[ ] 320/390/768/1024/1440 rendered
[ ] Two posters rendered
[ ] Eight Carousel pages rendered
[ ] Eight Slide pages rendered
[ ] Real-image previews rendered
[ ] Accessibility validation passes
[ ] Content stress validation passes
[ ] Human correction executed
[ ] Accepted pilot-ready Package created
[ ] Old-vs-new comparison created
[ ] Full Recrafts regression passes
[ ] Frozen RCs unchanged
[ ] CraftsOS/Layoutcrafts unchanged
[ ] Result and Review Packet created
```
