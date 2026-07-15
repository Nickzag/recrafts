#!/usr/bin/env node
import path from "node:path";
import { validateAcceptedBaseline } from "./r009a-core.mjs";

const [baseline, candidateRun, acceptedRun] = process.argv.slice(2);
if (!baseline || !candidateRun || !acceptedRun) {
  process.stderr.write("Usage: validate-accepted-baseline.mjs <baseline.json> <candidate-run> <accepted-run>\n");
  process.exit(2);
}
const result = validateAcceptedBaseline({ baselineFile: path.resolve(baseline), candidateRunRoot: path.resolve(candidateRun), acceptedRunRoot: path.resolve(acceptedRun) });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
