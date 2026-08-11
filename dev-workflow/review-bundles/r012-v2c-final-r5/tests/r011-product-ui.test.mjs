import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  validateApplicationGrammar,
  validateComponentRecurrence,
  validateProductUIHostAnalysis,
  validateProductUISourceDistance,
  validateProductUISourceScope,
  validateStateMatrix
} from "../runtime/product_ui_contract.mjs";

const root = "examples/golden-candidates/craft-product-ui-r011/candidate";
const read = async (file) => JSON.parse(await readFile(`${root}/${file}`, "utf8"));
const evidence = await read("analysis/evidence-bundle.json");
const refs = new Set(evidence.evidence.map((item) => item.evidence_id));

test("R-011 candidate package has a complete mixed-evidence contract", async () => {
  const manifest = await read("recrafts-package.json");
  const coverage = await read("preview-coverage.json");
  assert.equal(manifest.input_profile, "product-ui-mixed-evidence");
  assert.equal(manifest.status, "awaiting-owner-review");
  assert.equal(manifest.decision_status, "pending");
  assert.equal(coverage.status, "pass");
  assert.equal(coverage.previews.length, 28);
});

test("scope gate rejects marketing or user regions promoted to application Core", async () => {
  const scope = await read("source-scope-map.json");
  const bad = structuredClone(scope);
  const source = bad.sources.find((item) => item.source_id === "source-11");
  source.regions.find((item) => item.classification === "marketing-surface").canonical_promotion_blocked = false;
  assert.ok(validateProductUISourceScope(bad, refs).some((error) => error.code === "SCOPE_PROMOTION_BLOCKED"));
});

test("token gate rejects content or marketing token promotion", async () => {
  const host = await read("analysis/host-analysis.json");
  const bad = structuredClone(host);
  bad.tokens.push({ token_id: "marketing-brand-color", domain: "color", role: "brand", scope: "marketing-brand", status: "portable", value: "#123456", evidence_refs: [bad.sources.find((item) => item.source_id === "source-14").evidence_refs[0]], claim_refs: ["claim-marketing"], corroboration: "marketing", transformation_record: "copied", usage_limits: ["none"] });
  assert.ok(validateProductUIHostAnalysis(bad, { evidenceRefs: refs, preparedAnalysisId: bad.prepared_analysis_id }).some((error) => error.code === "CONTENT_TOKEN_PROMOTION_BLOCKED"));
});

test("component recurrence gate rejects a missing Core recurrence", async () => {
  const components = await read("components.json");
  const badRecurrence = components.recurrence.filter((item) => item.component_id !== "app-rail");
  assert.ok(validateComponentRecurrence(components.contracts, badRecurrence, refs).some((error) => error.code === "RECURRENCE_MISSING"));
});

test("state gate rejects inferred Core state", async () => {
  const matrix = await read("state-matrix.json");
  const bad = structuredClone(matrix);
  bad.states[0].status = "inferred";
  bad.states[0].promotion = "core";
  assert.ok(validateStateMatrix(bad, refs).some((error) => error.code === "INFERRED_STATE_CORE_BLOCKED"));
});

test("grammar gate rejects a single-screen global rule", async () => {
  const grammar = await read("application-grammar.json");
  const bad = structuredClone(grammar);
  bad.rules[0].core = true;
  bad.rules[0].cross_screen_recurrence_count = 1;
  assert.ok(validateApplicationGrammar(bad, refs).some((error) => error.code === "GRAMMAR_SINGLE_SCREEN_CORE"));
});

test("source-distance gate rejects copied source assets", async () => {
  const report = await read("source-distance-report.json");
  const bad = structuredClone(report);
  bad.dimensions.find((item) => item.dimension_id === "icon-similarity").portable_decision = "copied source icon asset";
  assert.ok(validateProductUISourceDistance(bad).some((error) => error.code === "SOURCE_ASSET_COPY_BLOCKED"));
});

test("host schema rejects unknown top-level fields", async () => {
  const host = await read("analysis/host-analysis.json");
  const bad = { ...host, unknown_top_level: true };
  assert.ok(validateProductUIHostAnalysis(bad, { evidenceRefs: refs, preparedAnalysisId: host.prepared_analysis_id }).some((error) => error.code === "HOST_SCHEMA_INVALID"));
});
