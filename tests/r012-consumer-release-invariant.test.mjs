import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as design from "../packages/recrafts-design/index.mjs";
import { createDesignRelease } from "../runtime/design_release_store.mjs";
import { importDesignOwnerDecision } from "../runtime/design_owner_decision.mjs";
import { candidateFixture, gateReports, ownerDecisionFile, canonical } from "./r012-governance-fixtures.mjs";

async function acceptedRelease() {
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-consumer-"));
  const candidate = candidateFixture();
  const { gateA, gateB } = await gateReports({ candidate });
  const decisionFile = await ownerDecisionFile(root, { candidate, gateA, gateB });
  const decisionReceipt = await importDesignOwnerDecision({ decisionFile, candidate, gateAReport: gateA, gateBReport: gateB, outputDirectory: path.join(root, "decision") });
  const storeDirectory = path.join(root, "store");
  await createDesignRelease({ storeDirectory, releaseId: "R1", version: "0.1.0", parentReleaseId: null, candidate, designSource: canonical, gateAReport: gateA, gateBReport: gateB, decisionReceipt });
  return { root, releaseDirectory: path.join(storeDirectory, "releases/R1") };
}

test("Consumer accepts only an exact locked, hash-verified Design Release directory", async () => {
  assert.equal(typeof design.loadDesignRelease, "function");
  const { releaseDirectory } = await acceptedRelease();
  const loaded = await design.loadDesignRelease({ releaseDirectory, expectedReleaseId: "R1", expectedVersion: "0.1.0" });
  assert.equal(loaded.release.status, "accepted");
  assert.equal(loaded.release.agent_usable, true);
  await assert.rejects(() => design.loadDesignRelease({ releaseDirectory, expectedReleaseId: "R-WRONG", expectedVersion: "0.1.0" }), /lock|release/i);
});

test("hand-written accepted Front Matter is never a governed Consumer input", () => {
  const forged = canonical.replace("status: candidate", "status: accepted").replace("release_id: null", "release_id: R-FAKE").replace("decision_revision: null", "decision_revision: D-FAKE").replace("agent_usable: false", "agent_usable: true");
  assert.throws(() => design.loadDesignSystem(forged), /Release loader|governed|accepted/i);
});

test("Consumer rejects tampered Release metadata or public artifacts", async () => {
  for (const file of ["release.json", "design.md", "preview.html"]) {
    const { releaseDirectory } = await acceptedRelease();
    const target = path.join(releaseDirectory, file);
    await writeFile(target, `${await readFile(target, "utf8")}\ntampered`);
    await assert.rejects(() => design.loadDesignRelease({ releaseDirectory, expectedReleaseId: "R1", expectedVersion: "0.1.0" }), /hash|integrity|tamper|Schema/i);
  }
});
