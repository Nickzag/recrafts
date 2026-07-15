# R-009 Independent Review Packet

## Requested verdict

Please return:

```text
Benchmark architecture: PASS / PASS WITH CHANGES / REWORK
No-Oracle integrity: PASS / PASS WITH CHANGES / REWORK
Static Coffee Corpus quality: PASS / PASS WITH CHANGES / REWORK
Baseline usefulness: PASS / PASS WITH CHANGES / REWORK
R-009: ACCEPT / REVISE
Corpus promotion: GOLDEN / REMAIN CANDIDATE
```

Current mechanical disposition: `REMAIN CANDIDATE`. Human and owner decisions are intentionally `PENDING`.

## Review entry points

- Specification: `docs/specifications/recrafts-benchmark-golden-corpus-spec.md`
- Registry: `benchmarks/registry.json`
- Corpus: `benchmarks/L2-brand/static-coffee/corpus.json`
- Capture policy: `benchmarks/L2-brand/static-coffee/capture-policy.md`
- Source and Region metadata: `benchmarks/L2-brand/static-coffee/source/`
- Capability/scope/hard-gate contracts: `benchmarks/L2-brand/static-coffee/expectations/`
- Scorecard: `benchmarks/L2-brand/static-coffee/rubric/`
- Candidate run: `benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-codex-gpt5-001/`
- Result: `dev-workflow/results/R-009-recrafts-golden-corpus-static-coffee-result.md`

The raw local Source Pack is intentionally not in Git. For visual review use `.local-benchmark-sources/static-coffee-v1-isolated-v3/` and verify the committed Source Manifest hashes before scoring.

## Mechanical evidence

| Check | Result |
|---|---|
| Corpus/no-Oracle validation | PASS |
| Source files represented | 20 static modules |
| Region records | 35 |
| Source Pack status | PARTIAL; 4 animated modules missing |
| Installed runtime | `recrafts@0.4.0-rc.1` Build 2 |
| Tarball SHA-256 | `2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774` |
| Host identity | `Codex / GPT-5 / vision=true` |
| Candidate Package | `package-a5adf72a7eecac57`, `awaiting-review` |
| Automatic score | 70/75 |
| Hard gates | PASS |
| Human score | PENDING |
| Normal correction/acceptance | PENDING |
| Owner Corpus review | PENDING |
| Baseline | not established |
| R-009 tests | 30/30 PASS |
| Full repository tests | 133/133 PASS |
| Benchmark files in npm tarball | 0 |
| Frozen Build 2/R-008 changes | 0 |

## Automatic score audit

Every module records a mechanism and supporting IDs in `automatic-score.json`.

- Evidence completeness cross-references current Package Evidence against all Source IDs, Region IDs and eight coverage categories.
- Evidence/Claim separation rejects raw Host output, rationale or possible intent stored as Evidence.
- Domain coverage requires populated domain arrays; empty files do not score, except an explicitly investigated empty Conflict array.
- Provenance validates all Evidence and Claim refs for 19 domain candidates.
- Scope isolation detects platform, mockup, descriptive-copy, advertising and unrelated-source promotion.
- Conflict quality reports the medium mockup-context scope conflict and blocks accepted output with open high conflicts.

## Installed-package boundary

The live runner invokes the installed `node_modules/.bin/recraft-interop` executable and contains no private runtime import. The observed chain was:

```text
prepare-analysis
-> needs_host_action
-> vision-capable Host Analysis
-> submit-analysis
-> package awaiting-review
```

The Response explicitly warns that Host output remains subject to project-owner visual review. `canonical_visual_generation_authorized` is false.

## No-Oracle and human separation

The Corpus defines investigation categories and required evidence counts, not exact values, component names, measurements or expected output. Presentation Grammar and Possible Design Intent were produced after Host analysis as candidate run artifacts. Intent language uses possible/likely formulations, records alternatives and remains Claim-layer material.

No human score, reviewer identity, Owner PASS, accepted Artifact Set or baseline was synthesized.

## Runtime gaps exposed, not patched

The installed Package has populated Tokens, Components and Grid Rules but empty Layout Rules and Visual Grammar, and no submit-stage Artifact Set. Automatic Domain coverage is therefore 10/15. R-009 records this in `gap-report.md`; frozen Build 2 was not modified.

## Highest-risk review questions

1. Does any expectation, rubric or validator reveal an expected visual answer?
2. Is the metadata-and-hashes-only treatment sufficient for the third-party source?
3. Are Region classifications accurate, and are Behance UI/mockup contexts isolated?
4. Is each automatic score mechanism reproducible from recorded artifacts?
5. Are all human-only judgments and owner authority still pending?
6. Are Possible Design Intent statements Claims rather than Evidence?
7. Is the installed-package run auditable and reproducible from the recorded hashes?
8. Can future compatible runs be compared without mutating this Corpus?
9. Are runtime gaps reported without contaminating the frozen RC?
10. Can a Source Pack with four omitted animated modules ever be declared stable, or must it be completed before Golden promotion?

## Required next decision

Independent review may approve the technical architecture while retaining `REMAIN CANDIDATE`. Baseline establishment requires a completed human scorecard, any normal Recrafts corrections, project-owner acceptance, immutable accepted run hashes and a project-owner Corpus verdict.
