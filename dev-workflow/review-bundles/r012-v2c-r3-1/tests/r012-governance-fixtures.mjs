import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { canonical } from "./r012-design-parser.test.mjs";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import { evaluateDesignCoherence } from "../runtime/design_coherence_gate.mjs";
import { compileDesignIr, parseDesignMd } from "../packages/recrafts-design/index.mjs";

export const sha = (value) => createHash("sha256").update(value).digest("hex");
export const withReportHash = (report) => ({ ...report, report_sha256: sha(JSON.stringify(report)) });

export function candidateFixture({ id = "C1", evidenceRevision = "E1", designSource = canonical } = {}) {
  return {
    schema: "recrafts.candidate-revision/v2", id, evidence_revision: evidenceRevision, design_sha256: sha(designSource),
    design_ir_sha256: sha(JSON.stringify(compileDesignIr(parseDesignMd(designSource)))), status: "candidate", agent_usable: false,
    agent: { name: "unit-test-host", run_id: `run-${id}`, input_manifest_sha256: "b".repeat(64) },
    created_at: "2026-08-09T00:00:00.000Z", immutable: true
  };
}

export async function gateReports({ candidate, designSource = canonical } = {}) {
  const preview = renderDesignPreview({ designSource, generatedAt: "2026-08-09T00:00:00.000Z" });
  const gateB = await evaluateDesignCoherence({ candidate, designSource, previewHtml: preview.html });
  const gateABase = {
    schema: "recrafts.source-fidelity-report/v2", verdict: "PASS", candidate_revision: candidate.id,
    evidence_revision: candidate.evidence_revision, design_sha256: candidate.design_sha256,
    artifact_hashes: { source_manifest: "1".repeat(64), region_set: "2".repeat(64), measurement_set: "3".repeat(64), source_token_set: "4".repeat(64), reconstruction: "5".repeat(64), comparison_report: "6".repeat(64), geometry_report: "7".repeat(64) },
    checks: { candidate_and_evidence_binding: "PASS", artifact_dependency_binding: "PASS", source_and_region_coverage: "PASS", measurement_integrity: "PASS", source_token_support: "PASS", reconstruction_coverage: "PASS", comparison_coverage: "PASS", unsupported_visible_objects: "PASS", unknown_honesty: "PASS", geometry_fidelity: "PASS" },
    failures: [], gate_a_runtime_qualification: "NOT_RUN", real_source_source_fidelity: "PASS", qualification_fixture: false
  };
  return { gateA: withReportHash(gateABase), gateB, preview };
}

export async function ownerDecisionFile(root, { candidate, gateA, gateB, overrides = {} }) {
  const value = {
    schema: "recrafts.owner-decision-input/v1", decision_id: `D-${candidate.id}`, reviewer_name: "Unit Test Owner", reviewer_role: "Project Owner",
    verdict: "PASS", candidate_revision: candidate.id, evidence_revision: candidate.evidence_revision, design_sha256: candidate.design_sha256,
    gate_a_report_sha256: gateA.report_sha256, gate_b_report_sha256: gateB.report_sha256,
    decided_at: "2026-08-09T01:00:00.000Z", fixture: false, ...overrides
  };
  const file = path.join(root, `${value.decision_id}.json`);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

export { canonical };
