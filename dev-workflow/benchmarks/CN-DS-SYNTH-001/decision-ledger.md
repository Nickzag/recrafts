# CN-DS-SYNTH-001 Decision Ledger

Status: `CANONICAL_SYNTHESIS_CANDIDATE`

Authority: Tier-A screenshots first; cross-model review second; frozen candidates as attributed proposals.

Rule: numeric disagreements are resolved from evidence or preserved as unknown, never averaged.

Evidence IDs `S01`–`S13` follow the frozen Source Pack timestamp order recorded in `input-freeze/source-pack-sha256.json`.

## Foundations

| rule_id | domain | Sol claim | Kimi claim | Grok claim | primary evidence | official evidence | class | synthesis decision | certainty / confidence / relationship | reason | downstream consequence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | Color / shell | quiet neutral shell | sampled pale neutrals | `#f5f5f5` field | S01–S03, S10, S13 | none required | AGREEMENT | low-chroma light-neutral application field | OBSERVED / .94 / direct | repeats across browse, settings and empty views | Layoutcrafts chrome must not compete with canvas |
| F-02 | Color / panel | white document and tool surfaces | sampled white surfaces | `#ffffff` panel | S01, S04–S08 | none | AGREEMENT | white raised/work surfaces | OBSERVED / .95 / direct | recurring across cards, canvas, inspector and modal | use for canvas, inspector and modal surfaces |
| F-03 | Color / text | near-black UI ink | sampled graphite ramp | `#1f2225` | S01–S11 | none | COMPATIBLE_DIFFERENCE | semantic graphite text; exact candidate `#1f2225` | OBSERVED_EXACT / .92 / measured candidate | models agree on role; Grok/Kimi measurements align | use as primary text and dark CTA, not decorative field |
| F-04 | Color / accent | interaction-only blue | sampled blue controls | `#0087ff` | S05, S06, S10 | none | AGREEMENT | configurable interaction accent, observed default `#0087FF` | OBSERVED_EXACT / .94 / measured | caret, toggle and selection use it; sidebar does not | prohibit blue brand wash |
| F-05 | Color / selection | quiet selection | soft blue control fill | `#d5e2ee` chip wash | S05–S06 | none | COMPATIBLE_DIFFERENCE | neutral white sidebar selection; soft-blue inspector selection | OBSERVED / .9 / direct | two selection contexts have different roles | separate navigation and control selected tokens |
| F-06 | Color / destructive | semantic danger | sampled pink-red delete | `#fd3c67` | S08 | none | AGREEMENT | destructive token candidate `#FD3C68` | OBSERVED_EXACT / .9 / measured | isolated irreversible action role | never reuse decorative red swatches |
| F-07 | Typography | system UI, content separate | detailed role ramp | inferred system-ui scale | S01–S13 | product text semantics only | COMPATIBLE_DIFFERENCE | system UI stack; role sizes are implementation candidates | INFERRED / .68 / screenshot-derived | font files and exact metrics unavailable | preserve typography roles; do not claim exact family |
| F-08 | Spacing | compact repeated rhythm | detailed density values | 12px row / 24px section candidates | S01–S10 | none | COMPATIBLE_DIFFERENCE | compact row and section rhythms, values are ranges | INFERRED / .72 / geometry-derived | screenshots support rhythm, not a full exact scale | expose bounded tokens, not a fabricated universal scale |
| F-09 | Radius | restrained rounded geometry | sampled control/card families | 8px control / 14–20px card | S01, S04–S11 | none | COMPATIBLE_DIFFERENCE | small control and larger surface radius families | OBSERVED_RANGE / .8 / geometry-derived | recurrence supports families, not path-exact values | avoid pill-everything UI |
| F-10 | Elevation | shallow separation | subtle material hierarchy | exact blur unknown | S01, S07, S11 | none | AGREEMENT | elevation is role-based and low contrast; exact shadow unknown | UNKNOWN / .55 / bounded | screenshots cannot reliably recover blur recipe | downstream must block invented shadow scale |
| F-11 | Content boundary | content is not chrome | explicit content-color exclusions | explicit exclusion | S03–S11 | none | AGREEMENT | document images, preset art, Imagine gradient and pricing art are excluded from chrome | OBSERVED / .98 / direct | visual diversity belongs to content surfaces | no content palette promotion |

