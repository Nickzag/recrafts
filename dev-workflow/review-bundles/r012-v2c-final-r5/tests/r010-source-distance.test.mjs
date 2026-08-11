import assert from "node:assert/strict";
import test from "node:test";
import { assessSourceDistance, DISTANCE_DIMENSIONS } from "../runtime/source_distance.mjs";

const dimensions = Object.fromEntries([
  ["identity_and_trademark", 5], ["copy_and_naming", 0], ["exact_color_dependence", 90], ["typography_dependence", 35],
  ["shape_motif_dependence", 85], ["page_topology", 90], ["component_combination", 88], ["imagery_and_proprietary_assets", 0],
  ["motion_signature", 20], ["overall_combination_risk", 90]
]);

test("source-distance assessment emits all ten required dimensions", () => {
  const result = assessSourceDistance({ dimension_scores: Object.fromEntries(DISTANCE_DIMENSIONS.map((name) => [name, 20])), source_traits: [], output_traits: [], topology: { matched_relationships: 1, total_relationships: 8 } });
  assert.equal(result.dimensions.length, 10);
  assert.equal(result.gate_status, "pass");
  assert.equal(result.topology_risk, "low");
});

test("high topology plus four signature traits blocks pilot readiness", () => {
  const traits = ["near-exact-green", "centered-full-height-hero", "viewport-rails", "cut-corner-canvas", "contour-object", "transaction-chip"];
  const result = assessSourceDistance({ dimension_scores: dimensions, source_traits: traits, output_traits: traits, topology: { matched_relationships: 8, total_relationships: 9 } });
  assert.equal(result.topology_risk, "high");
  assert.equal(result.motif_combination_risk, "high");
  assert.equal(result.gate_status, "blocked");
  assert.ok(result.blocking_reasons.some((reason) => /topology.*combination/i.test(reason)));
});

test("a transformed palette, topology and boundary preserve mechanisms without signature risk", () => {
  const result = assessSourceDistance({
    dimension_scores: { ...dimensions, exact_color_dependence: 15, shape_motif_dependence: 20, page_topology: 18, component_combination: 15, overall_combination_risk: 18 },
    source_traits: ["centered-full-height-hero", "viewport-rails", "cut-corner-canvas", "contour-object"],
    output_traits: ["asymmetric-hero", "offset-frame", "photographic-object"], topology: { matched_relationships: 1, total_relationships: 9 }
  });
  assert.equal(result.gate_status, "pass");
  assert.equal(result.motif_combination_risk, "low");
});
