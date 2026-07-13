import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { handleEnvelope } from "../runtime/interop_contract.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseFor = (root) => ({ protocol_version: "1.0", options: { compatibility_mode: "protocol-1.0" }, host: { agent: "test", engine: "node", capabilities: ["files", "structured-output"] }, working_root: root });
const fixture = () => JSON.parse(readFileSync(path.join(repo, "fixtures/interop/host-analysis.fixture.json")));

async function prepare(root, sources = ["fixture.svg"], output = "prepared") {
  return handleEnvelope({ ...baseFor(root), request_id: `prepare-${output}`, operation: "prepare-analysis", input: { sources }, output_directory: output });
}

async function submit(root, analysis, { prepared = "prepared", output = "package", filename = "host-analysis.json" } = {}) {
  writeFileSync(path.join(root, filename), JSON.stringify(analysis));
  return handleEnvelope({ ...baseFor(root), request_id: `submit-${output}`, operation: "submit-analysis", input: { prepared_analysis_directory: prepared, host_analysis_file: filename }, output_directory: output });
}

test("prepared contract exposes copied sources and duplicate basenames remain unambiguous", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-prepared-sources-"));
  mkdirSync(path.join(root, "a"));
  mkdirSync(path.join(root, "b"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "a/source.svg"));
  writeFileSync(path.join(root, "b/source.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>');
  const response = await prepare(root, ["a/source.svg", "b/source.svg"]);
  assert.equal(response.status, "needs_host_action");
  const manifest = JSON.parse(readFileSync(path.join(root, "prepared/analysis/input-manifest.json")));
  assert.deepEqual(manifest.sources.map(({ prepared_source_path }) => prepared_source_path), ["sources/source-1.svg", "sources/source-2.svg"]);
  assert.deepEqual(response.host_action.sources.map(({ path: sourcePath }) => sourcePath), ["sources/source-1.svg", "sources/source-2.svg"]);
  for (const source of response.host_action.sources) assert.ok(readFileSync(path.join(root, "prepared", source.path)).length > 0);
});

test("Host Analysis Schema and semantic mutations fail closed", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-host-schema-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "fixture.svg"));
  const prepared = await prepare(root);
  const valid = fixture();
  valid.prepared_analysis_id = prepared.validation.prepared_analysis_id;
  const cases = [
    ["missing-finding-id", (value) => delete value.findings[0].id, "SCHEMA_VALIDATION_FAILED"],
    ["missing-observation", (value) => delete value.findings[0].observation, "SCHEMA_VALIDATION_FAILED"],
    ["unknown-top-level", (value) => { value.unexpected = true; }, "SCHEMA_VALIDATION_FAILED"],
    ["invalid-token-status", (value) => { value.tokens[0].status = "invented"; }, "SCHEMA_VALIDATION_FAILED"],
    ["confidence-outside-range", (value) => { value.findings[0].confidence = 1.2; }, "SCHEMA_VALIDATION_FAILED"],
    ["empty-evidence-refs", (value) => { value.findings[0].evidence_refs = []; }, "SCHEMA_VALIDATION_FAILED"],
    ["unknown-evidence-ref", (value) => { value.findings[0].evidence_refs = ["source-404"]; }, "PACKAGE_INVALID"],
    ["vision-capability-false", (value) => { value.execution.vision_capability = false; }, "SCHEMA_VALIDATION_FAILED"],
    ["prepared-id-mismatch", (value) => { value.prepared_analysis_id = "prepared-wrong"; }, "HOST_ACTION_REQUIRED"],
  ];
  for (const [name, mutate, code] of cases) {
    const candidate = structuredClone(valid);
    mutate(candidate);
    const rejected = await submit(root, candidate, { output: `rejected-${name}`, filename: `${name}.json` });
    assert.equal(rejected.error?.code, code, name);
  }
});

test("submit-analysis revalidates copied source hash", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-source-hash-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "fixture.svg"));
  const prepared = await prepare(root);
  writeFileSync(path.join(root, "prepared/sources/source-1.svg"), "tampered");
  const analysis = fixture();
  analysis.prepared_analysis_id = prepared.validation.prepared_analysis_id;
  const rejected = await submit(root, analysis);
  assert.equal(rejected.error?.code, "PACKAGE_INVALID");
});

