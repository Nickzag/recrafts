#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDesignIr, parseDesignMd } from "../packages/recrafts-design/index.mjs";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import { evaluateDesignCoherence } from "../runtime/design_coherence_gate.mjs";
import { evaluateSourceFidelity } from "../runtime/design_fidelity_gate.mjs";
import { qualifyBlindHarness } from "../runtime/design_qualification.mjs";
import { localLinuxDiagnosis } from "../runtime/r012_linux_evidence.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const root = process.cwd();
const base = path.join(root, "examples/golden-candidates/recrafts-design-v1");
const designSource = await readFile(path.join(base, "design-system/design.md"), "utf8");
const preview = renderDesignPreview({ designSource, generatedAt: "2026-08-09T00:00:00.000Z" });
await writeFile(path.join(base, "design-system/preview.html"), preview.html);
const artifactsDir = path.join(base, "qualification/artifacts");
await mkdir(artifactsDir, { recursive: true });
const designSha = sha(designSource);
const ir = compileDesignIr(parseDesignMd(designSource));
const irSha = sha(JSON.stringify(ir));
const evidenceId = "E-FIXTURE-1";
const sourceArtifacts = {
  source_manifest: { schema: "recrafts.source-manifest/v1", evidence_revision: evidenceId, sources: [{ source_id: "S1", sha256: "a".repeat(64) }] },
  region_set: { schema: "recrafts.region-set/v1", evidence_revision: evidenceId, regions: [{ region_id: "RG1", source_id: "S1", coverage: 1, status: "observed" }] },
  measurement_set: { schema: "recrafts.measurement-set/v1", evidence_revision: evidenceId, measurements: [{ measurement_id: "M1", region_id: "RG1", kind: "bounds", value: 100, unit: "px", confidence: 0.95 }] },
  source_token_set: { schema: "recrafts.source-token-set/v1", evidence_revision: evidenceId, measurement_set_sha256: null, tokens: [{ token_id: "T1", certainty: "observed", region_refs: ["RG1"], measurement_refs: ["M1"] }] },
  reconstruction: { schema: "recrafts.faithful-reconstruction/v1", candidate_revision: "C-FIXTURE-1", design_sha256: designSha, region_set_sha256: null, surfaces: [{ region_id: "RG1", status: "rendered", source_bounds: {x:0,y:0,width:100,height:50,unit:"px"}, reconstruction_bounds: {x:0,y:0,width:100,height:50,unit:"px"} }], visual_evidence: { source_visual_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", reconstruction_visual_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", browser_provenance: "deterministic-fixture" } },
  comparison_report: { schema: "recrafts.source-comparison/v1", candidate_revision: "C-FIXTURE-1", reconstruction_sha256: null, comparisons: [{ region_id: "RG1", visual_similarity: 0.97, unsupported_objects: [], unknowns_hardened: false, metric_provenance: "deterministic-fixture" }], visual_binding: { source_visual_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", reconstruction_visual_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } },
  geometry_report: { schema: "recrafts.geometry-report/v1", candidate_revision: "C-FIXTURE-1", region_set_sha256: null, measurement_set_sha256: null, regions: [{ region_id: "RG1", delta_px: 1, tolerance_px: 2 }], visual_binding: { source_visual_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", reconstruction_visual_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } }
};
const regionHash = sha(json(sourceArtifacts.region_set));
const measurementHash = sha(json(sourceArtifacts.measurement_set));
sourceArtifacts.source_token_set.measurement_set_sha256 = measurementHash;
sourceArtifacts.reconstruction.region_set_sha256 = regionHash;
const reconHash = sha(json(sourceArtifacts.reconstruction));
sourceArtifacts.comparison_report.reconstruction_sha256 = reconHash;
sourceArtifacts.geometry_report.region_set_sha256 = regionHash;
sourceArtifacts.geometry_report.measurement_set_sha256 = measurementHash;
const artifacts = {};
for (const [key, value] of Object.entries(sourceArtifacts)) {
  const file = path.join(artifactsDir, `${key}.json`);
  await writeFile(file, json(value));
  artifacts[key] = { path: file, sha256: sha(await readFile(file)) };
}
const candidate = { id: "C-FIXTURE-1", evidence_revision: evidenceId, design_sha256: designSha, design_ir_sha256: irSha, status: "candidate", agent_usable: false };
const gateA = await evaluateSourceFidelity({ candidate, artifacts }, { qualificationFixture: true });
const gateB = await evaluateDesignCoherence({ candidate, designSource, previewHtml: preview.html });
const blind = qualifyBlindHarness({ allowed_files: ["design.md", "task.md"], accessed_files: ["design.md", "task.md"], provenance: { runner: "deterministic-fixture", input_isolated: true }, result: { schema_valid: true, constraints_followed: true } });
const linux = localLinuxDiagnosis();
const result = {
  schema: "recrafts.r012-result/v1", status: "candidate", agent_usable: false,
  gate_a: gateA,
  gate_b: gateB,
  blind,
  linux,
  owner_decision: "MISSING",
  release_promotion: "BLOCKED"
};
await writeFile(path.join(base, "qualification/result.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
