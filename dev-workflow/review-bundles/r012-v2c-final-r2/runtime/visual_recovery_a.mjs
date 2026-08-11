import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const regionSchema = loadSchema(new URL("../contracts/product-ui-screen-region.schema.json", import.meta.url));
const measurementSchema = loadSchema(new URL("../contracts/product-ui-visual-measurement.schema.json", import.meta.url));
const hostSchema = loadSchema(new URL("../contracts/product-ui-visual-observations.schema.json", import.meta.url));
const ROLES = new Set(["platform-chrome", "window-chrome", "application-sidebar", "navigation-row", "selected-navigation-row", "top-toolbar", "content-header", "document-preview", "list-row", "selected-list-row", "canvas-or-document", "inspector", "overlay", "dialog", "sheet", "control", "icon", "feedback", "empty-state", "loading-state", "user-content", "template-content", "unknown"]);
const STATES = new Set(["default", "selected", "active", "hover", "focus", "disabled", "available-option", "marketing", "user-content", "template-content", "unknown"]);
const OBSERVED_STATUSES = new Set(["observed", "corroborated", "single-screen", "conflicted", "unknown"]);
const writeJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const id = (prefix, value) => prefix + "-" + sha(value).slice(0, 16);
const issue = (code, message, details = {}) => ({ code, message, ...details });
const isHexSha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

function pngDimensions(bytes) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertNoPortableOutput(value) {
  const forbidden = /(portable|theme[_ -]?token|craftsos|required-extension|shell[-_ ]direction|quiet[-_ ]frame|signal[-_ ]column|source-neutral)/i;
  if (forbidden.test(JSON.stringify(value))) throw Object.assign(new Error("R-011R-A Host output contains downstream design-system or adaptation content"), { code: "PACKAGE_INVALID" });
}

function requiredRegionRoles(screen) {
  if (/workspace-(grid|list)|editor|empty/i.test(screen.screen_family)) return ["application-sidebar", "content-header"];
  if (/settings/i.test(screen.screen_family)) return ["application-sidebar", "content-header", "control"];
  return ["content-header"];
}

function checkRegion(region, screens, measurements) {
  const errors = [];
  try { assertSchema(region, regionSchema, "Product UI Region"); } catch (error) { errors.push(issue("REGION_SCHEMA_INVALID", error.message, { region_id: region && region.region_id })); }
  const screen = screens.get(region && region.screen_id);
  if (!screen) errors.push(issue("REGION_SCREEN_UNKNOWN", "Region references an unknown screen", { region_id: region && region.region_id }));
  if (region && !ROLES.has(region.role)) errors.push(issue("REGION_ROLE_INVALID", "Region role is not in the controlled vocabulary", { region_id: region.region_id }));
  if (region && !STATES.has(region.state)) errors.push(issue("REGION_STATE_INVALID", "Region state is not in the controlled vocabulary", { region_id: region.region_id }));
  if (!region || !isHexSha(region.crop_sha256)) errors.push(issue("REGION_CROP_HASH_MISSING", "Region must carry a 64-character crop SHA-256", { region_id: region && region.region_id }));
  const coordinates = region && region.coordinates;
  if (screen && coordinates) {
    const width = screen.dimensions.width;
    const height = screen.dimensions.height;
    const normalized = coordinates.normalized || [];
    if (coordinates.x + coordinates.width > width || coordinates.y + coordinates.height > height) errors.push(issue("REGION_OUT_OF_BOUNDS", "Pixel coordinates exceed source screen dimensions", { region_id: region.region_id }));
    if (normalized.length !== 4 || normalized.some((value) => value < 0 || value > 1)) errors.push(issue("REGION_NORMALIZED_INVALID", "Normalized coordinates must contain four values in [0,1]", { region_id: region.region_id }));
  }
  for (const reference of (region && region.measurement_refs) || []) if (!measurements.has(reference)) errors.push(issue("REGION_MEASUREMENT_UNKNOWN", "Region references an unknown measurement", { region_id: region && region.region_id, measurement_ref: reference }));
  if (region && region.review_status === "reviewed" && region.classification_method === "unknown") errors.push(issue("REGION_REVIEW_METHOD_UNKNOWN", "Reviewed Region cannot use unknown classification method", { region_id: region.region_id }));
  return errors;
}

