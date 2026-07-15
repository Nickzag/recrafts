#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compareBenchmarkRuns } from "./benchmark-core.mjs";

const [baselineFile, currentFile, outputFile] = process.argv.slice(2);
if (!baselineFile && !currentFile) {
  const corpus = JSON.parse(readFileSync(path.resolve("benchmarks/L2-brand/static-coffee/corpus.json"), "utf8"));
  const result = corpus.baseline_run_id && corpus.latest_run_id && corpus.baseline_run_id !== corpus.latest_run_id
    ? { status: "comparison-required", baseline_run_id: corpus.baseline_run_id, latest_run_id: corpus.latest_run_id }
    : { status: "baseline-no-comparison", baseline_run_id: corpus.baseline_run_id ?? null, latest_run_id: corpus.latest_run_id ?? null, reasons: [] };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}
if (!baselineFile || !currentFile) throw new Error("Usage: compare-benchmark-runs <baseline.json> <current.json> [output.json]");
const result = compareBenchmarkRuns(JSON.parse(readFileSync(path.resolve(baselineFile), "utf8")), JSON.parse(readFileSync(path.resolve(currentFile), "utf8")));
if (outputFile) writeFileSync(path.resolve(outputFile), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (["regression", "blocked"].includes(result.status)) process.exitCode = 1;
