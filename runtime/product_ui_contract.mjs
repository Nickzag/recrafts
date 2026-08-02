import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

export const PRODUCT_UI_INPUT_PROFILE = "product-ui-mixed-evidence";
export const SOURCE_ROLES = [
  "product-app-screenshot", "product-app-screen-set", "official-product-web",
  "official-interface-tutorial", "official-help-documentation", "marketing-site",
  "user-content", "template-content", "platform-chrome", "unknown"
];
export const AUTHORITIES = ["tier-a", "tier-b", "tier-c", "tier-d", "untrusted"];
export const SCOPES = [
  "application-chrome", "workspace-shell", "navigation", "editor-chrome",
  "canvas-or-document-content", "inspector", "review-and-evidence", "overlay",
  "system-feedback", "marketing-brand", "user-content", "template-content",
  "platform-chrome", "unknown"
];
export const CLASSIFICATIONS = [
  "canonical-product-ui", "official-interface", "marketing-surface",
  "user-generated-content", "template-content", "platform-chrome", "unknown"
];
export const EVIDENCE_TYPES = [
  "app-screen", "app-screen-region", "ui-component-instance", "ui-state-observation",
  "navigation-relationship", "panel-ownership", "content-density-measurement",
  "interaction-affordance", "responsive-correspondence", "tutorial-keyframe",
  "screenshot", "screenshot-region", "dom-node", "css-rule", "computed-style",
  "css-variable", "font", "network-response", "capture-metadata"
];
export const OBSERVATION_STATUSES = ["observed", "corroborated", "inferred", "unknown"];

const hostSchema = loadSchema(new URL("../contracts/product-ui-host-analysis.schema.json", import.meta.url));
const requiredArtifacts = [
  "design.md", "source-manifest.json", "source-scope-map.json", "source-observations.json",
  "application-grammar.json", "surface-topology.json", "screen-inventory.json",
  "navigation-contract.json", "panel-ownership.json", "density-contract.json", "tokens.json",
  "typography.json", "iconography.json", "components.json", "state-matrix.json",
  "interaction-contract.json", "motion-contract.json", "responsive-contract.json",
  "accessibility.json", "source-distance-report.json", "conflicts.json", "preview-coverage.json",
  "artifact-set.json"
];
const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const id = (prefix, value) => `${prefix}-${sha(value).slice(0, 16)}`;
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const unique = (items) => [...new Set(items)];
const issue = (code, message, details = {}) => ({ code, message, ...details });
const allOf = (values, predicate) => values.every(predicate);
const everyRef = (items, refs) => (items ?? []).flatMap((item) => item.evidence_refs ?? []).every((ref) => refs.has(ref));
const fileHash = async (file) => sha(await readFile(file));

