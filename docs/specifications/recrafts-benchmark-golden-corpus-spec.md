# Recrafts Benchmark System and Golden Corpus Specification

- Status: post-MVP quality-system specification
- Initial Corpus: `L2-brand/static-coffee`
- Runtime dependency: installed Recrafts package only
- CraftsOS dependency: none

## Purpose

The Benchmark System measures whether Recrafts' visual understanding, domain extraction, provenance discipline, scope isolation and correction behavior improve or regress. A Golden Corpus is a versioned input and review contract, not a hidden expected-answer suite.

It may require capability categories, minimum Evidence coverage, scope exclusions, structural outputs, hard gates and human review questions. It must not contain exact source colors, expected typefaces, Token values, component inventories, Grid measurements, prewritten brand principles, an expected `design.md`, expected output screenshots or source-specific prompts that reveal answers.

## Levels

- L1 Image: bounded Evidence and partial-system discipline for a single image.
- L2 Brand: multi-image brand systems, cross-application consistency and presentation understanding.
- L3 Website: real URL lifecycle, structured/pixel Evidence and website design contracts.
- L4 Product: multi-surface shells, states, component families and interaction grammar.

## Corpus and Source Packs

Committed Corpus data includes source identity, capture policy, hashes, dimensions, Region metadata, capability requirements, scoring contracts and review decisions. Raw third-party capture bytes remain in an ignored local Source Pack unless explicit redistribution permission exists.

Static Coffee uses Corpus ID `l2-brand-static-coffee-v1` and the public source `https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity`. Required Region classes are `canonical-brand-system`, `brand-application`, `packaging`, `signage-spatial`, `photography`, `editorial-layout`, `case-study-presentation`, `descriptive-copy`, `mockup-environment` and `unknown`. Behance chrome, creator/profile UI, metrics, recommendations, browser chrome, advertising and unrelated thumbnails are excluded. Mockup context cannot automatically become a Brand Token source; descriptive copy may support a Claim but is not visual Evidence.

## Scoring and hard gates

Automatic scoring totals 75 points: Evidence completeness 15, Evidence/Claim separation 10, Domain coverage 15, provenance 15, scope isolation 10 and conflict quality 10. Human review contributes 25 points across brand coherence, typography, color, cross-application consistency, visual grammar, presentation grammar, possible-intent discipline and overall usefulness.

A run is blocked by raw Host output as Evidence, canonical domains without provenance, accepted output with an unresolved high conflict, platform/mockup contamination, an Oracle, missing source identity/hashes, unverified reviewer identity or capture mutation. Possible Design Intent is always a Claim.

The first accepted run establishes an immutable baseline without inventing a previous comparison. Later comparisons require the same Corpus version, Source Pack hash and rubric version. Regression is an overall decline of at least 5 points or a module decline of at least 10 points; new hard-gate, provenance or scope failures are blocking.

## Governance

Lifecycle: `candidate -> reviewed -> golden -> deprecated`. Golden promotion requires a valid stable Source Pack, no-Oracle pass, successful installed-package run, automatic hard-gate pass, completed human review, project-owner PASS, baseline snapshot and confirmed redistribution boundary.

The benchmark is post-MVP infrastructure. It cannot change frozen RC acceptance, modify prior RCs, become a CraftsOS dependency, enter the public npm package by default or silently patch runtime gaps revealed by a run.
