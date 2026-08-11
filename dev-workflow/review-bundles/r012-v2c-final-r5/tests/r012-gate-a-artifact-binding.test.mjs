import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
const gate = await import("../runtime/design_fidelity_gate.mjs").catch(() => ({}));

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-gate-a-"));
  const sHash = "f".repeat(64);
  const rHash = "e".repeat(64);
  const files = {
    source_manifest: { schema: "recrafts.source-manifest/v1", evidence_revision: "E1", sources: [{ source_id: "S1", sha256: "a".repeat(64) }] },
    region_set: { schema: "recrafts.region-set/v1", evidence_revision: "E1", regions: [{ region_id: "RG1", source_id: "S1", coverage: 1, status: "observed" }] },
    measurement_set: { schema: "recrafts.measurement-set/v1", evidence_revision: "E1", measurements: [{ measurement_id: "M1", region_id: "RG1", kind: "bounds", value: 100, unit: "px", confidence: 0.95 }] },
    source_token_set: { schema: "recrafts.source-token-set/v1", evidence_revision: "E1", tokens: [{ token_id: "T1", certainty: "observed", region_refs: ["RG1"], measurement_refs: ["M1"] }] },
    reconstruction: { schema: "recrafts.faithful-reconstruction/v1", candidate_revision: "C1", design_sha256: "d".repeat(64), surfaces: [{ region_id: "RG1", status: "rendered", source_bounds: {x:0,y:0,width:100,height:50,unit:"px"}, reconstruction_bounds: {x:0,y:0,width:100,height:50,unit:"px"} }], visual_evidence: { source_visual_sha256: sHash, reconstruction_visual_sha256: rHash, browser_provenance: "playwright-chromium" } },
    comparison_report: { schema: "recrafts.source-comparison/v1", candidate_revision: "C1", comparisons: [{ region_id: "RG1", visual_similarity: 0.97, unsupported_objects: [], unknowns_hardened: false, metric_provenance: "playwright-pixelmatch" }], visual_binding: { source_visual_sha256: sHash, reconstruction_visual_sha256: rHash } },
    geometry_report: { schema: "recrafts.geometry-report/v1", candidate_revision: "C1", regions: [{ region_id: "RG1", delta_px: 1, tolerance_px: 2 }], visual_binding: { source_visual_sha256: sHash, reconstruction_visual_sha256: rHash } }
  };
  for (const [key, value] of Object.entries(overrides)) files[key] = { ...files[key], ...value };
  const regionHash = sha(json(files.region_set));
  const measurementHash = sha(json(files.measurement_set));
  files.source_token_set.measurement_set_sha256 = measurementHash;
  files.reconstruction.region_set_sha256 = regionHash;
  files.comparison_report.reconstruction_sha256 = sha(json(files.reconstruction));
  files.geometry_report.region_set_sha256 = regionHash;
  files.geometry_report.measurement_set_sha256 = measurementHash;
  const artifacts = {};
  for (const [key, value] of Object.entries(files)) {
    const file = path.join(root, key + ".json");
    await writeFile(file, json(value));
    artifacts[key] = { path: file, sha256: sha(await readFile(file)) };
  }
  return { candidate: { id: "C1", evidence_revision: "E1", design_sha256: "d".repeat(64), status: "candidate", agent_usable: false }, artifacts };
}

test("Gate A derives PASS from hash-bound Evidence, Reconstruction, Comparison, and Geometry Artifacts", async () => {
  assert.equal(typeof gate.evaluateSourceFidelity, "function");
  const input = await fixture();
  const report = await gate.evaluateSourceFidelity(input, { qualificationFixture: true });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.gate_a_runtime_qualification, "PASS");
  assert.equal(report.real_source_source_fidelity, "NOT_RUN");
  assert.equal(report.candidate_revision, "C1");
  assert.equal(report.evidence_revision, "E1");
  for (const name of Object.keys(input.artifacts)) assert.equal(report.artifact_hashes[name], input.artifacts[name].sha256);
});

test("Gate A fails closed on stale hashes and cross-artifact identity mismatches", async () => {
  const stale = await fixture();
  stale.artifacts.region_set.sha256 = "0000000000000000000000000000000000000000000000000000000000000000";
  await assert.rejects(() => gate.evaluateSourceFidelity(stale, { qualificationFixture: true }), /hash mismatch/i);
  for (const [key, override] of [
    ["region_set", { evidence_revision: "E2" }],
    ["reconstruction", { candidate_revision: "C2" }],
    ["reconstruction", { design_sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" }]
  ]) {
    const input = await fixture({ [key]: override });
    const report = await gate.evaluateSourceFidelity(input, { qualificationFixture: true });
    assert.equal(report.verdict, "FAIL");
  }
});

test("Gate A derives FAIL from missing coverage, unsupported objects, geometry mismatch, and hardened unknowns", async () => {
  const cases = [
    { region_set: { regions: [] } },
    { comparison_report: { comparisons: [{ region_id: "RG1", visual_similarity: 0.97, unsupported_objects: ["floating badge"], unknowns_hardened: false, metric_provenance: "playwright-pixelmatch" }] } },
    { comparison_report: { comparisons: [{ region_id: "RG1", visual_similarity: 0.97, unsupported_objects: [], unknowns_hardened: true, metric_provenance: "playwright-pixelmatch" }] } },
    { geometry_report: { regions: [{ region_id: "RG1", delta_px: 4, tolerance_px: 2 }] } }
  ];
  for (const overrides of cases) assert.equal((await gate.evaluateSourceFidelity(await fixture(overrides), { qualificationFixture: true })).verdict, "FAIL");
});

test("preview.html cannot be submitted as Source Fidelity evidence", async () => {
  const input = await fixture();
  input.artifacts.source_manifest.path = path.join(path.dirname(input.artifacts.source_manifest.path), "preview.html");
  await assert.rejects(() => gate.evaluateSourceFidelity(input, { qualificationFixture: true }), /preview\.html|source fidelity/i);
});
