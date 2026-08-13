import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
const smoke = await import("../scripts/r012-installed-consumer-smoke.mjs").catch(() => ({}));
const runtime = await import("../runtime/design_system_runtime.mjs").catch(() => ({}));

test("Candidate Artifact hash is derived from canonical Candidate content", () => {
  const candidate = { id: "C1", evidence_revision: "E1", design_ir: { schema: "fixture" } };
  const original = runtime.semanticCandidateArtifactSha256(candidate);
  assert.match(original, /^[a-f0-9]{64}$/);
  assert.notEqual(runtime.semanticCandidateArtifactSha256({ ...candidate, evidence_revision: "E2" }), original);
  assert.equal(runtime.semanticCandidateArtifactSha256({ ...candidate, artifact_sha256: original }), original);
});

test("installed smoke executes all eleven operations and records actual statuses", async () => {
  assert.equal(typeof smoke.runInstalledConsumerSmoke, "function");
  const workspace = await mkdtemp(path.join(os.tmpdir(), "r012-installed-smoke-"));
  const result = await smoke.runInstalledConsumerSmoke({ workspace, cliFile: new URL("../runtime/interop_cli.mjs", import.meta.url), packageRoot: new URL("../", import.meta.url) });
  assert.equal(result.tests.failed, 0);
  assert.equal(result.operation_results.length, 11);
  assert.ok(result.operation_results.every((record) => record.qualification === "PASS" && Number.isInteger(record.exit_code) && /^[a-f0-9]{64}$/.test(record.stdout_sha256)));
  assert.equal(result.governance_fixture_created_owner_pass, false);
  assert.equal(result.accepted_release_created, false);
});
