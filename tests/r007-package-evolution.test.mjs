import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { handleEnvelope } from "../runtime/interop_contract.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const treeHashes = (root) => Object.fromEntries(readdirSync(root, { recursive: true }).filter((name) => statSync(path.join(root, name)).isFile()).sort().map((name) => [name, hash(path.join(root, name))]));
const host = { agent: "test", engine: "node", capabilities: ["vision", "files", "structured-output"] };
const request = (root, operation, input, output_directory) => ({ protocol_version: "1.1", request_id: `${operation}-${output_directory}`, operation, host, working_root: root, input, ...(output_directory ? { output_directory } : {}) });

async function createBlockedPackage(root) {
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "image.svg"));
  const prepared = await handleEnvelope(request(root, "prepare-analysis", { sources: [{ kind: "image", path: "image.svg" }] }, "prepared"));
  const ev = json(path.join(root, "prepared/analysis/evidence-bundle.json")).evidence[0].evidence_id;
  const analysis = {
    fixture_label: "r007-deterministic-non-live", prepared_analysis_id: prepared.validation.prepared_analysis_id,
    execution: { host_agent: "fixture-host", engine: "fixture-vision", vision_capability: true, performed_at: "2026-07-13T00:00:00Z" },
    findings: [{ id: "finding-shell", observation: "Sanitized product shell", scope: "workspace", confidence: 0.8, evidence_refs: [ev] }],
    tokens: [{ id: "color.surface", category: "color", value: "#ffffff", scope: "workspace", status: "inferred", confidence: 0.8, evidence_refs: [ev] }],
    components: [{ name: "card", purpose: "Content surface", anatomy: ["container"], variants: ["default"], states: ["default"], scope: "surface", confidence: 0.8, evidence_refs: [ev] }],
    grid_rules: [{ id: "grid.workspace", rule_type: "column-layout", constraints: { columns: 2 }, scope: "workspace", status: "inferred", confidence: 0.8, evidence_refs: [ev] }],
    conflicts: [{ id: "grid-review", conflict_class: "grid-rule-conflict", domain: "grid-rule", severity: "high", impact: "workspace-layout", candidate_refs: ["grid.workspace"], evidence_refs: [ev] }]
  };
  writeFileSync(path.join(root, "analysis.json"), JSON.stringify(analysis));
  const submitted = await handleEnvelope(request(root, "submit-analysis", { prepared_analysis_directory: "prepared", host_analysis_file: "analysis.json" }, "package-A"));
  assert.equal(submitted.validation.package_status, "blocked");
  return { evidence_id: ev, claim_id: "claim-grid.workspace", package_id: submitted.validation.package_id };
}

function correction(basePackageId, evidenceId, claimId, operations, correctionId = "correction-1") {
  return { correction_id: correctionId, base_package_id: basePackageId, actor: "Nick", actor_role: "project-owner", created_at: "2026-07-13T01:00:00Z", reason: "Project-owner reviewed correction", operations: operations.map((operation, index) => ({ operation_id: `${correctionId}-op-${index + 1}`, evidence_refs: [evidenceId], claim_refs: [claimId], reason: "Evidence-bound owner correction", ...operation })), decision_context: { review_id: `review-${correctionId}` } };
}

function decision(candidatePackageId, id = "decision-1", extra = {}) {
  return { decision_id: id, candidate_package_id: candidatePackageId, actor: "Nick", actor_role: "project-owner", verdict: "PASS", created_at: "2026-07-13T02:00:00Z", accepted_risks: [], resolved_conflicts: [], notes: "Project-owner reviewed", ...extra };
}

