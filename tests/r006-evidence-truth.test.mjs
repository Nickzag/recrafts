import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { handleEnvelope } from "../runtime/interop_contract.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = { agent: "codex-test", engine: "node", capabilities: ["vision", "files", "structured-output"] };
const request = (root, operation, input = {}, output_directory, options) => ({ protocol_version: "1.1", request_id: `${operation}-${Date.now()}`, operation, host, working_root: root, input, ...(output_directory ? { output_directory } : {}), ...(options ? { options } : {}) });
const json = (file) => JSON.parse(readFileSync(file, "utf8"));

async function prepare(root, source, output = "prepared") {
  return handleEnvelope(request(root, "prepare-analysis", { sources: [source] }, output));
}

test("Protocol 1.1 accepts typed image and Protocol 1.0 requires explicit compatibility", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-protocol-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "image.svg"));
  const current = await prepare(root, { kind: "image", path: "image.svg" });
  assert.equal(current.status, "needs_host_action", JSON.stringify(current));
  const legacy = { ...request(root, "prepare-analysis", { sources: ["image.svg"] }, "legacy"), protocol_version: "1.0" };
  assert.equal((await handleEnvelope(legacy)).error.code, "PROTOCOL_VERSION_UNSUPPORTED");
  legacy.options = { compatibility_mode: "protocol-1.0" };
  assert.equal((await handleEnvelope(legacy)).status, "needs_host_action");
});

test("typed image-set preserves distinct source Evidence", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-image-set-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "one.svg"));
  writeFileSync(path.join(root, "two.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>');
  const response = await prepare(root, { kind: "image-set", paths: ["one.svg", "two.svg"] });
  assert.equal(response.status, "needs_host_action");
  const bundle = json(path.join(root, "prepared/analysis/evidence-bundle.json"));
  assert.equal(bundle.evidence.length, 2);
  assert.equal(new Set(bundle.evidence.map((item) => item.source_id)).size, 2);
});

test("URL complete keeps DOM/CSS and screenshot Evidence distinct", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-complete-"));
  cpSync(path.join(repo, "fixtures/r006/url-complete.json"), path.join(root, "capture.json"));
  const response = await prepare(root, { kind: "url", url: "https://example.com", routes: ["/"], viewports: ["1440x900"], capture_fixture: "capture.json" });
  assert.equal(response.status, "needs_host_action", JSON.stringify(response));
  const evidence = json(path.join(root, "prepared/analysis/evidence-bundle.json")).evidence;
  assert.ok(evidence.some((item) => item.evidence_type === "dom-node"));
  assert.ok(evidence.some((item) => item.evidence_type === "css-rule"));
  assert.ok(evidence.some((item) => item.evidence_type === "screenshot"));
  assert.ok(evidence.some((item) => item.evidence_type === "screenshot-region" && item.parent_evidence_id));
  assert.equal(json(path.join(root, "prepared/capture-status.json")).status, "complete");
});

test("URL partial, blocked and stale always leave auditable lifecycle artifacts", async () => {
  for (const state of ["partial", "stale"]) {
    const root = mkdtempSync(path.join(os.tmpdir(), `recrafts-r006-${state}-`));
    cpSync(path.join(repo, `fixtures/r006/url-${state}.json`), path.join(root, "capture.json"));
    const response = await prepare(root, { kind: "url", url: "https://example.com", capture_fixture: "capture.json" });
    assert.equal(response.status, "needs_host_action");
    assert.equal(json(path.join(root, "prepared/capture-status.json")).status, state);
    assert.ok(json(path.join(root, "prepared/run-log.json")).stages.includes("capture"));
  }
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-blocked-"));
  const response = await prepare(root, { kind: "url", url: "http://127.0.0.1/private" });
  assert.equal(response.status, "completed_with_warnings", JSON.stringify(response));
  assert.equal(json(path.join(root, "prepared/capture-status.json")).status, "blocked");
  assert.ok(json(path.join(root, "prepared/blocked-reason.json")).reason);
  assert.ok(json(path.join(root, "prepared/source-manifest.json")).sources.length === 1);
});

