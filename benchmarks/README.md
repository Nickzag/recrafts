# Recrafts Benchmarks

This directory contains versioned, no-Oracle benchmark contracts for measuring Recrafts without encoding the expected visual answer.

Benchmark inputs are split into two layers:

- committed Corpus metadata, capability requirements, rubrics, hashes and review records;
- ignored local Source Packs containing third-party captures.

Run `npm run benchmark:validate` after creating the local Static Coffee Source Pack described in `L2-brand/static-coffee/capture-policy.md`. Live Host runs are explicit and are not part of the default test command.

Corpus lifecycle: `candidate -> reviewed -> golden -> deprecated`. Promotion to `golden` requires a stable Source Pack, no-Oracle and hard-gate passes, completed human review, project-owner PASS and an immutable baseline snapshot.