test("golden chain corrects, accepts, evolves, accepts again and rolls back immutably", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r007-golden-"));
  const fixture = await createBlockedPackage(root); const aBefore = treeHashes(path.join(root, "package-A"));
  const corr1 = correction(fixture.package_id, fixture.evidence_id, fixture.claim_id, [
    { type: "resolve-conflict", target_id: "conflict-grid-review", before: { status: "open" }, after: { status: "resolved", selected_candidate: "grid.workspace", rejected_candidates: [] } },
    { type: "replace-token", target_id: "color.surface", before: { value: "#ffffff" }, after: { value: "#f7f7f7" } },
    { type: "replace-grid-rule", target_id: "grid.workspace", before: { constraints: { columns: 2 } }, after: { constraints: { columns: 3 } } }
  ]);
  writeFileSync(path.join(root, "correction-1.json"), JSON.stringify(corr1));
  const corrected = await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-A", correction_file: "correction-1.json" }, "package-B"));
  assert.equal(corrected.status, "completed_with_warnings", JSON.stringify(corrected));
  assert.equal(corrected.validation.package_status, "awaiting-review");
  assert.equal((await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-A", correction_file: "correction-1.json" }, "package-B"))).error.code, "OUTPUT_NOT_EMPTY");
  assert.notEqual(corrected.validation.package_id, fixture.package_id);
  assert.deepEqual(treeHashes(path.join(root, "package-A")), aBefore);
  assert.equal(json(path.join(root, "package-B/tokens.json")).tokens[0].value, "#f7f7f7");
  assert.equal(json(path.join(root, "package-B/grid-rules.json")).grid_rules[0].constraints.columns, 3);
  assert.equal(json(path.join(root, "package-B/conflicts.json")).conflicts[0].status, "resolved");

  writeFileSync(path.join(root, "decision-1.json"), JSON.stringify(decision(corrected.validation.package_id)));
  const accepted1 = await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-B", decision_file: "decision-1.json" }, "package-C"));
  assert.equal(accepted1.status, "completed", JSON.stringify(accepted1));
  assert.equal(accepted1.validation.package_status, "accepted");
  assert.equal((await handleEnvelope(request(root, "validate-package", { package_directory: "package-C" }))).validation.status, "pass");
  const cBefore = treeHashes(path.join(root, "package-C"));

  const component = json(path.join(root, "package-C/components.json")).components[0];
  const corr2 = correction(accepted1.validation.package_id, fixture.evidence_id, component.claim_refs[0], [{ type: "replace-component", target_id: component.component_id, before: { states: ["default"] }, after: { states: ["default", "selected"] } }], "correction-2");
  writeFileSync(path.join(root, "correction-2.json"), JSON.stringify(corr2));
  const corrected2 = await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-C", correction_file: "correction-2.json" }, "package-E"));
  assert.equal(corrected2.status, "completed_with_warnings", JSON.stringify(corrected2));
  writeFileSync(path.join(root, "decision-2.json"), JSON.stringify(decision(corrected2.validation.package_id, "decision-2")));
  const accepted2 = await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-E", decision_file: "decision-2.json" }, "package-F"));
  assert.equal(accepted2.status, "completed", JSON.stringify(accepted2));
  const fBefore = treeHashes(path.join(root, "package-F"));

  const rollback = { rollback_id: "rollback-1", current_package_id: accepted2.validation.package_id, restore_target_package_id: accepted1.validation.package_id, actor: "Nick", actor_role: "project-owner", reason: "Restore first accepted visual system", decision_id: "rollback-decision-1", created_at: "2026-07-13T03:00:00Z" };
  writeFileSync(path.join(root, "rollback.json"), JSON.stringify(rollback));
  const rolled = await handleEnvelope(request(root, "rollback-package", { current_package_directory: "package-F", restore_target_directory: "package-C", decision_file: "rollback.json" }, "package-G"));
  assert.equal(rolled.status, "completed", JSON.stringify(rolled));
  assert.equal(rolled.validation.package_status, "accepted");
  assert.equal((await handleEnvelope(request(root, "validate-package", { package_directory: "package-G" }))).validation.lineage_event_type, "rollback-created");
  assert.notEqual(rolled.validation.package_id, accepted2.validation.package_id);
  const gLineage = json(path.join(root, "package-G/lineage.json"));
  assert.equal(gLineage.parent_package_id, accepted2.validation.package_id);
  assert.equal(gLineage.restored_from_package_id, accepted1.validation.package_id);
  const cSet = json(path.join(root, "package-C/artifact-set.json")); const gSet = json(path.join(root, "package-G/artifact-set.json"));
  for (const name of ["design.md", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json"]) assert.equal(gSet.artifact_hashes[name], cSet.artifact_hashes[name], name);
  assert.deepEqual(treeHashes(path.join(root, "package-A")), aBefore);
  assert.deepEqual(treeHashes(path.join(root, "package-C")), cBefore);
  assert.deepEqual(treeHashes(path.join(root, "package-F")), fBefore);
});

test("correction before mismatch and wrong acceptance identity fail closed", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r007-negative-")); const fixture = await createBlockedPackage(root);
  const bad = correction(fixture.package_id, fixture.evidence_id, "claim-color.surface", [{ type: "replace-token", target_id: "color.surface", before: { value: "wrong" }, after: { value: "#000" } }]);
  writeFileSync(path.join(root, "bad.json"), JSON.stringify(bad));
  assert.equal((await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-A", correction_file: "bad.json" }, "bad-output"))).error.code, "PACKAGE_INVALID");
  writeFileSync(path.join(root, "wrong-decision.json"), JSON.stringify(decision("package-wrong")));
  assert.equal((await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-A", decision_file: "wrong-decision.json" }, "bad-accept"))).error.code, "PACKAGE_INVALID");
});

test("open high conflict blocks acceptance unless project owner explicitly accepts the risk", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r007-risk-")); const fixture = await createBlockedPackage(root);
  writeFileSync(path.join(root, "blocked-decision.json"), JSON.stringify(decision(fixture.package_id)));
  const blocked = await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-A", decision_file: "blocked-decision.json" }, "blocked-accept"));
  assert.equal(blocked.error.code, "REALIZATION_NOT_AUTHORIZED");
  writeFileSync(path.join(root, "risk-decision.json"), JSON.stringify(decision(fixture.package_id, "decision-risk", { verdict: "PASS_WITH_CHANGES", changes_completed: true, accepted_risks: [{ conflict_id: "conflict-grid-review", risk_statement: "Known bounded layout ambiguity", accepted_scope: "workspace fixture" }] })));
  const accepted = await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-A", decision_file: "risk-decision.json" }, "risk-accepted"));
  assert.equal(accepted.status, "completed", JSON.stringify(accepted));
  assert.equal(json(path.join(root, "risk-accepted/conflicts.json")).conflicts[0].status, "accepted-risk");
});

test("rollback rejects a non-accepted current or target package", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r007-rollback-negative-")); const fixture = await createBlockedPackage(root);
  const rollback = { rollback_id: "rollback-bad", current_package_id: fixture.package_id, restore_target_package_id: fixture.package_id, actor: "Nick", actor_role: "project-owner", reason: "Invalid rollback", decision_id: "decision-bad", created_at: "2026-07-13T03:00:00Z" };
  writeFileSync(path.join(root, "rollback.json"), JSON.stringify(rollback));
  const response = await handleEnvelope(request(root, "rollback-package", { current_package_directory: "package-A", restore_target_directory: "package-A", decision_file: "rollback.json" }, "rollback-output"));
  assert.equal(response.error.code, "PACKAGE_INVALID");
});

test("all remaining correction types create overlays without mutating raw extraction", async () => {
  const cases = [
    ["reject-token", "color.surface", { status: "inferred" }, {}, "tokens.json", "tokens", "rejected"],
    ["reject-component", "component.card", { status: "inferred" }, {}, "components.json", "components", "rejected"],
    ["reject-grid-rule", "grid.workspace", { status: "inferred" }, {}, "grid-rules.json", "grid_rules", "rejected"],
    ["confirm-candidate", "color.surface", { status: "inferred" }, {}, "tokens.json", "tokens", "confirmed"],
    ["reject-candidate", "color.surface", { status: "inferred" }, {}, "tokens.json", "tokens", "rejected"]
  ];
  for (const [index, [type, target, before, after, file, key, status]] of cases.entries()) {
    const root = mkdtempSync(path.join(os.tmpdir(), `recrafts-r007-type-${index}-`)); const fixture = await createBlockedPackage(root);
    const item = [...json(path.join(root, "package-A/tokens.json")).tokens, ...json(path.join(root, "package-A/components.json")).components, ...json(path.join(root, "package-A/grid-rules.json")).grid_rules].find((value) => [value.domain_id, value.token_id, value.component_id, value.grid_rule_id].includes(target));
    const value = correction(fixture.package_id, fixture.evidence_id, item.claim_refs[0], [{ type, target_id: target, before, after }], `correction-${index}`);
    writeFileSync(path.join(root, "correction.json"), JSON.stringify(value));
    const response = await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-A", correction_file: "correction.json" }, "corrected"));
    assert.equal(response.status, "completed_with_warnings", `${type}: ${JSON.stringify(response)}`);
    assert.equal(json(path.join(root, `corrected/${file}`))[key].find((candidate) => [candidate.domain_id, candidate.token_id, candidate.component_id, candidate.grid_rule_id].includes(target)).status, status);
  }
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r007-region-")); const fixture = await createBlockedPackage(root);
  const rawBefore = hash(path.join(root, "package-A/evidence-map.json"));
  const value = correction(fixture.package_id, fixture.evidence_id, "claim-color.surface", [{ type: "reclassify-region", target_id: fixture.evidence_id, before: { classification: "unknown" }, after: { classification: "canonical-product-ui" } }], "correction-region");
  writeFileSync(path.join(root, "correction.json"), JSON.stringify(value));
  const response = await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-A", correction_file: "correction.json" }, "corrected"));
  assert.equal(response.status, "completed_with_warnings", JSON.stringify(response));
  assert.equal(json(path.join(root, "corrected/region-overlays.json")).overlays[0].after.classification, "canonical-product-ui");
  assert.equal(hash(path.join(root, "corrected/evidence-map.json")), rawBefore);
  assert.ok(json(path.join(root, "corrected/tokens.json")).tokens[0].classification_overlay_refs.includes("correction-region"));
});

test("acceptance rejects stale Evidence, partial or blocked sources, missing provenance and Host authority", async () => {
  for (const mode of ["stale", "partial", "blocked", "provenance"]) {
    const root = mkdtempSync(path.join(os.tmpdir(), `recrafts-r007-gate-${mode}-`)); const fixture = await createBlockedPackage(root);
    if (mode === "stale") { const value = json(path.join(root, "package-A/evidence-map.json")); value.evidence[0].status = "stale"; writeFileSync(path.join(root, "package-A/evidence-map.json"), JSON.stringify(value)); }
    if (mode === "partial") { const value = json(path.join(root, "package-A/source-manifest.json")); value.sources[0].status = "partial"; writeFileSync(path.join(root, "package-A/source-manifest.json"), JSON.stringify(value)); }
    if (mode === "blocked") { const value = json(path.join(root, "package-A/source-manifest.json")); value.sources[0].status = "blocked"; writeFileSync(path.join(root, "package-A/source-manifest.json"), JSON.stringify(value)); }
    if (mode === "provenance") { const value = json(path.join(root, "package-A/tokens.json")); value.tokens[0].evidence_refs = []; writeFileSync(path.join(root, "package-A/tokens.json"), JSON.stringify(value)); }
    const risk = [{ conflict_id: "conflict-grid-review", risk_statement: "Explicit test risk", accepted_scope: "fixture" }];
    writeFileSync(path.join(root, "decision.json"), JSON.stringify(decision(fixture.package_id, `decision-${mode}`, { accepted_risks: risk })));
    const response = await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-A", decision_file: "decision.json" }, "accepted"));
    assert.ok(["PACKAGE_INVALID", "REALIZATION_NOT_AUTHORIZED"].includes(response.error.code), `${mode}: ${JSON.stringify(response)}`);
  }
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r007-host-authority-")); const fixture = await createBlockedPackage(root);
  writeFileSync(path.join(root, "decision.json"), JSON.stringify(decision(fixture.package_id, "decision-host", { actor: "model", actor_role: "host-agent" })));
  const response = await handleEnvelope(request(root, "accept-artifacts", { candidate_package_directory: "package-A", decision_file: "decision.json" }, "accepted"));
  assert.equal(response.error.code, "SCHEMA_VALIDATION_FAILED");
});

test("correction rejects unknown target, unknown Evidence and provenance rewrites", async () => {
  for (const mode of ["unknown-target", "unknown-ref", "rewrite-provenance"]) {
    const root = mkdtempSync(path.join(os.tmpdir(), `recrafts-r007-correction-${mode}-`)); const fixture = await createBlockedPackage(root);
    const value = correction(fixture.package_id, mode === "unknown-ref" ? "ev-missing" : fixture.evidence_id, "claim-color.surface", [{ type: "replace-token", target_id: mode === "unknown-target" ? "token.missing" : "color.surface", before: { value: "#ffffff" }, after: mode === "rewrite-provenance" ? { value: "#000", evidence_refs: [fixture.evidence_id] } : { value: "#000" } }]);
    writeFileSync(path.join(root, "correction.json"), JSON.stringify(value));
    const response = await handleEnvelope(request(root, "submit-correction", { base_package_directory: "package-A", correction_file: "correction.json" }, "corrected"));
    assert.equal(response.error.code, "PACKAGE_INVALID", `${mode}: ${JSON.stringify(response)}`);
  }
});
