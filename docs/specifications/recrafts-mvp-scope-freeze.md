# Recrafts MVP Scope Freeze

Target `0.4.0-rc.1`, protocol `1.1`, schema `3.0.0`. The independent MVP loop is:

`Input → Evidence → Domain Extraction → Confidence/Conflict → Human Correction → Artifact Set → Validation → Rollback`

Canonical inputs are image, image-set, and public URL. Evidence is source-derived only; Host output is versioned Claims. Tokens, Components, Grid Rules, Layout Rules, and Visual Grammar must trace to Evidence and Claims. Unresolved high-impact conflicts, blocked sources, or stale mandatory evidence prevent accepted artifacts.

R-006 delivers the loop through Confidence/Conflict. R-007 delivers correction, acceptance, immutable package evolution, and rollback. R-008 performs independent closure qualification. CraftsOS integration remains on hold and is not a dependency.

Explicit non-goals include universal cloning, embedded vision, production UI packages, public registry release, universal Host certification, and CraftsOS integration.