## Layout & Composition

| rule_id | domain | Sol claim | Kimi claim | Grok claim | primary evidence | official evidence | class | synthesis decision | certainty / confidence / relationship | reason | downstream consequence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L-01 | Topology | navigation + workspace + contextual inspector | three-region anatomy | same three-region composition | S04–S08 | none | AGREEMENT | canonical desktop topology has left navigation, main workspace/canvas and optional right inspector | OBSERVED / .98 / direct | repeated intact across editor modes | composition before components |
| L-02 | Sidebar | persistent Space/navigation rail | detailed sections and rows | 240px candidate | S01–S10, S13 | none | AGREEMENT | quiet navigation region, approximately 240–260 CSS px | OBSERVED_RANGE / .92 / measured | screenshot width and recurrence support range | initial Layoutcrafts width must remain within range |
| L-03 | Workspace | object-first center | browse/editor variants | workspace/canvas split | S01–S13 | none | AGREEMENT | center region owns document projections or the document canvas | OBSERVED / .97 / direct | same shell hosts browse and editing | canvas remains visually primary |
| L-04 | Inspector | contextual right tool | measured anatomy | 320px candidate | S04–S08 | none | AGREEMENT | optional contextual Inspector approximately 320–336 CSS px | OBSERVED_RANGE / .92 / measured | repeated right pane with fixed mode tabs | do not turn into generic properties dump |
| L-05 | Inspector modes | Insert/Format/Style/Info distinct | four explicit modes | four explicit modes | S04–S08 | none | AGREEMENT | preserve four modes; Format is block/content, Style is document theming | OBSERVED / .99 / direct | screenshots show different anatomy and semantics | separate contracts and UI states |
| L-06 | All Docs object | one document object, multiple projections | cards/list/dense detail | same projection model | S01–S03 | none | AGREEMENT | card, dense and list are views of the same Document | OBSERVED / .98 / direct | content identities recur while presentation changes | view switch must not transform data type |
| L-07 | Modal | bounded centered overlay | style/plan variants | modal frame | S07, S11 | none | AGREEMENT | centered bounded dialog over inert/dimmed context | OBSERVED / .94 / direct | both examples preserve underlying application | modal contents remain scoped |
| L-08 | Focus | reduced chrome exists | full-width canvas state | sidebar/inspector collapse | S12 | none | AGREEMENT | desktop focus mode may collapse both side regions | OBSERVED / .96 / direct | directly visible in S12 | expose explicit focus composition |
| L-09 | Settings | separate IA from document sidebar | detailed settings anatomy | separate settings composition | S10–S11 | none | AGREEMENT | settings navigator and body are a separate composition | OBSERVED / .95 / direct | left content and controls differ from document mode | do not reuse document inspector semantics |
| L-10 | Responsive | inferred collapse | unsupported exact breakpoints | inferred breakpoints | S12 only | none | CONFLICT | collapse ability is observed; phone/tablet topology and exact thresholds remain unknown | UNKNOWN / .5 / bounded | no narrow-device screenshots | qualification bands are not product truth; integration must surface ambiguity |

## Components

