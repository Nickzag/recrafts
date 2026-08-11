import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { executeDesignOperation } from "../runtime/design_system_runtime.mjs";
import { candidateFixture, gateReports, ownerDecisionFile, canonical } from "./r012-governance-fixtures.mjs";

const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

test("Owner import, Release creation/validation, and rollback execute through public Operations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-operations-"));
  const candidate = candidateFixture();
  const { gateA, gateB } = await gateReports({ candidate });
  await Promise.all([
    writeFile(path.join(root, "design.md"), canonical), writeJson(path.join(root, "candidate.json"), candidate),
    writeJson(path.join(root, "gate-a.json"), gateA), writeJson(path.join(root, "gate-b.json"), gateB)
  ]);
  const decisionFile = await ownerDecisionFile(root, { candidate, gateA, gateB });
  const imported = await executeDesignOperation({ operation: "import-design-owner-decision", input: { decision_file: path.basename(decisionFile), candidate_file: "candidate.json", gate_a_report_file: "gate-a.json", gate_b_report_file: "gate-b.json" }, output_directory: "decision-import" }, root);
  assert.equal(imported.status, "completed");
  await mkdir(path.join(root, "design-store"));
  const created = await executeDesignOperation({ operation: "create-design-release", input: { design_store_directory: "design-store", candidate_file: "candidate.json", design_file: "design.md", gate_a_report_file: "gate-a.json", gate_b_report_file: "gate-b.json", owner_decision_receipt_file: "decision-import/D-C1.receipt.json", release_id: "R1", version: "0.1.0", parent_release_id: null } }, root);
  assert.equal(created.validation.release_id, "R1");
  const validated = await executeDesignOperation({ operation: "validate-design-release", input: { design_store_directory: "design-store", release_id: "R1", expected_version: "0.1.0" } }, root);
  assert.equal(validated.validation.valid, true);
  const rollback = { schema: "recrafts.rollback-design-release-decision/v1", decision_id: "D-R1", reviewer_name: "Unit Test Owner", reviewer_role: "Project Owner", verdict: "PASS", current_release: "R1", target_release: "R1", new_release_id: "R2", new_version: "0.2.0", reason: "restore", decided_at: "2026-08-09T03:00:00.000Z", fixture: false };
  await writeJson(path.join(root, "rollback.json"), rollback);
  const rolledBack = await executeDesignOperation({ operation: "rollback-design-release", input: { design_store_directory: "design-store", rollback_decision_file: "rollback.json" } }, root);
  assert.equal(rolledBack.validation.release_id, "R2");
  assert.equal(JSON.parse(await readFile(path.join(root, "design-store/releases/R2/release.json"), "utf8")).release_kind, "rollback");
});

