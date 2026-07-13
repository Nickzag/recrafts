# R-006 Result — Evidence Truth and URL Lifecycle

## Outcome

Implemented the `0.4.0-rc.1` development line with Protocol `1.1` and Schema `3.0.0`. Protocol 1.0 remains executable only when the caller explicitly sets `options.compatibility_mode: "protocol-1.0"`. The six canonical operations are unchanged.

Typed `image`, `image-set`, and `url` sources now enter a shared Prepared Bundle identity model. URL capture records `complete`, `partial`, `blocked`, or `stale`; blocked capture still writes source manifest, capture status, blocked reason, and run log, while emitting no fabricated DOM/CSS Evidence.

Evidence records are source-derived and restricted to the R-006 taxonomy. DOM/CSS/computed-style records are separate from screenshot and screenshot-region records, and screenshot regions reference a parent screenshot. Host findings and domain suggestions are persisted in `claims.json`; no new `host-visual-analysis` Evidence is created.

`tokens.json`, `components.json`, `grid-rules.json`, `layout-rules.json`, and `visual-grammar.json` are first-class artifacts. Token, Component, and Grid candidates include domain identity, scope, status, confidence, Evidence refs, Claim refs, and Conflict refs. Runtime validation rejects missing or unknown provenance.

`conflicts.json` stores explicit conflicts and automatically detects duplicate Token value/scope, Component state, Grid constraint, and stale/current conflicts. Submitted DOM/screenshot and CSS/computed disagreements remain explicit conflict records instead of silent winner selection. Any open high-severity conflict, blocked capture, or stale mandatory Evidence yields package state `blocked`. R-006 never emits `accepted` or `rolled-back` and never authorizes canonical realization.

## Fixtures and verification

- Sanitized image and image-set fixtures verify distinct source Evidence and limited Host-derived Claims.
- Controlled URL fixtures verify complete, partial, stale, and blocked lifecycle behavior without network nondeterminism.
- Negative coverage includes unsupported kinds/statuses, false complete/partial/stale declarations, blocked fixtures with fabricated DOM, invalid Host Schema, missing/unknown Evidence refs, unsafe paths, output overwrite, stale promotion, and high-impact conflict progression.
- R-006 validators cover Evidence truth, URL lifecycle, domain provenance, Conflict reference integrity, status Gate, and forbidden accepted states.
- A development tarball is packed to `/tmp`, installed into an independent temporary npm project, and exercised without CraftsOS or Layoutcrafts.
- R-001 through R-005 validators and the full repository test suite are rerun as regression gates. Build 5 remains byte-for-byte outside the R-006 diff.

Final verification on 2026-07-13:

```text
npm test: 75/75 passed
validate:r001: passed
validate:r002: passed
validate:r003-preflight: passed
validate:r003-realization: passed
validate:r004: passed
validate:r005 (immutable Build 5): passed
development tarball clean install: passed
development tarball SHA-256: 7ceb6629720230c46b2998cc25045659c7960ef6fe5867fd7164d4b495a5e112
git diff --check: passed
Build 5 diff: empty
```

## Limitations

The controlled complete-URL fixture proves the complete lifecycle and artifact contract. The dependency-free live URL adapter captures safe network/DOM metadata and intentionally reports `partial` because it does not embed a browser, screenshot engine, font loader, or computed-style engine. A Host/browser capture adapter is still required to prove a real public URL as `complete` in R-008. DOM-versus-screenshot disagreement detection requires explicit source/Host conflict input because Recrafts does not perform embedded visual inference.

R-006 establishes source-derived Evidence, model-derived Claims, typed URL lifecycle, first-class Token/Component/Grid provenance and high-impact conflict blocking. It does not yet prove generic human correction, accepted artifact generation, rollback or final MVP closure.

## R-007 recommendation

Implement immutable correction events, decision-bound conflict resolution, accepted artifact validation, new package identities for every correction, and rollback-as-new-package without altering raw R-006 Evidence or Claims.
