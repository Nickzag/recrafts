#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const R008A_TARBALL_SHA256 = "2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774";
export const R008A_OPERATIONS = [
  "capabilities", "prepare-analysis", "submit-analysis", "validate-package",
  "generate-realization", "verify-fidelity", "submit-correction",
  "accept-artifacts", "rollback-package"
];
export const R008A_NEGATIVE_GATES = [
  "raw-host-output-in-evidence", "domain-without-evidence-refs", "host-self-authorization",
  "open-high-impact-conflict-acceptance", "partial-source-acceptance",
  "stale-source-acceptance", "rollback-output-overwrite", "path-traversal",
  "symlink-escape", "output-collision"
];

const REQUIRED_FILES = [
  "validation/clean-install-linux.json", "validation/linux-platform.json",
  "validation/linux-operation-matrix.json", "validation/linux-real-url-report.json",
  "validation/linux-conflict-acceptance-report.json", "validation/linux-rollback-report.json",
  "validation/linux-negative-gates.json", "validation/linux-package-isolation.json",
  "logs/linux-command-log.txt", "checksums.sha256", "workflow-run.json"
];
const HASH = /^[a-f0-9]{64}$/;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function readJson(root, name, errors) {
  const file = path.join(root, name);
  if (!existsSync(file)) {
    errors.push(`Missing required evidence file: ${name}`);
    return null;
  }
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { errors.push(`Invalid JSON in ${name}: ${error.message}`); return null; }
}

function validateChecksums(root, errors) {
  const file = path.join(root, "checksums.sha256");
  if (!existsSync(file)) return;
  const entries = new Map();
  for (const [index, line] of readFileSync(file, "utf8").trim().split(/\r?\n/).entries()) {
    const match = line.match(/^([a-f0-9]{64})  ([^\r\n]+)$/);
    if (!match) { errors.push(`Invalid checksums.sha256 line ${index + 1}`); continue; }
    const [, declared, name] = match;
    const normalized = path.posix.normalize(name.replaceAll("\\", "/"));
    if (path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
      errors.push(`Unsafe checksum path: ${name}`); continue;
    }
    const target = path.join(root, normalized);
    if (!existsSync(target) || !statSync(target).isFile()) { errors.push(`Checksum target missing: ${normalized}`); continue; }
    const actual = sha256(readFileSync(target));
    if (actual !== declared) errors.push(`Checksum mismatch: ${normalized}`);
    entries.set(normalized, declared);
  }
  for (const name of REQUIRED_FILES.filter((value) => value !== "checksums.sha256" && value !== "workflow-run.json")) {
    if (!entries.has(name)) errors.push(`Artifact checksum manifest does not cover ${name}`);
  }
}

function validateCleanInstall(report, expectedSha, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux clean-install status must be passed");
  if (report.rc_id !== "recrafts-0.4.0-rc.1-build2") errors.push("Linux clean-install RC identity is not Build 2");
  if (report.tarball_sha256 !== expectedSha) errors.push("Build 2 tarball SHA-256 does not match the frozen value");
}

function validatePlatform(report, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux platform report status must be passed");
  if (String(report.platform).toLowerCase() !== "linux" || !/^linux\b/i.test(String(report.os))) errors.push("Linux platform identity is missing or invalid");
  for (const key of ["architecture", "node", "npm", "playwright", "chromium", "installed_package_version", "protocol_version", "schema_version"]) {
    if (!report[key]) errors.push(`Linux platform report is missing ${key}`);
  }
  if (report.installed_package_version !== "0.4.0-rc.1") errors.push("Installed package version is not 0.4.0-rc.1");
  if (report.protocol_version !== "1.1" || report.schema_version !== "3.0.0") errors.push("Installed protocol/schema version mismatch");
}

function validateOperations(report, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux operation matrix status must be passed");
  const operationNames = Object.keys(report.operations ?? {});
  if (operationNames.length !== R008A_OPERATIONS.length || operationNames.some((name) => !R008A_OPERATIONS.includes(name))) errors.push("Linux operation matrix must account for exactly the nine canonical operations");
  for (const operation of R008A_OPERATIONS) {
    const result = report.operations?.[operation];
    if (!result) { errors.push(`Linux operation matrix is missing ${operation}`); continue; }
    if (operation === "generate-realization") {
      const passed = result.status === "passed" || (result.status === "failed-closed" && result.error_code === "REALIZATION_NOT_AUTHORIZED");
      if (!passed) errors.push("generate-realization must pass or assert REALIZATION_NOT_AUTHORIZED fail-closed behavior");
    } else if (result.status !== "passed") errors.push(`${operation} did not pass on Linux`);
  }
}

