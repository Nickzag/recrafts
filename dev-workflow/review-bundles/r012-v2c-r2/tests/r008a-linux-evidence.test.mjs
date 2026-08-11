import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateLinuxEvidence } from "../scripts/validate-r008a-linux-evidence.mjs";

const EXPECTED_SHA = "2371abab0d9a1549765f3f123c8ba55ac416c06a2b5e986cc6516d1fa5f7f774";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OPERATIONS = [
  "capabilities", "prepare-analysis", "submit-analysis", "validate-package",
  "generate-realization", "verify-fidelity", "submit-correction",
  "accept-artifacts", "rollback-package"
];
const NEGATIVE_GATES = [
  "raw-host-output-in-evidence", "domain-without-evidence-refs", "host-self-authorization",
  "open-high-impact-conflict-acceptance", "partial-source-acceptance",
  "stale-source-acceptance", "rollback-output-overwrite", "path-traversal",
  "symlink-escape", "output-collision"
];
const REPORTS = [
  "validation/clean-install-linux.json", "validation/linux-platform.json",
  "validation/linux-operation-matrix.json", "validation/linux-real-url-report.json",
  "validation/linux-conflict-acceptance-report.json", "validation/linux-rollback-report.json",
  "validation/linux-negative-gates.json", "validation/linux-package-isolation.json",
  "logs/linux-command-log.txt"
];

const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function refreshChecksums(root, workflowOverrides = {}) {
  const lines = REPORTS.filter((name) => {
    try { readFileSync(path.join(root, name)); return true; } catch { return false; }
  }).sort().map((name) => `${hash(readFileSync(path.join(root, name)))}  ${name}`);
  writeFileSync(path.join(root, "checksums.sha256"), `${lines.join("\n")}\n`);
  writeJson(path.join(root, "workflow-run.json"), {
    workflow_name: "Recrafts R-008A Linux Qualification", run_id: "123456789",
    run_attempt: "1", repository_commit: "255bf69a8745e15bde6c23255d5122fa8d535b15",
    runner_os: "Linux", runner_architecture: "X64",
    started_at: "2026-07-13T12:00:00.000Z", completed_at: "2026-07-13T12:10:00.000Z",
    artifact_checksum_scope: "checksums.sha256",
    artifact_checksum: hash(readFileSync(path.join(root, "checksums.sha256"))),
    ...workflowOverrides
  });
}

function fixture(options = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r008a-evidence-"));
  const releaseRoot = path.join(root, "release");
  mkdirSync(path.join(root, "validation"), { recursive: true });
  mkdirSync(path.join(root, "logs"), { recursive: true });
  mkdirSync(path.join(releaseRoot, "validation"), { recursive: true });

  const files = {
    "validation/clean-install-linux.json": {
      status: "passed", rc_id: "recrafts-0.4.0-rc.1-build2", tarball_sha256: EXPECTED_SHA
    },
    "validation/linux-platform.json": {
      status: "passed", platform: "linux", os: "Linux 6.11", architecture: "x64",
      node: "v24.15.0", npm: "11.12.1", playwright: "1.61.1", chromium: "149.0.0.0",
      installed_package_version: "0.4.0-rc.1", protocol_version: "1.1", schema_version: "3.0.0"
    },
    "validation/linux-operation-matrix.json": {
      status: "passed",
      operations: Object.fromEntries(OPERATIONS.map((name) => [name, name === "generate-realization"
        ? { status: "failed-closed", error_code: "REALIZATION_NOT_AUTHORIZED" }
        : { status: "passed" }]))
    },
    "validation/linux-real-url-report.json": {
      status: "passed", capture_status: "complete", target_url: "https://www.craft.do",
      raw_host_output_present: false,
      lifecycle: {
        partial_acceptance: "REALIZATION_NOT_AUTHORIZED",
        blocked_semantic_analysis_completed: false,
        blocked_acceptance: "not-constructible-without-fabricated-semantic-evidence",
        stale_acceptance: "REALIZATION_NOT_AUTHORIZED"
      },
      evidence: ["capture-metadata", "network-response", "dom", "css-rule", "computed-style",
        "viewport-screenshot", "screenshot-region", "asset", "font"].map((evidenceClass, index) => ({
        evidence_id: `ev-${index + 1}`, evidence_classes: [evidenceClass], sha256: hash(evidenceClass), hash_verified: true,
        freshness: { captured_at: "2026-07-13T12:02:00.000Z", valid_at: "2026-07-13T12:02:00.000Z" }
      }))
    },
    "validation/linux-conflict-acceptance-report.json": {
      status: "passed", fixture_label: "deterministic-non-live-host-analysis",
      fixture_is_live_model_result: false, fixture_is_visual_quality_proof: false,
      fixture_is_project_owner_decision: false, high_impact_conflicts: 1,
      acceptance_before_correction: { status: "blocked", error_code: "REALIZATION_NOT_AUTHORIZED" },
      correction: { status: "passed" }, acceptance_after_correction: { status: "passed" }
    },
    "validation/linux-rollback-report.json": {
      status: "passed", lineage_event_type: "rollback-created", hashes_restored: true,
      target_artifact_hashes: { "tokens.json": hash("tokens"), "components.json": hash("components") },
      rollback_artifact_hashes: { "tokens.json": hash("tokens"), "components.json": hash("components") }
    },
    "validation/linux-negative-gates.json": {
      status: "passed", gates: NEGATIVE_GATES.map((name) => ({ name, status: "failed-closed", error_code: "PACKAGE_INVALID" }))
    },
    "validation/linux-package-isolation.json": {
      status: "passed", install_source: { type: "tarball", sha256: EXPECTED_SHA },
      package_runtime_source: "installed-node_modules", npm_link_used: false,
      package_lock_resolved_from_file_tarball: true, installed_inside_temporary_work_root: true,
      qualification_outside_checkout: true, source_repository_imports: [], checkout_dependency: false
    },
    "logs/linux-command-log.txt": "npm install recrafts-0.4.0-rc.1.tgz\texit=0\n"
  };
  for (const [name, value] of Object.entries(files)) {
    if (options.omit === name) continue;
    if (name.endsWith(".json")) writeJson(path.join(root, name), value);
    else writeFileSync(path.join(root, name), value);
  }
  writeJson(path.join(releaseRoot, "validation/platform-matrix.json"), {
    darwin: { status: "pass" }, linux: { status: "pass", verified: true, tarball_sha256: EXPECTED_SHA }
  });
  writeJson(path.join(releaseRoot, "validation/rc-readiness.json"), {
    rc_id: "recrafts-0.4.0-rc.1-build2", status: "ready-for-owner-review",
    blockers: [], ready_for_owner_review: true
  });
  refreshChecksums(root);
  return { root, releaseRoot, refresh: (overrides) => refreshChecksums(root, overrides) };
}

