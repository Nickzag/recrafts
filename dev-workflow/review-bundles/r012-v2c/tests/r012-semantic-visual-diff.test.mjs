import assert from "node:assert/strict";
import test from "node:test";
const compare = await import("../runtime/design_compare.mjs").catch(() => ({}));

test("semantic diff classifies patch, minor, and major changes", () => {
  assert.equal(compare.classifyDesignChange({ documentation: true }), "patch");
  assert.equal(compare.classifyDesignChange({ added_components: ["button"] }), "minor");
  assert.equal(compare.classifyDesignChange({ shell_topology_changed: true }), "major");
});

test("candidate comparison rejects score-only voting inputs", () => {
  assert.throws(() => compare.compareDesignCandidates([
    { id: "C1", evidence_score: 0.8, measurement_score: 0.9 },
    { id: "C2", evidence_score: 0.6, measurement_score: 0.7 }
  ]), /Design IR|Evidence support/i);
});
