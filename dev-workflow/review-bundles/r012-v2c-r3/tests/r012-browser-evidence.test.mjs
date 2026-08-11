import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderDesignPreview } from "../runtime/design_preview_renderer.mjs";
import { canonical } from "./r012-design-parser.test.mjs";
const capture = await import("../scripts/capture-r012-preview-evidence.mjs").catch(() => ({}));

test("real Chromium evidence binds computed specimen styles and three viewport screenshots", async () => {
  assert.equal(typeof capture.capturePreviewEvidence, "function");
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-browser-evidence-"));
  const previewFile = path.join(root, "preview.html");
  const outputDirectory = path.join(root, "browser");
  await writeFile(previewFile, renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" }).html);
  const evidence = await capture.capturePreviewEvidence({ previewFile, outputDirectory });
  assert.equal(evidence.status, "PASS");
  assert.deepEqual(Object.keys(evidence.screenshots), ["desktop", "compact", "mobile"]);
  assert.ok(Object.values(evidence.screenshots).every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
  assert.equal(evidence.computed_styles.root_tokens["--recrafts-color-surface"], "#f7f7f5");
  assert.equal(evidence.computed_styles.specimen.borderRadius, "8px");
  assert.equal(evidence.computed_styles.specimen.borderTopWidth, "1px");
  assert.equal(evidence.infrastructure_selector_audit, "PASS");
  assert.equal(evidence.infrastructure_affects_visual_region, false);
  assert.equal(JSON.parse(await readFile(path.join(outputDirectory, "computed-styles.json"), "utf8")).status, "PASS");
});