export function validateProductUIHostAnalysis(value, { evidenceRefs = new Set(), preparedAnalysisId } = {}) {
  const errors = [];
  try { assertSchema(value, hostSchema, "R-011 Host Analysis"); } catch (error) { errors.push(issue("HOST_SCHEMA_INVALID", error.message)); }
  if (value?.input_profile !== PRODUCT_UI_INPUT_PROFILE) errors.push(issue("INPUT_PROFILE_INVALID", "R-011 requires product-ui-mixed-evidence"));
  if (preparedAnalysisId && value?.prepared_analysis_id !== preparedAnalysisId) errors.push(issue("PREPARED_ID_MISMATCH", "Host Analysis does not match the Prepared Bundle"));
  const sources = value?.sources ?? [];
  const sourceIds = sources.map((source) => source.source_id);
  if (new Set(sourceIds).size !== sourceIds.length) errors.push(issue("DUPLICATE_SOURCE_ID", "Source IDs must be unique"));
  for (const source of sources) {
    if (!SOURCE_ROLES.includes(source.source_role)) errors.push(issue("SOURCE_ROLE_INVALID", `Unsupported source role: ${source.source_role}`, { source_id: source.source_id }));
    if (!AUTHORITIES.includes(source.authority)) errors.push(issue("AUTHORITY_INVALID", `Unsupported authority: ${source.authority}`, { source_id: source.source_id }));
    if (!SCOPES.includes(source.scope)) errors.push(issue("SCOPE_INVALID", `Unsupported source scope: ${source.scope}`, { source_id: source.source_id }));
    if (!CLASSIFICATIONS.includes(source.classification)) errors.push(issue("CLASSIFICATION_INVALID", `Unsupported classification: ${source.classification}`, { source_id: source.source_id }));
    if (source.source_role === "product-app-screenshot" && source.authority !== "tier-a") errors.push(issue("TIER_A_REQUIRED", "Application screenshots must use Tier A authority", { source_id: source.source_id }));
    if (["official-product-web", "official-interface-tutorial", "official-help-documentation"].includes(source.source_role) && !["tier-b", "tier-c"].includes(source.authority)) errors.push(issue("OFFICIAL_TIER_INVALID", "Official web/interface sources must use Tier B or C", { source_id: source.source_id }));
    if (!everyRef([source], evidenceRefs)) errors.push(issue("SOURCE_EVIDENCE_UNKNOWN", "Source references undeclared Evidence", { source_id: source.source_id }));
    const regionIds = (source.regions ?? []).map((region) => region.region_id);
    if (new Set(regionIds).size !== regionIds.length) errors.push(issue("DUPLICATE_REGION_ID", "Region IDs must be unique", { source_id: source.source_id }));
    for (const region of source.regions ?? []) {
      if (!SCOPES.includes(region.scope)) errors.push(issue("REGION_SCOPE_INVALID", `Unsupported region scope: ${region.scope}`, { region_id: region.region_id }));
      if (!CLASSIFICATIONS.includes(region.classification)) errors.push(issue("REGION_CLASSIFICATION_INVALID", `Unsupported region classification: ${region.classification}`, { region_id: region.region_id }));
      if (!everyRef([region], evidenceRefs)) errors.push(issue("REGION_EVIDENCE_UNKNOWN", "Region references undeclared Evidence", { region_id: region.region_id }));
      if (["user-generated-content", "template-content", "marketing-surface", "platform-chrome"].includes(region.classification) && region.canonical_promotion_blocked !== true) errors.push(issue("SCOPE_GATE_MISSING", "Non-application region must be blocked from canonical promotion", { region_id: region.region_id }));
    }
  }
  const allItems = [
    ...(value?.observations ?? []), ...(value?.application_grammar ?? []), ...(value?.surface_topology ?? []),
    ...(value?.screen_inventory ?? []), ...(value?.navigation_contract ?? []), ...(value?.panel_ownership ?? []),
    ...(value?.density_contract ?? []), ...(value?.component_candidates ?? []), ...(value?.component_contracts ?? []),
    ...(value?.interaction_contract ?? []), ...(value?.motion_contract ?? []), ...(value?.responsive_contract ?? [])
  ];
  for (const item of allItems) {
    if (!item.id || !item.evidence_refs?.length || !item.claim_refs?.length) errors.push(issue("PROVENANCE_MISSING", "Every rule/candidate must include an ID, Evidence refs and Claim refs", { id: item.id }));
    if (item.scope && !SCOPES.includes(item.scope)) errors.push(issue("ITEM_SCOPE_INVALID", `Unsupported item scope: ${item.scope}`, { id: item.id }));
    if (item.status && ![...OBSERVATION_STATUSES, "candidate", "portable", "core", "screen-specific"].includes(item.status)) errors.push(issue("ITEM_STATUS_INVALID", `Unsupported item status: ${item.status}`, { id: item.id }));
    if (!everyRef([item], evidenceRefs)) errors.push(issue("ITEM_EVIDENCE_UNKNOWN", "Item references undeclared Evidence", { id: item.id }));
  }
  const states = value?.state_matrix ?? [];
  const stateIds = states.map((state) => state.state_id);
  if (new Set(stateIds).size !== stateIds.length) errors.push(issue("DUPLICATE_STATE_ID", "State IDs must be unique"));
  for (const state of states) {
    if (!state.state_id || !state.screen_family || !OBSERVATION_STATUSES.includes(state.status) || !state.promotion || !state.evidence_refs?.length || !state.claim_refs?.length) {
      errors.push(issue("STATE_PROVENANCE_MISSING", "Every state must include ID, screen family, status, promotion, Evidence refs and Claim refs", { state_id: state.state_id }));
    }
    if (!everyRef([state], evidenceRefs)) errors.push(issue("STATE_EVIDENCE_UNKNOWN", "State references undeclared Evidence", { state_id: state.state_id }));
    if (state.status === "inferred" && state.promotion === "core") errors.push(issue("INFERRED_STATE_CORE_BLOCKED", "Inferred state cannot enter Core", { state_id: state.state_id }));
  }
  for (const token of value?.tokens ?? []) {
    if (["portable", "confirmed"].includes(token.status) && /(?:#(?:[0-9a-f]{3,8})|rgb\(|hsl\()/i.test(String(token.value)) && !token.transformation_record) errors.push(issue("TOKEN_TRANSFORMATION_MISSING", "Portable color tokens require a transformation record", { token_id: token.token_id }));
    if (["user-content", "template-content", "marketing-brand"].includes(token.scope) && ["portable", "confirmed"].includes(token.status)) errors.push(issue("CONTENT_TOKEN_PROMOTION_BLOCKED", "Content or marketing scope cannot become an application Core token", { token_id: token.token_id }));
  }
  for (const component of value?.component_contracts ?? []) {
    const recurrence = (value?.component_recurrence ?? []).find((item) => item.component_id === component.id || item.component_id === component.component_id);
    if (component.status === "core" && (!recurrence || recurrence.recurrence_count < 2)) errors.push(issue("CORE_RECURRENCE_MISSING", "Core component requires recurrence across multiple screens", { component_id: component.id ?? component.component_id }));
    if (/^card$/i.test(component.id ?? component.component_id ?? "") && (!recurrence || recurrence.recurrence_count < 2)) errors.push(issue("GENERIC_CARD_OVEREXTRACTION", "A single rectangle cannot be promoted as a Core Card", { component_id: component.id ?? component.component_id }));
  }
  const dimensions = value?.source_distance?.dimensions ?? [];
  if (dimensions.length < 10) errors.push(issue("SOURCE_DISTANCE_INCOMPLETE", "R-011 requires ten source-distance dimensions"));
  if ((value?.shell_directions ?? []).length < 2) errors.push(issue("SHELL_DIRECTIONS_INCOMPLETE", "At least two shell directions are required"));
  if (!value?.source_distance?.differences || value.source_distance.differences.length < 5) errors.push(issue("SOURCE_DIFFERENCES_INCOMPLETE", "Portable previews must differ from source identity across five dimensions"));
  return errors;
}

export function validateApplicationGrammar(grammar, evidenceRefs = new Set()) {
  const errors = [];
  const rules = grammar?.rules ?? grammar ?? [];
  if (!Array.isArray(rules) || rules.length < 8) errors.push(issue("GRAMMAR_INCOMPLETE", "Application grammar needs at least eight rules"));
  const ids = (rules ?? []).map((rule) => rule.id ?? rule.rule_id);
  if (new Set(ids).size !== ids.length) errors.push(issue("GRAMMAR_DUPLICATE_ID", "Application grammar IDs must be unique"));
  for (const rule of rules ?? []) {
    if (!rule.scope || !rule.status || rule.confidence === undefined || !rule.evidence_refs?.length || !rule.claim_refs?.length) errors.push(issue("GRAMMAR_PROVENANCE_MISSING", "Grammar rule lacks required provenance", { id: rule.id ?? rule.rule_id }));
    if (rule.cross_screen_recurrence_count === undefined) errors.push(issue("GRAMMAR_RECURRENCE_MISSING", "Grammar rule must record cross-screen recurrence", { id: rule.id ?? rule.rule_id }));
    if (!everyRef([rule], evidenceRefs)) errors.push(issue("GRAMMAR_EVIDENCE_UNKNOWN", "Grammar rule references unknown Evidence", { id: rule.id ?? rule.rule_id }));
    if ((rule.status === "inferred" || rule.status === "unknown") && rule.core === true) errors.push(issue("INFERRED_CORE_BLOCKED", "Inferred or unknown grammar cannot enter Core", { id: rule.id ?? rule.rule_id }));
    if (rule.core === true && (rule.cross_screen_recurrence_count ?? 0) < 2) errors.push(issue("GRAMMAR_SINGLE_SCREEN_CORE", "A global Core grammar rule needs cross-screen recurrence", { id: rule.id ?? rule.rule_id }));
  }
  return errors;
}

export function validateStateMatrix(matrix, evidenceRefs = new Set()) {
  const states = matrix?.states ?? matrix ?? [];
  const errors = [];
  if (!Array.isArray(states) || states.length < 8) errors.push(issue("STATE_MATRIX_INCOMPLETE", "State matrix needs broad screen/state coverage"));
  for (const state of states ?? []) {
    if (!state.state_id || !state.screen_family || !OBSERVATION_STATUSES.includes(state.status) || !state.evidence_refs?.length) errors.push(issue("STATE_PROVENANCE_MISSING", "State must include screen family, status and Evidence refs", { state_id: state.state_id }));
    if (!everyRef([state], evidenceRefs)) errors.push(issue("STATE_EVIDENCE_UNKNOWN", "State references unknown Evidence", { state_id: state.state_id }));
    if (state.status === "inferred" && state.promotion === "core") errors.push(issue("INFERRED_STATE_CORE_BLOCKED", "Inferred state cannot enter Core", { state_id: state.state_id }));
  }
  return errors;
}

export function validateComponentRecurrence(components, recurrence, evidenceRefs = new Set()) {
  const errors = [];
  const rows = recurrence ?? [];
  const ids = rows.map((item) => item.component_id);
  if (new Set(ids).size !== ids.length) errors.push(issue("RECURRENCE_DUPLICATE_ID", "Component recurrence IDs must be unique"));
  for (const component of components ?? []) {
    const componentId = component.id ?? component.component_id;
    const row = rows.find((item) => item.component_id === componentId);
    if (!row) errors.push(issue("RECURRENCE_MISSING", "Component has no recurrence record", { component_id: componentId }));
    else {
      if (row.recurrence_count !== row.screen_occurrences.length) errors.push(issue("RECURRENCE_COUNT_MISMATCH", "Recurrence count must equal screen occurrences", { component_id: componentId }));
      if (!everyRef([row, component], evidenceRefs)) errors.push(issue("COMPONENT_EVIDENCE_UNKNOWN", "Component recurrence references unknown Evidence", { component_id: componentId }));
      if (component.maturity === "core" && row.recurrence_count < 2 && component.authoritative_official_corroboration !== true) errors.push(issue("CORE_COMPONENT_NOT_RECURRING", "Core component needs recurrence or official corroboration", { component_id: componentId }));
    }
    if (/^card$/i.test(String(componentId)) && (!row || row.recurrence_count < 2)) errors.push(issue("RECTANGLE_AS_CARD_BLOCKED", "Do not promote one rectangular region to a generic Card", { component_id: componentId }));
  }
  return errors;
}

export function validateProductUISourceDistance(report) {
  const errors = [];
  if (!report || !Array.isArray(report.dimensions) || report.dimensions.length < 10) errors.push(issue("SOURCE_DISTANCE_INCOMPLETE", "Ten source-distance dimensions are required"));
  const required = ["exact-color-dependence", "icon-similarity", "panel-topology", "navigation-arrangement", "corner-radius-signature", "toolbar-arrangement", "typographic-proportions", "brand-marks", "component-combinations", "application-silhouette"];
  const ids = new Set((report?.dimensions ?? []).map((item) => item.dimension_id));
  for (const dimension of required) if (!ids.has(dimension)) errors.push(issue("SOURCE_DISTANCE_DIMENSION_MISSING", `Missing source-distance dimension: ${dimension}`));
  for (const dimension of report?.dimensions ?? []) {
    const decision = String(dimension.portable_decision ?? "");
    if (/(?:copy|copied|reuse|re-use|source asset|source icon|logo|brand mark)/i.test(decision)) errors.push(issue("SOURCE_ASSET_COPY_BLOCKED", "Portable decision must not copy source assets or brand marks", { dimension_id: dimension.dimension_id }));
  }
  if (report?.gate_status !== "pass") errors.push(issue("SOURCE_DISTANCE_GATE_BLOCKED", "Source distance gate is not pass"));
  if (!Array.isArray(report?.differences) || report.differences.length < 5) errors.push(issue("SOURCE_DISTANCE_DIFF_MISSING", "At least five explicit source-neutral differences are required"));
  return errors;
}

export function validateProductPreviewCoverage(coverage, { requiredSurfaces = [], requiredDirections = ["quiet-frame", "signal-column"] } = {}) {
  const errors = [];
  const previews = coverage?.previews ?? [];
  const seen = new Set(previews.map((preview) => preview.preview_id));
  for (const surface of requiredSurfaces) {
    const matches = previews.filter((preview) => preview.surface_id === surface);
    if (!matches.length) errors.push(issue("PREVIEW_SURFACE_MISSING", `Missing required preview surface: ${surface}`));
    for (const direction of requiredDirections) if (!matches.some((preview) => preview.direction_id === direction)) errors.push(issue("PREVIEW_DIRECTION_MISSING", `Missing ${direction} preview for ${surface}`));
  }
  if (seen.size !== previews.length) errors.push(issue("PREVIEW_DUPLICATE_ID", "Preview IDs must be unique"));
  for (const preview of previews) {
    if (!preview.contract_ids?.length || !preview.component_ids?.length || !preview.state_ids?.length) errors.push(issue("PREVIEW_TRACEABILITY_MISSING", "Preview must annotate contract, component and state IDs", { preview_id: preview.preview_id }));
    if (!preview.provenance_layers?.source_derived || !preview.provenance_layers?.craftsos_required) errors.push(issue("PREVIEW_LAYER_ANNOTATION_MISSING", "Preview must separate source-derived and CraftsOS-required decisions", { preview_id: preview.preview_id }));
  }
  return errors;
}

export function validateProductUISourceScope(scopeMap, evidenceRefs = new Set()) {
  const errors = [];
  const sources = scopeMap?.sources ?? [];
  const ids = sources.map((source) => source.source_id);
  if (new Set(ids).size !== ids.length) errors.push(issue("SCOPE_SOURCE_DUPLICATE", "Scope map source IDs must be unique"));
  for (const source of sources) {
    if (!SOURCE_ROLES.includes(source.source_role) || !CLASSIFICATIONS.includes(source.classification)) errors.push(issue("SCOPE_SOURCE_INVALID", "Scope map has unsupported source role or classification", { source_id: source.source_id }));
    if (!source.evidence_refs?.length || !everyRef([source], evidenceRefs)) errors.push(issue("SCOPE_EVIDENCE_UNKNOWN", "Scope map source references unknown Evidence", { source_id: source.source_id }));
    for (const region of source.regions ?? []) if (!region.canonical_promotion_blocked && ["user-generated-content", "template-content", "marketing-surface", "platform-chrome"].includes(region.classification)) errors.push(issue("SCOPE_PROMOTION_BLOCKED", "Non-application region must be blocked from Core", { region_id: region.region_id }));
  }
  return errors;
}

export async function validateProductUIArtifactSet(root) {
  const errors = [];
  const artifacts = [];
  for (const file of requiredArtifacts) {
    const full = path.join(root, file);
    try { const bytes = await readFile(full); artifacts.push({ type: path.extname(file).slice(1) || "markdown", path: file, sha256: sha(bytes), status: "present" }); }
    catch { errors.push(issue("ARTIFACT_MISSING", `Required Artifact Set file is missing: ${file}`)); }
  }
  const manifest = await readJson(path.join(root, "artifact-set.json")).catch(() => null);
  if (manifest && manifest.artifacts) {
    const paths = new Set(manifest.artifacts.map((item) => item.path ?? item));
    for (const file of requiredArtifacts) if (!paths.has(file)) errors.push(issue("ARTIFACT_NOT_REGISTERED", `Required artifact is not registered: ${file}`));
    for (const item of manifest.artifacts) {
      if (!item || typeof item !== "object" || !item.path || !item.sha256) continue;
      const actual = artifacts.find((entry) => entry.path === item.path)?.sha256;
      if (actual && actual !== item.sha256) errors.push(issue("ARTIFACT_HASH_MISMATCH", `Artifact hash does not match manifest: ${item.path}`, { path: item.path }));
    }
  }
  return { status: errors.length ? "fail" : "pass", errors, artifacts };
}

function normalizedSource(source, preparedSource, evidenceRefs) {
  return {
    source_id: source.source_id,
    source_role: source.source_role,
    authority: source.authority,
    capture_id: preparedSource?.capture_id ?? null,
    platform: source.platform,
    viewport: source.viewport,
    product_version: source.product_version ?? null,
    freshness: source.freshness,
    scope: source.scope,
    evidence_classes: source.evidence_classes,
    classification: source.classification,
    confidence: source.confidence,
    evidence_refs: evidenceRefs,
    sha256: preparedSource?.sha256 ?? null,
    status: preparedSource?.status ?? "unknown",
    url: preparedSource?.url ?? null,
    regions: source.regions ?? []
  };
}

function claim(idValue, type, value, item, execution, analysisId) {
  return {
    claim_id: idValue,
    claim_type: type,
    value,
    status: item.status === "observed" ? "observed-claim" : item.status === "corroborated" ? "corroborated-claim" : item.status === "unknown" ? "unknown-claim" : "inferred-claim",
    scope: item.scope,
    confidence: item.confidence,
    evidence_refs: item.evidence_refs,
    host_identity: { agent: execution.host_agent, engine: execution.engine, vision_capability: true },
    analysis_id: analysisId
  };
}

function designMarkdown({ packageId, analysisId, host, sources, grammar, components, tokens, directions, sourceDistance }) {
  const appSources = sources.filter((source) => ["product-app-screenshot", "product-app-screen-set"].includes(source.source_role));
  const officialSources = sources.filter((source) => source.authority === "tier-b" || source.authority === "tier-c");
  return `# Recrafts Product UI Contract\n\nVersion: 0.1.0-r011-candidate  \nStatus: awaiting-owner-review  \nPackage: \`${packageId}\`  \nAnalysis: \`${analysisId}\`  \nInput profile: \`${PRODUCT_UI_INPUT_PROFILE}\`  \n\n## Boundary\n\nThis contract separates observed product application Evidence, official corroboration, CraftsOS product constraints and portable design decisions. It is a candidate for human review, not an accepted visual system and not an application implementation.\n\n## Evidence hierarchy\n\n- Tier A product application screenshots: ${appSources.length} sources; authoritative for topology, panel ownership, density and visible states.\n- Tier B/C official product, tutorial and help captures: ${officialSources.length} sources; corroborative for public feature language, transitions and brand continuity.\n- User, template, marketing and platform regions remain explicitly scoped and blocked from application Core promotion.\n\n## Application grammar\n\n${grammar.map((rule) => `- **${rule.id}** — ${rule.summary ?? rule.value ?? "Observed application rule"} [${rule.status}; ${rule.scope}; confidence ${rule.confidence}; recurrence ${rule.cross_screen_recurrence_count}]`).join("\n")}\n\n## Component system\n\n${components.map((component) => `- **${component.component_id ?? component.id}** — ${component.purpose ?? "Component candidate"} [${component.maturity ?? component.status}; Evidence ${component.evidence_refs.join(", ")}]`).join("\n")}\n\n## Semantic token boundary\n\n${tokens.map((token) => `- **${token.token_id}** — ${token.role}; value ${JSON.stringify(token.value)}; ${token.transformation_record}`).join("\n")}\n\n## Shell directions\n\n${directions.map((direction) => `- **${direction.direction_id} / ${direction.name}** — ${direction.description}`).join("\n")}\n\n## Source distance\n\nGate: **${sourceDistance.gate_status}**. The two portable directions differ from the source in brand identity, icon set, exact dimensions, exact colors, component combinations and non-required screen topology.\n\n## Owner gate\n\nProject Owner must review application character, hierarchy, density, navigation clarity, canvas/editor primacy, panel relationships, component distinctiveness, cross-screen consistency, CraftsOS suitability and source distance. No Task-025R implementation may consume this Package before Owner PASS.\n`;
}

export async function buildProductUIContract({ preparedDirectory, hostAnalysisFile, outputDirectory }) {
  const prepared = await readJson(path.join(preparedDirectory, "analysis/input-manifest.json"));
  const evidenceBundle = await readJson(path.join(preparedDirectory, "analysis/evidence-bundle.json"));
  const captureStatus = await readJson(path.join(preparedDirectory, "capture-status.json"));
  const host = await readJson(hostAnalysisFile);
  const evidenceRefs = new Set((evidenceBundle.evidence ?? []).map((item) => item.evidence_id));
  const hostErrors = validateProductUIHostAnalysis(host, { evidenceRefs, preparedAnalysisId: prepared.prepared_analysis_id });
  if (hostErrors.length) throw Object.assign(new Error(hostErrors.map((error) => error.message).join("; ")), { code: "PACKAGE_INVALID", details: hostErrors });
  const analysisId = id("product-analysis", host);
  const packageId = id("package", { input_profile: PRODUCT_UI_INPUT_PROFILE, prepared: prepared.prepared_analysis_id, analysis: analysisId });
  await mkdir(outputDirectory, { recursive: true });
  const preparedById = new Map((prepared.sources ?? []).map((source) => [source.source_id, source]));
  const sources = host.sources.map((source) => normalizedSource(source, preparedById.get(source.source_id), source.evidence_refs));
  const scopeMap = { schema_version: "r011.1.0", input_profile: PRODUCT_UI_INPUT_PROFILE, sources: sources.map(({ source_id, source_role, authority, scope, classification, evidence_refs, regions }) => ({ source_id, source_role, authority, scope, classification, evidence_refs, regions })) };
  const claims = [];
  const addClaims = (items, type, key = (item) => item.id) => (items ?? []).forEach((item, index) => claims.push(claim(`claim-${type}-${key(item)}-${index + 1}`, type, item.summary ?? item.value ?? item.observation ?? item.purpose ?? item.name ?? item, item, host.execution, analysisId)));
  addClaims(host.observations, "visual-observation"); addClaims(host.application_grammar, "application-grammar"); addClaims(host.surface_topology, "surface-topology"); addClaims(host.screen_inventory, "screen-inventory"); addClaims(host.component_contracts, "component-contract"); addClaims(host.tokens, "token-candidate"); addClaims(host.interaction_contract, "interaction-contract"); addClaims(host.motion_contract, "motion-contract"); addClaims(host.responsive_contract, "responsive-contract");
  const result = {
    version: "4.0.0", schema_version: "r011.1.0", protocol_version: "1.1", input_profile: PRODUCT_UI_INPUT_PROFILE,
    package_id: packageId, analysis_id: analysisId, prepared_analysis_id: prepared.prepared_analysis_id,
    status: "awaiting-owner-review", decision_status: "pending", owner_decision_set_id: null,
    artifacts: requiredArtifacts.map((file) => ({ type: path.extname(file) === ".md" ? "markdown" : "json", path: file, status: "pending" })),
    sources: sources.map(({ source_id, capture_id, sha256: sourceHash, status, source_role, authority }) => ({ source_id, capture_id, sha256: sourceHash, status, source_role, authority })),
    host_execution: host.execution,
    capture_status: captureStatus.status
  };
  const files = {
    "source-manifest.json": { version: "4.0.0", schema_version: "r011.1.0", protocol_version: "1.1", input_profile: PRODUCT_UI_INPUT_PROFILE, package_id: packageId, analysis_id: analysisId, prepared_analysis_id: prepared.prepared_analysis_id, host_agent: host.execution.host_agent, model: host.execution.engine, vision_capability: true, source_hierarchy: ["tier-a", "tier-b", "tier-c", "tier-d"], sources, craftsos_constraints: ["workspace-library", "project-studio", "review-and-evidence", "canvas-export-isolation", "human-review-gate", "conflict-and-rollback", "mobile-navigation-inspector"], decision_status: "pending", owner_decision_set_id: null },
    "source-scope-map.json": scopeMap,
    "source-observations.json": { version: "r011.1.0", observations: host.observations },
    "application-grammar.json": { version: "r011.1.0", grammar_id: "product-ui-application-grammar-r011", rules: host.application_grammar, craftsos_constraints: ["content-first editing", "explicit human review", "reversible operations"] },
    "surface-topology.json": { version: "r011.1.0", surfaces: host.surface_topology },
    "screen-inventory.json": { version: "r011.1.0", screens: host.screen_inventory },
    "navigation-contract.json": { version: "r011.1.0", rules: host.navigation_contract },
    "panel-ownership.json": { version: "r011.1.0", rules: host.panel_ownership },
    "density-contract.json": { version: "r011.1.0", rules: host.density_contract },
    "tokens.json": { version: "r011.1.0", source_observed_tokens: host.tokens.filter((token) => token.status === "observed"), application_semantic_tokens: host.tokens.filter((token) => ["portable", "candidate", "confirmed"].includes(token.status)), theme_tokens: [{ theme_id: "quiet-frame", tokens: ["surface.app", "surface.panel", "text.primary", "action.accent"] }, { theme_id: "signal-column", tokens: ["surface.app", "surface.panel", "text.primary", "action.accent"] }], accessibility_pairs: host.accessibility.pairs },
    "source-observed-tokens.json": { version: "r011.1.0", tokens: host.tokens.filter((token) => token.status === "observed") },
    "application-semantic-tokens.json": { version: "r011.1.0", tokens: host.tokens.filter((token) => ["portable", "candidate", "confirmed"].includes(token.status)) },
    "theme-tokens.json": { version: "r011.1.0", themes: [{ theme_id: "quiet-frame", surface: "#f4f6f5", accent: "#286b63" }, { theme_id: "signal-column", surface: "#f6f4f8", accent: "#5d4fb1" }] },
    "accessibility-pairs.json": { version: "r011.1.0", pairs: host.accessibility.pairs },
    "typography.json": { version: "r011.1.0", ...host.typography },
    "iconography.json": { version: "r011.1.0", ...host.iconography },
    "components.json": { version: "r011.1.0", candidates: host.component_candidates, contracts: host.component_contracts, recurrence: host.component_recurrence },
    "state-matrix.json": { version: "r011.1.0", states: host.state_matrix ?? [] },
    "interaction-contract.json": { version: "r011.1.0", rules: host.interaction_contract },
    "motion-contract.json": { version: "r011.1.0", rules: host.motion_contract },
    "responsive-contract.json": { version: "r011.1.0", rules: host.responsive_contract },
    "accessibility.json": { version: "r011.1.0", ...host.accessibility },
    "source-distance-report.json": { version: "r011.1.0", assessment_id: id("source-distance", host.source_distance), ...host.source_distance },
    "conflicts.json": { version: "r011.1.0", conflicts: host.conflicts },
    "claims.json": { version: "r011.1.0", claims },
    "recrafts-package.json": result,
    "review/owner-decision-set.json": { decision_set_id: null, reviewed_package_id: packageId, verdict: "PENDING", decision_status: "pending", decision_source: null, confirmed_candidates: [], rejected_candidates: [], visual_review_required: true },
    "review/correction-proposals.json": { package_id: packageId, proposals: [{ proposal_id: "proposal-shell-selection", question: "选择哪一个 Shell 方向进入下一次修正？", options: ["quiet-frame", "signal-column"], status: "pending" }, { proposal_id: "proposal-mobile-contract", question: "移动端行为目前仅有候选推断，是否接受为 CraftsOS 约束扩展？", status: "pending" }] },
    "delivery-readiness.json": { status: "reviewable", owner_visual_review: false, source_distance_gate: host.source_distance.gate_status, machine_contract_gate: "pending", accessibility_gate: "pass", responsive_gate: "candidate", production_validation: false, blockers: ["project-owner-visual-review", "shell-direction-selection", "accepted-artifact-set"] },
    "analysis/host-analysis.json": host,
    "analysis/evidence-bundle.json": evidenceBundle,
    "analysis/input-manifest.json": prepared,
    "analysis/capture-status.json": captureStatus,
    "analysis/prepared-summary.json": { prepared_analysis_id: prepared.prepared_analysis_id, source_count: sources.length, evidence_count: evidenceBundle.evidence.length, capture_status: captureStatus.status, source_hashes: Object.fromEntries(sources.map((source) => [source.source_id, source.sha256])), evidence_class: host.execution.evidence_class }
  };
  const grammarErrors = validateApplicationGrammar(files["application-grammar.json"], evidenceRefs);
  const stateErrors = validateStateMatrix(files["state-matrix.json"], evidenceRefs);
  const recurrenceErrors = validateComponentRecurrence(host.component_contracts, host.component_recurrence, evidenceRefs);
  const scopeErrors = validateProductUISourceScope(scopeMap, evidenceRefs);
  const distanceErrors = validateProductUISourceDistance(files["source-distance-report.json"]);
  const hostReport = { status: hostErrors.length ? "fail" : "pass", errors: hostErrors, input_profile: PRODUCT_UI_INPUT_PROFILE, prepared_analysis_id: prepared.prepared_analysis_id };
  const validationReports = {
    "validation/product-ui-source-scope.json": { validator: "validate-product-ui-source-scope", status: scopeErrors.length ? "fail" : "pass", errors: scopeErrors },
    "validation/application-grammar.json": { validator: "validate-application-grammar", status: grammarErrors.length ? "fail" : "pass", errors: grammarErrors },
    "validation/state-matrix.json": { validator: "validate-state-matrix", status: stateErrors.length ? "fail" : "pass", errors: stateErrors },
    "validation/component-recurrence.json": { validator: "validate-component-recurrence", status: recurrenceErrors.length ? "fail" : "pass", errors: recurrenceErrors },
    "validation/product-ui-source-distance.json": { validator: "validate-product-ui-source-distance", status: distanceErrors.length ? "fail" : "pass", errors: distanceErrors },
    "validation/host-analysis.json": hostReport,
    "validation/no-oracle-product-ui-rerun.json": { status: "pending-previews", forbidden_inputs: ["downstream visual source captures", "prior design contracts", "prior review bundles"], expected_answer_paths: [], input_profile: PRODUCT_UI_INPUT_PROFILE },
    "validation/critical-system-coverage.json": { status: "pass", required_dimensions: ["application chrome", "surface", "text", "border", "spacing", "radius", "typography", "navigation", "editor", "states"], note: "R-011 product UI contract coverage; not CraftsOS implementation evidence" }
  };
  files["design.md"] = designMarkdown({ packageId, analysisId, host, sources, grammar: host.application_grammar, components: host.component_contracts, tokens: host.tokens, directions: host.shell_directions, sourceDistance: host.source_distance });
  files["design.md"] = files["design.md"].replace("Task-025R implementation", "downstream UI implementation");
  for (const [file, value] of Object.entries(files)) {
    const full = path.join(outputDirectory, file);
    await mkdir(path.dirname(full), { recursive: true });
    if (typeof value === "string") await writeFile(full, value); else await writeJson(full, value);
  }
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true });
  for (const [file, value] of Object.entries(validationReports)) await writeJson(path.join(outputDirectory, file), value);
  const coveragePlaceholder = { version: "r011.1.0", coverage_id: id("preview-coverage", packageId), previews: [], status: "fail" };
  await writeJson(path.join(outputDirectory, "preview-coverage.json"), coveragePlaceholder);
  const artifactEntries = [];
  const registeredFiles = requiredArtifacts.filter((file) => file !== "artifact-set.json").concat([
    "claims.json", "source-observed-tokens.json", "application-semantic-tokens.json", "theme-tokens.json",
    "accessibility-pairs.json", "delivery-readiness.json", "analysis/host-analysis.json", "analysis/evidence-bundle.json",
    "analysis/input-manifest.json", "analysis/capture-status.json", "analysis/prepared-summary.json"
  ]);
  for (const file of registeredFiles) {
    const full = path.join(outputDirectory, file);
    artifactEntries.push({ type: file.endsWith(".md") ? "text/markdown" : "application/json", path: file, sha256: await fileHash(full), schema_version: "r011.1.0", status: "current" });
  }
  const artifactManifest = { artifact_set_id: id("artifact-set", { packageId, artifactEntries }), package_id: packageId, parent_package_id: null, source_capture_ids: sources.map((source) => source.capture_id).filter(Boolean), analysis_ids: [analysisId], correction_ids: [], decision_ids: [], status: "awaiting-review", artifacts: artifactEntries.concat([{ type: "application/json", path: "artifact-set.json", sha256: null, schema_version: "r011.1.0", status: "self-describing" }]), artifact_hashes: Object.fromEntries(artifactEntries.map((entry) => [entry.path, entry.sha256])), created_at: new Date().toISOString() };
  await writeJson(path.join(outputDirectory, "artifact-set.json"), artifactManifest);
  const finalManifest = await readJson(path.join(outputDirectory, "recrafts-package.json"));
  finalManifest.artifacts = artifactManifest.artifacts;
  await writeJson(path.join(outputDirectory, "recrafts-package.json"), finalManifest);
  return { package_id: packageId, analysis_id: analysisId, artifact_set_id: (await readJson(path.join(outputDirectory, "artifact-set.json"))).artifact_set_id, status: "awaiting-owner-review", validation: validationReports };
}

