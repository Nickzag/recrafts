import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import { evaluateDesignCoherence } from "../runtime/design_coherence_gate.mjs";
import { evaluateSourceFidelity } from "../runtime/design_fidelity_gate.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const intelligence = JSON.parse(await readFile(new URL("../fixtures/r013/holdout-kanban/design-intelligence.json", import.meta.url), "utf8"));

async function gateAFixture({ unsupported = [], overlay = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "r013-gate-a-"));
  const source = Buffer.from("source-visual");
  const reconstruction = Buffer.from("reconstruction-visual");
  const overlayBytes = Buffer.from("overlay-visual");
  const sourceHash = sha(source), reconstructionHash = sha(reconstruction), overlayHash = sha(overlayBytes);
  await Promise.all([writeFile(path.join(root, "source.png"), source), writeFile(path.join(root, "reconstruction.png"), reconstruction), writeFile(path.join(root, "overlay.png"), overlayBytes)]);
  const files = {
    source_manifest: { schema: "recrafts.source-manifest/v1", evidence_revision: "E1", sources: ["alpha", "beta", "gamma"].map((source_id) => ({ source_id, sha256: "a".repeat(64) })) },
    region_set: { schema: "recrafts.region-set/v1", evidence_revision: "E1", regions: ["alpha", "beta", "gamma"].map((source_id) => ({ region_id: `${source_id}-main`, source_id, coverage: 1, status: "observed" })) },
    measurement_set: { schema: "recrafts.measurement-set/v1", evidence_revision: "E1", measurements: ["alpha", "beta", "gamma"].map((id) => ({ measurement_id: `m-${id}`, region_id: `${id}-main`, kind: "bounds", value: 100, unit: "px", confidence: 0.95 })) },
    source_token_set: { schema: "recrafts.source-token-set/v1", evidence_revision: "E1", tokens: [{ token_id: "T1", certainty: "observed", region_refs: ["alpha-main", "beta-main", "gamma-main"], measurement_refs: ["m-alpha", "m-beta", "m-gamma"] }] },
    reconstruction: { schema: "recrafts.faithful-reconstruction/v1", candidate_revision: "C1", design_sha256: "d".repeat(64), surfaces: ["alpha", "beta", "gamma"].map((id) => ({ region_id: `${id}-main`, status: "rendered", source_bounds: { x: 0, y: 0, width: 100, height: 50, unit: "px" }, reconstruction_bounds: { x: 0, y: 0, width: 100, height: 50, unit: "px" } })), visual_evidence: { source_visual_sha256: sourceHash, reconstruction_visual_sha256: reconstructionHash, ...(overlay ? { overlay_visual_sha256: overlayHash } : {}), browser_provenance: "playwright-chromium" } },
    comparison_report: { schema: "recrafts.source-comparison/v1", candidate_revision: "C1", comparisons: ["alpha", "beta", "gamma"].map((id) => ({ region_id: `${id}-main`, visual_similarity: 0.97, unsupported_objects: unsupported, unknowns_hardened: false, metric_provenance: "pixel-compare" })), visual_binding: { source_visual_sha256: sourceHash, reconstruction_visual_sha256: reconstructionHash, ...(overlay ? { overlay_visual_sha256: overlayHash } : {}) } },
    geometry_report: { schema: "recrafts.geometry-report/v1", candidate_revision: "C1", regions: ["alpha", "beta", "gamma"].map((id) => ({ region_id: `${id}-main`, delta_px: 1, tolerance_px: 2 })), visual_binding: { source_visual_sha256: sourceHash, reconstruction_visual_sha256: reconstructionHash, ...(overlay ? { overlay_visual_sha256: overlayHash } : {}) } }
  };
  files.source_token_set.measurement_set_sha256 = sha(json(files.measurement_set));
  files.reconstruction.region_set_sha256 = sha(json(files.region_set));
  files.comparison_report.reconstruction_sha256 = sha(json(files.reconstruction));
  files.geometry_report.region_set_sha256 = sha(json(files.region_set));
  files.geometry_report.measurement_set_sha256 = sha(json(files.measurement_set));
  const artifacts = {};
  for (const [name, value] of Object.entries(files)) { const file = path.join(root, `${name}.json`); await writeFile(file, json(value)); artifacts[name] = { path: file, sha256: sha(await readFile(file)) }; }
  return { candidate: { id: "C1", evidence_revision: "E1", design_sha256: "d".repeat(64), status: "candidate", agent_usable: false }, artifacts, visualFiles: { source_visual: path.join(root, "source.png"), reconstruction_visual: path.join(root, "reconstruction.png"), ...(overlay ? { overlay_visual: path.join(root, "overlay.png") } : {}) }, designIntelligence: intelligence };
}

test("R-013 Gate A binds Intelligence, visible-object coverage, and declared Overlay bytes", async () => {
  assert.equal((await evaluateSourceFidelity(await gateAFixture(), { productionGate: true, requireDesignIntelligence: true })).verdict, "PASS");
  assert.equal((await evaluateSourceFidelity(await gateAFixture({ unsupported: ["unmapped-toolbar"] }), { productionGate: true, requireDesignIntelligence: true })).verdict, "FAIL");
  const missingOverlay = await gateAFixture(); delete missingOverlay.visualFiles.overlay_visual;
  assert.equal((await evaluateSourceFidelity(missingOverlay, { productionGate: true, requireDesignIntelligence: true })).verdict, "FAIL");
  const missingIntelligence = await gateAFixture(); missingIntelligence.designIntelligence = null;
  assert.equal((await evaluateSourceFidelity(missingIntelligence, { productionGate: true, requireDesignIntelligence: true })).verdict, "FAIL");
});

test("R-013 Gate B rejects absent or unbound Product Composition proof", async () => {
  const preview = renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-13T00:00:00.000Z" });
  const candidate = { id: "C1", evidence_revision: "E1", design_sha256: sha(canonical), status: "candidate", agent_usable: false };
  const noIntelligence = await evaluateDesignCoherence({ candidate, designSource: canonical, previewHtml: preview.html, requireDesignIntelligence: true });
  assert.equal(noIntelligence.verdict, "FAIL");
  const mismatched = structuredClone(intelligence);
  mismatched.preview_coverage.product_composition_refs = ["board-surface"];
  const report = await evaluateDesignCoherence({ candidate, designSource: canonical, previewHtml: preview.html, designIntelligence: mismatched, requireDesignIntelligence: true });
  assert.equal(report.checks.product_composition_proof, "FAIL");
  assert.equal(report.verdict, "FAIL");
});

test("R-013 Gate B accepts Design-bound maturity, composition proof, and utility without claiming Source Fidelity", async () => {
  const preview = renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-13T00:00:00.000Z" });
  const candidate = { id: "C1", evidence_revision: "E1", design_sha256: sha(canonical), status: "candidate", agent_usable: false };
  const bound = structuredClone(intelligence);
  bound.product_understanding.surfaces[0].id = "composition.workspace";
  bound.components[0].id = "component.document-row";
  bound.preview_coverage.product_composition_refs = ["composition.workspace"];
  bound.preview_coverage.rendered_component_refs = ["component.document-row"];
  const report = await evaluateDesignCoherence({ candidate, designSource: canonical, previewHtml: preview.html, designIntelligence: bound, requireDesignIntelligence: true });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.checks.product_composition_proof, "PASS");
  assert.equal(report.checks.component_preview_binding, "PASS");
  assert.equal(report.downstream_utility.verdict, "PASS");
  assert.equal(report.proves_source_fidelity, false);
});
