#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.resolve(process.argv[2] ?? "dev-workflow/review-bundles/r013");
const entries = [
  "dev-workflow/tasks/R-013", "dev-workflow/research/r013", "dev-workflow/results/R-013-baseline-remediation-blocker-ledger.md",
  "dev-workflow/evidence/r013", "dev-workflow/review-packets/R-013-evidence-grounded-ds-intelligence-review.md",
  "fixtures/r013", "packages/recrafts-design", "schemas/recrafts-design-v1", "contracts/operations",
  "runtime/design_intelligence.mjs", "runtime/design_fidelity_gate.mjs", "runtime/design_coherence_gate.mjs", "runtime/design_compare.mjs", "runtime/design_system_runtime.mjs",
  "scripts/validate-r013.mjs", "scripts/build-r013-review-bundle.mjs", "scripts/validate-r013-review-bundle.mjs",
  "tests/r013-design-intelligence.test.mjs", "tests/r013-operation-gates.test.mjs", "tests/r012-semantic-compare.test.mjs",
  "package.json", "package-lock.json", "manifest.json", "skill_manifest.json", "README.md", "SKILL.md"
];
await mkdir(output, { recursive: true });
for (const entry of entries) await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
const inventory = [];
async function walk(directory) { for (const item of await readdir(directory, { withFileTypes: true })) { const file = path.join(directory, item.name); if (item.isDirectory()) await walk(file); else if (item.name !== "SHA256SUMS") inventory.push(file); } }
await walk(output);
inventory.sort();
const sums = [];
for (const file of inventory) sums.push(`${createHash("sha256").update(await readFile(file)).digest("hex")}  ${path.relative(output, file)}`);
await writeFile(path.join(output, "SHA256SUMS"), `${sums.join("\n")}\n`);
process.stdout.write(`${JSON.stringify({ status: "PASS", output, files: inventory.length }, null, 2)}\n`);