function validateRealUrl(report, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux real URL report status must be passed");
  if (report.capture_status !== "complete") errors.push("Real URL capture status must be complete");
  if (!/^https:\/\/(www\.)?craft\.do\/?$/i.test(String(report.target_url))) errors.push("Real URL target is not https://www.craft.do");
  if (report.raw_host_output_present !== false) errors.push("Raw Host output must not be present in URL Evidence");
  if (!Array.isArray(report.evidence) || report.evidence.length === 0) { errors.push("Real URL Evidence records are missing"); return; }

  const classes = new Set();
  for (const [index, item] of report.evidence.entries()) {
    const itemClasses = item.evidence_classes;
    if (!Array.isArray(itemClasses) || itemClasses.length === 0) { errors.push(`URL Evidence ${index + 1} has no evidence class`); continue; }
    itemClasses.forEach((value) => classes.add(value));
    if (!HASH.test(String(item.sha256)) || item.hash_verified !== true) errors.push(`URL Evidence ${item.evidence_id ?? index + 1} has an invalid or unverified SHA-256`);
    if (!item.freshness?.captured_at || !item.freshness?.valid_at) errors.push(`URL Evidence ${item.evidence_id ?? index + 1} lacks freshness fields`);
    const structured = itemClasses.some((value) => ["dom", "css-rule", "css-variable", "computed-style"].includes(value));
    const pixels = itemClasses.some((value) => ["viewport-screenshot", "screenshot-region"].includes(value));
    if (structured && pixels) errors.push("DOM/CSS and screenshot Evidence must remain separate records");
  }
  for (const required of ["capture-metadata", "network-response", "dom", "computed-style", "viewport-screenshot", "screenshot-region", "asset"]) {
    if (!classes.has(required)) errors.push(`Real URL Evidence is missing ${required}`);
  }
  if (!classes.has("css-rule") && !classes.has("css-variable")) errors.push("Real URL Evidence is missing css-rule or css-variable");
  if (!classes.has("font") && !classes.has("no-custom-font")) errors.push("Real URL Evidence is missing font or explicit no-custom-font result");
  if (report.lifecycle?.partial_acceptance !== "REALIZATION_NOT_AUTHORIZED" || report.lifecycle?.stale_acceptance !== "REALIZATION_NOT_AUTHORIZED") errors.push("Partial and stale URL sources must fail acceptance with REALIZATION_NOT_AUTHORIZED");
  if (report.lifecycle?.blocked_semantic_analysis_completed !== false || report.lifecycle?.blocked_acceptance !== "not-constructible-without-fabricated-semantic-evidence") errors.push("Blocked URL source did not stop before semantic analysis and acceptance");
}

function validateConflict(report, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux conflict/acceptance report status must be passed");
  if (report.fixture_label !== "deterministic-non-live-host-analysis" || report.fixture_is_live_model_result !== false || report.fixture_is_visual_quality_proof !== false || report.fixture_is_project_owner_decision !== false) errors.push("Linux Host fixture is not explicitly bounded as deterministic and non-live");
  if (!(report.high_impact_conflicts > 0)) errors.push("Linux image-set flow did not create a high-impact conflict");
  if (report.acceptance_before_correction?.status !== "blocked" || report.acceptance_before_correction?.error_code !== "REALIZATION_NOT_AUTHORIZED") errors.push("Open high-impact conflict did not block acceptance");
  if (report.correction?.status !== "passed") errors.push("Authorized correction did not pass");
  if (report.acceptance_after_correction?.status !== "passed") errors.push("Acceptance after correction did not pass");
}

function validateRollback(report, errors) {
  if (!report) return;
  if (report.status !== "passed" || report.lineage_event_type !== "rollback-created" || report.hashes_restored !== true) errors.push("Linux rollback did not create a passing immutable rollback package");
  const target = report.target_artifact_hashes;
  const rollback = report.rollback_artifact_hashes;
  if (!target || !rollback || Object.keys(target).length === 0 || JSON.stringify(target) !== JSON.stringify(rollback)) errors.push("Linux rollback canonical artifact hashes do not match the restore target");
  for (const value of [...Object.values(target ?? {}), ...Object.values(rollback ?? {})]) if (!HASH.test(String(value))) errors.push("Linux rollback report contains an invalid artifact hash");
}

function validateNegativeGates(report, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux negative-gate report status must be passed");
  const gates = new Map((report.gates ?? []).map((gate) => [gate.name, gate]));
  for (const name of R008A_NEGATIVE_GATES) {
    const gate = gates.get(name);
    if (!gate) errors.push(`Linux negative-gate report is missing ${name}`);
    else if (gate.status !== "failed-closed" || !gate.error_code) errors.push(`${name} did not fail closed with a stable error category`);
  }
}