test("normal Host submission awaits owner review and unknown classification stays blocked", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-owner-gate-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "fixture.svg"));
  const prepared = await prepare(root);
  const analysis = fixture();
  analysis.prepared_analysis_id = prepared.validation.prepared_analysis_id;
  delete analysis.source_classifications;
  const submitted = await submit(root, analysis);
  assert.equal(submitted.status, "completed_with_warnings");
  const packageManifest = JSON.parse(readFileSync(path.join(root, "package/recrafts-package.json")));
  const ownerDecision = JSON.parse(readFileSync(path.join(root, "package/review/owner-decision-set.json")));
  const readiness = JSON.parse(readFileSync(path.join(root, "package/validation/realization-readiness.json")));
  const sourceManifest = JSON.parse(readFileSync(path.join(root, "package/source-manifest.json")));
  assert.equal(packageManifest.status, "awaiting-owner-review");
  assert.equal(ownerDecision.verdict, "PENDING");
  assert.equal(readiness.canonical_visual_generation_authorized, false);
  assert.equal(sourceManifest.sources[0].regions[0].class, "unknown");
  assert.equal(sourceManifest.sources[0].canonical_promotion_blocked, true);
  const blocked = await handleEnvelope({ ...baseFor(root), request_id: "realize-blocked", operation: "generate-realization", input: { package_directory: "package" }, output_directory: "blocked-realization" });
  assert.equal(blocked.error?.code, "REALIZATION_NOT_AUTHORIZED");
});

test("bounded fixture decision creates a new package and propagates decision identity", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-decision-import-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "fixture.svg"));
  const prepared = await prepare(root);
  const analysis = fixture();
  analysis.prepared_analysis_id = prepared.validation.prepared_analysis_id;
  analysis.components[0].evidence_refs = ["source-1-shell"];
  const submitted = await submit(root, analysis);
  const decision = { decision_set_id: "fixture-decision-build5", reviewed_package_id: submitted.validation.package_id, verdict: "PASS", decision_status: "accepted", decision_source: "deterministic-interoperability-fixture", decided_at: "2026-07-13T00:00:00Z" };
  writeFileSync(path.join(root, "owner-decision.json"), JSON.stringify(decision));
  const fixtureModeRequired = await handleEnvelope({ ...baseFor(root), request_id: "realize-unlabeled-fixture", operation: "generate-realization", input: { package_directory: "package", owner_decision_file: "owner-decision.json", approved_package_directory: "unlabeled-approved-package" }, output_directory: "unlabeled-realization" });
  assert.equal(fixtureModeRequired.error?.code, "HOST_ACTION_REQUIRED");
  const realized = await handleEnvelope({ ...baseFor(root), request_id: "realize-approved", operation: "generate-realization", input: { package_directory: "package", owner_decision_file: "owner-decision.json", approved_package_directory: "approved-package" }, output_directory: "realization", options: { compatibility_mode: "protocol-1.0", interoperability_fixture: true } });
  assert.equal(realized.status, "completed", JSON.stringify(realized));
  assert.notEqual(realized.validation.approved_package_id, submitted.validation.package_id);
  assert.ok(existsSync(path.join(root, "approved-package/recrafts-package.json")));
  const sourceManifest = JSON.parse(readFileSync(path.join(root, "approved-package/source-manifest.json")));
  const packageManifest = JSON.parse(readFileSync(path.join(root, "approved-package/recrafts-package.json")));
  const compiled = JSON.parse(readFileSync(path.join(root, "realization/preview/runtime/compiled-contract.json")));
  const realization = JSON.parse(readFileSync(path.join(root, "realization/realization.json")));
  for (const artifact of [sourceManifest, packageManifest]) {
    assert.equal(artifact.owner_decision_set_id, decision.decision_set_id);
    assert.equal(artifact.decision_status, decision.decision_status);
    assert.equal(artifact.decision_source, decision.decision_source);
  }
  assert.equal(compiled.decision_set_id, decision.decision_set_id);
  assert.equal(compiled.decision_status, decision.decision_status);
  assert.equal(compiled.decision_source, decision.decision_source);
  assert.equal(realization.decision_set_id, decision.decision_set_id);
  assert.equal(realization.decision_status, decision.decision_status);
  assert.equal(realization.decision_source, decision.decision_source);
});

test("project-owner decision imports without fixture mode and creates a new package identity", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-project-owner-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "fixture.svg"));
  const prepared = await prepare(root);
  const analysis = fixture();
  analysis.prepared_analysis_id = prepared.validation.prepared_analysis_id;
  const submitted = await submit(root, analysis);
  const decision = { decision_set_id: "owner-decision-build5", reviewed_package_id: submitted.validation.package_id, verdict: "PASS", decision_status: "accepted", decision_source: "project-owner", decided_at: "2026-07-13T00:00:00Z" };
  writeFileSync(path.join(root, "project-owner-decision.json"), JSON.stringify(decision));
  const realized = await handleEnvelope({ ...baseFor(root), request_id: "realize-owner-approved", operation: "generate-realization", input: { package_directory: "package", owner_decision_file: "project-owner-decision.json", approved_package_directory: "owner-approved-package" }, output_directory: "owner-realization" });
  assert.equal(realized.status, "completed", JSON.stringify(realized));
  assert.notEqual(realized.validation.approved_package_id, submitted.validation.package_id);
  assert.equal(JSON.parse(readFileSync(path.join(root, "owner-realization/realization.json"))).decision_source, "project-owner");
});