test("Host output becomes Claims and high-impact conflict blocks the package", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-claims-"));
  cpSync(path.join(repo, "fixtures/r006/url-complete.json"), path.join(root, "capture.json"));
  const prepared = await prepare(root, { kind: "url", url: "https://example.com", capture_fixture: "capture.json" });
  const bundle = json(path.join(root, "prepared/analysis/evidence-bundle.json"));
  const dom = bundle.evidence.find((item) => item.evidence_type === "dom-node").evidence_id;
  const shot = bundle.evidence.find((item) => item.evidence_type === "screenshot-region").evidence_id;
  const analysis = {
    fixture_label: "r006-controlled-host-analysis", prepared_analysis_id: prepared.validation.prepared_analysis_id,
    execution: { host_agent: "codex-test", engine: "test-vision", vision_capability: true, performed_at: "2026-07-13T00:00:00Z" },
    source_classifications: [],
    findings: [{ id: "finding-layout", observation: "Three-column workspace", scope: "workspace", confidence: 0.86, evidence_refs: [dom, shot] }],
    tokens: [{ id: "color.surface", category: "color", value: "#fff", scope: "workspace", status: "inferred", confidence: 0.8, evidence_refs: [dom, shot] }],
    components: [{ name: "card", purpose: "Content surface", anatomy: ["container"], variants: ["default"], states: ["default"], scope: "surface", confidence: 0.8, evidence_refs: [shot] }],
    grid_rules: [{ id: "grid.workspace", rule_type: "column-layout", constraints: { columns: 3 }, scope: "workspace", status: "inferred", confidence: 0.86, evidence_refs: [dom, shot] }],
    conflicts: [{ id: "layout-disagreement", conflict_class: "dom-vs-screenshot", domain: "grid-rule", severity: "high", impact: "workspace-layout", candidate_refs: ["grid.workspace"], evidence_refs: [dom, shot] }]
  };
  writeFileSync(path.join(root, "analysis.json"), JSON.stringify(analysis));
  const submitted = await handleEnvelope(request(root, "submit-analysis", { prepared_analysis_directory: "prepared", host_analysis_file: "analysis.json" }, "package"));
  assert.equal(submitted.status, "completed_with_warnings", JSON.stringify(submitted));
  assert.equal(submitted.validation.package_status, "blocked");
  const evidence = json(path.join(root, "package/evidence-map.json")).evidence;
  assert.ok(!evidence.some((item) => item.evidence_type.includes("host")));
  const claims = json(path.join(root, "package/claims.json")).claims;
  assert.ok(claims.some((item) => item.claim_id === "claim-finding-layout"));
  for (const file of ["tokens.json", "components.json", "grid-rules.json"]) {
    for (const item of json(path.join(root, `package/${file}`))[file.replace(".json", "").replace("grid-rules", "grid_rules")]) {
      assert.ok(item.evidence_refs.length && item.claim_refs.length);
    }
  }
  assert.equal(json(path.join(root, "package/recrafts-package.json")).status, "blocked");
  assert.equal(json(path.join(root, "package/validation/realization-readiness.json")).canonical_visual_generation_authorized, false);
});

test("domain objects without Evidence and fabricated Evidence fail closed", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-negative-"));
  cpSync(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "image.svg"));
  const prepared = await prepare(root, { kind: "image", path: "image.svg" });
  const fixture = json(path.join(repo, "fixtures/interop/host-analysis.fixture.json"));
  fixture.prepared_analysis_id = prepared.validation.prepared_analysis_id;
  const evidenceId = json(path.join(root, "prepared/analysis/evidence-bundle.json")).evidence[0].evidence_id;
  for (const item of [...fixture.findings, ...fixture.tokens, ...fixture.components]) item.evidence_refs = [evidenceId];
  fixture.tokens[0].evidence_refs = [];
  writeFileSync(path.join(root, "invalid.json"), JSON.stringify(fixture));
  const invalid = await handleEnvelope(request(root, "submit-analysis", { prepared_analysis_directory: "prepared", host_analysis_file: "invalid.json" }, "invalid-package"));
  assert.equal(invalid.error.code, "SCHEMA_VALIDATION_FAILED");
});

test("URL lifecycle fixtures cannot lie about complete, partial, stale or blocked Evidence", async () => {
  const mutations = [
    { fixture_kind: "controlled-url-capture", status: "complete", dom: [], screenshots: [] },
    { fixture_kind: "controlled-url-capture", status: "partial", screenshots: [{ viewport: "1x1", sha256: "a".repeat(64) }] },
    { fixture_kind: "controlled-url-capture", status: "stale", dom: [{ selector: "main" }] },
    { fixture_kind: "controlled-url-capture", status: "blocked", blocked_reason: "captcha", dom: [{ selector: "main" }] },
    { fixture_kind: "controlled-url-capture", status: "unknown" }
  ];
  for (const [index, fixture] of mutations.entries()) {
    const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r006-url-negative-"));
    writeFileSync(path.join(root, "capture.json"), JSON.stringify(fixture));
    const response = await prepare(root, { kind: "url", url: "https://example.com", capture_fixture: "capture.json" });
    assert.equal(response.error?.code, "SCHEMA_VALIDATION_FAILED", `mutation ${index}`);
  }
});
