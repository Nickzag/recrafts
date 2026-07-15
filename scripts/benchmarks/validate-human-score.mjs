#!/usr/bin/env node
import path from "node:path";
import { validateHumanScore } from "./r009a-core.mjs";

const [
  score = "benchmarks/L2-brand/static-coffee/reviews/r009a/human-score.json",
  run = "benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-codex-gpt5-001",
  scopeDecision,
  derivedSourcePack,
] = process.argv.slice(2);
const result = validateHumanScore({
  humanScoreFile: path.resolve(score),
  candidateRunRoot: path.resolve(run),
  scopeDecisionFile: scopeDecision ? path.resolve(scopeDecision) : undefined,
  derivedSourcePackFile: derivedSourcePack ? path.resolve(derivedSourcePack) : undefined,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