function checkMeasurement(measurement, regions, evidenceRefs) {
  const errors = [];
  try { assertSchema(measurement, measurementSchema, "Product UI Measurement"); } catch (error) { errors.push(issue("MEASUREMENT_SCHEMA_INVALID", error.message, { measurement_id: measurement && measurement.measurement_id })); }
  if (!regions.has(measurement && measurement.region_id)) errors.push(issue("MEASUREMENT_REGION_UNKNOWN", "Measurement references an unknown Region", { measurement_id: measurement && measurement.measurement_id }));
  if (!measurement || !measurement.method) errors.push(issue("MEASUREMENT_METHOD_MISSING", "Every measurement needs a method", { measurement_id: measurement && measurement.measurement_id }));
  if (measurement && measurement.certainty === "measured" && !["pixel-sample", "geometry", "cross-screen-comparison"].includes(measurement.method)) errors.push(issue("MEASURED_METHOD_MISMATCH", "Measured values require pixel or geometry evidence", { measurement_id: measurement.measurement_id }));
  if (measurement && measurement.certainty === "unknown" && measurement.method !== "manual-review") errors.push(issue("UNKNOWN_MEASUREMENT_METHOD", "Unknown measurement certainty must be explicitly reviewed", { measurement_id: measurement.measurement_id }));
  for (const reference of (measurement && measurement.evidence_refs) || []) if (!evidenceRefs.has(reference)) errors.push(issue("MEASUREMENT_EVIDENCE_UNKNOWN", "Measurement references unknown Evidence", { measurement_id: measurement && measurement.measurement_id, evidence_ref: reference }));
  return errors;
}

