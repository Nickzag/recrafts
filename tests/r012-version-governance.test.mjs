import assert from "node:assert/strict";
import test from "node:test";
import { createCandidateRevision, createEvidenceRevision } from "../runtime/design_governance.mjs";
import { checkCompatibility } from "../packages/recrafts-design/index.mjs";

test("revision objects are immutable and every agent run creates a candidate", () => {
  const evidence = createEvidenceRevision({ id: "E1", source_manifest_sha256: "a".repeat(64), created_at: "2026-08-09T00:00:00.000Z" });
  const candidate = createCandidateRevision({ id: "C1", evidence_revision: evidence.id, design_sha256: "b".repeat(64), design_ir_sha256: "c".repeat(64), agent: { name: "host", run_id: "run-1", input_manifest_sha256: "d".repeat(64) }, created_at: "2026-08-09T00:00:00.000Z" });
  assert.equal(evidence.immutable, true);
  assert.equal(candidate.status, "candidate");
  assert.equal(candidate.agent_usable, false);
  assert.throws(() => { candidate.status = "accepted"; }, TypeError);
});

test("compatibility check requires explicit promotion for locked consumers", () => {
  assert.equal(checkCompatibility({ current: "0.1.0", next: "0.1.1", explicitPromotion: false }).compatible, false);
  assert.equal(checkCompatibility({ current: "0.1.0", next: "0.2.0", explicitPromotion: true }).compatible, true);
  assert.equal(checkCompatibility({ current: "1.0.0", next: "2.0.0", explicitPromotion: true }).compatible, false);
});
