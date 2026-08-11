import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import * as governance from "../runtime/design_governance.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");

test("Gate B proves Design coherence but explicitly cannot prove Source Fidelity", () => {
  const candidate = { id: "C1", evidence_revision: "E1", design_sha256: sha(canonical), status: "candidate", agent_usable: false };
  const preview = renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  const report = governance.await evaluateDesignCoherence({ candidate, designSource: canonical, previewHtml: preview.html });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.proves_source_fidelity, false);
});

test("legacy in-memory promotion is blocked even with hand-written PASS objects", () => {
  assert.throws(() => governance.promoteDesignRelease({ candidate: { status: "candidate" }, gates: { source_fidelity: { verdict: "PASS" }, design_coherence: { verdict: "PASS" } }, ownerDecision: { verdict: "PASS", reviewer_role: "Project Owner" } }), /persistent Design Release Store/i);
});

