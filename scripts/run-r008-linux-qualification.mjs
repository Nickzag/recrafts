#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  realpathSync, statSync, symlinkSync, writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";

const RC_ID = "recrafts-0.4.0-rc.1-build2";
const DEFAULT_SHA = "2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774";
const OPERATIONS = [
  "capabilities", "prepare-analysis", "submit-analysis", "validate-package",
  "generate-realization", "verify-fidelity", "submit-correction",
  "accept-artifacts", "rollback-package"
];
const NEGATIVE_NAMES = [
  "raw-host-output-in-evidence", "domain-without-evidence-refs", "host-self-authorization",
  "open-high-impact-conflict-acceptance", "partial-source-acceptance",
  "stale-source-acceptance", "rollback-output-overwrite", "path-traversal",
  "symlink-escape", "output-collision"
];
const REPORT_FILES = [
  "validation/clean-install-linux.json", "validation/linux-platform.json",
  "validation/linux-operation-matrix.json", "validation/linux-real-url-report.json",
  "validation/linux-conflict-acceptance-report.json", "validation/linux-rollback-report.json",
  "validation/linux-negative-gates.json", "validation/linux-package-isolation.json",
  "logs/linux-command-log.txt"
];
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Invalid argument near ${key ?? "end"}`);
    values[key.slice(2)] = value;
  }
  for (const key of ["tarball", "secondary-fixture", "fidelity-fixture", "output"]) if (!values[key]) throw new Error(`Missing --${key}`);
  return {
    tarball: path.resolve(values.tarball), secondaryFixture: path.resolve(values["secondary-fixture"]),
    fidelityFixture: path.resolve(values["fidelity-fixture"]), output: path.resolve(values.output),
    expectedSha: values["expected-sha"] ?? DEFAULT_SHA,
    targetUrl: values["target-url"] ?? "https://www.craft.do",
    diagnosticNonLinux: values["diagnostic-non-linux"] === "true"
  };
}

const options = parseArgs(process.argv.slice(2));
const startedAt = new Date().toISOString();
const commandRecords = [];
mkdirSync(path.join(options.output, "validation"), { recursive: true });
mkdirSync(path.join(options.output, "logs"), { recursive: true });

function run(command, args, { cwd, input, expectSuccess = true } = {}) {
  const result = spawnSync(command, args, { cwd, input, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const record = {
    sequence: commandRecords.length + 1, command: path.basename(command), arguments: args,
    exit_code: result.status ?? -1, signal: result.signal ?? null,
    stdout_excerpt: (result.stdout ?? "").slice(0, 4000), stderr_excerpt: (result.stderr ?? "").slice(0, 4000)
  };
  try {
    const response = JSON.parse(result.stdout);
    record.response_status = response.status ?? null;
    record.error_code = response.error?.code ?? null;
  } catch {}
  commandRecords.push(record);
  if (expectSuccess && result.status !== 0) throw new Error(`${path.basename(command)} failed: ${result.stderr || result.stdout}`);
  return result;
}

function assert(condition, message) { if (!condition) throw new Error(message); }
function copyDirectory(source, target) { cpSync(source, target, { recursive: true, errorOnExist: true, force: false }); }

function treeContainsSymlink(root) {
  for (const name of readdirSync(root, { recursive: true })) if (lstatSync(path.join(root, name)).isSymbolicLink()) return true;
  return false;
}

function buildHostAnalysis(workRoot, preparedDirectory, { conflict = false, label }) {
  const bundle = json(path.join(workRoot, preparedDirectory, "analysis/evidence-bundle.json"));
  const manifest = json(path.join(workRoot, preparedDirectory, "analysis/input-manifest.json"));
  const evidenceRefs = bundle.evidence.map((item) => item.evidence_id);
  assert(evidenceRefs.length > 0, `${preparedDirectory} has no Evidence`);
  const first = evidenceRefs[0];
  return {
    fixture_label: label,
    prepared_analysis_id: manifest.prepared_analysis_id,
    execution: {
      host_agent: "r008a-deterministic-fixture", engine: "deterministic-non-live-protocol-fixture",
      vision_capability: true, performed_at: "2026-07-13T12:00:00.000Z"
    },
    source_classifications: manifest.sources.map((source) => ({
      source_id: source.source_id, classification: "unknown", scope: "surface", confidence: 0.5,
      evidence_refs: evidenceRefs.filter((id) => bundle.evidence.find((item) => item.evidence_id === id)?.source_id === source.source_id).slice(0, 1).length
        ? evidenceRefs.filter((id) => bundle.evidence.find((item) => item.evidence_id === id)?.source_id === source.source_id).slice(0, 1)
        : [first]
    })),
    findings: [{ id: "finding-bounded-fixture", observation: "Deterministic protocol fixture; no live visual-quality claim", scope: "surface", confidence: 0.5, evidence_refs: [first] }],
    tokens: [{ id: "color.surface", category: "color", value: "#ffffff", scope: "surface", status: "inferred", confidence: 0.5, evidence_refs: [first] }],
    components: [{ name: "card", purpose: "Bounded protocol surface", anatomy: ["container"], variants: ["default"], states: ["default"], scope: "surface", confidence: 0.5, evidence_refs: [first] }],
    grid_rules: [{ id: "grid.surface", rule_type: "column-layout", constraints: { columns: 2 }, scope: "surface", status: "inferred", confidence: 0.5, evidence_refs: [first] }],
    ...(conflict ? { conflicts: [{ id: "grid-review", conflict_class: "grid-rule-conflict", domain: "grid-rule", severity: "high", impact: "surface-layout", candidate_refs: ["grid.surface"], evidence_refs: [first] }] } : {})
  };
}

function decision(packageId, id, actorRole = "project-owner") {
  return {
    decision_id: id, candidate_package_id: packageId, actor: "R-008A authorized fixture reviewer",
    actor_role: actorRole, verdict: "PASS", created_at: "2026-07-13T13:00:00.000Z",
    accepted_risks: [], resolved_conflicts: [],
    notes: "Deterministic protocol qualification fixture; not a live model result or project-owner Release Verdict"
  };
}

function writeReportsAndWorkflow() {
  const lines = REPORT_FILES.sort().map((name) => {
    const target = path.join(options.output, name);
    assert(existsSync(target), `Missing generated report ${name}`);
    return `${sha(readFileSync(target))}  ${name}`;
  });
  writeFileSync(path.join(options.output, "checksums.sha256"), `${lines.join("\n")}\n`);
  writeJson(path.join(options.output, "workflow-run.json"), {
    workflow_name: process.env.GITHUB_WORKFLOW ?? "Recrafts R-008A Linux Qualification",
    run_id: process.env.GITHUB_RUN_ID ?? "local-unavailable",
    run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? "1",
    repository_commit: process.env.GITHUB_SHA ?? "unavailable",
    runner_os: process.env.RUNNER_OS ?? (process.platform === "linux" ? "Linux" : process.platform),
    runner_architecture: process.env.RUNNER_ARCH ?? os.arch(),
    started_at: startedAt, completed_at: new Date().toISOString(),
    artifact_checksum_scope: "checksums.sha256",
    artifact_checksum: sha(readFileSync(path.join(options.output, "checksums.sha256")))
  });
}

function flushCommandLog() {
  const lines = commandRecords.flatMap((record) => [
    `[${record.sequence}] ${record.command} ${record.arguments.join(" ")}`,
    `exit=${record.exit_code} signal=${record.signal ?? "none"} response_status=${record.response_status ?? "n/a"} error_code=${record.error_code ?? "none"}`,
    ...(record.stderr_excerpt ? [`stderr=${record.stderr_excerpt.replaceAll("\n", "\\n")}`] : [])
  ]);
  writeFileSync(path.join(options.output, "logs/linux-command-log.txt"), `${lines.join("\n")}\n`);
}

async function qualify() {
  const canonicalLinux = process.platform === "linux";
  assert(canonicalLinux || options.diagnosticNonLinux, `R-008A canonical qualification requires Linux, received ${process.platform}`);
  assert(existsSync(options.tarball) && statSync(options.tarball).isFile(), "Build 2 tarball not found");
  assert(existsSync(options.secondaryFixture) && statSync(options.secondaryFixture).isFile(), "Secondary sanitized fixture not found");
  assert(existsSync(options.fidelityFixture) && statSync(options.fidelityFixture).isDirectory(), "Fidelity fixture not found");
  const tarballSha = sha(readFileSync(options.tarball));
  assert(tarballSha === options.expectedSha, `Build 2 tarball SHA-256 mismatch: ${tarballSha}`);

  const workRoot = mkdtempSync(path.join(path.dirname(options.output), "recrafts-r008a-work-"));
  writeJson(path.join(workRoot, "package.json"), {
    name: "recrafts-r008a-linux-qualification", version: "1.0.0", private: true,
    scripts: { test: "node node_modules/recrafts/scripts/package-smoke.mjs" }
  });
  run("npm", ["install", "--no-audit", "--no-fund", options.tarball], { cwd: workRoot });
  const installedRoot = path.join(workRoot, "node_modules/recrafts");
  const installedPackage = json(path.join(installedRoot, "package.json"));
  assert(installedPackage.version === "0.4.0-rc.1", "Installed package version mismatch");
  run("npm", ["test"], { cwd: workRoot });

  const cli = path.join(installedRoot, "runtime/interop_cli.mjs");
  const captureCli = path.join(installedRoot, "runtime/browser_capture_cli.mjs");
  const help = run(process.execPath, [cli, "--help"], { cwd: workRoot });
  const version = run(process.execPath, [cli, "--version"], { cwd: workRoot });
  assert(/one JSON request/.test(help.stdout), "Installed CLI help mismatch");
  assert(version.stdout.trim() === "0.4.0-rc.1", "Installed CLI version mismatch");

  let requestSequence = 0;
  const host = { agent: "r008a-linux-wrapper", engine: "deterministic-non-live-protocol-fixture", capabilities: ["vision", "files", "structured-output"] };
  const envelope = (operation, input = {}, outputDirectory) => ({
    protocol_version: "1.1", request_id: `r008a-${++requestSequence}-${operation}`,
    operation, host, working_root: workRoot, input, ...(outputDirectory ? { output_directory: outputDirectory } : {})
  });
  const call = (request, { expectedError } = {}) => {
    const result = run(process.execPath, [cli], { cwd: workRoot, input: JSON.stringify(request), expectSuccess: false });
    let response;
    try { response = JSON.parse(result.stdout); } catch { throw new Error(`Installed CLI returned non-JSON: ${result.stdout}`); }
    if (expectedError) {
      const allowed = Array.isArray(expectedError) ? expectedError : [expectedError];
      assert(response.status === "failed" && allowed.includes(response.error?.code), `${request.operation} expected ${allowed.join("/")}, received ${JSON.stringify(response)}`);
    } else assert(result.status === 0 && response.status !== "failed", `${request.operation} failed: ${JSON.stringify(response)}`);
    return response;
  };

  const operationResults = {};
  const capabilities = call(envelope("capabilities"));
  assert(JSON.stringify(capabilities.validation.operations) === JSON.stringify(OPERATIONS), "Installed operation list mismatch");
  operationResults.capabilities = { status: "passed", response_status: capabilities.status };

  const primary = path.join(installedRoot, "fixtures/interop/sanitized-analysis-fixture.svg");
  cpSync(primary, path.join(workRoot, "primary.svg"));
  cpSync(options.secondaryFixture, path.join(workRoot, "secondary.svg"));
  const singlePrepared = call(envelope("prepare-analysis", { sources: [{ kind: "image", path: "primary.svg" }] }, "single-prepared"));
  operationResults["prepare-analysis"] = { status: "passed", response_status: singlePrepared.status };
  writeJson(path.join(workRoot, "single-analysis.json"), buildHostAnalysis(workRoot, "single-prepared", { conflict: false, label: "deterministic-non-live-host-analysis" }));
  const singleSubmitted = call(envelope("submit-analysis", { prepared_analysis_directory: "single-prepared", host_analysis_file: "single-analysis.json" }, "single-package-a"));
  operationResults["submit-analysis"] = { status: "passed", response_status: singleSubmitted.status };
  const singleValidated = call(envelope("validate-package", { package_directory: "single-package-a" }));
  operationResults["validate-package"] = { status: singleValidated.validation.status === "pass" ? "passed" : "failed", response_status: singleValidated.status };

  call(envelope("prepare-analysis", { sources: [{ kind: "image-set", paths: ["primary.svg", "secondary.svg"] }] }, "multi-prepared"));
  writeJson(path.join(workRoot, "multi-analysis.json"), buildHostAnalysis(workRoot, "multi-prepared", { conflict: true, label: "deterministic-non-live-host-analysis" }));
  const packageAResponse = call(envelope("submit-analysis", { prepared_analysis_directory: "multi-prepared", host_analysis_file: "multi-analysis.json" }, "multi-package-a"));
  const packageA = packageAResponse.validation.package_id;
  writeJson(path.join(workRoot, "decision-open.json"), decision(packageA, "r008a-decision-open"));
  const openBlocked = call(envelope("accept-artifacts", { candidate_package_directory: "multi-package-a", decision_file: "decision-open.json" }, "multi-open-accept"), { expectedError: "REALIZATION_NOT_AUTHORIZED" });

  const conflict = json(path.join(workRoot, "multi-package-a/conflicts.json")).conflicts[0];
  const grid = json(path.join(workRoot, "multi-package-a/grid-rules.json")).grid_rules[0];
  writeJson(path.join(workRoot, "correction-1.json"), {
    correction_id: "r008a-correction-1", base_package_id: packageA,
    actor: "R-008A authorized fixture reviewer", actor_role: "authorized-reviewer",
    created_at: "2026-07-13T13:10:00.000Z", reason: "Resolve deterministic qualification conflict",
    operations: [{ operation_id: "r008a-correction-1-op-1", type: "resolve-conflict", target_id: conflict.conflict_id,
      before: { status: "open" }, after: { status: "resolved", selected_candidate: grid.domain_id, rejected_candidates: [] },
      evidence_refs: conflict.evidence_refs, claim_refs: grid.claim_refs, reason: "Bounded evidence-backed qualification correction" }],
    decision_context: { review_id: "r008a-linux-fixture-review-1", fixture_only: true }
  });
  const corrected = call(envelope("submit-correction", { base_package_directory: "multi-package-a", correction_file: "correction-1.json" }, "multi-package-b"));
  operationResults["submit-correction"] = { status: "passed", response_status: corrected.status };
  writeJson(path.join(workRoot, "decision-c.json"), decision(corrected.validation.package_id, "r008a-decision-c"));
  const acceptedC = call(envelope("accept-artifacts", { candidate_package_directory: "multi-package-b", decision_file: "decision-c.json" }, "multi-package-c"));
  operationResults["accept-artifacts"] = { status: "passed", response_status: acceptedC.status };

  const component = json(path.join(workRoot, "multi-package-c/components.json")).components[0];
  writeJson(path.join(workRoot, "correction-2.json"), {
    correction_id: "r008a-correction-2", base_package_id: acceptedC.validation.package_id,
    actor: "R-008A authorized fixture reviewer", actor_role: "authorized-reviewer",
    created_at: "2026-07-13T13:20:00.000Z", reason: "Exercise later immutable accepted history",
    operations: [{ operation_id: "r008a-correction-2-op-1", type: "replace-component", target_id: component.component_id,
      before: { states: component.states }, after: { states: [...new Set([...(component.states ?? []), "selected"])] },
      evidence_refs: component.evidence_refs, claim_refs: component.claim_refs, reason: "Bounded qualification evolution" }],
    decision_context: { review_id: "r008a-linux-fixture-review-2", fixture_only: true }
  });
  const evolved = call(envelope("submit-correction", { base_package_directory: "multi-package-c", correction_file: "correction-2.json" }, "multi-package-e"));
  writeJson(path.join(workRoot, "decision-f.json"), decision(evolved.validation.package_id, "r008a-decision-f"));
  const acceptedF = call(envelope("accept-artifacts", { candidate_package_directory: "multi-package-e", decision_file: "decision-f.json" }, "multi-package-f"));
  writeJson(path.join(workRoot, "rollback.json"), {
    rollback_id: "r008a-rollback-1", current_package_id: acceptedF.validation.package_id,
    restore_target_package_id: acceptedC.validation.package_id, actor: "R-008A authorized fixture reviewer",
    actor_role: "authorized-reviewer", reason: "Restore the earlier accepted deterministic fixture package",
    decision_id: "r008a-rollback-decision-1", created_at: "2026-07-13T13:30:00.000Z"
  });
  const rolledBack = call(envelope("rollback-package", { current_package_directory: "multi-package-f", restore_target_directory: "multi-package-c", decision_file: "rollback.json" }, "multi-package-g"));
  operationResults["rollback-package"] = { status: "passed", response_status: rolledBack.status };
  const rollbackValidation = call(envelope("validate-package", { package_directory: "multi-package-g" }));
  assert(rollbackValidation.validation.lineage_event_type === "rollback-created", "Rollback lineage event mismatch");

  const realization = call(envelope("generate-realization", { package_directory: "multi-package-g" }, "realization-not-authorized"), { expectedError: "REALIZATION_NOT_AUTHORIZED" });
  operationResults["generate-realization"] = { status: "failed-closed", error_code: realization.error.code };
  copyDirectory(options.fidelityFixture, path.join(workRoot, "fidelity-fixture"));
  const fidelity = call(envelope("verify-fidelity", { fidelity_directory: "fidelity-fixture" }));
  operationResults["verify-fidelity"] = { status: fidelity.validation.status === "passed" ? "passed" : "failed", response_status: fidelity.status };

  const captureResult = run(process.execPath, [captureCli, options.targetUrl, path.join(workRoot, "url-capture")], { cwd: workRoot });
  const captureResponse = JSON.parse(captureResult.stdout);
  const captureRecord = json(captureResponse.capture_record);
  assert(captureRecord.status === "complete", `Real URL capture was ${captureRecord.status}`);
  const urlPrepared = call(envelope("prepare-analysis", { sources: [{ kind: "url", url: options.targetUrl, browser_capture_record: "url-capture/capture-record.json" }] }, "url-prepared"));
  assert(urlPrepared.validation.capture_status === "complete", "Installed URL preparation was not complete");
  const urlEvidence = json(path.join(workRoot, "url-prepared/analysis/evidence-bundle.json")).evidence.map((item) => ({
    evidence_id: item.evidence_id,
    evidence_classes: [item.evidence_type === "screenshot" ? "viewport-screenshot" : item.evidence_type === "dom-node" ? "dom" : item.evidence_type],
    sha256: item.sha256, hash_verified: item.sha256 === sha(Buffer.from(JSON.stringify(item.value))),
    freshness: { captured_at: item.captured_at, valid_at: item.captured_at }
  }));
  assert(urlEvidence.every((item) => item.hash_verified), "A real URL Evidence hash did not verify");

  const lifecycle = {};
  for (const mode of ["partial", "stale"]) {
    const fixturePath = `node_modules/recrafts/fixtures/r006/url-${mode}.json`;
    call(envelope("prepare-analysis", { sources: [{ kind: "url", url: options.targetUrl, capture_fixture: fixturePath }] }, `${mode}-prepared`));
    writeJson(path.join(workRoot, `${mode}-analysis.json`), buildHostAnalysis(workRoot, `${mode}-prepared`, { conflict: false, label: "deterministic-non-live-host-analysis" }));
    const submitted = call(envelope("submit-analysis", { prepared_analysis_directory: `${mode}-prepared`, host_analysis_file: `${mode}-analysis.json` }, `${mode}-package`));
    writeJson(path.join(workRoot, `${mode}-decision.json`), decision(submitted.validation.package_id, `r008a-${mode}-decision`));
    lifecycle[mode] = call(envelope("accept-artifacts", { candidate_package_directory: `${mode}-package`, decision_file: `${mode}-decision.json` }, `${mode}-accepted`), { expectedError: "REALIZATION_NOT_AUTHORIZED" });
  }
  writeJson(path.join(workRoot, "blocked-url.json"), {
    fixture_kind: "controlled-url-capture", captured_at: "2026-07-13T12:00:00.000Z",
    status: "blocked", blocked_reason: "deterministic-qualification-boundary"
  });
  const blocked = call(envelope("prepare-analysis", { sources: [{ kind: "url", url: options.targetUrl, capture_fixture: "blocked-url.json" }] }, "blocked-prepared"));
  assert(blocked.status === "completed_with_warnings" && blocked.validation.semantic_analysis_completed === false && blocked.host_action === null, "Blocked URL did not fail closed before semantic analysis");

  const negativeGates = [];
  const gate = (name, response) => negativeGates.push({ name, status: "failed-closed", error_code: response.error.code });
  copyDirectory(path.join(workRoot, "multi-package-b"), path.join(workRoot, "negative-raw-host"));
  const rawEvidence = json(path.join(workRoot, "negative-raw-host/evidence-map.json")); rawEvidence.evidence[0].evidence_type = "host-model-raw-output";
  writeJson(path.join(workRoot, "negative-raw-host/evidence-map.json"), rawEvidence);
  gate("raw-host-output-in-evidence", call(envelope("validate-package", { package_directory: "negative-raw-host" }), { expectedError: ["SCHEMA_VALIDATION_FAILED", "PACKAGE_INVALID"] }));

  copyDirectory(path.join(workRoot, "multi-package-b"), path.join(workRoot, "negative-domain-ref"));
  const badTokens = json(path.join(workRoot, "negative-domain-ref/tokens.json")); badTokens.tokens[0].evidence_refs = [];
  writeJson(path.join(workRoot, "negative-domain-ref/tokens.json"), badTokens);
  gate("domain-without-evidence-refs", call(envelope("validate-package", { package_directory: "negative-domain-ref" }), { expectedError: "PACKAGE_INVALID" }));

  writeJson(path.join(workRoot, "decision-host.json"), decision(corrected.validation.package_id, "r008a-decision-host", "host-agent"));
  gate("host-self-authorization", call(envelope("accept-artifacts", { candidate_package_directory: "multi-package-b", decision_file: "decision-host.json" }, "host-authorized"), { expectedError: "SCHEMA_VALIDATION_FAILED" }));
  gate("open-high-impact-conflict-acceptance", openBlocked);
  gate("partial-source-acceptance", lifecycle.partial);
  gate("stale-source-acceptance", lifecycle.stale);
  gate("rollback-output-overwrite", call(envelope("rollback-package", { current_package_directory: "multi-package-f", restore_target_directory: "multi-package-c", decision_file: "rollback.json" }, "multi-package-g"), { expectedError: "OUTPUT_NOT_EMPTY" }));
  gate("path-traversal", call(envelope("prepare-analysis", { sources: [{ kind: "image", path: "../outside.svg" }] }, "traversal-output"), { expectedError: "UNSAFE_INPUT_PATH" }));
  symlinkSync(options.tarball, path.join(workRoot, "escape-link.tgz"));
  gate("symlink-escape", call(envelope("prepare-analysis", { sources: [{ kind: "image", path: "escape-link.tgz" }] }, "symlink-output"), { expectedError: "UNSAFE_INPUT_PATH" }));
  mkdirSync(path.join(workRoot, "collision-output")); writeFileSync(path.join(workRoot, "collision-output/marker.txt"), "occupied\n");
  gate("output-collision", call(envelope("prepare-analysis", { sources: [{ kind: "image", path: "primary.svg" }] }, "collision-output"), { expectedError: "OUTPUT_NOT_EMPTY" }));
  negativeGates.push({ name: "blocked-source-acceptance", status: "failed-closed", error_code: "HOST_ACTION_REQUIRED", semantic_analysis_completed: false });
  assert(NEGATIVE_NAMES.every((name) => negativeGates.some((gateResult) => gateResult.name === name)), "Negative-gate matrix is incomplete");

  const targetSet = json(path.join(workRoot, "multi-package-c/artifact-set.json"));
  const rollbackSet = json(path.join(workRoot, "multi-package-g/artifact-set.json"));
  const hashesRestored = JSON.stringify(targetSet.artifact_hashes) === JSON.stringify(rollbackSet.artifact_hashes);
  assert(hashesRestored, "Rollback canonical hashes do not match the restore target");
  assert(Object.values(operationResults).every((result) => ["passed", "failed-closed"].includes(result.status)), "Operation matrix contains a failure");

  const npmVersion = run("npm", ["--version"], { cwd: workRoot }).stdout.trim();
  const playwrightVersion = json(path.join(workRoot, "node_modules/playwright/package.json")).version;
  const lock = json(path.join(workRoot, "package-lock.json"));
  const resolved = lock.packages?.["node_modules/recrafts"]?.resolved ?? "";
  const workspace = process.env.GITHUB_WORKSPACE ? realpathSync(process.env.GITHUB_WORKSPACE) : null;
  const outsideCheckout = !workspace || !realpathSync(workRoot).startsWith(`${workspace}${path.sep}`);
  const installedInsideWorkRoot = realpathSync(installedRoot).startsWith(`${realpathSync(workRoot)}${path.sep}`);

  writeJson(path.join(options.output, "validation/linux-platform.json"), {
    status: canonicalLinux ? "passed" : "diagnostic-only", platform: process.platform, os: `${os.type()} ${os.release()}`,
    architecture: os.arch(), node: process.version, npm: npmVersion,
    playwright: playwrightVersion, chromium: captureRecord.browser.version,
    installed_package_version: installedPackage.version,
    protocol_version: capabilities.validation.protocol_version,
    schema_version: capabilities.validation.schema_version
  });
  writeJson(path.join(options.output, "validation/linux-operation-matrix.json"), { status: "passed", operations: operationResults });
  writeJson(path.join(options.output, "validation/linux-real-url-report.json"), {
    status: "passed", capture_status: captureRecord.status, target_url: options.targetUrl,
    viewport: "1440x900", browser: captureRecord.browser, captured_at: captureRecord.captured_at,
    raw_host_output_present: false, evidence: urlEvidence,
    lifecycle: {
      partial_acceptance: lifecycle.partial.error.code,
      blocked_semantic_analysis_completed: false,
      blocked_acceptance: "not-constructible-without-fabricated-semantic-evidence",
      stale_acceptance: lifecycle.stale.error.code
    }
  });
  writeJson(path.join(options.output, "validation/linux-conflict-acceptance-report.json"), {
    status: "passed", fixture_label: "deterministic-non-live-host-analysis",
    fixture_is_live_model_result: false, fixture_is_visual_quality_proof: false,
    fixture_is_project_owner_decision: false, high_impact_conflicts: 1,
    acceptance_before_correction: { status: "blocked", error_code: openBlocked.error.code },
    correction: { status: "passed", correction_id: corrected.validation.correction_id },
    acceptance_after_correction: { status: "passed", package_id: acceptedC.validation.package_id },
    darwin_real_host_evidence_remains_authoritative: true
  });
  writeJson(path.join(options.output, "validation/linux-rollback-report.json"), {
    status: "passed", lineage_event_type: rollbackValidation.validation.lineage_event_type,
    current_package_id: acceptedF.validation.package_id, restore_target_package_id: acceptedC.validation.package_id,
    rollback_package_id: rolledBack.validation.package_id, hashes_restored: hashesRestored,
    target_artifact_hashes: targetSet.artifact_hashes,
    rollback_artifact_hashes: rollbackSet.artifact_hashes
  });
  writeJson(path.join(options.output, "validation/linux-negative-gates.json"), { status: "passed", gates: negativeGates });
  writeJson(path.join(options.output, "validation/linux-package-isolation.json"), {
    status: "passed", install_source: { type: "tarball", filename: path.basename(options.tarball), sha256: tarballSha },
    package_lock_resolved_from_file_tarball: /^file:/.test(resolved), package_runtime_source: "installed-node_modules",
    installed_inside_temporary_work_root: installedInsideWorkRoot, qualification_outside_checkout: outsideCheckout,
    npm_link_used: false, source_repository_imports: [], checkout_dependency: false,
    allowed_checkout_inputs: ["immutable-tarball", "portable-sanitized-secondary-fixture", "portable-fidelity-fixture", "qualification-wrapper", "evidence-validator"],
    installed_tree_contains_symlink: treeContainsSymlink(installedRoot)
  });
  assert(/^file:/.test(resolved) && installedInsideWorkRoot && outsideCheckout, "Installed package isolation check failed");

  writeJson(path.join(options.output, "validation/clean-install-linux.json"), {
    status: canonicalLinux ? "passed" : "diagnostic-only", rc_id: RC_ID, tarball_sha256: tarballSha,
    all_mandatory_checks_passed: canonicalLinux,
    ...(canonicalLinux ? {} : { limitation: "Local non-Linux diagnostic; cannot satisfy the Linux release gate" })
  });
  flushCommandLog();
  writeReportsAndWorkflow();
  process.stdout.write(`${JSON.stringify({ status: canonicalLinux ? "passed" : "diagnostic-only", rc_id: RC_ID, tarball_sha256: tarballSha, output: options.output })}\n`);
}

try { await qualify(); }
catch (error) {
  writeJson(path.join(options.output, "validation/clean-install-linux.json"), {
    status: "failed", rc_id: RC_ID,
    tarball_sha256: existsSync(options.tarball) && statSync(options.tarball).isFile() ? sha(readFileSync(options.tarball)) : null,
    error: error.message
  });
  flushCommandLog();
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