export async function prepareVisualRecovery({ sources, sourcePackId, outputDirectory }) {
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > 20) throw Object.assign(new Error("prepare-visual-recovery requires 1–20 screens"), { code: "SCHEMA_VALIDATION_FAILED" });
  const seenScreens = new Set();
  const screens = [];
  await mkdir(path.join(outputDirectory, "analysis"), { recursive: true });
  await mkdir(path.join(outputDirectory, "sources"), { recursive: true });
  for (const descriptor of sources) {
    if (!descriptor || !descriptor.path || !descriptor.screen_id || seenScreens.has(descriptor.screen_id)) throw Object.assign(new Error("Screen IDs must be non-empty and unique"), { code: "SCHEMA_VALIDATION_FAILED" });
    seenScreens.add(descriptor.screen_id);
    const bytes = await readFile(descriptor.path);
    const dimensions = pngDimensions(bytes);
    if (!dimensions) throw Object.assign(new Error("R-011R-A requires PNG screenshots: " + descriptor.screen_id), { code: "SCHEMA_VALIDATION_FAILED" });
    if (bytes.length > 25 * 1024 * 1024) throw Object.assign(new Error("Individual screenshot limit exceeded"), { code: "SCHEMA_VALIDATION_FAILED" });
    const sourceId = descriptor.source_id || descriptor.screen_id;
    const preparedPath = "sources/" + descriptor.screen_id + ".png";
    await copyFile(descriptor.path, path.join(outputDirectory, preparedPath));
    screens.push({ screen_id: descriptor.screen_id, source_id: sourceId, source_pack_id: sourcePackId, source_role: descriptor.source_role || "product-app-screenshot", authority: "tier-a", screen_family: descriptor.screen_family, platform: descriptor.platform, viewport: descriptor.viewport, dimensions, original_basename: path.basename(descriptor.path), prepared_source_path: preparedPath, source_sha256: sha(bytes), bytes: bytes.length, visible_states: descriptor.known_state_labels || ["default"], evidence_refs: ["screen-evidence-" + descriptor.screen_id] });
  }
  const preparedId = id("prepared-visual", { sourcePackId, screens: screens.map(({ screen_id, source_sha256 }) => ({ screen_id, source_sha256 })) });
  const regionPreparation = screens.map((screen) => ({ screen_id: screen.screen_id, source_path: screen.prepared_source_path, required_region_roles: requiredRegionRoles(screen), instructions: "Classify visible Regions with pixel and normalized coordinates. Mark state explicitly; do not emit portable or target design recommendations." }));
  const measurementRequest = { measurement_request_id: id("measurement-request", screens), screen_ids: screens.map((screen) => screen.screen_id), domains: ["color", "alpha/translucency", "blur/material", "border", "shadow", "radius", "spacing", "dimension", "typography", "icon", "density", "ratio", "alignment"], rules: ["Every value must cite a Region and method.", "Unknown values remain unknown.", "Available options cannot be labeled selected/default."] };
  await Promise.all([
    writeJson(path.join(outputDirectory, "screen-manifest.json"), { schema_version: "3.1.0", protocol_version: "1.2", source_pack_id: sourcePackId, prepared_visual_recovery_id: preparedId, screens, raw_sources_external: true }),
    writeJson(path.join(outputDirectory, "analysis/region-preparation.json"), { schema_version: "3.1.0", prepared_visual_recovery_id: preparedId, screens: regionPreparation }),
    writeJson(path.join(outputDirectory, "analysis/measurement-request.json"), measurementRequest),
    writeJson(path.join(outputDirectory, "analysis/recovery-input.json"), { schema_version: "3.1.0", protocol_version: "1.2", prepared_visual_recovery_id: preparedId, source_pack_id: sourcePackId, excluded_inputs: ["R-011 Product UI Mixed Evidence candidate", "quiet-frame", "signal-column", "Task 025 UI", "prior portable tokens"] }),
    writeFile(path.join(outputDirectory, "analysis/host-instructions.md"), "# R-011R-A Visual Observation Host Contract\n\n仅返回源产品的可见事实、Region、状态、测量、跨屏复现与未知项。禁止输出 portable token、theme token、CraftsOS adaptation、shell direction、组件样式建议或任何下游目标要求。每个 Region 必须有 pixel + normalized coordinates、crop_sha256、role、scope、state、measurement_refs、confidence、classification_method 与 review_status。\n"),
    writeJson(path.join(outputDirectory, "recovery-input.json"), { schema_version: "3.1.0", protocol_version: "1.2", source_pack_id: sourcePackId, prepared_visual_recovery_id: preparedId, screen_count: screens.length, semantic_analysis_completed: false })
  ]);
  return { prepared_visual_recovery_id: preparedId, source_pack_id: sourcePackId, screen_count: screens.length, artifacts: ["screen-manifest.json", "analysis/region-preparation.json", "analysis/measurement-request.json", "analysis/recovery-input.json", "analysis/host-instructions.md"] };
}

