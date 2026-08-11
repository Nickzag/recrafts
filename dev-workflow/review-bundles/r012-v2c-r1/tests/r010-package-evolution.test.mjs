import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { appendLifecycleMetadata, canonicalArtifactFiles, deriveAcceptedDeliveryReadiness } from "../runtime/package_evolution.mjs";
import * as packageEvolution from "../runtime/package_evolution.mjs";

test("R-010 optional machine contracts join the canonical Artifact Set when present", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-canonical-"));
  for (const file of ["design.md", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json", "source-observations.json", "core-grammar.json", "themes.json", "templates.json", "accessibility.json", "source-distance-report.json", "preview-coverage.json", "delivery-readiness.json"]) writeFileSync(path.join(root, file), file.endsWith(".json") ? "{}" : "# design");
  const files = await canonicalArtifactFiles(root);
  assert.ok(files.includes("source-observations.json"));
  assert.ok(files.includes("delivery-readiness.json"));
  assert.equal(new Set(files).size, files.length);
});

test("legacy Packages keep the original seven canonical files", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-legacy-"));
  for (const file of ["design.md", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json"]) writeFileSync(path.join(root, file), file.endsWith(".json") ? "{}" : "# design");
  assert.equal((await canonicalArtifactFiles(root)).length, 7);
});

test("only a project-owner acceptance can move a validated R-010 Package to pilot-ready", () => {
  const delivery = { status: "reviewable", owner_visual_review: false, identity_legal_gate: "pass", source_distance_gate: "pass", machine_contract_gate: "pass", accessibility_gate: "pass", responsive_gate: "pass", production_validation: false };
  assert.throws(() => deriveAcceptedDeliveryReadiness(delivery, { actor_role: "host-agent" }), /project-owner/i);
  const accepted = deriveAcceptedDeliveryReadiness(delivery, { actor_role: "project-owner" });
  assert.equal(accepted.status, "pilot-ready");
  assert.equal(accepted.owner_visual_review, true);
});

test("production-ready is rejected without explicit production validation", () => {
  const delivery = { status: "production-ready", owner_visual_review: true, identity_legal_gate: "pass", source_distance_gate: "pass", machine_contract_gate: "pass", accessibility_gate: "pass", responsive_gate: "pass", production_validation: false };
  assert.throws(() => deriveAcceptedDeliveryReadiness(delivery, { actor_role: "project-owner" }), /production validation/i);
});

test("R-010 lifecycle transitions retain the complete design contract", () => {
  const original = "# Portable Design Contract\n\n## Core Grammar\n\nEvidence before decoration.\n";
  const evolved = appendLifecycleMetadata(original, { title: "Correction lineage", status: "awaiting-review", packageId: "package-new", parentPackageId: "package-old" });
  assert.match(evolved, /## Core Grammar/);
  assert.match(evolved, /Evidence before decoration/);
  assert.match(evolved, /package-new/);
});

test("accepted finalization replaces review metadata with a self-consistent accepted header", () => {
  assert.equal(typeof packageEvolution.composeAcceptedDesign, "function");
  const reviewable = `# Portable Contract

Version: 0.1.0-r010-reviewable  
Status: reviewable  
Package: \`package-old\`  
Delivery target: pilot-ready after project-owner correction and acceptance

## Core Grammar

Evidence before decoration.

## Open Questions / Human Decisions

The project owner must confirm the system. Until that decision is recorded, realization is not authorized.

## Change Log

- Reviewable extraction created.

## Correction lineage

- status: awaiting-review

## Correction lineage

- status: awaiting-finalization
`;
  const accepted = packageEvolution.composeAcceptedDesign(reviewable, {
    packageId: "package-final",
    parentPackageId: "package-parent",
    deliveryReadiness: "pilot-ready",
    ownerDecisionId: "decision-owner",
    artifactSetId: "artifact-set-final"
  });
  assert.match(accepted, /Version: 0\.1\.0-r010-accepted/);
  assert.match(accepted, /Status: accepted/);
  assert.match(accepted, /Package: `package-final`/);
  assert.match(accepted, /Artifact Set: `artifact-set-final`/);
  assert.match(accepted, /Owner Decision: `decision-owner`/);
  assert.match(accepted, /Evidence before decoration/);
  assert.doesNotMatch(accepted, /project owner must confirm|realization is not authorized|pilot-ready after/i);
  assert.doesNotMatch(accepted, /## Correction lineage|## Acceptance lineage/i);
});
