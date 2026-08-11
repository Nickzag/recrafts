import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertSchema } from "../runtime/schema_validator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const operations = ["capabilities", "prepare-analysis", "submit-analysis", "validate-package", "generate-realization", "verify-fidelity", "submit-correction", "accept-artifacts", "rollback-package"];

test("Protocol 1.1 exposes exactly nine canonical operations", () => {
  assert.deepEqual(read("contracts/envelope-request.schema.json").properties.operation.enum, operations);
  for (const operation of operations) assert.equal(read(`contracts/operations/${operation}.request.schema.json`).properties.operation.const, operation);
});

test("correction contract is strict and enumerates every R-007 operation", () => {
  const schema = read("contracts/correction.schema.json");
  const valid = { correction_id: "correction-1", base_package_id: "package-A", actor: "Nick", actor_role: "project-owner", created_at: "2026-07-13T00:00:00Z", reason: "Resolve reviewed mismatch", operations: [{ operation_id: "op-1", type: "replace-token", target_id: "color.surface", before: { value: "#fff" }, after: { value: "#f7f7f7" }, evidence_refs: ["ev-1"], claim_refs: ["claim-1"], reason: "Owner correction" }], decision_context: { review_id: "review-1" } };
  assert.doesNotThrow(() => assertSchema(valid, schema));
  for (const type of ["replace-token", "reject-token", "replace-component", "reject-component", "replace-grid-rule", "reject-grid-rule", "reclassify-region", "resolve-conflict", "confirm-candidate", "reject-candidate", "finalize-accepted-metadata"]) {
    assert.doesNotThrow(() => assertSchema({ ...valid, operations: [{ ...valid.operations[0], type }] }, schema), type);
  }
  assert.throws(() => assertSchema({ ...valid, actor_role: "host-agent" }, schema));
  assert.throws(() => assertSchema({ ...valid, unexpected: true }, schema));
});

test("acceptance and rollback decisions require human authority and identity binding", () => {
  const accept = read("contracts/artifact-decision.schema.json");
  const validAccept = { decision_id: "decision-1", candidate_package_id: "package-B", actor: "Nick", actor_role: "project-owner", verdict: "PASS", created_at: "2026-07-13T00:00:00Z", accepted_risks: [], resolved_conflicts: [], notes: "Reviewed" };
  assert.doesNotThrow(() => assertSchema(validAccept, accept));
  assert.throws(() => assertSchema({ ...validAccept, actor_role: "host-agent" }, accept));
  const rollback = read("contracts/rollback-decision.schema.json");
  const validRollback = { rollback_id: "rollback-1", current_package_id: "package-F", restore_target_package_id: "package-C", actor: "Nick", actor_role: "project-owner", reason: "Restore stable state", decision_id: "decision-rollback", created_at: "2026-07-13T01:00:00Z" };
  assert.doesNotThrow(() => assertSchema(validRollback, rollback));
  assert.throws(() => assertSchema({ ...validRollback, restore_target_package_id: undefined }, rollback));
});