export function validateVisualObservations(value, { screenManifest, preparedVisualRecoveryId }) {
  const errors = [];
  try { assertSchema(value, hostSchema, "R-011R-A Visual Observations"); } catch (error) { errors.push(issue("HOST_OBSERVATION_SCHEMA_INVALID", error.message)); }
  try { assertNoPortableOutput(value); } catch (error) { errors.push(issue(error.code, error.message)); }
  if (value && value.prepared_visual_recovery_id !== preparedVisualRecoveryId) errors.push(issue("PREPARED_VISUAL_ID_MISMATCH", "Observations do not match the Prepared Visual Recovery bundle"));
  const screens = new Map((screenManifest.screens || []).map((screen) => [screen.screen_id, screen]));
  const observedScreens = new Map(((value && value.screens) || []).map((screen) => [screen.screen_id, screen]));
  if (observedScreens.size !== screens.size) errors.push(issue("SCREEN_COVERAGE_INCOMPLETE", "Every prepared Tier A screen must have a Host screen record"));
  for (const screen of screenManifest.screens || []) {
    const observed = observedScreens.get(screen.screen_id);
    if (!observed) continue;
    if (observed.source_sha256 !== screen.source_sha256) errors.push(issue("SCREEN_HASH_MISMATCH", "Host screen hash does not match prepared source", { screen_id: screen.screen_id }));
    for (const role of requiredRegionRoles(screen)) if (!((value && value.regions) || []).some((region) => region.screen_id === screen.screen_id && region.role === role)) errors.push(issue("TIER_A_REGION_ROLE_MISSING", "Required Tier A Region role is missing: " + role, { screen_id: screen.screen_id }));
  }
  const regions = (value && value.regions) || [];
  const regionIds = regions.map((region) => region.region_id);
  if (new Set(regionIds).size !== regionIds.length) errors.push(issue("DUPLICATE_REGION_ID", "Region IDs must be unique"));
  const measurementIds = new Set(((value && value.measurements) || []).map((measurement) => measurement.measurement_id));
  const regionMap = new Map(regions.map((region) => [region.region_id, region]));
  for (const region of regions) errors.push(...checkRegion(region, screens, measurementIds));
  const evidenceRefs = new Set([...(screenManifest.screens || []).flatMap((screen) => screen.evidence_refs), ...regionIds]);
  for (const measurement of (value && value.measurements) || []) errors.push(...checkMeasurement(measurement, regionMap, evidenceRefs));
  const selectedStates = ((value && value.state_aware_colors) || []).filter((item) => ["selected", "active", "focus"].includes(item.state));
  if (!selectedStates.length) errors.push(issue("STATE_OBSERVATION_MISSING", "Selected, active or focus state observations are required"));
  for (const color of (value && value.state_aware_colors) || []) {
    if (!STATES.has(color.state)) errors.push(issue("STATE_COLOR_INVALID", "State-aware color uses an unsupported state", { observation_id: color.observation_id }));
    if (!evidenceRefs.has(color.region_id) && !regionMap.has(color.region_id)) errors.push(issue("STATE_COLOR_REGION_UNKNOWN", "State-aware color references an unknown Region", { observation_id: color.observation_id }));
    if (color.state === "available-option" && /selected|active|default/i.test(String(color.role))) errors.push(issue("AVAILABLE_OPTION_STATE_COLLISION", "Available option cannot be labeled selected, active or default", { observation_id: color.observation_id }));
  }
  const tokens = (value && value.source_observed_visual_tokens) || [];
  if (!tokens.length) errors.push(issue("SOURCE_OBSERVED_TOKEN_EMPTY", "Source-observed visual Tokens cannot be empty"));
  const tokenScreens = new Set((screenManifest.screens || []).map((screen) => screen.screen_id));
  for (const token of tokens) {
    if (!OBSERVED_STATUSES.has(token.status)) errors.push(issue("SOURCE_TOKEN_STATUS_INVALID", "Token status is not an observed-Evidence status", { observation_token_id: token.observation_token_id }));
    if (!token.measurement_refs || !token.measurement_refs.every((reference) => measurementIds.has(reference))) errors.push(issue("SOURCE_TOKEN_MEASUREMENT_MISSING", "Every observed visual Token needs a measurement parent", { observation_token_id: token.observation_token_id }));
    if (!token.screen_refs || !token.screen_refs.every((reference) => tokenScreens.has(reference))) errors.push(issue("SOURCE_TOKEN_SCREEN_UNKNOWN", "Observed Token references an unknown screen", { observation_token_id: token.observation_token_id }));
    if (token.scope === "marketing-brand" && token.cross_screen_recurrence > 0) errors.push(issue("MARKETING_TOKEN_DOMINANCE", "Marketing Evidence cannot dominate application visual Tokens", { observation_token_id: token.observation_token_id }));
  }
  const componentInstances = (value && value.component_instances) || [];
  for (const instance of componentInstances) {
    if (!regionMap.has(instance.region_id)) errors.push(issue("COMPONENT_REGION_UNKNOWN", "Component instance uses an unknown Region", { instance_id: instance.instance_id }));
    if (/^card$/i.test(instance.component_candidate) && regionMap.get(instance.region_id) && regionMap.get(instance.region_id).role === "unknown") errors.push(issue("GENERIC_CARD_CONTAMINATION", "Whole-screen or unknown Region cannot become a generic Card instance", { instance_id: instance.instance_id }));
  }
  for (const recurrence of (value && value.cross_screen_recurrence) || []) {
    if (recurrence.recurrence_count !== recurrence.screen_refs.length) errors.push(issue("RECURRENCE_COUNT_MISMATCH", "Cross-screen recurrence count must equal screen references", { recurrence_id: recurrence.recurrence_id }));
    if (recurrence.screen_refs.length < 2 && recurrence.status !== "single-screen") errors.push(issue("RECURRENCE_STATUS_INVALID", "A one-screen observation must be marked single-screen", { recurrence_id: recurrence.recurrence_id }));
  }
  const weighting = value && value.evidence_weighting;
  if (!weighting || weighting.status !== "pass") errors.push(issue("EVIDENCE_WEIGHTING_BLOCKED", "Evidence weighting gate is not pass"));
  if (!weighting || weighting.gates.tier_a_region_coverage !== true || weighting.gates.source_observed_token_coverage !== true) errors.push(issue("EVIDENCE_WEIGHTING_GATE_MISSING", "Tier A Region and source-observed Token gates must pass"));
  return errors;
}

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

