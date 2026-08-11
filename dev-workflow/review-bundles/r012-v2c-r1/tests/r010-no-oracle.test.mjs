import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildNoOracleReport } from "../runtime/analysis_input_audit.mjs";

test("fresh Evidence and generic instructions form a passing allowlisted Host bundle", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-no-oracle-"));
  mkdirSync(path.join(root, "captures"));
  writeFileSync(path.join(root, "captures/capture-record.json"), "fresh evidence");
  writeFileSync(path.join(root, "host-instructions.md"), "generic source-neutral analysis instructions");
  const report = await buildNoOracleReport({ root, input_files: ["captures/capture-record.json", "host-instructions.md"], prior_artifact_roots: [] });
  assert.equal(report.status, "pass");
  assert.equal(report.inputs.length, 2);
  assert.ok(report.inputs.every((item) => /^[a-f0-9]{64}$/.test(item.sha256)));
});

test("old design.md and preview pixels are rejected by path and prior hashes", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-oracle-input-"));
  const old = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-oracle-old-"));
  writeFileSync(path.join(root, "design.md"), "old answer");
  writeFileSync(path.join(root, "copied.png"), "old pixels");
  writeFileSync(path.join(old, "preview.png"), "old pixels");
  const report = await buildNoOracleReport({ root, input_files: ["design.md", "copied.png"], prior_artifact_roots: [old] });
  assert.equal(report.status, "fail");
  assert.ok(report.findings.some((item) => item.kind === "forbidden-answer-artifact"));
  assert.ok(report.findings.some((item) => item.kind === "prior-artifact-hash-match"));
});
