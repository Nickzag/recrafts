import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveSafeInput, resolveSafeOutput, resolveWorkingRoot } from "../runtime/path_security.mjs";

test("canonical path safety rejects traversal, symlink escape and collision", async () => {
  const rootPath = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-path-"));
  writeFileSync(path.join(rootPath, "input.svg"), "<svg/>");
  mkdirSync(path.join(rootPath, "full")); writeFileSync(path.join(rootPath, "full/x"), "x");
  symlinkSync("/tmp", path.join(rootPath, "escape"));
  const root = await resolveWorkingRoot(rootPath);
  assert.equal(await resolveSafeInput({ value: "input.svg", workingRoot: root, allowedTypes: ["file"] }), realpathSync(path.join(rootPath, "input.svg")));
  await assert.rejects(() => resolveSafeInput({ value: "../outside", workingRoot: root }), /traversal/i);
  await assert.rejects(() => resolveSafeInput({ value: "escape", workingRoot: root }), /unsafe/i);
  await assert.rejects(() => resolveSafeOutput({ value: "full", workingRoot: root }), /not empty/i);
  await assert.rejects(() => resolveSafeOutput({ value: "input.svg/out", workingRoot: root, inputs: [path.join(rootPath, "input.svg")] }));
});
