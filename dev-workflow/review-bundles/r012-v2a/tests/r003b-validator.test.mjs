import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateRealization } from "../scripts/validate-r003-realization.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/realizations/r003b-v2");
const fixture = () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "recrafts-r003b-validator-"));
  cpSync(source, directory, { recursive: true });
  return directory;
};
const mutate = (directory, relative, transform) => {
  const file = path.join(directory, relative);
  writeFileSync(file, transform(readFileSync(file, "utf8")));
};

test("canonical realization passes fail-closed validation", async () => {
  assert.equal((await validateRealization(source, { writeReports: false })).status, "passed");
});

for (const [name, relative, transform, check] of [
  ["Oracle input", "preview/system-board.html", (text) => `${text}\n<!-- ../oracle/design-contract.json -->`, "oracle_input"],
  ["remote asset", "preview/system-board.html", (text) => `${text}\n<img src="https://example.com/a.png">`, "remote_asset"],
  ["direct CraftsOS import", "preview/runtime/preview.js", (text) => `${text}\nimport x from '/CraftsOS/apps/layoutcrafts/x.js';`, "direct_craftsos_import"],
  ["fidelity claim", "preview/system-board.html", (text) => `${text}\n<p>pixel-perfect</p>`, "fidelity_claim"],
  ["canonical literal", "preview/runtime/base.css", (text) => `${text}\n.bad { color: #123456; }`, "token_compliance"],
  ["missing state", "preview/surface-preview.html", (text) => text.replace('data-preview-state="agent-suggestion"', 'data-preview-state="missing"'), "state_coverage"],
  ["unresolved trace", "preview/system-board.html", (text) => text.replace(/data-evidence-refs="[^"]*"/, 'data-evidence-refs="ev-does-not-exist"'), "traceability"],
]) {
  test(`validator rejects ${name}`, async () => {
    const directory = fixture();
    mutate(directory, relative, transform);
    const result = await validateRealization(directory, { writeReports: false });
    assert.equal(result.status, "failed");
    assert.equal(result.checks[check], false);
  });
}

test("validator rejects missing component coverage", async () => {
  const directory = fixture();
  mutate(directory, "preview/runtime/compiled-contract.json", (text) => {
    const value = JSON.parse(text);
    value.components = value.components.slice(0, 20);
    value.preview_fallback_components = [];
    return JSON.stringify(value);
  });
  const result = await validateRealization(directory, { writeReports: false });
  assert.equal(result.checks.component_coverage, false);
});
