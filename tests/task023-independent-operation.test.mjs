import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("Task 023 CLI produces and validates an independent artifact set", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "recrafts-023-"));
  await mkdir(path.join(root, "source"));
  await writeFile(path.join(root, "source", "tokens.css"), ":root{--ink:#111}");
  const manifest = { schema_version: "1.0.0", contract_id: "fixture", contract_version: "1.0.0", title: "Fixture", intent: "Independent operation", evidence_scope: "fixture", sources: [{ evidence_id: "css", source_type: "css", local_ref: "source/tokens.css", capture_timestamp: "2026-07-15T00:00:00.000Z", extraction_method: "source-parse", reliability_class: "direct-source" }], candidates: [{ candidate_id: "ink", domain: "color", rule: { ink: "#111111" }, evidence_refs: ["css"], confidence: { state: "high", reason: "Direct CSS source." }, corrections: [{ correction_id: "accept-ink", action: "accept", author: "fixture-owner", timestamp: "2026-07-15T00:01:00.000Z" }] }] };
  await writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest));
  const run = spawnSync(process.execPath, ["scripts/run-task023-artifact-set.mjs", "--manifest", path.join(root, "manifest.json"), "--output", path.join(root, "output")], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const validate = spawnSync(process.execPath, ["scripts/validate-task023-independent-operation.mjs", "--output", path.join(root, "output")], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(validate.status, 0, validate.stderr);
  assert.equal(JSON.parse(await readFile(path.join(root, "output", "validation-report.json"), "utf8")).status, "valid");
});

test("Task 023 CLI rejects changed source bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "recrafts-023-hash-"));
  await writeFile(path.join(root, "source.css"), "changed");
  await writeFile(path.join(root, "manifest.json"), JSON.stringify({ schema_version: "1.0.0", sources: [{ evidence_id: "css", source_type: "css", local_ref: "source.css", content_hash: "0".repeat(64), capture_timestamp: "2026-07-15T00:00:00.000Z", extraction_method: "source-parse", reliability_class: "direct-source" }], candidates: [] }));
  const run = spawnSync(process.execPath, ["scripts/run-task023-artifact-set.mjs", "--manifest", path.join(root, "manifest.json"), "--output", path.join(root, "output")], { cwd: process.cwd(), encoding: "utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /hash mismatch/);
});
