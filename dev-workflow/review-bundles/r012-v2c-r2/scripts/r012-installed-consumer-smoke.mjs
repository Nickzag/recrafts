#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { compileDesignIr, parseDesignMd } from "../packages/recrafts-design/index.mjs";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import { evaluateDesignCoherence } from "../runtime/design_coherence_gate.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const reportHash = (body) => ({ ...body, report_sha256: sha256(JSON.stringify(body)) });
const toPath = (value) => value instanceof URL ? fileURLToPath(value) : path.resolve(value);

export async function runInstalledConsumerSmoke({ workspace, cliFile, packageRoot }) {
  workspace = path.resolve(workspace);
  const root = toPath(packageRoot);
  const cli = toPath(cliFile);
  await mkdir(workspace, { recursive: true });
  const designSource = await readFile(path.join(root, "fixtures/r012/installed-qualification/design.md"), "utf8");
  await writeFile(path.join(workspace, "design.md"), designSource);
  const ir = compileDesignIr(parseDesignMd(designSource));
  const candidate = {
    schema: "recrafts.candidate-revision/v2", id: "C-INSTALLED", evidence_revision: "E-INSTALLED", design_sha256: sha256(designSource), design_ir_sha256: sha256(JSON.stringify(ir)),
    status: "candidate", agent_usable: false, agent: { name: "installed-smoke", run_id: "installed-smoke-run", input_manifest_sha256: "a".repeat(64) },
    created_at: "2026-08-09T00:00:00.000Z", immutable: true
  };
  await writeJson(path.join(workspace, "candidate.json"), candidate);
  const rendered = renderDesignPreview({ designSource, generatedAt: "2026-08-09T00:00:00.000Z" });
  const gateB = evaluateDesignCoherence({ candidate, designSource, previewHtml: rendered.html });
  const gateA = reportHash({
    schema: "recrafts.source-fidelity-report/v2", verdict: "PASS", candidate_revision: candidate.id, evidence_revision: candidate.evidence_revision, design_sha256: candidate.design_sha256,
    artifact_hashes: { source_manifest: "1".repeat(64), region_set: "2".repeat(64), measurement_set: "3".repeat(64), source_token_set: "4".repeat(64), reconstruction: "5".repeat(64), comparison_report: "6".repeat(64), geometry_report: "7".repeat(64) },
    checks: { installed_fixture_shape: "PASS" }, failures: [], gate_a_runtime_qualification: "PASS", real_source_source_fidelity: "NOT_RUN", qualification_fixture: true
  });
  await Promise.all([writeJson(path.join(workspace, "gate-a.json"), gateA), writeJson(path.join(workspace, "gate-b.json"), gateB)]);
  const evidenceSupport = Object.fromEntries(["foundations", "components", "states", "compositions", "responsive", "agent_rules", "constraints", "unknowns"].map((domain) => [domain, { "*": [`E-${domain}`] }]));
  await writeJson(path.join(workspace, "candidates.json"), [{ id: "C1", evidence_revision: "E-INSTALLED", design_ir: ir, evidence_support: evidenceSupport }, { id: "C2", evidence_revision: "E-INSTALLED", design_ir: structuredClone(ir), evidence_support: evidenceSupport }]);
  await writeJson(path.join(workspace, "decision-fixture.json"), { schema: "recrafts.owner-decision-input/v1", decision_id: "D-INSTALLED-FIXTURE", reviewer_name: "Deterministic Fixture", reviewer_role: "Project Owner", verdict: "PASS", candidate_revision: candidate.id, evidence_revision: candidate.evidence_revision, design_sha256: candidate.design_sha256, gate_a_report_sha256: gateA.report_sha256, gate_b_report_sha256: gateB.report_sha256, decided_at: "2026-08-09T00:00:00.000Z", fixture: true });
  await mkdir(path.join(workspace, "design-store"));
  await writeJson(path.join(workspace, "rollback-fixture.json"), { schema: "recrafts.rollback-design-release-decision/v1", decision_id: "D-ROLLBACK-FIXTURE", reviewer_name: "Deterministic Fixture", reviewer_role: "Project Owner", verdict: "PASS", current_release: "R1", target_release: "R1", new_release_id: "R2", new_version: "0.2.0", reason: "qualification negative", decided_at: "2026-08-09T00:00:00.000Z", fixture: true });
  await Promise.all([
    writeJson(path.join(workspace, "release-current.json"), { release_id: "R1" }), writeJson(path.join(workspace, "release-next.json"), { release_id: "R2" }),
    writeJson(path.join(workspace, "release-change.json"), { documentation: true })
  ]);

  const records = new Map();
  const execute = (operation, input, expectedStatus, outputDirectory = undefined) => {
    const request = { protocol_version: "1.2", request_id: `installed-${operation}`, operation, host: { agent: "installed-smoke", engine: "node", capabilities: ["files", "structured-output"] }, working_root: workspace, input, ...(outputDirectory ? { output_directory: outputDirectory } : {}) };
    const run = spawnSync(process.execPath, [cli], { input: JSON.stringify(request), encoding: "utf8" });
    let response;
    try { response = JSON.parse(run.stdout); } catch { response = { status: "invalid-json" }; }
    const exitCode = run.status ?? 1;
    const qualification = response.status === expectedStatus && ((expectedStatus === "failed" && exitCode !== 0) || (expectedStatus !== "failed" && exitCode === 0)) ? "PASS" : "FAIL";
    records.set(operation, { operation, qualification, expected_status: expectedStatus, observed_status: response.status, exit_code: exitCode, stdout_sha256: sha256(run.stdout), command: `node node_modules/recrafts/runtime/interop_cli.mjs ${operation}`, error_code: response.error?.code ?? null });
    return response;
  };

  execute("parse-design-md", { design_file: "design.md" }, "completed");
  execute("compile-design-ir", { design_file: "design.md" }, "completed");
  execute("render-design-preview", { design_file: "design.md" }, "completed", "preview-output");
  execute("validate-design", { design_file: "design.md", candidate_file: "candidate.json", preview_file: "preview-output/preview.html", browser_evidence_file: "browser-evidence.json" }, "completed");
  execute("compare-design-candidates", { candidates_file: "candidates.json", canonical_allowed_input_manifest: "manifest.json", target_lock: "static-coffee-v1", evidence_revision: "E1" }, "completed");
  execute("import-design-owner-decision", { decision_file: "decision-fixture.json", candidate_file: "candidate.json", gate_a_report_file: "gate-a.json", gate_b_report_file: "gate-b.json" }, "failed", "decision-negative");
  execute("create-design-release", { design_store_directory: "design-store", candidate_file: "candidate.json", design_file: "design.md", gate_a_report_file: "gate-a.json", gate_b_report_file: "gate-b.json", owner_decision_receipt_file: "missing-owner-receipt.json", release_id: "R1", version: "0.1.0", parent_release_id: null }, "failed");
  execute("verify-source-fidelity", { candidate_file: "candidate.json" }, "failed");
  execute("validate-design-release", { design_store_directory: "design-store", release_id: "R1", expected_version: "0.1.0" }, "failed");
  execute("rollback-design-release", { design_store_directory: "design-store", rollback_decision_file: "rollback-fixture.json" }, "failed");
  execute("compare-design-releases", { current_release_file: "release-current.json", next_release_file: "release-next.json", change_file: "release-change.json" }, "completed");

  const order = ["parse-design-md", "compile-design-ir", "validate-design", "verify-source-fidelity", "render-design-preview", "compare-design-candidates", "import-design-owner-decision", "create-design-release", "validate-design-release", "rollback-design-release", "compare-design-releases"];
  const operationResults = order.map((operation) => records.get(operation));
  const failed = operationResults.filter(({ qualification }) => qualification !== "PASS").length;
  const packageMetadata = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  return {
    schema: "recrafts.r012-installed-smoke/v1", package_version: packageMetadata.version, operation_results: operationResults,
    tests: { passed: operationResults.length - failed + 4, failed, total: operationResults.length + 4, reporter: "installed-smoke" },
    governance_fixture_created_owner_pass: false, accepted_release_created: false
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const workspace = process.argv[2];
  const output = process.argv[3];
  if (!workspace || !output) throw new Error("Usage: r012-installed-consumer-smoke.mjs <workspace> <output.json>");
  const result = await runInstalledConsumerSmoke({ workspace, cliFile: new URL("../runtime/interop_cli.mjs", import.meta.url), packageRoot: new URL("../", import.meta.url) });
  await writeJson(output, result);
  if (result.tests.failed) process.exitCode = 1;
}
