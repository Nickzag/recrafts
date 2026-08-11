import assert from "node:assert/strict";
import test from "node:test";
import * as qualification from "../runtime/design_qualification.mjs";

const allowed = ["target-lock.json", "evidence-revision.json", "canonical-schema.json", "compiler.mjs"];

test("independent Candidate runs may share Evidence and Compiler but not peer answers", () => {
  assert.equal(typeof qualification.validateCandidateIsolation, "function");
  const report = qualification.validateCandidateIsolation([
    { candidate_id: "C1", run_id: "run-1", agent: "Sol", allowed_inputs: allowed, accessed_inputs: allowed, output_sha256: "a".repeat(64) },
    { candidate_id: "C2", run_id: "run-2", agent: "Kimi", allowed_inputs: allowed, accessed_inputs: allowed, output_sha256: "b".repeat(64) }
  ]);
  assert.equal(report.status, "PASS");
  assert.equal(report.compare_authorized, true);
});

test("peer Candidate access, undeclared input, duplicate output, or missing provenance invalidates isolation", () => {
  const cases = [
    [{ candidate_id: "C1", run_id: "run-1", agent: "A", allowed_inputs: allowed, accessed_inputs: [...allowed, "candidates/C2.json"], output_sha256: "a".repeat(64) }, { candidate_id: "C2", run_id: "run-2", agent: "B", allowed_inputs: allowed, accessed_inputs: allowed, output_sha256: "b".repeat(64) }],
    [{ candidate_id: "C1", run_id: "run-1", agent: "A", allowed_inputs: allowed, accessed_inputs: allowed, output_sha256: "a".repeat(64) }, { candidate_id: "C2", run_id: "run-2", agent: "B", allowed_inputs: allowed, accessed_inputs: allowed, output_sha256: "a".repeat(64) }],
    [{ candidate_id: "C1", run_id: "run-1", agent: "A", allowed_inputs: allowed, accessed_inputs: allowed }]
  ];
  for (const runs of cases) assert.equal(qualification.validateCandidateIsolation(runs).status, "INVALID");
});