function validateIsolation(report, expectedSha, errors) {
  if (!report) return;
  if (report.status !== "passed") errors.push("Linux package-isolation report status must be passed");
  if (report.install_source?.type !== "tarball" || report.install_source?.sha256 !== expectedSha) errors.push("Linux qualification did not use the exact tarball install");
  if (report.package_runtime_source !== "installed-node_modules") errors.push("Linux qualification runtime did not come from installed-node_modules");
  if (report.package_lock_resolved_from_file_tarball !== true || report.installed_inside_temporary_work_root !== true || report.qualification_outside_checkout !== true) errors.push("Linux qualification did not prove an isolated file-tarball installation outside the checkout");
  if (report.npm_link_used !== false || report.checkout_dependency !== false || !Array.isArray(report.source_repository_imports) || report.source_repository_imports.length !== 0) errors.push("Linux qualification depends on a source checkout, npm link or source runtime import");
}

function validateWorkflow(root, report, errors) {
  if (!report) return;
  for (const key of ["workflow_name", "run_id", "run_attempt", "repository_commit", "runner_os", "runner_architecture", "started_at", "completed_at"]) if (!report[key]) errors.push(`workflow-run.json is missing ${key}`);
  if (report.runner_os !== "Linux") errors.push("Workflow runner OS is not Linux");
  if (report.artifact_checksum_scope !== "checksums.sha256" || !HASH.test(String(report.artifact_checksum))) errors.push("Workflow artifact checksum is missing or invalid");
  else if (existsSync(path.join(root, "checksums.sha256")) && report.artifact_checksum !== sha256(readFileSync(path.join(root, "checksums.sha256")))) errors.push("Workflow artifact checksum does not match checksums.sha256");
}

function validateReleaseState(releaseRoot, cleanInstall, expectedSha, errors) {
  if (!releaseRoot) return;
  const releaseErrors = [];
  const platform = readJson(releaseRoot, "validation/platform-matrix.json", releaseErrors);
  const readiness = readJson(releaseRoot, "validation/rc-readiness.json", releaseErrors);
  errors.push(...releaseErrors);
  if (platform) {
    if (platform.linux?.status !== "pass" || platform.linux?.verified !== true) errors.push("Release platform matrix does not mark Linux verified and passed");
    if (platform.linux?.tarball_sha256 !== expectedSha) errors.push("Release platform matrix Linux tarball SHA-256 mismatch");
  }
  if (readiness) {
    const ready = readiness.status === "ready-for-owner-review" && readiness.ready_for_owner_review === true && Array.isArray(readiness.blockers) && readiness.blockers.length === 0;
    if (!ready) errors.push("RC readiness is not ready-for-owner-review with no blockers");
    if (cleanInstall?.status !== "passed" && ready) errors.push("RC readiness cannot be ready while Linux qualification has not passed");
  }
}

export function validateLinuxEvidence(root, options = {}) {
  const evidenceRoot = path.resolve(root);
  const expectedSha = options.expectedTarballSha256 ?? R008A_TARBALL_SHA256;
  const errors = [];
  for (const name of REQUIRED_FILES) if (!existsSync(path.join(evidenceRoot, name))) errors.push(`Missing required evidence file: ${name}`);
  const cleanInstall = readJson(evidenceRoot, "validation/clean-install-linux.json", errors);
  const platform = readJson(evidenceRoot, "validation/linux-platform.json", errors);
  const operations = readJson(evidenceRoot, "validation/linux-operation-matrix.json", errors);
  const realUrl = readJson(evidenceRoot, "validation/linux-real-url-report.json", errors);
  const conflict = readJson(evidenceRoot, "validation/linux-conflict-acceptance-report.json", errors);
  const rollback = readJson(evidenceRoot, "validation/linux-rollback-report.json", errors);
  const negatives = readJson(evidenceRoot, "validation/linux-negative-gates.json", errors);
  const isolation = readJson(evidenceRoot, "validation/linux-package-isolation.json", errors);
  const workflow = readJson(evidenceRoot, "workflow-run.json", errors);

  validateCleanInstall(cleanInstall, expectedSha, errors);
  validatePlatform(platform, errors);
  validateOperations(operations, errors);
  validateRealUrl(realUrl, errors);
  validateConflict(conflict, errors);
  validateRollback(rollback, errors);
  validateNegativeGates(negatives, errors);
  validateIsolation(isolation, expectedSha, errors);
  validateChecksums(evidenceRoot, errors);
  validateWorkflow(evidenceRoot, workflow, errors);
  validateReleaseState(options.releaseRoot ? path.resolve(options.releaseRoot) : null, cleanInstall, expectedSha, errors);

  return { status: errors.length === 0 ? "pass" : "fail", errors, evidence_root: evidenceRoot, release_state_validated: Boolean(options.releaseRoot) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = args[0];
  const releaseIndex = args.indexOf("--release-root");
  if (!root) {
    process.stderr.write("Usage: node scripts/validate-r008a-linux-evidence.mjs <evidence-directory> [--release-root <build2-directory>]\n");
    process.exit(2);
  }
  const result = validateLinuxEvidence(root, { releaseRoot: releaseIndex >= 0 ? args[releaseIndex + 1] : undefined });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "pass") process.exitCode = 1;
}
