import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "runtime/recraft-cli.mjs");
const fixture = path.join(root, "examples/golden-candidates/crafts-ui-multi-image");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
}

test("multi-image runtime consumes input only and emits extraction artifacts", () => {
  const output = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-multi-"));
  const result = run(["analyze-images", "--input", path.join(fixture, "input"), "--output", output]);
  assert.equal(result.status, 0, result.stderr);
  for (const name of ["source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md"]) {
    assert.ok(readFileSync(path.join(output, name)).length > 0, name);
  }
  assert.doesNotMatch(readFileSync(path.join(output, "run-log.json"), "utf8"), /oracle|expected-/i);
});

test("single-image runtime declares limited coverage", () => {
  const output = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-single-"));
  const source = path.join(fixture, "input/sources/shared-empty-state.png");
  const result = run(["analyze-image", "--input", source, "--output", output, "--host-capabilities", "files,structured-output,vision"]);
  assert.equal(result.status, 0, result.stderr);
  const design = readFileSync(path.join(output, "design.md"), "utf8");
  assert.match(design, /source_coverage: limited/);
  assert.match(design, /system_confidence: partial/);
});

test("runtime fails closed on oracle and expected paths", () => {
  for (const input of [path.join(fixture, "oracle"), path.join(fixture, "oracle/expected-source-classification.json")]) {
    const result = run(["analyze-images", "--input", input, "--output", mkdtempSync(path.join(os.tmpdir(), "recraft-r002-reject-"))]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /oracle|expected/i);
  }
});

test("duplicate image hashes fail closed", () => {
  const input = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-duplicate-"));
  const source = path.join(fixture, "input/sources/shared-empty-state.png");
  cpSync(source, path.join(input, "a.png"));
  cpSync(source, path.join(input, "b.png"));
  const result = run(["analyze-images", "--input", input, "--output", `${input}-output`]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate/i);
});

test("unsupported and secret-like inputs fail closed", () => {
  const input = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-invalid-"));
  writeFileSync(path.join(input, "source.txt"), "sk-abcdefghijklmnopqrstuvwxyz123456");
  const result = run(["analyze-images", "--input", input, "--output", `${input}-output`]);
  assert.notEqual(result.status, 0);
});

test("same input is structurally repeatable and changed input changes output", () => {
  const source = path.join(fixture, "input/sources/shared-empty-state.png");
  const outA = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-a-"));
  const outB = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-b-"));
  assert.equal(run(["analyze-image", "--input", source, "--output", outA, "--host-capabilities", "files,structured-output,vision"]).status, 0);
  assert.equal(run(["analyze-image", "--input", source, "--output", outB, "--host-capabilities", "files,structured-output,vision"]).status, 0);
  assert.equal(readFileSync(path.join(outA, "design.md"), "utf8"), readFileSync(path.join(outB, "design.md"), "utf8"));

  const changed = mkdtempSync(path.join(os.tmpdir(), "recraft-r002-changed-"));
  const changedSource = path.join(changed, "changed.png");
  cpSync(source, changedSource);
  const bytes = readFileSync(changedSource);
  bytes[bytes.length - 1] ^= 1;
  writeFileSync(changedSource, bytes);
  const outC = `${changed}-output`;
  assert.equal(run(["analyze-image", "--input", changedSource, "--output", outC, "--host-capabilities", "files,structured-output,vision"]).status, 0);
  assert.notEqual(readFileSync(path.join(outA, "source-manifest.json"), "utf8"), readFileSync(path.join(outC, "source-manifest.json"), "utf8"));
});

test("website adapter rejects unsafe scope before network access", () => {
  const cases = [
    ["--url", "file:///etc/passwd"],
    ["--url", "http://127.0.0.1"],
    ["--url", "https://example.com", "--routes", "/a,/b,/c,/d"],
    ["--url", "https://example.com", "--action", "submit-form"],
  ];
  for (const args of cases) {
    const result = run(["analyze-website", ...args, "--output", mkdtempSync(path.join(os.tmpdir(), "recraft-r002-web-"))]);
    assert.notEqual(result.status, 0, args.join(" "));
  }
});
