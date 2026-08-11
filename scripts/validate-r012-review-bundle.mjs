#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dev-workflow/review-bundles/r012-v2");
const lines = (await readFile(path.join(root, "SHA256SUMS"), "utf8")).trim().split("\n");
if (!lines.length) throw new Error("Review Bundle checksum inventory is empty");
for (const line of lines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error(`Malformed checksum line: ${line}`);
  const actual = createHash("sha256").update(await readFile(path.join(root, match[2]))).digest("hex");
  if (actual !== match[1]) throw new Error(`Review Bundle checksum mismatch: ${match[2]}`);
}
const required = [
  "dev-workflow/tasks/R-012-v2-canonical-design-system-governance.md",
  "dev-workflow/results/R-012-v2-canonical-design-system-governance-result.md",
  "dev-workflow/review-packets/R-012-v2-canonical-design-system-governance-review.md",
  "dev-workflow/evidence/r012-v2/validation-summary.md",
  "examples/golden-candidates/recrafts-design-v1/qualification/readiness.json"
];
for (const file of required) await readFile(path.join(root, file));
process.stdout.write(`${JSON.stringify({ status: "PASS", checksums: lines.length, required_files: required.length }, null, 2)}\n`);

