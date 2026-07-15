# R-008 — Independent MVP Closure Result

## Outcome

`recrafts-0.4.0-rc.1-build2` has completed installed qualification on Darwin and Linux using the same immutable Tarball and is now `ready-for-owner-review`. Build 1 remains preserved unchanged as a failed RC after installed qualification exposed a partial-source Acceptance Gate defect.

- Build 1 SHA-256: `f6ea4f583f9297c38367a8f301d2a617b6640eb5089104332b5bc7bd69623f4c`
- Build 2 SHA-256: `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`
- Artifact source commit: `8623a741c39ac25d91d6876d5a3648885f0d4bb6`
- Release evidence commit: `2b8b4f862354904b9f0623c5c3127e3107a9b266`
- Linux qualification workflow head: `9448ebfb391b73ba00e794ec1e6baf12efd985dc`
- Linux workflow run: `29388978971`, attempt `1`
- Protocol / Schema: `1.1` / `3.0.0`

## Real URL and Host

The installed Build 2 Tarball captured `https://www.craft.do` through Playwright/Chromium `149.0.7827.55` at `1440x900` plus a `1440x11032` full-page screenshot. Capture `capture-b9caa911cb91f7ec` contains separate metadata, network, DOM, CSS rule/variable, computed-style, screenshot, screenshot-region, asset and font classes. The viewport screenshot SHA-256 is `9f5be314c5d5be52d0661b3e17fcc9cfa84104e09481628906bea551d0b4280a`.

Codex/GPT-5 directly inspected the final installed-RC pixels and both installed multi-image inputs. Raw output is stored outside Evidence; structured Claims cite source-derived Evidence IDs. The accepted URL Package is `package-a6b2830ecd7731e6`, Artifact Set `artifact-set-23bfb2353722489c`.

## Cross-input closure

- Single image: accepted `package-1e002655b84aa8c0`, Artifact Set `artifact-set-5907a23fb36417bb`, validation pass. The correction keeps the result bounded and prevents complete-system overclaim.
- Multi-image: initial `package-e2a5188bda0e49db` produced three high-impact conflicts; acceptance failed with `REALIZATION_NOT_AUTHORIZED`. Correction `correction-build2-multi-resolve` produced accepted C `package-630d059798d98669`; later accepted F is `package-7a851d60780a0618`; rollback created G `package-5b691472ba1240c0`. G is new, parented by F, restored from C, has `rollback-created` lineage, and all canonical Artifact hashes match C.
- URL lifecycle: partial, stale and blocked states are preserved. Partial and stale acceptance fail with `REALIZATION_NOT_AUTHORIZED`; blocked sources do not request fabricated semantic Host analysis.
- Negative gates: raw Host output inserted into Evidence → `SCHEMA_VALIDATION_FAILED`; domain without Evidence → `PACKAGE_INVALID`; Host self-authorization → `SCHEMA_VALIDATION_FAILED`; rollback target overwrite → `UNSAFE_OUTPUT_PATH`.

## Linux installed-RC qualification

GitHub Actions Run `29388978971` executed the exact Build 2 Tarball on `ubuntu-latest` outside the repository checkout. The runner reported Linux `6.17.0-1018-azure` x64, Node `v24.18.0`, npm `11.16.0`, Playwright `1.61.1` and Chromium `149.0.7827.55`. The uploaded artifact is `recrafts-r008a-linux-qualification-29388978971`, GitHub digest `sha256:12bade357ee6837385eb6b173a0d006e6c7116757beb71070aca54f1663932f6`.

The installed package exposed all nine Operations. Eight completed normally; `generate-realization` returned the expected fail-closed `REALIZATION_NOT_AUTHORIZED`. The Linux browser adapter captured `https://www.craft.do` as complete at `1440x900` with 824 hashed Evidence records across metadata, network, DOM, CSS rules/variables, computed styles, screenshots, regions, assets and fonts. Conflict blocking, correction, Artifact acceptance, later acceptance and rollback-as-new-package passed; all seven canonical rollback hashes matched the target. Eleven negative gates failed closed. The downloaded portable Evidence passed `validate-r008a-linux-evidence.mjs`.

## Package, platforms and regression

`npm pack --json` reports 113 files, 70,066 packed bytes and 279,924 unpacked bytes. The Tarball includes the browser adapter, runtime, contracts, schemas, realization, fidelity boundary and sanitized protocol fixtures; it excludes dev history, release candidates, tests, raw Host output, private review, browser state, Oracle/expected answers and CraftsOS/Layoutcrafts source.

Darwin x86_64 clean install passed with Node `v24.15.0`, npm `11.12.1`, Playwright `1.61.1` and Chromium `149.0.7827.55`. Linux x64 installed qualification passed with the same Tarball. Full repository regression passed `103/103`; R-001 through R-007 validators also passed. `verify-fidelity` passed; `generate-realization` was executed and failed closed because Schema 3 Artifact acceptance does not authorize the out-of-scope visual-generation path.

## Review state

- Independent review: `ACCEPT`
- Project-owner release verdict: `PASS`
- Recrafts independent MVP loop: `COMPLETE`
- CraftsOS Recrafts prerequisite: `SATISFIED`
- CraftsOS holding: `RELEASED`
- CraftsOS/Layoutcrafts changes: none

Build 2 has completed final independent and project-owner closure review. The frozen RC snapshot remains unchanged; the later independent review, Owner Verdict and holding release are recorded under `dev-workflow/reviews/`. This result does not claim public npm publication, embedded inference, unrestricted website cloning, complete VIS, pixel-perfect fidelity or production readiness.

> R-008 proves that Recrafts can independently execute the frozen MVP loop across image, image-set and real public URL inputs; separate source Evidence from Host Claims; produce traceable Token, Component and Grid domains; block unresolved high-impact conflicts; preserve immutable human correction history; create validated accepted Artifact Sets; and rollback through a new immutable package, all from an installed release candidate without CraftsOS. It does not prove unrestricted website reconstruction, pixel-perfect fidelity, embedded inference, full VIS generation or production readiness.

The quoted proof is established for the same immutable Build 2 Tarball on Darwin and Linux. Project-owner decision `r008-owner-pass-20260715` records `PASS`; CraftsOS holding decision `craftsos-recrafts-holding-release-20260715` records `RELEASED`.
