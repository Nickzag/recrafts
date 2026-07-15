# R-009 Recrafts Golden Corpus and Static Coffee Result

## Result

R-009 technical implementation is complete and Static Coffee is runnable as a candidate Corpus. Golden promotion and baseline establishment remain gated by human correction/acceptance, completed human scoring, project-owner review and Source Pack stabilization.

> R-009 establishes a reusable, no-Oracle Golden Corpus system and uses Static Coffee as the first L2 Brand benchmark candidate. It measures Recrafts' Evidence quality, domain coverage, provenance, scope isolation, conflict handling, visual grammar and presentation understanding without encoding the expected design answer.

## Benchmark architecture

- Registry and seven benchmark Schemas under `benchmarks/`.
- Local-only Source Pack capture and hash verification; third-party pixels are ignored by Git.
- Capability-only expectations, scope boundaries and automatic hard gates.
- Installed-package runner using the nine-operation Host-Agent protocol boundary; it does not import private runtime modules.
- Automatic scoring, human score merge, traceability/scope/conflict reports and compatible-run regression comparison.
- Benchmark-only Presentation Grammar and Possible Design Intent candidates kept outside the stable runtime contract.

## Corpus identity

- Corpus: `l2-brand-static-coffee-v1@1.0.0`
- Level/domain: `L2-brand / brand-identity`
- Lifecycle: `candidate`
- Rubric: `brand-system-v1@1.0.0`
- Registry baseline/latest run: `null / null`

## Source Pack and redistribution boundary

- Source Pack: `static-coffee-source-pack-v1`
- Public source: `https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity`
- Manifest SHA-256: `ad51dbbbf6618ad9bf5cbd1ffc579e493b58636f8b1ee05eb64116b9b9832f7b`
- Capture: 20 isolated static public project modules, 35 Region records.
- Status: `partial`; four animated project modules were not captured and are explicitly listed as missing.
- Browser/page captures were diagnostic only and were not passed to analysis.
- Redistribution: `metadata-and-hashes-only`; raw source pixels remain under ignored `.local-benchmark-sources/`.

The incomplete animated-module coverage prevents Golden promotion. No missing section was fabricated.

## No-Oracle audit and capabilities

- no-Oracle validation: `pass`; 5 expectation/rubric files scanned.
- Schema and Corpus validation: `pass`.
- Required capability categories: 14.
- Negative tests reject exact color answers, font answers, component inventories, hidden `design.md`, source-specific answer prompts and expected screenshots.
- Scope exclusions cover Behance chrome, profile/metrics/recommendations, browser chrome, advertising and unrelated thumbnails. Mockup context and descriptive copy are conditional, non-global sources.

## Installed Build 2 candidate run

- Run: `run-static-coffee-20260715-codex-gpt5-001`
- Frozen installed package: `recrafts@0.4.0-rc.1`
- Build 2 tarball SHA-256: `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774`
- Protocol/Schema: `1.1 / 3.0.0`
- Host: `Codex / GPT-5`, `vision=true`
- Instruction SHA-256: `fdcc86d68582a09af2d22404b47256c332e8bc80285b3b50afe7d4a473360107`
- Host Analysis SHA-256: `533c5b136982faf5087549b797ae030a33c7459bdad379b545908f2bbb1eb4bb`
- Package: `package-a5adf72a7eecac57`
- Package status: `awaiting-review`
- Canonical generation authorization: `false`
- Open conflicts: 1 medium scope conflict; 0 high-impact conflicts.

The run used `prepare-analysis -> Host visual analysis -> submit-analysis`. It did not create an Owner PASS or accepted Artifact Set.

## Automatic score and hard gates

- Automatic score: `70/75`
- Evidence completeness: `15/15`
- Evidence/Claim separation: `10/10`
- Domain coverage: `10/15`
- Provenance/traceability: `15/15`
- Scope isolation: `10/10`
- Conflict quality: `10/10`
- Automatic hard gates: `pass`
- Traceable domain candidates: 19; failed provenance: 0.

Domain coverage does not award file-presence credit. Build 2 produced populated Tokens, Components, Grid Rules and Conflict output, but left `layout-rules.json` and `visual-grammar.json` empty, so five points were withheld.

## Human and baseline status

- Human score: `PENDING`; no reviewer identity has been supplied.
- Correction and acceptance through normal Recrafts operations: `PENDING`.
- Project-owner Corpus review: `PENDING`.
- Baseline snapshot: `pending-human-review`; no baseline run ID or fictional prior comparison exists.
- Regression comparison: `baseline-no-comparison`.

## Known gaps

1. The Source Pack omits four animated modules.
2. Build 2 cannot express populated brand Layout Rules or Visual Grammar at `submit-analysis`, and does not emit an `artifact-set.json` at that stage.
3. Presentation Grammar and Possible Design Intent are benchmark-only candidates pending human review.
4. Golden promotion and baseline establishment cannot proceed without human authority and normal acceptance evidence.

These gaps were recorded without modifying frozen Build 2, R-008 Evidence, CraftsOS or Layoutcrafts.

## Validation evidence

- `node --test tests/r009-benchmark.test.mjs`: `30/30 pass`.
- `npm test`: `133/133 pass`.
- `npm run benchmark:validate`: no-Oracle `pass`; Corpus `pass`; Source Pack status `partial`.
- `npm run benchmark:compare`: `baseline-no-comparison`.
- `npm pack --dry-run --json`: 113 entries; benchmark, benchmark scripts and R-009 tests included in tarball: `0`.
- Frozen RC/R-008 paths changed: `0`.

## Recommendation

Request independent review of the architecture, no-Oracle boundary, Region classification, automatic mechanisms and installed-package run. Keep Corpus status `candidate` until a reviewer supplies the human score, normal corrections/acceptance are executed, the project owner returns a Corpus verdict, the partial Source Pack is resolved or explicitly versioned as stable, and the baseline snapshot is established once.
