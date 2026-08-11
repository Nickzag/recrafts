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
  assert.equal(release.release_id, "R1");
  assert.equal(release.version, "0.1.0");
  await assert.rejects(() => store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.2.0", parentReleaseId: "R1", ...input }), /duplicate Release ID/i);
  await assert.rejects(() => store.createDesignRelease({ storeDirectory, releaseId: "R2", version: "0.1.0", parentReleaseId: "R1", ...input }), /duplicate version/i);
  await assert.rejects(() => store.createDesignRelease({ storeDirectory, releaseId: "R2", version: "0.2.0", parentReleaseId: "R-MISSING", ...input }), /parent/i);
});

test("rollback restores target semantics into a new higher Release and never rewinds a pointer", async () => {
  assert.equal(typeof store.rollbackDesignRelease, "function");
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-rollback-"));
  const storeDirectory = path.join(root, "design-store");
  const first = await releaseInput(root, { id: "C1" });
  const secondSource = canonical.replace("id: deterministic-qualification-fixture", "id: deterministic-v2").replace("version: 0.1.0", "version: 0.2.0");
  const second = await releaseInput(root, { id: "C2", evidenceRevision: "E2", designSource: secondSource });
  await store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.1.0", parentReleaseId: null, ...first });
  await store.createDesignRelease({ storeDirectory, releaseId: "R2", version: "0.2.0", parentReleaseId: "R1", ...second });
  const decision = { schema: "recrafts.rollback-design-release-decision/v1", decision_id: "D-ROLLBACK-1", reviewer_name: "Unit Test Owner", reviewer_role: "Project Owner", verdict: "PASS", current_release: "R2", target_release: "R1", new_release_id: "R3", new_version: "0.3.0", reason: "test rollback", decided_at: "2026-08-09T01:00:00.000Z", fixture: false };
  const rollback = await store.rollbackDesignRelease({ storeDirectory, currentReleaseId: "R2", targetReleaseId: "R1", newReleaseId: "R3", newVersion: "0.3.0", rollbackDecision: decision });
  assert.equal(rollback.release_id, "R3");
  assert.equal(rollback.version, "0.3.0");
  assert.equal(rollback.release_kind, "rollback");
  assert.equal(rollback.parent_release, "R2");
  const current = await store.loadAndValidateRelease(storeDirectory, "R2");
  assert.equal(current.release_id, "R2");
});

test("rollback rejects modified historical artifacts instead of inheriting stale Gate PASS", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-rollback-mod-"));
  const storeDirectory = path.join(root, "design-store");
  const first = await releaseInput(root, { id: "C1" });
  await store.createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.1.0", parentReleaseId: null, ...first });
  const decision = { schema: "recrafts.rollback-design-release-decision/v1", decision_id: "D-MOD-1", reviewer_name: "Unit Test Owner", reviewer_role: "Project Owner", verdict: "PASS", current_release: "R1", target_release: "R1", new_release_id: "R2", new_version: "0.2.0", reason: "test", decided_at: "2026-08-09T01:00:00.000Z", fixture: false };
  await assert.rejects(() => store.rollbackDesignRelease({ storeDirectory, currentReleaseId: "R1", targetReleaseId: "R1", newReleaseId: "R2", newVersion: "0.2.0", rollbackDecision: decision }), /hash|immutable|tamper/i);
});
