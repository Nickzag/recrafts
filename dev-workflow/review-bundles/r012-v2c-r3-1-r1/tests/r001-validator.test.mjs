import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts/validate-r001-recrafts-contract-evidence-fixture.mjs");
const fixtureRelative = "examples/golden-candidates/crafts-ui-multi-image";

function cloneRepository() {
  const target = mkdtempSync(path.join(os.tmpdir(), "recrafts-r001-"));
  cpSync(root, target, {
    recursive: true,
    filter(source) {
      return !source.includes(`${path.sep}.git`) && !source.includes(`${path.sep}node_modules`);
    },
  });
  return target;
}

function runValidator(cwd, extraArgs = []) {
  return spawnSync(process.execPath, [validator, "--root", cwd, ...extraArgs], {
    cwd,
    encoding: "utf8",
  });
}

function mutateJson(cwd, relativePath, mutate) {
  const file = path.join(cwd, relativePath);
  const value = JSON.parse(readFileSync(file, "utf8"));
  mutate(value);
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

test("golden candidate passes the public validator CLI", () => {
  const output = execFileSync(process.execPath, [validator, "--root", root], { encoding: "utf8" });
  assert.match(output, /R-001 validation passed/);
});

const negativeCases = [
  ["raw screenshot tracked", (cwd) => writeFileSync(path.join(cwd, fixtureRelative, "local-raw-sources", "raw.png"), "raw")],
  ["secret-like string", (cwd) => writeFileSync(path.join(cwd, fixtureRelative, "README.md"), "sk-abcdefghijklmnopqrstuvwxyz123456")],
  ["unclassified region", (cwd) => mutateJson(cwd, `${fixtureRelative}/input/source-manifest.json`, (x) => { x.sources[0].regions[0].class = ""; })],
  ["missing evidence ref", (cwd) => mutateJson(cwd, `${fixtureRelative}/oracle/evidence-map.json`, (x) => { delete x.evidence[0].region_id; })],
  ["user-content green promoted globally", (cwd) => mutateJson(cwd, `${fixtureRelative}/oracle/design-contract.json`, (x) => { x.tokens.push({ id: "global.color.accent", value: "#00C878", scope: "global", status: "observed", source_class: "user-generated-content", evidence_refs: ["ev-document-artwork"] }); })],
  ["marketing blue promoted globally", (cwd) => mutateJson(cwd, `${fixtureRelative}/oracle/design-contract.json`, (x) => { x.tokens.push({ id: "global.color.surface", value: "#87CEEB", scope: "global", status: "observed", source_class: "marketing-surface", evidence_refs: ["ev-imagine-background"] }); })],
  ["inferred value marked confirmed", (cwd) => mutateJson(cwd, `${fixtureRelative}/oracle/evidence-map.json`, (x) => { x.evidence.find((e) => e.status === "inferred").status = "confirmed"; })],
  ["duplicate source id", (cwd) => mutateJson(cwd, `${fixtureRelative}/input/source-manifest.json`, (x) => { x.sources[1].source_id = x.sources[0].source_id; })],
  ["stale hash", (cwd) => mutateJson(cwd, `${fixtureRelative}/input/source-manifest.json`, (x) => { x.sources[0].sha256 = "0".repeat(64); })],
  ["missing source", (cwd) => mutateJson(cwd, `${fixtureRelative}/input/source-manifest.json`, (x) => { x.sources[0].file = "sources/missing.png"; })],
  ["direct Layoutcrafts import", (cwd) => writeFileSync(path.join(cwd, "runtime", "forbidden.mjs"), "import x from '/apps/layoutcrafts/src/x.js';\n")],
  ["final claim without review", (cwd) => writeFileSync(path.join(cwd, fixtureRelative, "oracle", "design-draft.md"), readFileSync(path.join(cwd, fixtureRelative, "oracle", "design-draft.md"), "utf8").replace("status: draft", "status: final"))],
];

for (const [name, mutate] of negativeCases) {
  test(`fails closed: ${name}`, () => {
    const cwd = cloneRepository();
    mutate(cwd);
    const result = runValidator(cwd, ["--skip-git-check"]);
    assert.notEqual(result.status, 0, `validator unexpectedly accepted: ${name}`);
    assert.match(`${result.stdout}${result.stderr}`, /validation failed/i);
  });
}
