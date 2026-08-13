#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const evidence = path.join(root, "dev-workflow/evidence/r013/package");
const npmCache = path.join(os.tmpdir(), "recrafts-r013-npm-cache");
await mkdir(evidence, { recursive: true });
await mkdir(npmCache, { recursive: true });
const env = { ...process.env, npm_config_cache: npmCache };
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: "utf8", env, ...options });
const checked = (label, command, args, options = {}) => {
  const result = run(command, args, options);
  if (result.status !== 0) throw new Error(`${label} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result;
};

const pack = checked("npm pack", "npm", ["pack", "--json", "--pack-destination", evidence], { cwd: root });
const inventory = JSON.parse(pack.stdout);
if (inventory.length !== 1 || inventory[0].version !== "0.6.0-rc.1") throw new Error("npm pack returned an unexpected package identity");
await writeFile(path.join(evidence, "npm-pack-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
const tarball = path.join(evidence, inventory[0].filename);
const tarballBytes = await readFile(tarball);
const tarballSha = createHash("sha256").update(tarballBytes).digest("hex");
await writeFile(path.join(evidence, "tarball-sha256.txt"), `${tarballSha}  ${inventory[0].filename}\n`);

const installRoot = await mkdtemp(path.join(os.tmpdir(), "recrafts-r013-darwin-install-"));
checked("npm init", "npm", ["init", "-y"], { cwd: installRoot });
const install = checked("exact tarball clean install", "npm", ["install", tarball, "--ignore-scripts"], { cwd: installRoot });
const packageRoot = path.join(installRoot, "node_modules/recrafts");
const binChecks = [
  ["recraft", path.join(packageRoot, "runtime/recraft-cli.mjs"), [], 1],
  ["recraft-interop", path.join(packageRoot, "runtime/interop_cli.mjs"), ["--version"], 0],
  ["recraft-capture", path.join(packageRoot, "runtime/browser_capture_cli.mjs"), [], 2]
].map(([name, file, args, expected]) => {
  const result = run(process.execPath, [file, ...args], { cwd: installRoot });
  if (result.status !== expected || /ERR_MODULE_NOT_FOUND|Cannot find module/.test(`${result.stdout}${result.stderr}`)) throw new Error(`${name} bin load failed`);
  return { name, expected_exit_code: expected, observed_exit_code: result.status, stdout_sha256: createHash("sha256").update(result.stdout).digest("hex"), stderr_sha256: createHash("sha256").update(result.stderr).digest("hex") };
});
const smokeWorkspace = path.join(installRoot, "installed-smoke-workspace");
const smokeScript = path.join(packageRoot, "scripts/r012-installed-consumer-smoke.mjs");
const smokeModule = await import(pathToFileURL(smokeScript).href);
if (typeof smokeModule.runInstalledConsumerSmoke !== "function") throw new Error("Installed package does not export runInstalledConsumerSmoke");
const smoke = await smokeModule.runInstalledConsumerSmoke({ workspace: smokeWorkspace, cliFile: path.join(packageRoot, "runtime/interop_cli.mjs"), packageRoot });
if (smoke.tests.failed !== 0 || smoke.operation_results.length !== 11) throw new Error("Installed smoke did not qualify all 11 Operations");
await writeFile(path.join(evidence, "installed-smoke-result.json"), `${JSON.stringify(smoke, null, 2)}\n`);
const qualification = { schema: "recrafts.r013-darwin-qualification/v1", status: "PASS", platform: process.platform, arch: process.arch, package_version: inventory[0].version, tarball: inventory[0].filename, tarball_sha256: tarballSha, packed_files: inventory[0].entryCount, exact_tarball_install: true, source_install: false, bin_checks: binChecks, installed_operations: smoke.operation_results.length, installed_smoke: smoke.tests };
await writeFile(path.join(evidence, "darwin-qualification.json"), `${JSON.stringify(qualification, null, 2)}\n`);
await writeFile(path.join(evidence, "clean-install.log"), `exact tarball: ${inventory[0].filename}\nsha256: ${tarballSha}\nnpm install exit: 0\ninstalled package version: ${inventory[0].version}\nCLI bins loaded: 3/3\ninstalled Operations: 11/11\ninstalled smoke: ${smoke.tests.passed}/${smoke.tests.total} PASS\n`);
process.stdout.write(`${JSON.stringify(qualification, null, 2)}\n`);
