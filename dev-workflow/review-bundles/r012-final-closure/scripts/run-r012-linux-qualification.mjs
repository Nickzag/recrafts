#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateLinuxEvidence } from "../runtime/r012_linux_evidence.mjs";

if (process.platform !== "linux") {
  process.stdout.write(`${JSON.stringify({ schema: "recrafts.r012-local-linux-diagnosis/v1", host_os: process.platform, readiness: "LINUX_PENDING", substitutes_for_linux_evidence: false }, null, 2)}\n`);
  process.exit(2);
}

const packageFile = process.argv[2] ? path.resolve(process.argv[2]) : null;
const outputFile = path.resolve(process.argv[3] ?? "r012-linux-evidence.json");
if (!packageFile) throw new Error("Usage: run-r012-linux-qualification.mjs <exact-tarball> [output]");
const packageBytes = await readFile(packageFile);
const installRoot = await mkdtemp(path.join(os.tmpdir(), "recrafts-r012-linux-install-"));
const qualificationWorkspace = path.join(installRoot, "qualification-workspace");
await mkdir(qualificationWorkspace);

execFileSync("npm", ["init", "-y"], { cwd: installRoot, stdio: "ignore" });
execFileSync("npm", ["install", packageFile, "--ignore-scripts"], { cwd: installRoot, stdio: "inherit" });
const installedPackageRoot = path.join(installRoot, "node_modules", "recrafts");
const installedSmoke = path.join(installRoot, "node_modules", "recrafts", "scripts", "r012-installed-consumer-smoke.mjs");
const installedCli = path.join(installedPackageRoot, "runtime", "interop_cli.mjs");
const smokeResultFile = path.join(installRoot, "installed-smoke-result.json");
execFileSync(process.execPath, [installedSmoke, qualificationWorkspace, smokeResultFile], { cwd: installRoot, stdio: "inherit" });
const smoke = JSON.parse(await readFile(smokeResultFile, "utf8"));
const cliVersion = execFileSync(process.execPath, [installedCli, "--version"], { encoding: "utf8" }).trim();
const evidence = {
  schema: "recrafts.r012-linux-evidence/v2", runner_os: "Linux", runner_arch: process.arch,
  commit_sha: process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim(),
  package_sha256: createHash("sha256").update(packageBytes).digest("hex"),
  installation: { exact_tarball: true, source_install: false, package_version: smoke.package_version, cli_version: cliVersion },
  operation_results: smoke.operation_results, tests: smoke.tests, readiness: "LINUX_QUALIFIED"
};
validateLinuxEvidence(evidence);
await writeFile(outputFile, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: "PASS", evidence: outputFile, operations: evidence.operation_results.length, tests: evidence.tests }, null, 2)}\n`);
