import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeImages } from "../runtime/extraction_runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureInput = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/input");
const single = path.join(fixtureInput, "sources/shared-empty-state.png");

const readJson = (directory, file) => JSON.parse(readFileSync(path.join(directory, file), "utf8"));
const semanticProjection = (directory) => ({
  tokens: readJson(directory, "tokens.json").tokens.map(({ id, type, status, scope, value, measurement_capability }) => ({ id, type, status, scope, value, measurement_capability })),
  layout: readJson(directory, "layout.json").app_shell,
  components: readJson(directory, "components.json").components.map(({ name, scope, purpose }) => ({ name, scope, purpose })),
});

test("renaming and relocating identical image bytes preserves semantic output", async () => {
  const unrelated = mkdtempSync(path.join(os.tmpdir(), "unrelated-input-"));
  const renamed = path.join(unrelated, "totally-unrelated-name.png");
  cpSync(single, renamed);
  const a = mkdtempSync(path.join(os.tmpdir(), "rename-a-"));
  const b = mkdtempSync(path.join(os.tmpdir(), "rename-b-"));
  await analyzeImages({ input: single, output: a, single: true, hostAgent: "test-host", model: "test-model", hostCapabilities: ["files","structured-output","vision"] });
  await analyzeImages({ input: renamed, output: b, single: true, hostAgent: "test-host", model: "test-model", hostCapabilities: ["files","structured-output","vision"] });
  assert.deepEqual(semanticProjection(a), semanticProjection(b));
  assert.equal(readJson(a, "source-manifest.json").sources[0].source_id, readJson(b, "source-manifest.json").sources[0].source_id);
});

test("manifest reorder and non-semantic source labels do not change candidates", async () => {
  const input = mkdtempSync(path.join(os.tmpdir(), "manifest-reorder-"));
  const sourcesDir = path.join(input, "sources");
  symlinkSync(path.join(fixtureInput, "sources"), sourcesDir, "dir");
  const manifest = JSON.parse(readFileSync(path.join(fixtureInput, "source-manifest.json"), "utf8"));
  manifest.sources.reverse();
  for (const [index, source] of manifest.sources.entries()) source.source_id = `neutral-label-${index}`;
  writeFileSync(path.join(input, "source-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const baseline = mkdtempSync(path.join(os.tmpdir(), "manifest-baseline-"));
  const reordered = mkdtempSync(path.join(os.tmpdir(), "manifest-changed-"));
  await analyzeImages({ input: fixtureInput, output: baseline, hostCapabilities: ["files","structured-output"] });
  await analyzeImages({ input, output: reordered, hostCapabilities: ["files","structured-output"] });
  assert.deepEqual(semanticProjection(baseline), semanticProjection(reordered));
});

test("sequential fixtures in one process do not leak candidates", async () => {
  const primary = mkdtempSync(path.join(os.tmpdir(), "isolation-primary-"));
  const limited = mkdtempSync(path.join(os.tmpdir(), "isolation-single-"));
  const primaryAgain = mkdtempSync(path.join(os.tmpdir(), "isolation-primary-again-"));
  await analyzeImages({ input: fixtureInput, output: primary, hostCapabilities: ["files","structured-output"] });
  await analyzeImages({ input: single, output: limited, single: true, hostCapabilities: ["files","structured-output","vision"] });
  await analyzeImages({ input: fixtureInput, output: primaryAgain, hostCapabilities: ["files","structured-output"] });
  assert.deepEqual(semanticProjection(primary), semanticProjection(primaryAgain));
  assert.notDeepEqual(semanticProjection(primary), semanticProjection(limited));
});

test("unseen changed image produces a distinct capture identity", async () => {
  const changedDir = mkdtempSync(path.join(os.tmpdir(), "synthetic-unseen-"));
  const changed = path.join(changedDir, "synthetic.png");
  const bytes = readFileSync(single); bytes[bytes.length - 1] ^= 1; writeFileSync(changed, bytes);
  const originalOutput = mkdtempSync(path.join(os.tmpdir(), "synthetic-original-"));
  const changedOutput = mkdtempSync(path.join(os.tmpdir(), "synthetic-changed-"));
  await analyzeImages({ input: single, output: originalOutput, single: true, hostCapabilities: ["files","structured-output","vision"] });
  await analyzeImages({ input: changed, output: changedOutput, single: true, hostCapabilities: ["files","structured-output","vision"] });
  assert.notEqual(readJson(originalOutput, "source-manifest.json").capture_id, readJson(changedOutput, "source-manifest.json").capture_id);
  assert.ok(readJson(changedOutput, "source-classification.json").sources.length === 1);
});