export async function submitVisualObservations({ preparedDirectory, observationsFile, outputDirectory }) {
  const screenManifest = JSON.parse(await readFile(path.join(preparedDirectory, "screen-manifest.json"), "utf8"));
  const observationsText = await readFile(observationsFile, "utf8");
  const observations = JSON.parse(observationsText);
  const errors = validateVisualObservations(observations, {
    screenManifest,
    preparedVisualRecoveryId: screenManifest.prepared_visual_recovery_id,
  });
  if (errors.length) {
    throw Object.assign(new Error("R-011R-A Visual Observations package is invalid"), { code: "PACKAGE_INVALID", details: errors });
  }
  const packageId = id("package-r011r-a", { prepared: screenManifest.prepared_visual_recovery_id, observations: sha(observationsText) });
  const artifactDirectory = path.join(outputDirectory, "validation");
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(path.join(outputDirectory, "review"), { recursive: true });
  const manifest = {
    ...screenManifest,
    package_id: packageId,
    stage: "R-011R-A",
    status: "awaiting-r011r-a-review",
    raw_sources_external: true,
    source_observation_execution: observations.execution,
    owner_decision_set_id: null,
  };
  const files = {
    "screen-manifest.json": manifest,
    "region-manifest.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, regions: observations.regions },
    "visual-measurements.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, measurements: observations.measurements },
    "state-aware-color-observations.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, observations: observations.state_aware_colors },
    "source-observed-visual-tokens.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, tokens: observations.source_observed_visual_tokens },
    "component-instances.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, instances: observations.component_instances },
    "cross-screen-recurrence.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, recurrence: observations.cross_screen_recurrence },
    "evidence-weighting-report.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, ...observations.evidence_weighting },
    "unknowns.json": { schema_version: "3.1.0", protocol_version: "1.2", package_id: packageId, unknowns: observations.unknowns },
    "r011r-a-evidence-package.json": {
      package_id: packageId,
      artifact_set_id: null,
      stage: "R-011R-A",
      protocol_version: "1.2",
      schema_version: "3.1.0",
      prepared_visual_recovery_id: screenManifest.prepared_visual_recovery_id,
      source_pack_id: screenManifest.source_pack_id,
      status: "awaiting-r011r-a-review",
      owner_decision_set_id: null,
      owner_verdict: "PENDING",
      downstream_generation_authorized: false,
      artifacts: ["screen-manifest.json", "region-manifest.json", "visual-measurements.json", "state-aware-color-observations.json", "source-observed-visual-tokens.json", "component-instances.json", "cross-screen-recurrence.json", "evidence-weighting-report.json", "unknowns.json"],
    },
    "review/owner-decision.json": {
      schema_version: "3.1.0",
      package_id: packageId,
      decision_set_id: null,
      status: "pending",
      verdict: "PENDING",
      review_scope: ["Tier A Region depth", "measurement integrity", "state distinction", "source-observed Token coverage", "evidence weighting"],
      downstream_authorization: "blocked until R-011R-A ACCEPT",
    },
  };
  for (const [relative, value] of Object.entries(files)) await writeJson(path.join(outputDirectory, relative), value);
  const validationReports = {
    "tier-a-region-coverage.json": { validator: "validate-tier-a-region-coverage", status: "pass", package_id: packageId, screen_count: observations.screens.length, region_count: observations.regions.length },
    "visual-measurement-coverage.json": { validator: "validate-visual-measurement-coverage", status: "pass", package_id: packageId, measurement_count: observations.measurements.length },
    "state-aware-color.json": { validator: "validate-state-aware-color", status: "pass", package_id: packageId, observation_count: observations.state_aware_colors.length },
    "source-observed-token-coverage.json": { validator: "validate-source-observed-token-coverage", status: "pass", package_id: packageId, token_count: observations.source_observed_visual_tokens.length },
    "evidence-weighting.json": { validator: "validate-evidence-weighting", status: "pass", package_id: packageId, gates: observations.evidence_weighting.gates },
    "r011r-a-no-oracle.json": { validator: "validate-r011r-a-no-oracle", status: "pass", package_id: packageId, raw_sources_external: true },
  };
  for (const [relative, value] of Object.entries(validationReports)) await writeJson(path.join(artifactDirectory, relative), value);
  const artifactFiles = (await collectFiles(outputDirectory)).filter((file) => file !== "artifact-set.json");
  const artifactSetId = id("artifact-set", { packageId, artifact_files: artifactFiles });
  files["r011r-a-evidence-package.json"].artifact_set_id = artifactSetId;
  await writeJson(path.join(outputDirectory, "r011r-a-evidence-package.json"), files["r011r-a-evidence-package.json"]);
  const artifactEntries = [];
  for (const relative of artifactFiles) {
    const full = path.join(outputDirectory, relative);
    const bytes = await readFile(full);
    artifactEntries.push({ type: path.extname(relative) === ".md" ? "text/markdown" : "application/json", path: relative, media_type: path.extname(relative) === ".md" ? "text/markdown" : "application/json", sha256: sha(bytes), schema_version: "3.1.0", status: "current" });
  }
  const artifactSet = { artifact_set_id: artifactSetId, package_id: packageId, parent_package_id: null, source_capture_ids: screenManifest.screens.map((screen) => screen.source_id), analysis_ids: [screenManifest.prepared_visual_recovery_id], correction_ids: [], decision_ids: [], status: "awaiting-review", artifacts: artifactEntries.concat([{ type: "application/json", path: "artifact-set.json", media_type: "application/json", sha256: null, schema_version: "3.1.0", status: "self-describing" }]), artifact_hashes: Object.fromEntries(artifactEntries.map((entry) => [entry.path, entry.sha256])), created_at: new Date().toISOString() };
  await writeJson(path.join(outputDirectory, "artifact-set.json"), artifactSet);
  return { package_id: packageId, artifact_set_id: artifactSetId, status: "awaiting-r011r-a-review", validation: validationReports, screen_count: observations.screens.length, region_count: observations.regions.length, measurement_count: observations.measurements.length, token_count: observations.source_observed_visual_tokens.length };
}
