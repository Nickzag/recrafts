import assert from "node:assert/strict";
import test from "node:test";
const qualification = await import("../runtime/design_qualification.mjs").catch(() => ({}));

test("deterministic blind harness can become READY but real agent remains PENDING", () => {
  const result = qualification.qualifyBlindHarness({
    allowed_files: ["design.md", "task.md"], accessed_files: ["design.md", "task.md"],
    provenance: { runner: "deterministic-fixture", input_isolated: true },
    result: { schema_valid: true, constraints_followed: true }
  });
  assert.equal(result.blind_harness_status, "READY");
  assert.equal(result.blind_agent_status, "PENDING");
  assert.equal(result.agent_usable, false);
});

test("blind harness fails closed on forbidden access or fabricated real-agent PASS", () => {
  assert.equal(qualification.qualifyBlindHarness({ allowed_files: ["design.md"], accessed_files: ["source.png"], provenance: { runner: "fixture", input_isolated: true }, result: { schema_valid: true, constraints_followed: true } }).blind_harness_status, "INVALID");
  assert.throws(() => qualification.qualifyBlindHarness({ allowed_files: ["design.md"], accessed_files: ["design.md"], provenance: { runner: "fixture", input_isolated: true }, result: { schema_valid: true, constraints_followed: true }, blind_agent_status: "PASS" }), /real agent|deterministic/i);
});

