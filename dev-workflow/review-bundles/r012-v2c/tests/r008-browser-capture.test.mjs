import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateBrowserCapture } from "../runtime/browser_capture.mjs";
import { handleEnvelope } from "../runtime/interop_contract.mjs";

const complete = (root) => {
  const screenshot = path.join(root, "viewport.png");
  const pixels = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(pixels);
  pixels.writeUInt32BE(1440, 16);
  pixels.writeUInt32BE(900, 20);
  writeFileSync(screenshot, pixels);
  return {
    fixture_kind: "real-browser-capture",
    status: "complete",
    url: "https://www.craft.do/",
    captured_at: "2026-07-13T12:00:00.000Z",
    browser: { name: "chromium", version: "test" },
    network: [{ url: "https://www.craft.do/", status: 200 }],
    dom: [{ selector: "main", tag: "main" }],
    css_rules: [{ selector: "main", css_text: "display:block" }],
    css_variables: [{ name: "--surface", value: "#fff" }],
    computed_styles: [{ selector: "main", display: "block" }],
    screenshots: [{ viewport: "1440x900", file: "viewport.png" }],
    screenshot_regions: [{ selector: "main", screenshot_index: 0, box: { x: 0, y: 0, width: 100, height: 100 } }],
    assets: [{ url: "https://www.craft.do/logo.svg", kind: "image" }],
    fonts: [{ family: "Inter", status: "loaded" }]
  };
};

test("a real browser capture is complete only when every mandatory Evidence class exists", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r008-capture-"));
  const record = complete(root);
  const result = await validateBrowserCapture(record, root, { expectedUrl: "https://www.craft.do" });
  assert.equal(result.status, "complete");
  assert.deepEqual(result.missing_evidence, []);

  for (const key of ["network", "dom", "css_rules", "computed_styles", "screenshots", "screenshot_regions", "assets", "fonts"]) {
    const mutation = structuredClone(record);
    mutation[key] = [];
    const invalid = await validateBrowserCapture(mutation, root, { expectedUrl: "https://www.craft.do" });
    assert.equal(invalid.status, "partial", key);
    assert.ok(invalid.missing_evidence.length, key);
  }
});

test("capture validation rejects synthetic labels, URL substitution and missing pixels", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r008-capture-negative-"));
  const record = complete(root);
  await assert.rejects(() => validateBrowserCapture({ ...record, fixture_kind: "controlled-url-capture" }, root), /real-browser-capture/);
  await assert.rejects(() => validateBrowserCapture(record, root, { expectedUrl: "https://example.com" }), /URL/);
  record.screenshots[0].file = "missing.png";
  const invalid = await validateBrowserCapture(record, root);
  assert.equal(invalid.status, "partial");
  assert.ok(invalid.missing_evidence.includes("screenshot"));
});

test("capture validation rejects a viewport declaration that disagrees with PNG pixels", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r008-capture-size-"));
  const record = complete(root);
  const pixels = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(pixels);
  pixels.writeUInt32BE(1280, 16);
  pixels.writeUInt32BE(720, 20);
  writeFileSync(path.join(root, "viewport.png"), pixels);
  const invalid = await validateBrowserCapture(record, root);
  assert.equal(invalid.status, "partial");
  assert.ok(invalid.missing_evidence.includes("screenshot"));
});

test("capture validation rejects duplicate source records before Evidence IDs are generated", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r008-capture-duplicate-"));
  const record = complete(root);
  record.assets.push(structuredClone(record.assets[0]));
  const invalid = await validateBrowserCapture(record, root);
  assert.equal(invalid.status, "partial");
  assert.ok(invalid.missing_evidence.includes("duplicate-asset"));
});

test("prepare-analysis imports a validated real capture and copies its pixels", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r008-prepare-"));
  const capture = complete(root);
  writeFileSync(path.join(root, "capture-record.json"), JSON.stringify(capture));
  const response = await handleEnvelope({
    protocol_version: "1.1", request_id: "r008-real-capture", operation: "prepare-analysis",
    host: { agent: "test", engine: "node", capabilities: ["vision", "files", "structured-output"] },
    working_root: root,
    input: { sources: [{ kind: "url", url: "https://www.craft.do", browser_capture_record: "capture-record.json" }] },
    output_directory: "prepared"
  });
  assert.equal(response.status, "needs_host_action", JSON.stringify(response));
  assert.equal(response.validation.capture_status, "complete");
  const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(root, "prepared/source-manifest.json"), "utf8"));
  assert.equal(manifest.sources[0].real_browser_capture, true);
  await (await import("node:fs/promises")).access(path.join(root, "prepared/sources/url-source-1-screenshot-1.png"));
});
