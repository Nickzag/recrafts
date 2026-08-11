import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadExtractionPackage } from "../realization/package_loader.mjs";
import { evaluateRealizationPreflight } from "../realization/preflight.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("R-003 package loader rejects oracle inputs", async () => {
  await assert.rejects(() => loadExtractionPackage(path.join(root, "examples/golden-candidates/crafts-ui-multi-image/oracle")), /oracle/i);
});

test("R-003 canonical generation remains blocked while owner review is pending", async () => {
  const packageData = await loadExtractionPackage(path.join(root, "examples/golden-candidates/crafts-ui-multi-image/generated"));
  const result = evaluateRealizationPreflight({ packageData, metrics: { provenance_coverage: 1, contamination_findings: 0, open_high_impact_question_count: 0, component_evidence_coverage: 1 }, criticalCoverage: { status: "passed" }, ownerReview: { verdict: "PENDING" } });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("project-owner-extraction-review-pending"));
});

test("corrected owner-reviewed visual-analysis package passes preflight", async () => {
  const directory = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/packages/package-ffa63ca8b0ea69af");
  const packageData = await loadExtractionPackage(directory);
  const metrics = (await import(path.join(directory, "validation/extraction-quality-summary.json"), { with: { type: "json" } })).default;
  const coverage = (await import(path.join(directory, "validation/critical-system-coverage.json"), { with: { type: "json" } })).default;
  const result = evaluateRealizationPreflight({ packageData, metrics, criticalCoverage: coverage, ownerReview: { verdict: "PASS" } });
  assert.equal(result.status, "ready");
  assert.equal(result.canonical_visual_generation_authorized, true);
});

test("missing auditable vision identity blocks realization", async () => {
  const packageData = await loadExtractionPackage(path.join(root, "examples/golden-candidates/crafts-ui-multi-image/generated"));
  packageData.manifest.host_agent = "unavailable";
  packageData.manifest.model = "unavailable";
  packageData.manifest.vision_capability = false;
  const result = evaluateRealizationPreflight({ packageData, metrics: { provenance_coverage: 1, contamination_findings: 0, open_high_impact_question_count: 0, component_evidence_coverage: 1 }, criticalCoverage: { status: "passed" }, ownerReview: { verdict: "PASS" } });
  assert.ok(result.blockers.includes("auditable-vision-analysis-missing"));
});
