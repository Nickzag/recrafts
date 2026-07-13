# R-006 — Recrafts MVP Evidence Truth and URL Lifecycle

Source: `Recrafts MVP Convergence Task Pack.zip` supplied by the project owner on 2026-07-13.

## Target

- Development line: `0.4.0-rc.1`
- Protocol: `1.1`; schema: `3.0.0`
- Preserve R-005 Build 5 and all prior release candidates unchanged.
- Do not modify or depend on CraftsOS/Layoutcrafts.

Implement typed `image`, `image-set`, and `url` inputs; URL `complete`, `partial`, `blocked`, and `stale` lifecycle artifacts; source-derived Evidence separated from Host-derived Claims; first-class Token, Component, Grid, Layout, and Visual Grammar provenance; explicit conflicts; and a fail-closed Gate that blocks unresolved high-impact conflicts.

Canonical operations remain `capabilities`, `prepare-analysis`, `submit-analysis`, `validate-package`, `generate-realization`, and `verify-fidelity`. Protocol 1.0 is readable only through explicit compatibility mode.

R-006 may emit only `draft`, `partial`, `blocked`, and `awaiting-review`. Human correction, acceptance, immutable evolution, and rollback belong to R-007.

## Required verification

Cover image/image-set and URL complete/partial/blocked/stale fixtures, evidence/claim separation, domain provenance, conflict reference integrity, stale/blocked exclusion, high-impact blocking, critical negative mutations, output safety, independence checks, development-tarball clean install, and R-001 through R-006 regression. Create the required Result and Review Packet.
