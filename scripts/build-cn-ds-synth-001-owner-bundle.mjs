import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repository = process.cwd();
const sourceRoot = path.join(repository, "dev-workflow", "benchmarks", "CN-DS-SYNTH-001");
const bundleRoot = path.join(repository, "dev-workflow", "review-bundles", "CN-DS-SYNTH-001-owner-review");

const files = [
  ["canonical-candidate/design.md", "canonical/design.md"],
  ["canonical-candidate/preview.html", "canonical/preview.html"],
  ["canonical-candidate/candidate-artifact.json", "canonical/candidate-artifact.json"],
  ["decision-ledger.md", "decision-ledger.md"],
  ["normalization/source-fidelity-matrix.md", "source-fidelity-matrix.md"],
  ["normalization/normalization-summary.md", "normalization-summary.md"],
  ["canonical-qualification/gate-a/gate-a-result.json", "qualification/gate-a-result.json"],
  ["canonical-qualification/gate-b/gate-b-result.json", "qualification/gate-b-result.json"],
  ["canonical-qualification/layoutcrafts-utility.json", "qualification/layoutcrafts-utility.json"],
  ["canonical-qualification/unsupported-semantics.json", "qualification/unsupported-semantics.json"],
  ["canonical-qualification/qualification-result.md", "qualification/qualification-result.md"],
  ["canonical-qualification/browser/browser-evidence.json", "browser/browser-evidence.json"],
  ["canonical-qualification/browser/desktop.png", "browser/desktop.png"],
  ["canonical-qualification/browser/compact.png", "browser/compact.png"],
  ["canonical-qualification/browser/mobile.png", "browser/mobile.png"],
  ["normalization/sol/normalization-result.md", "normalization/sol-result.md"],
  ["normalization/sol/parse-result.json", "normalization/sol-parse-result.json"],
  ["normalization/kimi/normalization-result.md", "normalization/kimi-result.md"],
  ["normalization/kimi/parse-result.json", "normalization/kimi-parse-result.json"],
  ["normalization/grok/normalization-result.md", "normalization/grok-result.md"],
  ["normalization/grok/parse-result.json", "normalization/grok-parse-result.json"],
  ["normalization/grok/compile-result.json", "normalization/grok-compile-result.json"],
  ["normalization/runtime-installation.json", "normalization/runtime-installation.json"],
  ["input-freeze/input-freeze-result.md", "input-freeze-result.md"],
  ["input-freeze/candidate-sha256.json", "hashes/candidate-sha256.json"],
  ["input-freeze/source-pack-sha256.json", "hashes/source-pack-sha256.json"],
  ["input-freeze/benchmark-review-sha256.json", "hashes/benchmark-review-sha256.json"],
  ["input-freeze/normalization-authority.json", "hashes/normalization-authority.json"],
];

await rm(bundleRoot, { recursive: true, force: true });
for (const [source, destination] of files) {
  const target = path.join(bundleRoot, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(sourceRoot, source), target);
}
await cp(path.join(sourceRoot, "layoutcrafts-handoff"), path.join(bundleRoot, "layoutcrafts-handoff"), { recursive: true });
await mkdir(path.join(bundleRoot, "review"), { recursive: true });
await cp(path.join(repository, "dev-workflow", "results", "CN-DS-SYNTH-001-canonical-craft-design-system-synthesis-result.md"), path.join(bundleRoot, "review", "result.md"));
await cp(path.join(repository, "dev-workflow", "review-packets", "CN-DS-SYNTH-001-canonical-craft-design-system-synthesis-review-packet.md"), path.join(bundleRoot, "review", "review-packet.md"));

const walk = async (directory, prefix = "") => {
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(directory, { withFileTypes: true }));
  const output = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path.join(directory, entry.name), relative));
    else if (relative !== "manifest.json") output.push(relative);
  }
  return output;
};

const requiredFiles = await walk(bundleRoot);
const fileHashes = {};
for (const file of requiredFiles) fileHashes[file] = createHash("sha256").update(await readFile(path.join(bundleRoot, file))).digest("hex");
const manifest = {
  schema: "cn-ds-synth.owner-review-bundle/v1",
  task_id: "CN-DS-SYNTH-001",
  status: "OWNER_REVIEW_READY",
  candidate_status: "candidate",
  agent_usable: false,
  required_files: requiredFiles,
  file_hashes: fileHashes,
};
await writeFile(path.join(bundleRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
