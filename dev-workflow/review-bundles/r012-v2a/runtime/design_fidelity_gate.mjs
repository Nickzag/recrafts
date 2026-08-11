import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertSourceFidelityArtifact } from "../packages/recrafts-design/src/schema_runtime.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const REQUIRED = ["source_manifest", "region_set", "measurement_set", "source_token_set", "reconstruction", "comparison_report", "geometry_report"];
const SCHEMA_KIND = { source_manifest: "sourceManifest", region_set: "regionSet", measurement_set: "measurementSet", source_token_set: "sourceTokenSet", reconstruction: "reconstruction", comparison_report: "comparisonReport", geometry_report: "geometryReport" };
const pass = (condition) => condition ? "PASS" : "FAIL";
const covers = (required, actual) => [...required].every((id) => actual.has(id));

async function loadArtifacts(artifacts) {
  const values = {};
  const hashes = {};
  for (const name of REQUIRED) {
    const descriptor = artifacts?.[name];
    if (!descriptor?.path || !descriptor.sha256) throw new Error(`Source Fidelity Artifact is missing: ${name}`);
    if (path.basename(descriptor.path).toLowerCase() === "preview.html") throw new Error("preview.html cannot be used as Source Fidelity evidence");
    const bytes = await readFile(descriptor.path);
    const actual = sha256(bytes);
    if (actual !== descriptor.sha256) throw new Error(`Source Fidelity Artifact hash mismatch: ${name}`);
    const value = JSON.parse(bytes);
    assertSourceFidelityArtifact(SCHEMA_KIND[name], value);
    values[name] = value;
    hashes[name] = actual;
  }
  return { values, hashes };
}

export async function evaluateSourceFidelity({ candidate, artifacts }, { qualificationFixture = false } = {}) {
  const { values, hashes } = await loadArtifacts(artifacts);
  const sourceIds = new Set(values.source_manifest.sources.map(({ source_id }) => source_id));
  const regions = values.region_set.regions;
  const regionIds = new Set(regions.map(({ region_id }) => region_id));
  const measurementIds = new Set(values.measurement_set.measurements.map(({ measurement_id }) => measurement_id));
  const measuredRegions = new Set(values.measurement_set.measurements.map(({ region_id }) => region_id));
  const reconstructedRegions = new Set(values.reconstruction.surfaces.filter(({ status }) => status === "rendered").map(({ region_id }) => region_id));
  const comparisonRegions = new Set(values.comparison_report.comparisons.map(({ region_id }) => region_id));
  const geometryRegions = new Set(values.geometry_report.regions.map(({ region_id }) => region_id));
  const checks = {
    candidate_and_evidence_binding: pass(
      candidate?.id && candidate.status === "candidate" && candidate.agent_usable === false &&
      values.source_manifest.evidence_revision === candidate.evidence_revision && values.region_set.evidence_revision === candidate.evidence_revision &&
      values.measurement_set.evidence_revision === candidate.evidence_revision && values.source_token_set.evidence_revision === candidate.evidence_revision &&
      values.reconstruction.candidate_revision === candidate.id && values.comparison_report.candidate_revision === candidate.id && values.geometry_report.candidate_revision === candidate.id &&
      values.reconstruction.design_sha256 === candidate.design_sha256
    ),
    artifact_dependency_binding: pass(
      values.source_token_set.measurement_set_sha256 === hashes.measurement_set && values.reconstruction.region_set_sha256 === hashes.region_set &&
      values.comparison_report.reconstruction_sha256 === hashes.reconstruction && values.geometry_report.region_set_sha256 === hashes.region_set &&
      values.geometry_report.measurement_set_sha256 === hashes.measurement_set
    ),
    source_and_region_coverage: pass(regions.length > 0 && regions.every((region) => sourceIds.has(region.source_id) && region.coverage >= 0.95) && covers(sourceIds, new Set(regions.map(({ source_id }) => source_id)))),
    measurement_integrity: pass(covers(regionIds, measuredRegions) && values.measurement_set.measurements.every((measurement) => regionIds.has(measurement.region_id) && measurement.confidence >= 0.8)),
    source_token_support: pass(values.source_token_set.tokens.length > 0 && values.source_token_set.tokens.every((token) => token.region_refs.every((ref) => regionIds.has(ref)) && token.measurement_refs.every((ref) => measurementIds.has(ref)))),
    reconstruction_coverage: pass(covers(regionIds, reconstructedRegions)),
    comparison_coverage: pass(covers(regionIds, comparisonRegions) && values.comparison_report.comparisons.every((item) => item.visual_similarity >= 0.9)),
    unsupported_visible_objects: pass(values.comparison_report.comparisons.every((item) => item.unsupported_objects.length === 0)),
    unknown_honesty: pass(values.comparison_report.comparisons.every((item) => item.unknowns_hardened === false)),
    geometry_fidelity: pass(covers(regionIds, geometryRegions) && values.geometry_report.regions.every((item) => item.delta_px <= item.tolerance_px))
  };
  const failures = Object.entries(checks).filter(([, status]) => status !== "PASS").map(([check]) => check);
  const verdict = failures.length ? "FAIL" : "PASS";
  const report = {
    schema: "recrafts.source-fidelity-report/v2", verdict, candidate_revision: candidate?.id ?? null, evidence_revision: candidate?.evidence_revision ?? null,
    design_sha256: candidate?.design_sha256 ?? null, artifact_hashes: hashes, checks, failures,
    gate_a_runtime_qualification: qualificationFixture ? verdict : "NOT_RUN", real_source_source_fidelity: qualificationFixture ? "NOT_RUN" : verdict,
    qualification_fixture: qualificationFixture
  };
  return { ...report, report_sha256: sha256(JSON.stringify(report)) };
}

