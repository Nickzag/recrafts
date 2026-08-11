#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.resolve(process.argv[2] ?? "dev-workflow/review-bundles/r012-v2");
const entries = [
  "dev-workflow/tasks/R-012-v2-canonical-design-system-governance.md",
  "dev-workflow/tasks/R-012-v2A-runtime-depth-governance-repair.md",
  "dev-workflow/results/R-012-v2-canonical-design-system-governance-result.md",
  "dev-workflow/results/R-012-v2A-runtime-depth-governance-repair-result.md",
  "dev-workflow/results/R-012-v2C-r1-result.md",
  "dev-workflow/results/R-012-v2C-r3-result.md",
  "dev-workflow/results/R-012-v2C-r3-1-result.md",
  "dev-workflow/review-packets/R-012-v2-canonical-design-system-governance-review.md",
  "dev-workflow/evidence/r012-v2",
  "examples/golden-candidates/recrafts-design-v1",
  "packages/recrafts-design",
  "schemas/recrafts-design-v1",
  "contracts/operations",
  "contracts",
  "runtime/design_compare.mjs",
  "runtime/design_coherence_gate.mjs",
  "runtime/design_fidelity_gate.mjs",
  "runtime/design_governance.mjs",
  "runtime/design_owner_decision.mjs",
  "runtime/design_preview_renderer.mjs",
  "runtime/design_qualification.mjs",
  "runtime/design_release_store.mjs",
  "runtime/design_system_runtime.mjs",
  "runtime/r012_linux_evidence.mjs",
  "scripts/run-r012-v2.mjs",
  "scripts/validate-r012-v2.mjs",
  "scripts/run-r012-linux-qualification.mjs",
  "scripts/validate-r012-linux-evidence.mjs",
  ".github/workflows/recrafts-r012-linux-qualification.yml",
  "fixtures/r012",
  "manifest.json",
  "skill_manifest.json",
  "README.md",
  "SKILL.md",
  "package.json",
  "package-lock.json",
  "runtime/interop_contract.mjs",
  "runtime/interop_operations.mjs",
  "runtime/interop_cli.mjs",
  "runtime/path_security.mjs",
  "runtime/recraft-cli.mjs",
  "runtime/browser_capture_cli.mjs",
  "runtime/extraction_runtime.mjs",
  "runtime/owner_decision_import.mjs",
  "runtime/r006_validation.mjs",
  "runtime/r007_validation.mjs",
  "runtime/browser_capture.mjs",
  "runtime/acceptance_finalization.mjs",
  "runtime/source_neutral_fidelity.mjs",
  "realization/realization_runtime.mjs",
  "realization/package_loader.mjs",
  "realization/source_neutral_realization.mjs",
  "scripts/validate-r004-fidelity.mjs",
  "realization",
  "runtime/schema_validator.mjs",
  "runtime/analysis_exchange.mjs",
  "runtime/evidence_truth.mjs",
  "runtime/package_evolution.mjs",
  "runtime/visual_recovery_a.mjs",
  "scripts/capture-r012-preview-evidence.mjs",
  "scripts/r012-installed-consumer-smoke.mjs",
  "scripts/build-r012-review-bundle.mjs",
  "scripts/validate-r012-review-bundle.mjs",
  "tests"
];
await mkdir(output, { recursive: true });
for (const entry of entries) await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
async function files(dir) { return (await readdir(dir, { withFileTypes: true })).flatMap(() => []); }
const inventory = [];
async function walk(dir) { for (const item of await readdir(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) await walk(file); else if (item.name !== "SHA256SUMS") inventory.push(file); } }
await walk(output);
inventory.sort();
const sums = [];
for (const file of inventory) sums.push(`${createHash("sha256").update(await readFile(file)).digest("hex")}  ${path.relative(output, file)}`);
await writeFile(path.join(output, "SHA256SUMS"), `${sums.join("\n")}\n`);
process.stdout.write(`${JSON.stringify({ status: "PASS", output, files: inventory.length }, null, 2)}\n`);