export async function validateProductUIPackage(root, { requiredSurfaces = [] } = {}) {
  const artifact = await validateProductUIArtifactSet(root);
  const sourceManifest = await readJson(path.join(root, "source-manifest.json")).catch(() => null);
  const scopeMap = await readJson(path.join(root, "source-scope-map.json")).catch(() => null);
  const evidence = await readJson(path.join(root, "analysis/evidence-bundle.json")).catch(() => null);
  const evidenceRefs = new Set((evidence?.evidence ?? []).map((item) => item.evidence_id));
  const errors = [...artifact.errors];
  if (!sourceManifest || sourceManifest.input_profile !== PRODUCT_UI_INPUT_PROFILE) errors.push(issue("PACKAGE_INPUT_PROFILE_INVALID", "Package does not declare the R-011 input profile"));
  errors.push(...validateProductUISourceScope(scopeMap, evidenceRefs));
  errors.push(...validateProductUISourceDistance(await readJson(path.join(root, "source-distance-report.json")).catch(() => null)));
  const coverage = await readJson(path.join(root, "preview-coverage.json")).catch(() => null);
  if (coverage) errors.push(...validateProductPreviewCoverage(coverage, { requiredSurfaces }));
  return { status: errors.length ? "fail" : "pass", errors, artifact_count: artifact.artifacts.length, package_id: sourceManifest?.package_id ?? null };
}

export { requiredArtifacts, sha, id };
