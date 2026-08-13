#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dev-workflow/review-bundles/r013");
const lines = (await readFile(path.join(root, "SHA256SUMS"), "utf8")).trim().split("\n");
if (!lines.length) throw new Error("R-013 Review Bundle checksum inventory is empty");
for (const line of lines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error(`Malformed checksum line: ${line}`);
  const actual = createHash("sha256").update(await readFile(path.join(root, match[2]))).digest("hex");
  if (actual !== match[1]) throw new Error(`Review Bundle checksum mismatch: ${match[2]}`);
}
const required = [
  "dev-workflow/tasks/R-013/R-013-contract.md", "dev-workflow/tasks/R-013/validation-matrix.md", "dev-workflow/tasks/R-013/result.md",
  "dev-workflow/research/r013/fixture-manifest.json", "dev-workflow/evidence/r013/test-summary.json",
  "dev-workflow/evidence/r013/package/npm-pack-inventory.json", "dev-workflow/evidence/r013/package/tarball-sha256.txt",
  "dev-workflow/evidence/r013/package/clean-install.log", "dev-workflow/evidence/r013/package/installed-smoke-result.json",
  "dev-workflow/review-packets/R-013-evidence-grounded-ds-intelligence-review.md",
  "packages/recrafts-design/schemas/design-intelligence.schema.json", "fixtures/r013/holdout-kanban/design-intelligence.json"
];
for (const file of required) await readFile(path.join(root, file));
process.stdout.write(`${JSON.stringify({ status: "PASS", checksums: lines.length, required_files: required.length }, null, 2)}\n`);
