#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { calculateAutomaticScore, mergeHumanScore } from "./benchmark-core.mjs";

export function scoreBenchmark({ corpusRoot, packageRoot, outputRoot, humanScoreFile = null }) {
  const automatic = calculateAutomaticScore({ corpusRoot, packageRoot });
  mkdirSync(outputRoot, { recursive: true });
  const reports = {
    "automatic-score.json": automatic,
    "hard-gates.json": automatic.hard_gates,
    "traceability-report.json": automatic.traceability,
    "scope-isolation-report.json": automatic.scope_isolation,
    "conflict-report.json": automatic.conflicts,
  };
  if (humanScoreFile) reports["human-score.json"] = mergeHumanScore(automatic, JSON.parse(readFileSync(humanScoreFile, "utf8")));
  else reports["human-score.json"] = { status: "pending", reviewer: null, reviewed_at: null, scores: [] };
  for (const [file, value] of Object.entries(reports)) writeFileSync(path.join(outputRoot, file), `${JSON.stringify(value, null, 2)}\n`);
  return reports;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [corpus, packageDirectory, output, human] = process.argv.slice(2);
  if (!corpus || !packageDirectory || !output) throw new Error("Usage: score-benchmark <corpus> <package> <output> [human-score.json]");
  const result = scoreBenchmark({ corpusRoot: path.resolve(corpus), packageRoot: path.resolve(packageDirectory), outputRoot: path.resolve(output), humanScoreFile: human ? path.resolve(human) : null });
  process.stdout.write(`${JSON.stringify(result["automatic-score.json"], null, 2)}\n`);
  if (result["automatic-score.json"].status === "blocked") process.exitCode = 1;
}
