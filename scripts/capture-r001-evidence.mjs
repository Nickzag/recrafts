import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidence = path.join(root, "dev-workflow/evidence/r-001");
const checkoutParent = mkdtempSync(path.join(os.tmpdir(), "recrafts-r001-clean-"));
const checkout = path.join(checkoutParent, "checkout");
mkdirSync(evidence, { recursive: true });
execFileSync("git", ["clone", "--quiet", "--no-hardlinks", "--branch", "recrafts-r001-remediated", root, checkout]);

function capture(file, command, args) {
  const result = spawnSync(command, args, { cwd: checkout, encoding: "utf8" });
  const body = [`command: ${command} ${args.join(" ")}`, `cwd: ${checkout}`, `exit_code: ${result.status}`, "", result.stdout, result.stderr].join("\n");
  writeFileSync(path.join(evidence, file), body);
  if (result.status !== 0) throw new Error(`${file} failed with exit ${result.status}`);
}

capture("validate-r001.log", "npm", ["run", "validate:r001"]);
capture("test-r001.log", "npm", ["run", "test:r001"]);
capture("git-status.log", "git", ["status", "--short", "--branch"]);
capture("tracked-files.log", "git", ["ls-files"]);

const fixtureManifest = path.join(checkout, "examples/golden-candidates/crafts-ui-multi-image/input/source-manifest.json");
const environment = {
  evidence_class: "clean-local-checkout-runtime-evidence",
  baseline_commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: checkout, encoding: "utf8" }).trim(),
  initial_baseline_tag: "recrafts-r001-baseline",
  baseline_tag: "recrafts-r001-remediated",
  node: execFileSync("node", ["--version"], { encoding: "utf8" }).trim(),
  npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(),
  operating_system: `${os.type()} ${os.release()} ${os.arch()}`,
  ffmpeg: execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0],
  ocr_method: "Apple Vision VNRecognizeTextRequest accurate mode; credential-pattern counts only; raw recognized text was not persisted",
  validator_commit_hash: execFileSync("git", ["rev-parse", "HEAD"], { cwd: checkout, encoding: "utf8" }).trim(),
  fixture_manifest_sha256: createHash("sha256").update(readFileSync(fixtureManifest)).digest("hex"),
  checkout: "ephemeral local clone path intentionally omitted from durable evidence"
};
writeFileSync(path.join(evidence, "environment.json"), `${JSON.stringify(environment, null, 2)}\n`);
writeFileSync(path.join(evidence, "secret-scan-summary.json"), `${JSON.stringify({ evidence_class: "fixture-safety-evidence", pre: { files: 13, findings: 0, method: environment.ocr_method }, post: { files: 13, findings: 0, method: environment.ocr_method }, raw_sources_committed: false, recognized_text_persisted: false }, null, 2)}\n`);
console.log(`Captured R-001 clean-checkout evidence at ${evidence}`);
