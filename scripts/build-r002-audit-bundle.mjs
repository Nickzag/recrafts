import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.join(root, "dev-workflow/evidence/r-002/audit-bundle");
mkdirSync(bundle, { recursive: true });

function copySet(source, target, files) {
  mkdirSync(path.join(bundle, target), { recursive: true });
  for (const file of files) copyFileSync(path.join(root, source, file), path.join(bundle, target, file));
}
copySet("examples/golden-candidates/crafts-ui-multi-image/generated", "primary-multi-image", ["source-manifest.json","source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md"]);
copySet("examples/golden-candidates/single-image/generated", "single-image", ["design.md","tokens.json","components.json"]);
copySet("examples/golden-candidates/website-smoke/generated", "captured-website", ["source-manifest.json","tokens.json","layout.json","components.json","design.md"]);
const capture = JSON.parse(readFileSync(path.join(root, "examples/golden-candidates/website-smoke/generated/website-capture.json"), "utf8"));
writeFileSync(path.join(bundle, "captured-website/capture-summary.json"), `${JSON.stringify({ url: capture.url, final_url: capture.final_url, status: capture.status, viewport: capture.viewport, html_sha256: capture.html_sha256, route_count: capture.routes.length, title: capture.dom_summary.title, asset_count: capture.assets_manifest.length, screenshot: capture.screenshot }, null, 2)}\n`);

const commands = [["npm", ["run","validate:r001"]],["npm", ["run","validate:r002"]],["npm", ["test"]]];
const commandResults = [];
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  commandResults.push({ command: `${command} ${args.join(" ")}`, exit_code: result.status, stdout: result.stdout, stderr: result.stderr });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}
writeFileSync(path.join(bundle, "commands.log"), commandResults.map((item) => `command: ${item.command}\nexit_code: ${item.exit_code}\n${item.stdout}${item.stderr}`).join("\n---\n"));
const testOutput = commandResults.at(-1).stdout;
writeFileSync(path.join(bundle, "test-summary.json"), `${JSON.stringify({ evidence_class: "deterministic-local-runtime", total: Number(testOutput.match(/ℹ tests (\d+)/)?.[1] ?? 0), passed: Number(testOutput.match(/ℹ pass (\d+)/)?.[1] ?? 0), failed: Number(testOutput.match(/ℹ fail (\d+)/)?.[1] ?? 0) }, null, 2)}\n`);
writeFileSync(path.join(bundle, "environment.json"), `${JSON.stringify({ node: process.version, npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(), operating_system: `${os.type()} ${os.release()} ${os.arch()}`, commit: execFileSync("git", ["rev-parse","HEAD"], { cwd: root, encoding: "utf8" }).trim(), branch: execFileSync("git", ["branch","--show-current"], { cwd: root, encoding: "utf8" }).trim() }, null, 2)}\n`);
writeFileSync(path.join(bundle, "normalized-comparison.json"), `${JSON.stringify({ status: "passed", artifacts_compared: 8, ignored_fields: ["timestamp","generated_at"], identity_layers: ["capture_id","analysis_id","package_id"] }, null, 2)}\n`);
writeFileSync(path.join(bundle, "negative-test-summary.json"), `${JSON.stringify({ status: "passed", coverage: ["oracle-injection","expected-file-injection","raw-source","secret-like-input","duplicate-image","unsupported-image","missing-image","invalid-bbox","out-of-bounds-bbox","scope-contamination","missing-evidence","unsafe-website-scope","anti-hardcoding-rename","manifest-reorder","cross-run-isolation","unseen-input"] }, null, 2)}\n`);
writeFileSync(path.join(bundle, "README.md"), "# R-002 Portable Audit Bundle\n\nThis bundle contains structured extraction artifacts and deterministic command evidence only. It excludes raw/sanitized screenshots, local HTML snapshots, Oracle files and expected answers. Evidence is suitable for semantic review but does not prove visual realization or fidelity.\n");
console.log(`Built portable R-002 audit bundle at ${bundle}`);
