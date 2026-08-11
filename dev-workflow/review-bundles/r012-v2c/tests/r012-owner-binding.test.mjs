import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { candidateFixture, gateReports, ownerDecisionFile } from "./r012-governance-fixtures.mjs";
const owner = await import("../runtime/design_owner_decision.mjs").catch(() => ({}));

test("formal Owner import creates an immutable receipt bound to exact Candidate, Evidence, Design, and Gate reports", async () => {
  assert.equal(typeof owner.importDesignOwnerDecision, "function");
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-owner-"));
  const candidate = candidateFixture();
  const { gateA, gateB } = gateReports({ candidate });
  const decisionFile = await ownerDecisionFile(root, { candidate, gateA, gateB });
  const outputDirectory = path.join(root, "imported");
  const receipt = await owner.importDesignOwnerDecision({ decisionFile, candidate, gateAReport: gateA, gateBReport: gateB, outputDirectory });
  assert.equal(receipt.import_operation, "import-design-owner-decision");
  assert.equal(receipt.authority_provenance.trust_boundary, "local-governance");
  assert.equal(receipt.candidate_revision, candidate.id);
  assert.equal(receipt.gate_a_report_sha256, gateA.report_sha256);
  assert.equal(receipt.gate_b_report_sha256, gateB.report_sha256);
  assert.equal(JSON.parse(await readFile(path.join(outputDirectory, "owner-decision-receipt.json"), "utf8")).receipt_sha256, receipt.receipt_sha256);
});

test("Owner import rejects fake role, fixture authority, stale Candidate, Evidence, Design, or Gate binding", async () => {
  const cases = [
    { reviewer_role: "Host Agent" }, { fixture: true }, { candidate_revision: "C-OTHER" }, { evidence_revision: "E-OTHER" },
    { design_sha256: "0".repeat(64) }, { gate_a_report_sha256: "0".repeat(64) }, { gate_b_report_sha256: "0".repeat(64) }
  ];
  for (const [index, overrides] of cases.entries()) {
    const root = await mkdtemp(path.join(os.tmpdir(), `r012-owner-negative-${index}-`));
    const candidate = candidateFixture();
    const { gateA, gateB } = gateReports({ candidate });
    const decisionFile = await ownerDecisionFile(root, { candidate, gateA, gateB, overrides });
    await assert.rejects(() => owner.importDesignOwnerDecision({ decisionFile, candidate, gateAReport: gateA, gateBReport: gateB, outputDirectory: path.join(root, "imported") }), /Owner|binding|fixture|Schema|Candidate|Gate/i);
  }
});

