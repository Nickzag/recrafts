# R-009 — Recrafts Golden Corpus Infrastructure and Static Coffee Benchmark

- Repository: `/Users/Nick/Documents/Recrafts`
- Branch: `recrafts/r-009-golden-corpus-static-coffee`
- Prerequisite: R-008 Project-owner PASS and canonical main normalization
- Corpus: `l2-brand-static-coffee-v1`
Source: `https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity`

## Outcome

Create reusable no-Oracle benchmark infrastructure and establish Static Coffee as the first L2 Brand candidate Corpus. Required deliverables are the registry and schemas, local Source Pack contract, Source/Region metadata, capability and scope contracts, hard gates, automatic/human scoring, traceability and scope audits, run comparison, an installed-Recrafts candidate run, result and review packet.

## Boundaries

Do not modify frozen Build 2, R-008 Darwin/Linux Evidence, CraftsOS or Layoutcrafts. Do not commit raw third-party images. The live runner must invoke an installed package entrypoint and must not import private runtime modules. Benchmark-only Presentation Grammar and Possible Design Intent must not alter the stable runtime contract.

## Promotion gate

Static Coffee remains `candidate` until Source Pack completeness/stability, no-Oracle, hard gates, human score, normal correction/acceptance, project-owner Corpus PASS, immutable baseline and redistribution confirmation are complete. Missing Source Pack sections, reviewer identity or owner decisions must never be fabricated.

## Validation

- `npm run benchmark:validate`
- `node --test tests/r009-benchmark.test.mjs`
- `npm test`
- explicit installed-package benchmark run
- compatible-run comparison tests

The full live benchmark is intentionally excluded from default `npm test` because it requires a local Source Pack and Host execution.
