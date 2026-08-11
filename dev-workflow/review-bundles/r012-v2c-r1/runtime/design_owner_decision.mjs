import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
const exists = async (file) => access(file).then(() => true).catch(() => false);
import path from "node:path";
import { assertGateReport, assertGovernanceObject } from "../packages/recrafts-design/src/schema_runtime.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const reportHashValid = (report) => {
  const { report_sha256: declared, ...body } = report;
  return declared === sha256(JSON.stringify(body));
};

export function validateOwnerDecisionReceipt({ receipt, candidate, gateAReport, gateBReport }) {
  assertGovernanceObject("candidate", candidate);
  assertGateReport("gateA", gateAReport);
  assertGateReport("gateB", gateBReport);
  assertGovernanceObject("ownerDecisionReceipt", receipt);
  const { receipt_sha256: declared, ...body } = receipt;
  if (declared !== sha256(JSON.stringify(body))) throw new Error("Owner Decision receipt hash binding is invalid");
  if (!reportHashValid(gateAReport) || !reportHashValid(gateBReport)) throw new Error("Gate report hash binding is invalid");
  if (gateAReport.verdict !== "PASS" || gateBReport.verdict !== "PASS") throw new Error("Owner Decision cannot authorize failed Gates");
  if (receipt.candidate_revision !== candidate.id || receipt.evidence_revision !== candidate.evidence_revision || receipt.design_sha256 !== candidate.design_sha256) throw new Error("Owner Decision exact Candidate binding failed");
  if (receipt.gate_a_report_sha256 !== gateAReport.report_sha256 || receipt.gate_b_report_sha256 !== gateBReport.report_sha256) throw new Error("Owner Decision Gate binding failed");
  return { valid: true };
}

export async function importDesignOwnerDecision({ decisionFile, candidate, gateAReport, gateBReport, outputDirectory, importedAt = new Date().toISOString() }) {
  assertGovernanceObject("candidate", candidate);
  assertGateReport("gateA", gateAReport);
  assertGateReport("gateB", gateBReport);
  if (!reportHashValid(gateAReport) || !reportHashValid(gateBReport)) throw new Error("Gate report hash binding is invalid");
  const decisionBytes = await readFile(decisionFile);
  const decision = JSON.parse(decisionBytes);
  assertGovernanceObject("ownerDecisionInput", decision);
  if (decision.verdict !== "PASS") throw new Error("Owner Decision import requires PASS");
  if (decision.candidate_revision !== candidate.id || decision.evidence_revision !== candidate.evidence_revision || decision.design_sha256 !== candidate.design_sha256) throw new Error("Owner Decision exact Candidate binding failed");
  if (decision.gate_a_report_sha256 !== gateAReport.report_sha256 || decision.gate_b_report_sha256 !== gateBReport.report_sha256) throw new Error("Owner Decision exact Gate binding failed");
  if (gateAReport.candidate_revision !== candidate.id || gateBReport.candidate_revision !== candidate.id || gateAReport.evidence_revision !== candidate.evidence_revision || gateBReport.evidence_revision !== candidate.evidence_revision || gateAReport.design_sha256 !== candidate.design_sha256 || gateBReport.design_sha256 !== candidate.design_sha256) throw new Error("Gate reports do not bind the exact Candidate");
  if (gateAReport.verdict !== "PASS" || gateBReport.verdict !== "PASS") throw new Error("Owner Decision cannot import failed Gates");
  const body = {
    schema: "recrafts.owner-decision-receipt/v1", decision_id: decision.decision_id, verdict: "PASS", candidate_revision: candidate.id,
    evidence_revision: candidate.evidence_revision, design_sha256: candidate.design_sha256, gate_a_report_sha256: gateAReport.report_sha256,
    gate_b_report_sha256: gateBReport.report_sha256, decision_file_sha256: sha256(decisionBytes), import_operation: "import-design-owner-decision",
    authority_provenance: { trust_boundary: "local-governance", reviewer_name: decision.reviewer_name, reviewer_role: "Project Owner", cryptographic_identity_verified: false },
    decided_at: decision.decided_at, imported_at: importedAt
  };
  const receipt = { ...body, receipt_sha256: sha256(JSON.stringify(body)) };
  assertGovernanceObject("ownerDecisionReceipt", receipt);
  await mkdir(outputDirectory, { recursive: true });
  const temporary = path.join(outputDirectory, ".owner-decision-receipt.next.json");
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  await rename(temporary, receiptFile);
  return receipt;
}
