#!/usr/bin/env node
import path from "node:path";
import { validateGoldenPromotion } from "./r009a-core.mjs";

const [registry, corpus, decision, baseline, acceptedRun, noOracle = "pass", sourceStability = "pass", humanScore = "pass"] = process.argv.slice(2);
if (!registry || !corpus || !decision || !baseline || !acceptedRun) {
  process.stderr.write("Usage: validate-golden-promotion.mjs <registry.json> <corpus.json> <decision.json> <baseline.json> <accepted-run> [no-oracle] [source-stability] [human-score]\n");
  process.exit(2);
}
const result = validateGoldenPromotion({
  registryFile: path.resolve(registry),
  corpusFile: path.resolve(corpus),
  decisionFile: path.resolve(decision),
  baselineFile: path.resolve(baseline),
  acceptedRunRoot: path.resolve(acceptedRun),
  noOracleStatus: noOracle,
  sourceStabilityStatus: sourceStability,
  humanScoreStatus: humanScore,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
