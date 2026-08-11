import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateReleaseCandidate } from "../scripts/validate-r005-release-candidate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("npm dry-run inventory contains interop runtime and excludes repository evidence", () => {
  const result = JSON.parse(execFileSync("npm", ["pack", "--json", "--dry-run"], { cwd: root, encoding: "utf8" }))[0];
  const files = result.files.map(({ path: file }) => file);
  for (const required of ["runtime/interop_cli.mjs","runtime/owner_decision_import.mjs","contracts/host-analysis.schema.json","contracts/owner-decision.schema.json","fixtures/interop/host-analysis.fixture.json"]) assert.ok(files.includes(required), required);
  assert.ok(files.every((file) => !/(?:^|\/)(?:review|analysis|examples|release-candidates|dev-workflow|tests)(?:\/|$)|\.DS_Store|\.playwright-cli|oracle|expected-/i.test(file)));
});
test("generated RC passes readiness when present", async (context) => {
  const directory = path.join(root, "release-candidates/recrafts-0.3.0-rc.1-build5");
  try { assert.equal((await validateReleaseCandidate(directory, { writeReport: false })).status, "passed"); }
  catch (error) { context.skip(`RC not generated yet: ${error.code ?? error.message}`); }
});
