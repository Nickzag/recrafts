import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const rcDirectory = path.resolve(process.argv[2]);
const tarball = path.join(rcDirectory, "artifacts/recrafts-0.3.0-rc.1.tgz");
const sandbox = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-clean-install-"));
const work = path.join(sandbox, "work");
await mkdir(work, { recursive: true });
execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], { cwd: sandbox, stdio: "pipe" });
const cli = path.join(sandbox, "node_modules/.bin/recraft-interop");
const run = (request) => {
  const result = spawnSync(cli, [], { cwd: sandbox, input: typeof request === "string" ? request : JSON.stringify(request), encoding: "utf8" });
  let response = null;
  try { response = JSON.parse(result.stdout); } catch {}
  return { exit_code: result.status, stdout_json_values: response ? 1 : 0, stderr: result.stderr, response };
};
const base = (operation, input = {}, output_directory) => ({ protocol_version: "1.0", request_id: `smoke-${operation}`, operation, host: { agent: "generic-shell-fixture", engine: "node", capabilities: ["files","structured-output"] }, working_root: work, input, ...(output_directory ? { output_directory } : {}) });
await cp(path.join(rcDirectory, "bundle/fixtures/sanitized-analysis-fixture.svg"), path.join(work, "fixture.svg"));
await cp(path.join(rcDirectory, "bundle/fixtures/host-analysis.fixture.json"), path.join(work, "host-analysis.json"));
await cp(path.join(rcDirectory, "bundle/evidence/fidelity"), path.join(work, "fidelity"), { recursive: true });

const checks = [];
const help = spawnSync(cli, ["--help"], { encoding: "utf8" }); checks.push({ name: "help", passed: help.status === 0 && /one JSON request/.test(help.stdout) });
const version = spawnSync(cli, ["--version"], { encoding: "utf8" }); checks.push({ name: "version", passed: version.status === 0 && version.stdout.trim() === "0.3.0-rc.1" });
const packageTest = spawnSync("npm", ["test"], { cwd: path.join(sandbox, "node_modules/recrafts"), encoding: "utf8" }); checks.push({ name: "package-local-test", passed: packageTest.status === 0 && /1 protocol check/.test(packageTest.stdout) && !/0 tests/.test(packageTest.stdout) });
const capabilities = run(base("capabilities")); checks.push({ name: "capabilities", passed: capabilities.exit_code === 0 && capabilities.response?.validation.embedded_vision_provider === false && capabilities.stdout_json_values === 1 });
const prepared = run(base("prepare-analysis", { sources: ["fixture.svg"] }, "prepared")); checks.push({ name: "prepare-analysis", passed: prepared.exit_code === 0 && prepared.response?.status === "needs_host_action" && prepared.response?.error === null });
const hostAnalysisFile = path.join(work, "host-analysis.json");
const hostAnalysis = JSON.parse(await readFile(hostAnalysisFile, "utf8")); hostAnalysis.prepared_analysis_id = prepared.response?.validation.prepared_analysis_id; await writeFile(hostAnalysisFile, JSON.stringify(hostAnalysis));
const submitted = run(base("submit-analysis", { prepared_analysis_directory: "prepared", host_analysis_file: "host-analysis.json" }, "package")); checks.push({ name: "submit-analysis", passed: submitted.exit_code === 0 && submitted.response?.status === "completed_with_warnings" });
const validated = run(base("validate-package", { package_directory: "package" })); checks.push({ name: "validate-package", passed: validated.exit_code === 0 && validated.response?.validation.valid === true });
const realized = run(base("generate-realization", { package_directory: "package" }, "realization")); checks.push({ name: "generate-realization", passed: Boolean(realized.exit_code === 0 && realized.response?.validation.realization_id) });
const fidelity = run(base("verify-fidelity", { fidelity_directory: "fidelity" })); checks.push({ name: "verify-fidelity", passed: fidelity.exit_code === 0 && fidelity.response?.validation.status === "passed" });
const malformed = run("not-json"); checks.push({ name: "malformed-request", passed: malformed.exit_code !== 0 && malformed.response?.error.code === "INVALID_JSON" });
const unsafe = run(base("prepare-analysis", { sources: ["../escape.svg"] }, "unsafe")); checks.push({ name: "unsafe-path", passed: unsafe.exit_code !== 0 && unsafe.response?.error.code === "UNSAFE_INPUT_PATH" });
const collision = run(base("generate-realization", { package_directory: "package" }, "realization")); checks.push({ name: "output-collision", passed: collision.exit_code !== 0 && collision.response?.error.code === "OUTPUT_NOT_EMPTY" });
const report = { status: checks.every(({ passed }) => passed) ? "passed" : "failed", installed_tarball: path.basename(tarball), fixture_label: "deterministic interoperability fixture; not a live model result; not proof of visual quality", sandbox_policy: "temporary directory outside source repository", checks };
await writeFile(path.join(rcDirectory, "validation/clean-install-report.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== "passed") process.exitCode = 1;
