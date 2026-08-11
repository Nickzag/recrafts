import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
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
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "r012-fixture-bev-"));
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(200).fill(0)]);
  const dHash = sha(png); const cHash = sha(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(200).fill(1)])); const mHash = sha(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(200).fill(2)]));
  await Promise.all([writeFile(path.join(tmpDir, "desktop.png"), png), writeFile(path.join(tmpDir, "compact.png"), Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(200).fill(1)])), writeFile(path.join(tmpDir, "mobile.png"), Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(200).fill(2)]))]);
  const tokens = { "--recrafts-color-surface": "#f7f7f5", "--recrafts-color-panel": "#ffffff", "--recrafts-color-text": "#20201e", "--recrafts-color-border": "#d8d8d3", "--recrafts-color-accent": "#dce8ff", "--recrafts-spacing-row": "12px", "--recrafts-spacing-section": "24px", "--recrafts-radius-control": "8px", "--recrafts-border-hairline": "1px", "--recrafts-typography-body": "14px/1.5 system-ui" };
  const desktopRegions = [{ id: "canvas", visibility: "preserved", display: "block" }, { id: "sidebar", visibility: "preserved", display: "block" }, { id: "inspector", visibility: "preserved", display: "block" }];
  const compactRegions = [{ id: "canvas", visibility: "preserved", display: "block" }, { id: "sidebar", visibility: "preserved", display: "block" }, { id: "inspector", visibility: "collapsed", display: "none" }];
  const mobileRegions = [{ id: "canvas", visibility: "preserved", display: "block" }, { id: "navigation", visibility: "relocated", display: "block" }, { id: "sidebar", visibility: "collapsed", display: "none" }, { id: "inspector", visibility: "collapsed", display: "none" }];
  const gateB = await evaluateDesignCoherence({ candidate, designSource, previewHtml: preview.html, productionGate: true, browserEvidenceRoot: tmpDir, browserEvidence: { schema: "recrafts.browser-evidence/v1", status: "PASS", browser_engine: "playwright-chromium", preview_sha256: sha(preview.html), screenshots: { desktop: { file: "desktop.png", sha256: dHash, viewport: { width: 1440, height: 1000 } }, compact: { file: "compact.png", sha256: cHash, viewport: { width: 768, height: 1000 } }, mobile: { file: "mobile.png", sha256: mHash, viewport: { width: 390, height: 844 } } }, computed_styles: { desktop: { root_tokens: tokens, specimen: {}, visual_region: {}, regions: desktopRegions }, compact: { root_tokens: tokens, specimen: {}, visual_region: {}, regions: compactRegions }, mobile: { root_tokens: tokens, specimen: {}, visual_region: {}, regions: mobileRegions } } } });
  const gateABase = {
    schema: "recrafts.source-fidelity-report/v2", verdict: "PASS", candidate_revision: candidate.id,
    evidence_revision: candidate.evidence_revision, design_sha256: candidate.design_sha256,
    artifact_hashes: { source_manifest: "1".repeat(64), region_set: "2".repeat(64), measurement_set: "3".repeat(64), source_token_set: "4".repeat(64), reconstruction: "5".repeat(64), comparison_report: "6".repeat(64), geometry_report: "7".repeat(64) },
    checks: { candidate_and_evidence_binding: "PASS", artifact_dependency_binding: "PASS", source_and_region_coverage: "PASS", measurement_integrity: "PASS", source_token_support: "PASS", reconstruction_coverage: "PASS", comparison_coverage: "PASS", unsupported_visible_objects: "PASS", unknown_honesty: "PASS", geometry_fidelity: "PASS", visual_file_verification: "PASS" },
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
