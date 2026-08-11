import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("R-002 repository validator accepts generated runtime evidence", () => {
  const output = execFileSync(process.execPath, [path.join(root, "scripts/validate-r002-mvp-extraction.mjs"), "--root", root], { cwd: root, encoding: "utf8" });
  assert.match(output, /R-002 validation passed/);
});

test("normalized comparator accepts repeat runs", () => {
  const fixture = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/generated");
  const output = execFileSync(process.execPath, [path.join(root, "scripts/compare-r002-normalized-output.mjs"), fixture, fixture], { cwd: root, encoding: "utf8" });
  assert.match(output, /normalized outputs match/);
});
