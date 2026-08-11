import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { acceptArtifacts, canonicalArtifactFiles, submitCorrection } from "../runtime/package_evolution.mjs";
import { validateAcceptanceFinalization } from "../runtime/acceptance_finalization.mjs";
import { validateR007Package } from "../runtime/r007_validation.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repo, "examples/golden-candidates/spade-source-neutral-v2/packages/package-c2a9b64984ab6d02");
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const json = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

test("metadata-only correction creates a new self-describing accepted Package without changing portable contracts", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010b-flow-"));
  const base = path.join(root, "base"); const corrected = path.join(root, "corrected"); const accepted = path.join(root, "accepted");
  cpSync(source, base, { recursive: true });
  const authority = path.join(root, "identity-pass.json"); json(authority, { status: "pass", findings: [] });
  const correctionFile = path.join(root, "correction.json");
  json(correctionFile, {
    correction_id: "correction-r010b-metadata-finalization",
    base_package_id: "package-c2a9b64984ab6d02",
    actor: "ChatGPT Independent Review",
    actor_role: "authorized-reviewer",
    created_at: "2026-07-16T13:00:00+08:00",
    reason: "Finalize accepted metadata and validation authority without changing portable contracts.",
    operations: [{ operation_id: "finalize-accepted-metadata", type: "finalize-accepted-metadata", target_id: "design.md", before: { status: "accepted" }, after: { delivery_readiness: "pilot-ready" }, evidence_refs: ["ev-together-desktop-viewport", "ev-spade-desktop-viewport"], claim_refs: ["claim-shell-brand-separation"], reason: "Independent review requires a self-consistent package-only authority chain." }],
    decision_context: { review: "R-010 Final Independent Review", verdict: "ACCEPT", correction_class: "non-blocking-consistency" }
  });
  const baseHashes = Object.fromEntries((await canonicalArtifactFiles(base)).map((file) => [file, sha(path.join(base, file))]));
  const correction = await submitCorrection({ basePackageDirectory: base, correctionFile, authoritativeValidationReport: authority, outputDirectory: corrected });
  assert.equal(correction.package_status, "awaiting-finalization");
  const correctedHashes = Object.fromEntries((await canonicalArtifactFiles(corrected)).map((file) => [file, sha(path.join(corrected, file))]));
  for (const [file, hash] of Object.entries(baseHashes)) if (file !== "design.md") assert.equal(correctedHashes[file], hash, file);
  const decisionFile = path.join(root, "decision.json");
  json(decisionFile, { decision_id: "decision-r010b-independent-review-accept", candidate_package_id: correction.package_id, actor: "ChatGPT Independent Review", actor_role: "authorized-reviewer", verdict: "PASS_WITH_CHANGES", changes_completed: true, created_at: "2026-07-16T13:05:00+08:00", accepted_risks: [], resolved_conflicts: [], notes: "R-010 ACCEPT; bounded consistency correction completed." });
  const final = await acceptArtifacts({ candidatePackageDirectory: corrected, decisionFile, outputDirectory: accepted });
  assert.equal(final.package_status, "accepted");
  assert.equal(JSON.parse(readFileSync(path.join(accepted, "recrafts-package.json"), "utf8")).parent_package_id, "package-c2a9b64984ab6d02");
  const design = readFileSync(path.join(accepted, "design.md"), "utf8"); const set = JSON.parse(readFileSync(path.join(accepted, "artifact-set.json"), "utf8"));
  assert.match(design, new RegExp("Package: `" + final.package_id + "`"));
  assert.match(design, new RegExp("Artifact Set: `" + set.artifact_set_id + "`"));
  assert.match(design, /Owner Decision: `decision-r010-owner-pass-20260716`/);
  assert.equal((await validateAcceptanceFinalization(accepted)).status, "pass");
  const acceptedHashes = Object.fromEntries((await canonicalArtifactFiles(accepted)).map((file) => [file, sha(path.join(accepted, file))]));
  for (const [file, hash] of Object.entries(baseHashes)) if (file !== "design.md") assert.equal(acceptedHashes[file], hash, file);
  assert.equal((await validateR007Package(accepted)).status, "pass");
  const tampered = path.join(root, "tampered"); cpSync(accepted, tampered, { recursive: true });
  const staleDesign = readFileSync(path.join(tampered, "design.md"), "utf8").replace("Status: accepted", "Status: reviewable");
  writeFileSync(path.join(tampered, "design.md"), staleDesign);
  const staleHash = sha(path.join(tampered, "design.md")); const staleSet = JSON.parse(readFileSync(path.join(tampered, "artifact-set.json"), "utf8"));
  staleSet.artifact_hashes["design.md"] = staleHash; staleSet.artifacts.find((item) => item.path === "design.md").sha256 = staleHash; json(path.join(tampered, "artifact-set.json"), staleSet);
  const staleLineage = JSON.parse(readFileSync(path.join(tampered, "lineage.json"), "utf8")); staleLineage.artifact_set_hash = sha(path.join(tampered, "artifact-set.json")); json(path.join(tampered, "lineage.json"), staleLineage);
  await assert.rejects(() => validateR007Package(tampered), /design status|finalization/i);
});
