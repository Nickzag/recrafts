import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import { evaluateDesignCoherence } from "../runtime/design_coherence_gate.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const candidate = (source) => ({ id: "C1", evidence_revision: "E1", design_sha256: sha(source), status: "candidate", agent_usable: false });

test("Gate B derives a bound PASS from deep IR and actual Preview coverage", async () => {
  const preview = renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  const report = await evaluateDesignCoherence({ candidate: candidate(canonical), designSource: canonical, previewHtml: preview.html });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.candidate_revision, "C1");
  assert.equal(report.evidence_revision, "E1");
  assert.equal(report.design_sha256, sha(canonical));
  assert.equal(report.preview_artifact_sha256, preview.integrity.preview_artifact_sha256);
  assert.equal(report.proves_source_fidelity, false);
  assert.ok(Object.entries(report.checks).every(([check, status]) => status === "PASS" || (check === "browser_bound_visual" && status === "NOT_RUN")));
});

test("Gate B rejects incomplete visual grammar, unknown governance, accessibility, and responsive semantics", async () => {
  const mutations = [
    canonical.replace("      font: typography.body", "      font: color.text"),
    canonical.replace("  accessibility_behavior: exposes row selection", "  accessibility_behavior: unknown"),
    canonical.replace("known_unknowns: [exact font file, hover transition]", "known_unknowns: [exact font file]"),
    canonical.replace("  min_width: 640", "  min_width: 700"),
    canonical.replace("- preserve unknown values as unknown", "- make all values exact"),
    canonical.replace("forbidden_children: [marketing-banner]", "forbidden_children: [generic SaaS dashboard]").replace("sample_content: [Document title, Updated recently]", "sample_content: [generic SaaS dashboard]")
  ];
  for (const source of mutations) {
    const preview = renderDesignPreview({ designSource: source, generatedAt: "2026-08-09T00:00:00.000Z" });
    const report = await evaluateDesignCoherence({ candidate: candidate(source), designSource: source, previewHtml: preview.html });
    assert.equal(report.verdict, "FAIL");
    assert.ok(report.failures.length > 0);
  }
});

test("Gate B rejects stale Candidate and Preview bindings", async () => {
  const preview = renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  assert.equal(await evaluateDesignCoherence({ candidate: { ...candidate(canonical), design_sha256: "0".repeat(64) }, designSource: canonical, previewHtml: preview.html }).verdict, "FAIL");
  assert.equal(await evaluateDesignCoherence({ candidate: candidate(canonical), designSource: canonical, previewHtml: preview.html.replace("Document title", "Tampered") }).verdict, "FAIL");
});