function validate(value) {
  return validateLinuxEvidence(value.root, { releaseRoot: value.releaseRoot, expectedTarballSha256: EXPECTED_SHA });
}

test("valid Linux qualification evidence passes", () => {
  assert.equal(validate(fixture()).status, "pass");
});

test("wrong tarball hash fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/clean-install-linux.json");
  writeJson(file, { ...json(file), tarball_sha256: hash("wrong") }); value.refresh();
  assert.match(validate(value).errors.join("\n"), /tarball SHA-256/i);
});

test("source install instead of tarball fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/linux-package-isolation.json");
  writeJson(file, { ...json(file), install_source: { type: "source-checkout", sha256: EXPECTED_SHA } }); value.refresh();
  assert.match(validate(value).errors.join("\n"), /tarball install/i);
});

test("missing Linux platform report fails", () => {
  const value = fixture({ omit: "validation/linux-platform.json" });
  assert.match(validate(value).errors.join("\n"), /linux-platform\.json/);
});

test("missing operation fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/linux-operation-matrix.json");
  const report = json(file); delete report.operations["verify-fidelity"]; writeJson(file, report); value.refresh();
  assert.match(validate(value).errors.join("\n"), /verify-fidelity/);
});

test("real URL partial marked passed fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/linux-real-url-report.json");
  writeJson(file, { ...json(file), capture_status: "partial" }); value.refresh();
  assert.match(validate(value).errors.join("\n"), /capture status.*complete/i);
});

test("missing screenshot Evidence fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/linux-real-url-report.json");
  const report = json(file); report.evidence = report.evidence.filter((item) => item.evidence_classes[0] !== "viewport-screenshot"); writeJson(file, report); value.refresh();
  assert.match(validate(value).errors.join("\n"), /viewport-screenshot/);
});

test("merged DOM and screenshot Evidence fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/linux-real-url-report.json");
  const report = json(file); const dom = report.evidence.find((item) => item.evidence_classes[0] === "dom");
  dom.evidence_classes.push("viewport-screenshot"); report.evidence = report.evidence.filter((item) => item.evidence_classes[0] !== "viewport-screenshot");
  writeJson(file, report); value.refresh();
  assert.match(validate(value).errors.join("\n"), /DOM.*screenshot.*separate/i);
});

test("rollback hash mismatch fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/linux-rollback-report.json");
  const report = json(file); report.rollback_artifact_hashes["tokens.json"] = hash("different"); writeJson(file, report); value.refresh();
  assert.match(validate(value).errors.join("\n"), /rollback.*hash/i);
});

test("workflow artifact missing checksum fails", () => {
  const value = fixture(); value.refresh({ artifact_checksum: undefined });
  assert.match(validate(value).errors.join("\n"), /artifact checksum/i);
});

test("rc-readiness ready while Linux failed fails", () => {
  const value = fixture(); const file = path.join(value.root, "validation/clean-install-linux.json");
  writeJson(file, { ...json(file), status: "failed" }); value.refresh();
  assert.match(validate(value).errors.join("\n"), /Linux.*passed|readiness.*Linux/i);
});

test("qualification wrapper imports only Node standard-library modules", () => {
  const source = readFileSync(path.join(REPO, "scripts/run-r008-linux-qualification.mjs"), "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.ok(imports.length > 0);
  assert.ok(imports.every((specifier) => specifier.startsWith("node:")), imports.join(", "));
  assert.doesNotMatch(source, /(?:npm\s+pack|npm\s+link|\.\.\/runtime|\.\.\/realization|\.\.\/fidelity)/);
  assert.match(source, new RegExp(EXPECTED_SHA));
  for (const operation of OPERATIONS) assert.match(source, new RegExp(`"${operation}"`));
});

test("GitHub Actions workflow keeps the Linux qualification boundary", () => {
  const source = readFileSync(path.join(REPO, ".github/workflows/recrafts-r008a-linux-qualification.yml"), "utf8");
  for (const fragment of ["workflow_dispatch:", "contents: read", "runs-on: ubuntu-latest", "timeout-minutes:", "concurrency:", "actions/upload-artifact@v4", "sha256sum", "RUNNER_TEMP"]) assert.match(source, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, new RegExp(EXPECTED_SHA));
  assert.doesNotMatch(source, /npm\s+(?:pack|link|publish)|create-release|release-action/i);
});
