import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runValidator } from "../scripts/validate-r011r-a.mjs";
import { validateVisualObservations } from "../runtime/visual_recovery_a.mjs";
import { handleEnvelope } from "../runtime/interop_contract.mjs";
import { assertSchema, loadSchema } from "../runtime/schema_validator.mjs";

const packageRoot = "examples/golden-candidates/craft-product-ui-r011r/evidence-package";
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

async function loadObservationFixture() {
  const manifest = await readJson(packageRoot + "/screen-manifest.json");
  const regionManifest = await readJson(packageRoot + "/region-manifest.json");
  const measurementManifest = await readJson(packageRoot + "/visual-measurements.json");
  const colorManifest = await readJson(packageRoot + "/state-aware-color-observations.json");
  const tokenManifest = await readJson(packageRoot + "/source-observed-visual-tokens.json");
  const componentManifest = await readJson(packageRoot + "/component-instances.json");
  const recurrenceManifest = await readJson(packageRoot + "/cross-screen-recurrence.json");
  const weighting = await readJson(packageRoot + "/evidence-weighting-report.json");
  const unknownManifest = await readJson(packageRoot + "/unknowns.json");
  return {
    schema_version: "3.1.0",
    protocol_version: "1.2",
    prepared_visual_recovery_id: manifest.prepared_visual_recovery_id,
    execution: manifest.source_observation_execution,
    screens: manifest.screens.map((screen) => ({ screen_id: screen.screen_id, source_id: screen.source_id, screen_family: screen.screen_family, source_role: screen.source_role, authority: screen.authority, platform: screen.platform, viewport: screen.viewport, dimensions: screen.dimensions, source_sha256: screen.source_sha256, visible_states: screen.visible_states, evidence_refs: screen.evidence_refs })),
    regions: regionManifest.regions,
    measurements: measurementManifest.measurements,
    state_aware_colors: colorManifest.observations,
    source_observed_visual_tokens: tokenManifest.tokens,
    component_instances: componentManifest.instances,
    cross_screen_recurrence: recurrenceManifest.recurrence,
    unknowns: unknownManifest.unknowns,
    evidence_weighting: { tiers: weighting.tiers, application_visual_token_source_counts: weighting.application_visual_token_source_counts, gates: weighting.gates, status: weighting.status },
  };
}

test("R-011R-A package passes the complete validator", async () => {
  const result = await runValidator(packageRoot);
  assert.equal(result.status, "pass");
  assert.equal(result.screen_count, 13);
  assert.equal(result.region_count, 55);
  assert.equal(result.measurement_count, 105);
});

test("R-011R-A rejects required negative mutations", async () => {
  const manifest = await readJson(packageRoot + "/screen-manifest.json");
  const baseline = await loadObservationFixture();
  const validate = (mutate) => {
    const value = clone(baseline);
    mutate(value);
    return validateVisualObservations(value, { screenManifest: manifest, preparedVisualRecoveryId: manifest.prepared_visual_recovery_id }).map((item) => item.code);
  };
  assert.ok(validate((value) => { value.regions = value.regions.filter((region) => region.role !== "application-sidebar"); }).includes("TIER_A_REGION_ROLE_MISSING"));
  assert.ok(validate((value) => { value.source_observed_visual_tokens = []; }).includes("SOURCE_OBSERVED_TOKEN_EMPTY"));
  assert.ok(validate((value) => { const token = value.source_observed_visual_tokens.find((item) => item.role === "selection"); token.scope = "marketing-brand"; token.cross_screen_recurrence = 2; }).includes("MARKETING_TOKEN_DOMINANCE"));
  assert.ok(validate((value) => { const color = value.state_aware_colors.find((item) => item.state === "available-option"); color.role = "selected-color-option"; }).includes("AVAILABLE_OPTION_STATE_COLLISION"));
  assert.ok(validate((value) => { delete value.regions[0].crop_sha256; }).includes("REGION_CROP_HASH_MISSING"));
  assert.ok(validate((value) => { delete value.measurements[0].method; }).includes("MEASUREMENT_METHOD_MISSING"));
  assert.ok(validate((value) => { value.measurements[0].certainty = "unknown"; value.measurements[0].method = "pixel-sample"; }).includes("UNKNOWN_MEASUREMENT_METHOD"));
  assert.ok(validate((value) => { value.unknowns[0].question = "quiet-frame input must be rejected"; }).includes("PACKAGE_INVALID"));
  assert.ok(validate((value) => { const region = value.regions.find((item) => item.role === "unknown") || value.regions[0]; region.role = "unknown"; value.component_instances.push({ instance_id: "bad-card", component_candidate: "Card", screen_id: region.screen_id, region_id: region.region_id, state: "default", evidence_refs: region.evidence_refs, confidence: 0.4, status: "observed" }); }).includes("GENERIC_CARD_CONTAMINATION"));
});

test("R-011R-A operation Schemas reject required-field mutations", () => {
  const valid = {
    "prepare-visual-recovery": { operation: "prepare-visual-recovery", input: { source_pack_id: "pack", sources: [{ path: "source.png", screen_id: "screen", screen_family: "workspace-grid", platform: "desktop", viewport: "native", source_role: "product-app-screenshot" }] }, output_directory: "prepared" },
    "submit-visual-observations": { operation: "submit-visual-observations", input: { prepared_visual_recovery_directory: "prepared", observations_file: "observations.json" }, output_directory: "package" },
    "generate-faithful-reconstruction": { operation: "generate-faithful-reconstruction", input: { evidence_package_directory: "package" }, output_directory: "reconstruction" },
    "verify-source-fidelity": { operation: "verify-source-fidelity", input: { candidate_file: "candidate.json", source_manifest_file: "source-manifest.json", region_set_file: "region-set.json", measurement_set_file: "measurement-set.json", source_token_set_file: "source-token-set.json", reconstruction_file: "reconstruction.json", comparison_report_file: "comparison-report.json", geometry_report_file: "geometry-report.json", source_visual_file: "source.png", reconstruction_visual_file: "reconstruction.png" }, output_directory: "fidelity" },
    "compile-portable-product-ui": { operation: "compile-portable-product-ui", input: { reconstruction_directory: "reconstruction" }, output_directory: "portable" },
    "generate-target-adaptation": { operation: "generate-target-adaptation", input: { portable_package_directory: "portable" }, output_directory: "adaptation" },
  };
  for (const [operation, request] of Object.entries(valid)) {
    const schema = loadSchema(new URL("../contracts/operations/" + operation + ".request.schema.json", import.meta.url));
    assert.doesNotThrow(() => assertSchema(request, schema), operation);
    const mutated = clone(request);
    delete mutated[schema.required[0]];
    assert.throws(() => assertSchema(mutated, schema), /Schema validation failed/, operation);
  }
});

test("R-011R-A envelope path safety fails closed", async () => {
  const root = process.cwd();
  const response = await handleEnvelope({
    protocol_version: "1.2",
    request_id: "r011r-a-path-negative",
    operation: "prepare-visual-recovery",
    host: { agent: "Codex", engine: "gpt-5", capabilities: ["files"] },
    working_root: root,
    input: { source_pack_id: "pack", sources: [{ path: "../outside.png", screen_id: "screen", screen_family: "workspace-grid", platform: "desktop", viewport: "native", source_role: "product-app-screenshot" }] },
    output_directory: ".local-benchmark-sources/craft-notes-v1/path-negative-output",
  });
  assert.equal(response.status, "failed");
  assert.equal(response.error.code, "UNSAFE_INPUT_PATH");
});
