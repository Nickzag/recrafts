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
  const result = evaluateRealizationPreflight({ packageData, metrics: { provenance_coverage: 1, contamination_findings: 0, open_high_impact_question_count: 0, component_evidence_coverage: 1 }, ownerReview: { verdict: "PENDING" } });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("project-owner-extraction-review-pending"));
});
