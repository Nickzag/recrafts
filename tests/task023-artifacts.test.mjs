import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyCorrection, createDomainCandidate, createSourceEvidence, rollbackCorrection, validateArtifactSet, writeArtifactSet } from "../runtime/task023_artifacts.mjs";

const evidence = createSourceEvidence({ evidence_id: "ev-css-color", source_type: "dom-css", source_uri: "https://example.com", content_hash: "a".repeat(64), capture_timestamp: "2026-07-13T00:00:00Z", extraction_method: "css-variable", reliability_class: "direct-source" });
const candidate = createDomainCandidate({ candidate_id: "color-accent", domain: "color", rule: { role: "accent", value: "#c8553d" }, evidence_refs: [evidence.evidence_id], confidence: { state: "high", reason: "Repeated direct CSS evidence." } });

test("rejects screenshot and model output presented as direct evidence", () => {
  assert.throws(() => createSourceEvidence({ ...evidence, source_type: "screenshot" }), /cannot be direct-source/);
  assert.throws(() => createSourceEvidence({ ...evidence, source_type: "model-output" }), /cannot be direct-source/);
});

test("requires evidence-linked domain confidence with a reason", () => {
  assert.equal(candidate.high_impact, true);
  assert.throws(() => createDomainCandidate({ candidate_id: "bad", domain: "color", rule: {}, evidence_refs: [], confidence: { state: "high", reason: "x" } }), /evidence refs/);
  assert.throws(() => createDomainCandidate({ candidate_id: "bad", domain: "color", rule: {}, evidence_refs: ["ev"], confidence: { state: "high" } }), /explained confidence/);
});

test("preserves extraction and confidence through correction and rollback", () => {
  const corrected = applyCorrection(candidate, { correction_id: "correction-1", action: "edit", value: { role: "accent", value: "#b84b37" }, author: "owner", timestamp: "2026-07-13T01:00:00Z" });
  assert.deepEqual(corrected.original_extraction, candidate.rule);
  assert.equal(corrected.confidence.original_state, "high");
  const rolledBack = rollbackCorrection(corrected, "correction-1", { correction_id: "rollback-1", author: "owner", timestamp: "2026-07-13T02:00:00Z" });
  assert.deepEqual(rolledBack.rule, candidate.rule);
  assert.equal(rolledBack.corrections.at(-1).action, "rollback");
});

test("blocks unapproved high-impact conflict correction", () => {
  const conflicted = { ...candidate, confidence: { state: "conflicted", reason: "Direct and rendered sources disagree." } };
  assert.throws(() => applyCorrection(conflicted, { correction_id: "c", action: "accept", author: "owner", timestamp: "2026-07-13T01:00:00Z" }), /explicit approval/);
});

test("writes and validates a portable structured artifact set", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "recrafts-task023-"));
  const result = await writeArtifactSet(output, { contract_id: "contract-test", title: "Test System", intent: "Evidence-bounded system.", evidence_scope: "Fixture only.", evidence: [evidence], candidates: [candidate], conflicts: [], unresolved: [], accessibility: ["Text contrast remains testable."], exceptions: [] });
  assert.equal(result.validation.status, "valid");
  assert.match(await readFile(path.join(output, "design.md"), "utf8"), /Evidence Scope/);
  const contract = JSON.parse(await readFile(path.join(output, "design-contract.json"), "utf8"));
  assert.equal(contract.production_ready, false);
  assert.equal(contract.domains.length, 13);
});

test("artifact validation rejects broken evidence and aggregate accuracy", () => {
  const report = validateArtifactSet({ "design.md": "x", "design-contract.json": { domains: [{ candidates: [{ ...candidate, evidence_refs: ["missing"] }] }] }, "tokens.json": {}, "components.json": {}, "evidence.json": { evidence: [evidence] }, "conflicts.json": {}, "preview/index.html": "x", "validation-report.json": {} });
  assert.equal(report.status, "invalid");
  assert.equal(report.aggregate_accuracy_score, null);
});
