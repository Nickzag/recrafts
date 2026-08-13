# Common Source Fidelity Matrix

The matrix uses the recovered 13-image Tier-A Source Pack. Historical Candidate Gate A scores are not reused as normalized scores. `SUPPORTED` means the frozen Candidate claim agrees with the screenshot set; it does not mean the Candidate parsed under `recrafts.design/v1`.

| Product evidence | Screenshots | Sol | Kimi | Grok | Mainline synthesis consequence |
|---|---|---|---|---|---|
| App topology: left navigation, center work surface, optional Inspector | S01–S13 | SUPPORTED | SUPPORTED | SUPPORTED | canonical observed topology |
| Sidebar geometry around 240–260 CSS px | S04–S08 measurements | SUPPORTED range | CONFLICT: too narrow | SUPPORTED measurement | use measured range; no averaging |
| Inspector geometry around 320–336 CSS px | S04–S08 measurements | NEAR/SUPPORTED | CONFLICT: too narrow | SUPPORTED measurement | use measured range |
| Quiet neutral shell and white content surfaces | S01–S13 | SUPPORTED | SUPPORTED | SUPPORTED | canonical observed roles |
| All Docs card/list/dense projections share Document identity | S01–S03 | SUPPORTED | SUPPORTED | SUPPORTED | one object, three projections |
| Inspector modes Insert / Format / Style / Info | S04–S08 | SUPPORTED | STRONGLY SUPPORTED | SUPPORTED | canonical modes; Format ≠ Style |
| Style Gallery is bounded modal content, not global chrome | S07 | SUPPORTED | STRONGLY SUPPORTED | SUPPORTED | modal-only visual exception |
| Selected sidebar state remains neutral/white | S01–S10 | SUPPORTED | STRONGLY SUPPORTED | SUPPORTED | prohibit accent-filled sidebar selection |
| Configurable interaction accent, observed #0087FF | S04/S10 | role supported; value conflicts | STRONGLY SUPPORTED | STRONGLY SUPPORTED | role from Sol, exact observed value from Kimi/Grok |
| Destructive role near #FD3C68 | S08 | candidate value differs | partial | measured/support | preserve semantic role and observed neighborhood |
| Settings anatomy uses broad rows and preview choices | S10 | SUPPORTED | STRONGLY SUPPORTED | SUPPORTED | no card-per-setting fallback |
| Empty/loading states use quiet ghosts/skeletons | S09/S13 | SUPPORTED | STRONGLY SUPPORTED | SUPPORTED | canonical state treatment |
| Focus/reduced-chrome mode | S12 | SUPPORTED | SUPPORTED | SUPPORTED | desktop collapse/focus proven |
| Exact phone/tablet topology or breakpoints | none | UNSUPPORTED inference | UNKNOWN | UNSUPPORTED inference | canonical `UNKNOWN` |
| User document imagery and Imagine/upgrade artwork are not shell tokens | S01/S09/S11 | STRONGLY SUPPORTED | STRONGLY SUPPORTED | SUPPORTED | content-vs-chrome boundary |
| Hover, dark mode, collaboration conflict states | none | UNKNOWN/inferred | UNKNOWN | UNKNOWN | do not invent |

## Normalization Status

| Candidate | Exact runtime parse | Exact runtime compile | Common Gate B | Common Layoutcrafts Utility |
|---|---|---|---|---|
| Sol | FAIL: no canonical Front Matter | FAIL | NOT_REQUALIFIED | UNQUALIFIED as a formal Candidate; semantic contribution retained |
| Kimi | FAIL: no canonical Front Matter | FAIL | NOT_REQUALIFIED | UNQUALIFIED as a formal Candidate; visual evidence contribution retained |
| Grok | PASS | PASS | PENDING common browser evidence | PENDING common utility check |

Frozen outputs were not edited. The canonical synthesis may translate supported rules into a new valid authoring source; it must retain the ledger provenance for every translation.
