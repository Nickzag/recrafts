import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { candidateFixture, gateReports, ownerDecisionFile, canonical } from "./r012-governance-fixtures.mjs";
const owner = await import("../runtime/design_owner_decision.mjs").catch(() => ({}));
const store = await import("../runtime/design_release_store.mjs").catch(() => ({}));

async function releaseInput(root, { id = "C1", evidenceRevision = "E1", designSource = canonical } = {}) {
  const candidate = candidateFixture({ id, evidenceRevision, designSource });
  const { gateA, gateB } = gateReports({ candidate, designSource });
  const decisionFile = await ownerDecisionFile(root, { candidate, gateA, gateB });
  const decisionReceipt = await owner.importDesignOwnerDecision({ decisionFile, candidate, gateAReport: gateA, gateBReport: gateB, outputDirectory: path.join(root, `decision-${id}`) });
  return { candidate, designSource, gateAReport: gateA, gateBReport: gateB, decisionReceipt };
}

test("Release Store persists immutable Accepted artifacts and blocks duplicate ID/version or invalid parent", async () => {
  assert.equal(typeof store.createDesignRelease, "function");
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-store-"));
  const storeDirectory = path.join(root, "design-store");
  const input = await releaseInput(root);
  const release = await store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.1.0", parentReleaseId: null, ...input });
  assert.equal(release.status, "accepted");
  assert.equal(release.agent_usable, true);
  assert.equal(release.release_id, "R1");
  assert.equal(JSON.parse(await readFile(path.join(storeDirectory, "releases/R1/release.json"), "utf8")).release_sha256, release.release_sha256);
  await assert.rejects(() => store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.2.0", parentReleaseId: "R1", ...input }), /duplicate Release ID/i);
  await assert.rejects(() => store.createDesignRelease({ storeDirectory, releaseId: "R2", version: "0.1.0", parentReleaseId: "R1", ...input }), /duplicate version/i);
  await assert.rejects(() => store.createDesignRelease({ storeDirectory, releaseId: "R2", version: "0.2.0", parentReleaseId: "R-MISSING", ...input }), /parent/i);
});

test("rollback restores target semantics into a new higher Release and never rewinds a pointer", async () => {
  assert.equal(typeof store.rollbackDesignRelease, "function");
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-rollback-"));
  const storeDirectory = path.join(root, "design-store");
  const first = await releaseInput(root, { id: "C1" });
  await store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.1.0", parentReleaseId: null, ...first });
  const secondSource = canonical.replace("version: 0.1.0", "version: 0.2.0").replace("evidence_revision: E1", "evidence_revision: E2").replace("  - C1", "  - C2").replace("  overall: 0.82", "  overall: 0.83");
  const second = await releaseInput(root, { id: "C2", evidenceRevision: "E2", designSource: secondSource });
  await store.createDesignRelease({ storeDirectory, releaseId: "R2", version: "0.2.0", parentReleaseId: "R1", ...second });
  const decision = {
    schema: "recrafts.rollback-design-release-decision/v1", decision_id: "D-ROLLBACK-1", reviewer_name: "Unit Test Owner", reviewer_role: "Project Owner", verdict: "PASS",
    current_release: "R2", target_release: "R1", new_release_id: "R3", new_version: "0.3.0", reason: "Restore the prior semantic system", decided_at: "2026-08-09T02:00:00.000Z", fixture: false
  };
  const rollback = await store.rollbackDesignRelease({ storeDirectory, currentReleaseId: "R2", targetReleaseId: "R1", newReleaseId: "R3", newVersion: "0.3.0", rollbackDecision: decision });
  assert.equal(rollback.release_id, "R3");
  assert.equal(rollback.parent_release, "R2");
  assert.equal(rollback.rollback.source_release, "R2");
  assert.equal(rollback.rollback.target_release, "R1");
  assert.equal(rollback.reused_gate_artifacts_from, "R1");
  const index = JSON.parse(await readFile(path.join(storeDirectory, "release-index.json"), "utf8"));
  assert.deepEqual(index.releases.map(({ release_id }) => release_id), ["R1", "R2", "R3"]);
  assert.equal(Object.hasOwn(index, "current_release"), false);
});

test("rollback rejects modified historical artifacts instead of inheriting stale Gate PASS", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-rollback-tamper-"));
  const storeDirectory = path.join(root, "design-store");
  const first = await releaseInput(root);
  await store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.1.0", parentReleaseId: null, ...first });
  await writeFile(path.join(storeDirectory, "releases/R1/design.md"), "tampered");
  const decision = { schema: "recrafts.rollback-design-release-decision/v1", decision_id: "D-R", reviewer_name: "Unit Test Owner", reviewer_role: "Project Owner", verdict: "PASS", current_release: "R1", target_release: "R1", new_release_id: "R2", new_version: "0.2.0", reason: "test", decided_at: "2026-08-09T02:00:00.000Z", fixture: false };
  await assert.rejects(() => store.rollbackDesignRelease({ storeDirectory, currentReleaseId: "R1", targetReleaseId: "R1", newReleaseId: "R2", newVersion: "0.2.0", rollbackDecision: decision }), /hash|immutable|tamper/i);
});