| rule_id | domain | Sol claim | Kimi claim | Grok claim | primary evidence | official evidence | class | synthesis decision | certainty / confidence / relationship | reason | downstream consequence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C-01 | Sidebar item | mature nav contract | row/section detail | formal item specimen | S01–S10, S13 | none | AGREEMENT | icon/label/trailing row; selected uses white neutral pill | OBSERVED / .96 / direct | strong recurrence | canonical core component |
| C-02 | Document card | preview-card anatomy | exact card variants | formal comfortable/dense card | S01, S03 | none | AGREEMENT | title plus optional live preview/badge; content remains scoped | OBSERVED / .95 / direct | repeated document projection | support text/image/mixed density |
| C-03 | Document row | list/table contract | metadata columns | formal row | S02 | none | AGREEMENT | title-first row with secondary metadata and hairline separation | OBSERVED / .92 / direct | one screen but multiple rows | optional metadata may collapse before title |
| C-04 | View mode control | explicit view switch | three-state toggle | under-specified | S01–S03 | none | COMPATIBLE_DIFFERENCE | segmented/icon control changes projection only | OBSERVED / .93 / direct | corresponding view outputs are visible | must preserve document identity |
| C-05 | Inspector tabs | ContextInspector modes | explicit four tabs | formal tab | S04–S08 | none | AGREEMENT | four-mode tablist at Inspector top | OBSERVED / .99 / direct | direct screenshot labels | no generic Properties label |
| C-06 | Insert control | catalog contract | tiles and groups | formal insert tile | S04 | none | AGREEMENT | grouped insert catalog of compact icon/name tiles | OBSERVED / .94 / direct | categories and tile rhythm visible | blocks are actions, not marketing cards |
| C-07 | Format control | block/content formatting | detailed chips, alignment, swatches | style-chip too broad | S05 | none | CONFLICT | dedicated format controls: role, emphasis, alignment, list, color and font | OBSERVED / .94 / direct | Format anatomy is distinct from Style | do not collapse into style chip abstraction alone |
| C-08 | Style control | document theme controls | detailed backdrop/cover/separator/font | style-chip partial | S06–S07 | none | CONFLICT | dedicated page-style controls plus bounded Style Gallery modal | OBSERVED / .95 / direct | page-level settings and gallery are visible | gallery artwork is content, not tokens |
| C-09 | Info control | document metadata/actions | detailed Page Info/Actions | absent as a dedicated component | S08 | none | CONFLICT | Info pane owns metadata, review actions and destructive delete | OBSERVED / .96 / direct | visible hierarchy is materially distinct | destructive action must remain scoped and low in hierarchy |
| C-10 | Settings row | reusable row/choice contracts | detailed toggles and choices | toggle only | S10 | none | COMPATIBLE_DIFFERENCE | settings section + row + choice/toggle contracts | OBSERVED / .9 / direct | multiple repeating rows | keep settings controls out of editor Inspector |
| C-11 | Modal | general overlay system | Style Gallery and pricing variants | modal frame | S07, S11 | none | AGREEMENT | common frame; body variants remain domain-specific | OBSERVED / .94 / direct | frame recurs, artwork does not | canonicalize frame, not promo composition |
| C-12 | Empty state | quiet functional absence | ghost-grid details | formal empty-browse | S09, S13 | none | AGREEMENT | subdued empty status; shared/browse may reuse latent structure | OBSERVED / .9 / direct | two distinct empty contexts | no decorative empty-state hero |
| C-13 | Loading skeleton | state contract | exact ghost cards | missing as component | S13 | none | CONFLICT | card-grid skeleton with low-contrast blocks | OBSERVED / .92 / direct | loading and empty coexist visibly | expose as independent state/component |
| C-14 | Assistant entry | secondary persistent entry | FAB detail | formal entry | S04–S13 | none | AGREEMENT | quiet trailing-corner assistant opener | OBSERVED / .9 / direct | repeats without dominating work | assistant remains secondary to creation |
| C-15 | Primary action | graphite CTA hierarchy | dark primary button | formal near-black button | S11 | none | AGREEMENT | primary action uses graphite/near-black, not accent wash | OBSERVED / .88 / direct | clear pricing modal example | do not make every action black |

## States, Responsive, Agent Rules

