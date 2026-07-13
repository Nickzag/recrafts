# R-008 — Independent MVP Closure Result

## Outcome

`recrafts-0.4.0-rc.1-build2` is mechanically qualified on Darwin but remains `blocked`; it is not ready for project-owner verdict because Linux clean install was not executable in the available environment. Build 1 is preserved unchanged as a failed RC after installed qualification exposed a partial-source Acceptance Gate defect.

- Build 1 SHA-256: `f6ea4f583f9297c38367a8f301d2a617b6640eb5089104332b5bc7bd69623f4c`
- Build 2 SHA-256: `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`
- Artifact source commit: `8623a741c39ac25d91d6876d5a3648885f0d4bb6`
- Release evidence commit: `2b8b4f862354904b9f0623c5c3127e3107a9b266`
- Protocol / Schema: `1.1` / `3.0.0`

## Real URL and Host

The installed Build 2 Tarball captured `https://www.craft.do` through Playwright/Chromium `149.0.7827.55` at `1440x900` plus a `1440x11032` full-page screenshot. Capture `capture-b9caa911cb91f7ec` contains separate metadata, network, DOM, CSS rule/variable, computed-style, screenshot, screenshot-region, asset and font classes. The viewport screenshot SHA-256 is `9f5be314c5d5be52d0661b3e17fcc9cfa84104e09481628906bea551d0b4280a`.

Codex/GPT-5 directly inspected the final installed-RC pixels and both installed multi-image inputs. Raw output is stored outside Evidence; structured Claims cite source-derived Evidence IDs. The accepted URL Package is `package-a6b2830ecd7731e6`, Artifact Set `artifact-set-23bfb2353722489c`.

## Cross-input closure

- Single image: accepted `package-1e002655b84aa8c0`, Artifact Set `artifact-set-5907a23fb36417bb`, validation pass. The correction keeps the result bounded and prevents complete-system overclaim.
- Multi-image: initial `package-e2a5188bda0e49db` produced three high-impact conflicts; acceptance failed with `REALIZATION_NOT_AUTHORIZED`. Correction `correction-build2-multi-resolve` produced accepted C `package-630d059798d98669`; later accepted F is `package-7a851d60780a0618`; rollback created G `package-5b691472ba1240c0`. G is new, parented by F, restored from C, has `rollback-created` lineage, and all canonical Artifact hashes match C.
- URL lifecycle: partial, stale and blocked states are preserved. Partial and stale acceptance fail with `REALIZATION_NOT_AUTHORIZED`; blocked sources do not request fabricated semantic Host analysis.
- Negative gates: raw Host output inserted into Evidence → `SCHEMA_VALIDATION_FAILED`; domain without Evidence → `PACKAGE_INVALID`; Host self-authorization → `SCHEMA_VALIDATION_FAILED`; rollback target overwrite → `UNSAFE_OUTPUT_PATH`.

## Package, platforms and regression

`npm pack --json` reports 113 files, 70,066 packed bytes and 279,924 unpacked bytes. The Tarball includes the browser adapter, runtime, contracts, schemas, realization, fidelity boundary and sanitized protocol fixtures; it excludes dev history, release candidates, tests, raw Host output, private review, browser state, Oracle/expected answers and CraftsOS/Layoutcrafts source.

Darwin x86_64 clean install passed with Node `v24.15.0`, npm `11.12.1`, Playwright `1.61.1` and Chromium `149.0.7827.55`. Linux is `not-executed`: no Docker, Podman, Colima, Lima, OrbStack, nerdctl, Multipass or configured external runner was available. Full repository regression passed `90/90`. `verify-fidelity` passed; `generate-realization` was executed and failed closed because Schema 3 Artifact acceptance does not authorize the out-of-scope visual-generation path.

## Review state

- Independent review: `PENDING`
- Project-owner release verdict: `PENDING`
- CraftsOS holding: `PENDING`
- CraftsOS/Layoutcrafts changes: none

Known limitation: Build 2 cannot move to `ready-for-owner-review` until the same Tarball passes a Linux clean install and installed closure qualification. This result does not claim public npm publication, embedded inference, unrestricted website cloning, complete VIS, pixel-perfect fidelity, or production readiness.

> R-008 proves that Recrafts can independently execute the frozen MVP loop across image, image-set and real public URL inputs; separate source Evidence from Host Claims; produce traceable Token, Component and Grid domains; block unresolved high-impact conflicts; preserve immutable human correction history; create validated accepted Artifact Sets; and rollback through a new immutable package, all from an installed release candidate without CraftsOS. It does not prove unrestricted website reconstruction, pixel-perfect fidelity, embedded inference, full VIS generation or production readiness.

The quoted proof is established for Darwin Build 2. The cross-platform release gate remains blocked until Linux reproduces it.
