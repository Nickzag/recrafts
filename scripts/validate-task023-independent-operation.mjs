#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { validateArtifactSet } from "../runtime/task023_artifacts.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.output) fail("Usage: node scripts/validate-task023-independent-operation.mjs --output <artifact-directory>");
const root = path.resolve(args.output);
const names = ["design.md", "design-contract.json", "tokens.json", "components.json", "evidence.json", "conflicts.json", "preview/index.html", "validation-report.json", "artifact-hashes.json"];
const artifacts = {};
for (const name of names) {
  const file = path.join(root, name);
  await access(file).catch(() => fail(`Missing artifact: ${name}`));
  if (name.endsWith(".json") && name !== "artifact-hashes.json") artifacts[name] = JSON.parse(await readFile(file, "utf8"));
  else artifacts[name] = await readFile(file, "utf8");
}
const validation = validateArtifactSet(artifacts);
const contract = artifacts["design-contract.json"];
if (validation.status !== "valid") fail(validation.errors.join("\n"));
if (contract.production_ready !== false) fail("Task 023 artifacts must not claim production readiness.");
if (Object.hasOwn(contract, "aggregate_accuracy_score")) fail("Aggregate extraction accuracy is prohibited.");
process.stdout.write(`${JSON.stringify({ status: "valid", artifact_count: names.length, domain_count: contract.domains.length, layoutcrafts_dependency: false }, null, 2)}\n`);

function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) if (values[i].startsWith("--")) result[values[i].slice(2)] = values[i + 1], i += 1; return result; }
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