| rule_id | domain | Sol claim | Kimi claim | Grok claim | primary evidence | official evidence | class | synthesis decision | certainty / confidence / relationship | reason | downstream consequence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S-01 | Selection | context-specific hierarchy | selected nav/chip/control detail | selected state | S01, S05–S06, S10 | none | AGREEMENT | selection uses context-specific neutral or soft-accent treatment | OBSERVED / .94 / direct | several selected examples | one universal selected fill is forbidden |
| S-02 | Focus | writing priority | reduced chrome | focus composition | S12 | none | AGREEMENT | focus is a composition state, not just focus-ring styling | OBSERVED / .96 / direct | region removal is visible | preserve explicit mode transition |
| S-03 | Empty | object absence | multiple empty states | formal empty state | S09, S13 | none | AGREEMENT | empty remains quiet and task-specific | OBSERVED / .9 / direct | contexts differ but hierarchy agrees | no marketing illustration fallback |
| S-04 | Loading | not fully modeled | strong skeleton evidence | absent | S13 | none | CONFLICT | loading skeleton is canonical and separate from empty | OBSERVED / .92 / direct | S13 shows both ghost content and caption | downstream must not conflate states |
| S-05 | Disabled | semantic state | visible subdued controls | formal disabled | S10–S11 | none | COMPATIBLE_DIFFERENCE | disabled mutes control and blocks activation | OBSERVED / .82 / direct | subdued controls visible; keyboard inferred | accessibility behavior required |
| S-06 | Error | preserve unknown | not shown | not shown | none | none | UNKNOWN | visual error treatment remains unknown | UNKNOWN / 0 / absent | no source evidence | must block invented error styling |
| R-01 | Collapse order | inspector before sidebar candidate | exact behavior unknown | inferred order | S12 | none | UNSUPPORTED | no canonical collapse order beyond explicit focus mode | UNKNOWN / .3 / absent | only simultaneous reduced-chrome state observed | handoff marks implementation choice as unresolved |
| R-02 | Mobile | do not invent | unknown | inferred mobile shell | none | none | UNKNOWN | phone and tablet topology unsupported | UNKNOWN / 0 / absent | no primary evidence | no bottom bar, drawer or breakpoint claim |
| A-01 | Agent composition | composition first | preserve topology | formal rule | S01–S13 | none | AGREEMENT | choose a governed composition before components | RESEARCH_CONFIRMED / .96 / synthesis | prevents generic component soup | hard implementation rule |
| A-02 | Unknown handling | preserve unknown | explicit unknowns | formal unknown governance | evidence gaps | none | AGREEMENT | missing evidence stays unknown or blocked | RESEARCH_CONFIRMED / .99 / governance | prevents silent invention | handoff must emit BLOCK/DEGRADED/UNKNOWN |
| A-03 | Generic fallback | anti-generic SaaS | no default library substitution | explicit prohibition | S01–S13 | none | AGREEMENT | prohibit generic SaaS/shadcn visual substitution | RESEARCH_CONFIRMED / .98 / synthesis | Craft grammar is topology and hierarchy, not library defaults | component primitive may be reused only under canonical contract |
| A-04 | Content isolation | content-scoped art | explicit color exclusions | formal exclusion | S03–S11 | none | AGREEMENT | never promote content/marketing art into application tokens | OBSERVED / .98 / direct | prevents false visual DNA | validation checks forbidden sources |
| A-05 | Missing semantics | stop or degrade | unknown list | formal unsupported list | evidence gaps | none | AGREEMENT | do not redesign missing parts during Layoutcrafts implementation | RESEARCH_CONFIRMED / .99 / governance | keeps source authority intact | integration report must expose every gap |

## Ledger conclusion

No complete Candidate is selected as the winner. Kimi supplies the strongest screenshot-specific detail, Sol supplies the executable semantic/component grammar, and Grok supplies the frozen machine contract and provenance discipline. The canonical Candidate may proceed only as `agent_usable=false` and remains subject to Owner/Mainline review.
