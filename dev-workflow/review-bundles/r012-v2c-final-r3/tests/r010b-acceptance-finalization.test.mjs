import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010b-finalization-"));
  mkdirSync(path.join(root, "validation"));
  const report = `${JSON.stringify({ status: "pass", findings: [] }, null, 2)}\n`;
  writeFileSync(path.join(root, "validation/identity-safety-report.current.json"), report);
  writeFileSync(path.join(root, "validation/identity-safety-report.json"), `${JSON.stringify({ status: "blocked" })}\n`);
  json(path.join(root, "recrafts-package.json"), { package_id: "package-final", parent_package_id: "package-parent", artifact_set_id: "artifact-set-final", status: "accepted" });
  json(path.join(root, "artifact-set.json"), { artifact_set_id: "artifact-set-final", package_id: "package-final", status: "accepted", decision_ids: ["decision-owner", "decision-finalizer"] });
  json(path.join(root, "lineage.json"), { event_type: "accepted", package_id: "package-final", parent_package_id: "package-parent", decision_ids: ["decision-owner", "decision-finalizer"] });
  json(path.join(root, "delivery-readiness.json"), { status: "pilot-ready", owner_visual_review: true });
  writeFileSync(path.join(root, "decisions.jsonl"), `${JSON.stringify({ decision_id: "decision-owner", candidate_package_id: "package-prior", actor: "Nick", actor_role: "project-owner", verdict: "PASS", created_at: "2026-07-16T00:00:00Z", accepted_risks: [], resolved_conflicts: [], notes: "Owner PASS" })}\n`);
  writeFileSync(path.join(root, "design.md"), `# Portable Contract

Version: 0.1.0-r010-accepted  
Status: accepted  
Package: \`package-final\`  
Delivery readiness: pilot-ready  
Parent Package: \`package-parent\`  
Owner Decision: \`decision-owner\`  
Artifact Set: \`artifact-set-final\`

## Core Grammar

Evidence before decoration.
`);
  json(path.join(root, "validation/index.json"), {
    schema_version: "1.0.0",
    validation_run_id: "validation-r010b-final",
    reports: [{ validation_id: "identity-safety", authoritative_report_path: "validation/identity-safety-report.current.json", report_status: "pass", report_sha256: sha(report), superseded_report_paths: ["validation/identity-safety-report.json"], superseded_reason: "Older scanner treated provenance IDs as reusable content." }]
  });
  return root;
}

test("package-only consumer can validate accepted metadata and authoritative PASS report", async () => {
  const module = await import("../runtime/acceptance_finalization.mjs").catch(() => ({}));
  assert.equal(typeof module.validateAcceptanceFinalization, "function");
  const result = await module.validateAcceptanceFinalization(fixture());
  assert.equal(result.status, "pass");
  assert.equal(result.metadata_consistency.status, "pass");
  assert.equal(result.validation_authority.status, "pass");
});

test("stale review metadata and invalid authority hash fail closed", async () => {
  const module = await import("../runtime/acceptance_finalization.mjs").catch(() => ({}));
  assert.equal(typeof module.validateAcceptanceFinalization, "function");
  const root = fixture();
  writeFileSync(path.join(root, "design.md"), "# Portable Contract\n\nStatus: reviewable\n\nThe project owner must confirm before realization is authorized.\n");
  const index = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(root, "validation/index.json"), "utf8"));
  index.reports[0].report_sha256 = "0".repeat(64); json(path.join(root, "validation/index.json"), index);
  const result = await module.validateAcceptanceFinalization(root);
  assert.equal(result.status, "blocked");
  assert.ok(result.errors.some((error) => /review-stage authorization|design status|report hash/i.test(error)));
});

test("accepted finalization fails closed when Artifact Set state diverges from delivery readiness", async () => {
  const module = await import("../runtime/acceptance_finalization.mjs");
  const root = fixture();
  const set = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(root, "artifact-set.json"), "utf8"));
  set.status = "awaiting-review";
  json(path.join(root, "artifact-set.json"), set);
  const result = await module.validateAcceptanceFinalization(root);
  assert.equal(result.status, "blocked");
  assert.ok(result.errors.some((error) => /Artifact Set state/i.test(error)));
});
