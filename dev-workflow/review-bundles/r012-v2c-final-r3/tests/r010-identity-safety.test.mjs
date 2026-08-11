import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanIdentitySafety } from "../runtime/identity_safety.mjs";

const root = () => mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-identity-"));

test("TRACEFIELD registered mark is blocked without an explicit legal record", async () => {
  const dir = root();
  writeFileSync(path.join(dir, "preview.html"), "<h1>TRACEFIELD®</h1>");
  const result = await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [] });
  assert.equal(result.status, "blocked");
  assert.ok(result.findings.some((finding) => finding.kind === "unapproved-legal-symbol"));
});

test("source names are allowed in Evidence but forbidden in portable previews", async () => {
  const dir = root();
  mkdirSync(path.join(dir, "evidence"));
  writeFileSync(path.join(dir, "evidence/source.json"), JSON.stringify({ source: "Spade" }));
  writeFileSync(path.join(dir, "portable-preview.html"), "<p>Spade operating canvas</p>");
  const result = await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [] });
  assert.equal(result.status, "blocked");
  assert.equal(result.findings.filter((finding) => finding.kind === "source-name").length, 1);
  assert.match(result.findings[0].file, /portable-preview/);
});

test("an authorized legal record permits only the declared working name and symbol", async () => {
  const dir = root();
  writeFileSync(path.join(dir, "preview.html"), "<h1>FIELDNOTE™</h1>");
  const result = await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [], legal_records: [{ text: "FIELDNOTE™", symbol: "™", status: "authorized" }] });
  assert.equal(result.status, "pass");
});

test("source names inside JSON provenance identifiers do not contaminate portable content", async () => {
  const dir = root();
  writeFileSync(path.join(dir, "portable.json"), JSON.stringify({
    role: "single prioritized signal",
    evidence_refs: ["ev-spade-desktop-viewport"],
    source_observation_refs: ["obs-color-spade-forest"]
  }));
  const result = await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [] });
  assert.equal(result.status, "pass");
});

test("source names remain blocked in JSON reusable values even when provenance is present", async () => {
  const dir = root();
  writeFileSync(path.join(dir, "portable.json"), JSON.stringify({ label: "Spade operating canvas", evidence_refs: ["ev-spade-desktop"] }));
  const result = await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [] });
  assert.equal(result.status, "blocked");
  assert.equal(result.findings[0].kind, "source-name");
});

test("declared source input files are treated as source-reference material", async () => {
  const dir = root();
  mkdirSync(path.join(dir, "input"));
  writeFileSync(path.join(dir, "input", "capture-config.json"), JSON.stringify({ source: "Spade" }));
  assert.equal((await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [] })).status, "pass");
});

test("technical IDs and file paths are provenance, not reusable brand copy", async () => {
  const dir = root();
  writeFileSync(path.join(dir, "portable.json"), JSON.stringify({ coverage_id: "preview-coverage-spade-v2", html_file: "runs/spade/previews/index.html", label: "Portable preview" }));
  assert.equal((await scanIdentitySafety(dir, { source_names: ["Spade"], source_slogans: [] })).status, "pass");
});
