#!/usr/bin/env node
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tarball = path.resolve(process.argv[2]);
const root = await mkdtemp(path.join(os.tmpdir(), "recrafts-r006-clean-install-"));
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
};
run("npm", ["init", "-y"]); run("npm", ["install", tarball]);
const cli = path.join(root, "node_modules/recrafts/runtime/interop_cli.mjs");
const fixtureRoot = path.join(root, "node_modules/recrafts/fixtures");
await cp(path.join(fixtureRoot, "interop/sanitized-analysis-fixture.svg"), path.join(root, "image.svg"));
for (const state of ["complete", "partial", "stale"]) await cp(path.join(fixtureRoot, `r006/url-${state}.json`), path.join(root, `${state}.json`));
const host = { agent: "clean-install-fixture", engine: "node", capabilities: ["vision", "files", "structured-output"] };
const envelope = (operation, input, output_directory) => ({ protocol_version: "1.1", request_id: `clean-${operation}-${output_directory ?? "none"}`, operation, host, working_root: root, input, ...(output_directory ? { output_directory } : {}) });
const call = (request) => JSON.parse(run(process.execPath, [cli], { input: JSON.stringify(request) }));
const capability = call(envelope("capabilities", {}));
if (capability.validation.protocol_version !== "1.1") throw new Error("Protocol 1.1 unavailable after clean install");
const image = call(envelope("prepare-analysis", { sources: [{ kind: "image", path: "image.svg" }] }, "prepared-image"));
const evidence = JSON.parse(await readFile(path.join(root, "prepared-image/analysis/evidence-bundle.json"))).evidence[0].evidence_id;
const analysis = { fixture_label: "clean-install-host-analysis", prepared_analysis_id: image.validation.prepared_analysis_id, execution: { host_agent: "clean-install-fixture", engine: "fixture-vision", vision_capability: true, performed_at: "2026-07-13T00:00:00Z" }, findings: [{ id: "finding", observation: "Sanitized surface", scope: "surface", confidence: 0.6, evidence_refs: [evidence] }], tokens: [{ id: "color.surface", value: "#fff", scope: "surface", status: "inferred", confidence: 0.6, evidence_refs: [evidence] }], components: [{ name: "surface", scope: "surface", confidence: 0.6, evidence_refs: [evidence] }], grid_rules: [] };
await writeFile(path.join(root, "host-analysis.json"), JSON.stringify(analysis));
const submitted = call(envelope("submit-analysis", { prepared_analysis_directory: "prepared-image", host_analysis_file: "host-analysis.json" }, "package"));
if (submitted.validation.package_status !== "awaiting-review") throw new Error("Clean-install image package did not await review");
const validated = call(envelope("validate-package", { package_directory: "package" }));
if (validated.validation.status !== "pass") throw new Error("Clean-install package validation failed");
const urlStates = {};
for (const state of ["complete", "partial", "stale"]) {
  const response = call(envelope("prepare-analysis", { sources: [{ kind: "url", url: "https://example.com", capture_fixture: `${state}.json` }] }, `url-${state}`));
  urlStates[state] = response.validation.capture_status;
}
const blocked = call(envelope("prepare-analysis", { sources: [{ kind: "url", url: "http://127.0.0.1/private" }] }, "url-blocked"));
urlStates.blocked = blocked.validation.capture_status;
console.log(JSON.stringify({ status: "pass", root, operations: ["capabilities", "prepare-analysis", "submit-analysis", "validate-package"], url_states: urlStates, independent_from_craftsos: true }));
