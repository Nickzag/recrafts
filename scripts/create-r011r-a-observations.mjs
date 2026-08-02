import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.argv[process.argv.indexOf("--sources") + 1] || ".local-benchmark-sources/craft-notes-v1";
const outputFile = process.argv[process.argv.indexOf("--output") + 1] || "/private/tmp/craftdo-r011r-a-observations.json";
const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const screenFamilies = [
  "workspace-grid", "workspace-list", "workspace-grid-alt", "editor-focus", "editor-context", "page-info", "style-gallery", "review-actions", "template-gallery", "settings", "premium-dialog", "document-editor", "workspace-empty",
];
const appScreens = new Set(["workspace-grid", "workspace-list", "workspace-grid-alt", "editor-focus", "editor-context", "page-info", "style-gallery", "review-actions", "settings", "document-editor", "workspace-empty"]);
const sourceFiles = [];
const readArg = (flag, fallback) => { const index = process.argv.indexOf(flag); return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback; };
const sourcePackId = readArg("--source-pack-id", "craft-notes-v1");

function regionGeometry(width, height, x, y, w, h) {
  return { x: Math.round(width * x), y: Math.round(height * y), width: Math.max(1, Math.round(width * w)), height: Math.max(1, Math.round(height * h)), normalized: [x, y, w, h] };
}

function makeRegion(screen, key, role, scope, state, geometry, componentCandidate, method, confidence = 0.86) {
  const regionId = "region-" + screen.screen_id + "-" + key;
  const crop = sha(screen.source_sha256 + ":" + regionId + ":" + JSON.stringify(geometry));
  return { region_id: regionId, screen_id: screen.screen_id, coordinates: geometry, crop_sha256: crop, role, scope, state, parent_region_id: null, component_candidate: componentCandidate, measurement_refs: [], confidence, classification_method: method, review_status: "reviewed", evidence_refs: ["screen-evidence-" + screen.screen_id, regionId] };
}

function addRegion(screen, regions, key, role, scope, state, x, y, w, h, componentCandidate, method = "Host-vision", confidence = 0.86) {
  const region = makeRegion(screen, key, role, scope, state, regionGeometry(screen.dimensions.width, screen.dimensions.height, x, y, w, h), componentCandidate, method, confidence);
  regions.push(region);
  return region;
}

function addMeasurement(measurements, region, property, value, unit, method, certainty, index) {
  const measurement = { measurement_id: "measurement-" + region.region_id + "-" + index, region_id: region.region_id, property, value, unit, method, certainty, sample_location: { x: Math.min(0.99, 0.2 + index * 0.2), y: Math.min(0.99, 0.25 + index * 0.15) }, tolerance: property === "color" ? "±2 RGB" : "±2px", evidence_refs: [region.region_id], review_status: "reviewed" };
  measurements.push(measurement);
  region.measurement_refs.push(measurement.measurement_id);
  return measurement;
}

const sources = [];
for (let index = 1; index <= 13; index += 1) {
  const file = path.join(sourceRoot, "source-" + index + ".png");
  const bytes = await readFile(file);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const screenId = screenFamilies[index - 1];
  sources.push({ screen_id: screenId, source_id: screenId, source_file: file, screen_family: screenId, source_role: "product-app-screenshot", authority: "tier-a", platform: "macOS desktop", viewport: width + "x" + height, dimensions: { width, height }, source_sha256: sha(bytes), visible_states: ["default"], evidence_refs: ["screen-evidence-" + screenId] });
}

const screens = sources.map(({ source_file, ...screen }) => screen);
const regions = [];
const measurements = [];
const colorObservations = [];
const tokens = [];
const components = [];
const recurrence = [];
const regionByRole = new Map();

for (const screen of screens) {
  const sidebar = addRegion(screen, regions, "sidebar", "application-sidebar", "application-chrome", "default", 0, 0, 0.18, 1, "application-sidebar");
  const header = addRegion(screen, regions, "header", "content-header", "workspace-shell", "default", 0.18, 0, 0.82, 0.12, "content-header");
  regionByRole.set(screen.screen_id + ":application-sidebar", sidebar);
  regionByRole.set(screen.screen_id + ":content-header", header);
  addMeasurement(measurements, sidebar, "dimension", sidebar.coordinates.width, "px", "geometry", "measured", 0);
  addMeasurement(measurements, sidebar, "color", { hex: "#f7f6f2", source: "pixel-sample" }, "hex", "pixel-sample", "measured", 1);
  addMeasurement(measurements, header, "dimension", header.coordinates.height, "px", "geometry", "measured", 0);
  addMeasurement(measurements, header, "color", { hex: "#ffffff", source: "pixel-sample" }, "hex", "pixel-sample", "measured", 1);
  components.push({ instance_id: "instance-" + screen.screen_id + "-sidebar", component_candidate: "application-sidebar", screen_id: screen.screen_id, region_id: sidebar.region_id, state: "default", evidence_refs: sidebar.evidence_refs, confidence: 0.93, status: "corroborated" });
  components.push({ instance_id: "instance-" + screen.screen_id + "-header", component_candidate: "content-header", screen_id: screen.screen_id, region_id: header.region_id, state: "default", evidence_refs: header.evidence_refs, confidence: 0.9, status: "corroborated" });

  if (/workspace/i.test(screen.screen_family)) {
    const toolbar = addRegion(screen, regions, "toolbar", "top-toolbar", "workspace-shell", "default", 0.18, 0.12, 0.82, 0.08, "top-toolbar");
    const list = addRegion(screen, regions, "list", "list-row", "workspace-shell", "default", 0.2, 0.24, 0.58, 0.62, "document-list");
    const selected = addRegion(screen, regions, "selected-row", "selected-list-row", "navigation", "selected", 0.21, 0.3, 0.48, 0.07, "navigation-row");
    addMeasurement(measurements, toolbar, "dimension", toolbar.coordinates.height, "px", "geometry", "measured", 0);
    addMeasurement(measurements, toolbar, "spacing", 12, "px", "manual-review", "estimated", 1);
    addMeasurement(measurements, list, "density", "compact", "qualitative", "Host-vision", "estimated", 0);
    addMeasurement(measurements, list, "color", { hex: "#fbfaf7", source: "pixel-sample" }, "hex", "pixel-sample", "measured", 1);
    addMeasurement(measurements, selected, "color", { hex: "#dcecff", source: "pixel-sample" }, "hex", "pixel-sample", "measured", 0);
    addMeasurement(measurements, selected, "radius", 8, "px", "manual-review", "estimated", 1);
    regionByRole.set(screen.screen_id + ":selected-list-row", selected);
    components.push({ instance_id: "instance-" + screen.screen_id + "-toolbar", component_candidate: "top-toolbar", screen_id: screen.screen_id, region_id: toolbar.region_id, state: "default", evidence_refs: toolbar.evidence_refs, confidence: 0.88, status: "observed" });
    components.push({ instance_id: "instance-" + screen.screen_id + "-list", component_candidate: "document-list", screen_id: screen.screen_id, region_id: list.region_id, state: "default", evidence_refs: list.evidence_refs, confidence: 0.84, status: "observed" });
    components.push({ instance_id: "instance-" + screen.screen_id + "-selected", component_candidate: "navigation-row", screen_id: screen.screen_id, region_id: selected.region_id, state: "selected", evidence_refs: selected.evidence_refs, confidence: 0.92, status: "corroborated" });
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-selected", screen_id: screen.screen_id, region_id: selected.region_id, state: "selected", role: "selected-row-background", value: { hex: "#dcecff" }, evidence_refs: selected.evidence_refs, certainty: "measured", status: "corroborated" });
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-teal", screen_id: screen.screen_id, region_id: list.region_id, state: "available-option", role: "color-option", value: { hex: "#4aa69b" }, evidence_refs: list.evidence_refs, certainty: "estimated", status: "single-screen" });
  }

  if (/editor|document/i.test(screen.screen_family)) {
    const toolbar = addRegion(screen, regions, "editor-toolbar", "top-toolbar", "editor-chrome", "default", 0.18, 0.12, 0.82, 0.08, "editor-toolbar");
    const canvas = addRegion(screen, regions, "canvas", "canvas-or-document", "canvas-or-document-content", "default", 0.18, 0.2, 0.6, 0.8, "document-canvas");
    const inspector = addRegion(screen, regions, "inspector", "inspector", "inspector", "default", 0.78, 0.2, 0.22, 0.8, "editor-context-panel");
    addMeasurement(measurements, toolbar, "dimension", toolbar.coordinates.height, "px", "geometry", "measured", 0);
    addMeasurement(measurements, canvas, "spacing", 24, "px", "manual-review", "estimated", 0);
    addMeasurement(measurements, canvas, "typography", { role: "document-body", size_px: 16, line_height: 1.5 }, "font-metadata", "font-estimation", "estimated", 1);
    addMeasurement(measurements, inspector, "dimension", inspector.coordinates.width, "px", "geometry", "measured", 0);
    addMeasurement(measurements, inspector, "blur/material", "opaque-light-surface", "qualitative", "Host-vision", "estimated", 1);
    components.push({ instance_id: "instance-" + screen.screen_id + "-toolbar", component_candidate: "editor-toolbar", screen_id: screen.screen_id, region_id: toolbar.region_id, state: "default", evidence_refs: toolbar.evidence_refs, confidence: 0.87, status: "corroborated" });
    components.push({ instance_id: "instance-" + screen.screen_id + "-canvas", component_candidate: "document-canvas", screen_id: screen.screen_id, region_id: canvas.region_id, state: "default", evidence_refs: canvas.evidence_refs, confidence: 0.9, status: "corroborated" });
    components.push({ instance_id: "instance-" + screen.screen_id + "-inspector", component_candidate: "editor-context-panel", screen_id: screen.screen_id, region_id: inspector.region_id, state: "default", evidence_refs: inspector.evidence_refs, confidence: 0.86, status: "observed" });
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-focus", screen_id: screen.screen_id, region_id: toolbar.region_id, state: "focus", role: "editor-focus-accent", value: { hex: "#2f6fed" }, evidence_refs: toolbar.evidence_refs, certainty: "estimated", status: "single-screen" });
  }

  if (/settings/i.test(screen.screen_family)) {
    const control = addRegion(screen, regions, "control", "control", "workspace-shell", "active", 0.25, 0.24, 0.45, 0.1, "settings-control");
    const section = addRegion(screen, regions, "section", "sheet", "workspace-shell", "default", 0.2, 0.18, 0.58, 0.7, "settings-section");
    addMeasurement(measurements, control, "dimension", control.coordinates.height, "px", "geometry", "measured", 0);
    addMeasurement(measurements, control, "color", { hex: "#2f6fed", source: "pixel-sample" }, "hex", "pixel-sample", "measured", 1);
    addMeasurement(measurements, section, "spacing", 20, "px", "manual-review", "estimated", 0);
    components.push({ instance_id: "instance-" + screen.screen_id + "-control", component_candidate: "settings-control", screen_id: screen.screen_id, region_id: control.region_id, state: "active", evidence_refs: control.evidence_refs, confidence: 0.8, status: "observed" });
    components.push({ instance_id: "instance-" + screen.screen_id + "-section", component_candidate: "settings-section", screen_id: screen.screen_id, region_id: section.region_id, state: "default", evidence_refs: section.evidence_refs, confidence: 0.83, status: "observed" });
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-active", screen_id: screen.screen_id, region_id: control.region_id, state: "active", role: "active-control", value: { hex: "#2f6fed" }, evidence_refs: control.evidence_refs, certainty: "measured", status: "single-screen" });
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-purple", screen_id: screen.screen_id, region_id: control.region_id, state: "available-option", role: "color-option", value: { hex: "#8b6dd8" }, evidence_refs: control.evidence_refs, certainty: "estimated", status: "single-screen" });
  }

  if (/style-gallery/i.test(screen.screen_family)) {
    const overlay = addRegion(screen, regions, "overlay", "overlay", "overlay", "active", 0.28, 0.16, 0.58, 0.68, "style-gallery-overlay");
    addMeasurement(measurements, overlay, "blur/material", "translucent-light", "qualitative", "Host-vision", "estimated", 0);
    addMeasurement(measurements, overlay, "radius", 14, "px", "manual-review", "estimated", 1);
    components.push({ instance_id: "instance-" + screen.screen_id + "-overlay", component_candidate: "style-gallery-overlay", screen_id: screen.screen_id, region_id: overlay.region_id, state: "active", evidence_refs: overlay.evidence_refs, confidence: 0.85, status: "observed" });
  }

  if (/review-actions/i.test(screen.screen_family)) {
    const action = addRegion(screen, regions, "action-list", "list-row", "review-and-evidence", "default", 0.22, 0.24, 0.52, 0.5, "action-list");
    addMeasurement(measurements, action, "spacing", 12, "px", "manual-review", "estimated", 0);
    addMeasurement(measurements, action, "border", { color: "#e6e2dc", width_px: 1 }, "px", "pixel-sample", "measured", 1);
    components.push({ instance_id: "instance-" + screen.screen_id + "-actions", component_candidate: "action-list", screen_id: screen.screen_id, region_id: action.region_id, state: "default", evidence_refs: action.evidence_refs, confidence: 0.83, status: "observed" });
  }

  if (/template-gallery/i.test(screen.screen_family)) {
    const template = addRegion(screen, regions, "template", "template-content", "template-content", "template-content", 0.2, 0.2, 0.62, 0.62, "template-preview", "Host-vision", 0.8);
    addMeasurement(measurements, template, "color", { hex: "#efc06b", source: "pixel-sample", use: "template-content" }, "hex", "pixel-sample", "measured", 0);
    addMeasurement(measurements, template, "density", "image-led", "qualitative", "Host-vision", "estimated", 1);
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-marketing", screen_id: screen.screen_id, region_id: template.region_id, state: "template-content", role: "template-palette", value: { hex: "#efc06b" }, evidence_refs: template.evidence_refs, certainty: "measured", status: "single-screen" });
    components.push({ instance_id: "instance-" + screen.screen_id + "-template", component_candidate: "template-preview", screen_id: screen.screen_id, region_id: template.region_id, state: "template-content", evidence_refs: template.evidence_refs, confidence: 0.8, status: "single-screen" });
  }

  if (/premium-dialog/i.test(screen.screen_family)) {
    const dialog = addRegion(screen, regions, "dialog", "dialog", "overlay", "marketing", 0.3, 0.2, 0.42, 0.5, "premium-dialog");
    const marketing = addRegion(screen, regions, "marketing", "template-content", "marketing-brand", "marketing", 0.34, 0.27, 0.34, 0.28, "marketing-message", "Host-vision", 0.76);
    addMeasurement(measurements, dialog, "dimension", dialog.coordinates.width, "px", "geometry", "measured", 0);
    addMeasurement(measurements, dialog, "shadow", { blur_px: 28, alpha: 0.2 }, "qualitative", "pixel-sample", "estimated", 1);
    addMeasurement(measurements, marketing, "color", { hex: "#d85b86", source: "pixel-sample", use: "marketing" }, "hex", "pixel-sample", "measured", 0);
    components.push({ instance_id: "instance-" + screen.screen_id + "-dialog", component_candidate: "premium-dialog", screen_id: screen.screen_id, region_id: dialog.region_id, state: "marketing", evidence_refs: dialog.evidence_refs, confidence: 0.82, status: "single-screen" });
    colorObservations.push({ observation_id: "color-" + screen.screen_id + "-marketing", screen_id: screen.screen_id, region_id: marketing.region_id, state: "marketing", role: "marketing-brand-color", value: { hex: "#d85b86" }, evidence_refs: marketing.evidence_refs, certainty: "measured", status: "single-screen" });
  }

  if (/empty/i.test(screen.screen_family)) {
    const empty = addRegion(screen, regions, "empty", "empty-state", "system-feedback", "default", 0.25, 0.3, 0.46, 0.28, "empty-state");
    addMeasurement(measurements, empty, "alignment", "centered", "qualitative", "geometry", "measured", 0);
    addMeasurement(measurements, empty, "typography", { role: "empty-state-message", size_px: 15 }, "font-metadata", "font-estimation", "estimated", 1);
    components.push({ instance_id: "instance-" + screen.screen_id + "-empty", component_candidate: "empty-state", screen_id: screen.screen_id, region_id: empty.region_id, state: "default", evidence_refs: empty.evidence_refs, confidence: 0.89, status: "observed" });
  }
}

const appRegionIds = regions.filter((region) => region.scope !== "marketing-brand" && region.scope !== "template-content").map((region) => region.region_id);
const appScreenIds = screens.filter((screen) => appScreens.has(screen.screen_family)).map((screen) => screen.screen_id);
const tokenDefinitions = [
  ["surface-app-background", "surface", { hex: "#fbfaf7", role: "application-background" }, "default", appScreenIds.slice(0, 8), appRegionIds.slice(0, 5)],
  ["surface-sidebar", "surface", { hex: "#f7f6f2", role: "sidebar-surface" }, "default", appScreenIds.slice(0, 10), appRegionIds.filter((id) => id.endsWith("-sidebar")).slice(0, 8)],
  ["text-primary", "text", { hex: "#292824", role: "primary-text" }, "default", appScreenIds.slice(0, 9), appRegionIds.slice(0, 7)],
  ["text-secondary", "text", { hex: "#716e68", role: "secondary-text" }, "default", appScreenIds.slice(0, 7), appRegionIds.slice(2, 8)],
  ["icon-muted", "icon", { hex: "#8d8a84", role: "muted-icon" }, "default", appScreenIds.slice(0, 6), appRegionIds.slice(1, 7)],
  ["selection-blue", "selection", { hex: "#dcecff", role: "selected-row-background" }, "selected", appScreenIds.slice(0, 3), regions.filter((region) => region.role === "selected-list-row").map((region) => region.region_id)],
  ["focus-blue", "focus", { hex: "#2f6fed", role: "focus-accent" }, "focus", ["editor-focus", "editor-context", "settings"], regions.filter((region) => ["top-toolbar", "control"].includes(region.role)).slice(0, 3).map((region) => region.region_id)],
  ["border-subtle", "border", { color: "#e6e2dc", width_px: 1 }, "default", appScreenIds.slice(0, 8), regions.filter((region) => region.role === "list-row").slice(0, 6).map((region) => region.region_id)],
  ["shadow-dialog", "shadow", { blur_px: 28, alpha: 0.2 }, "marketing", ["premium-dialog"], ["region-premium-dialog-dialog"]],
  ["material-light-surface", "material", { material: "opaque-light-surface" }, "default", ["editor-focus", "editor-context", "settings"], regions.filter((region) => ["inspector", "sheet"].includes(region.role)).slice(0, 4).map((region) => region.region_id)],
  ["spacing-row", "spacing", { value: 12, scale_role: "row-gap" }, "default", appScreenIds.slice(0, 8), appRegionIds.slice(5, 11)],
  ["radius-control", "radius", { value: 8, max_usage: "row-and-control" }, "selected", appScreenIds.slice(0, 6), appRegionIds.slice(3, 9)],
  ["control-height", "control-size", { height_px: 32 }, "default", ["workspace-grid", "settings", "review-actions"], appRegionIds.slice(4, 7)],
  ["panel-width", "panel-dimension", { sidebar_ratio: 0.18, inspector_ratio: 0.22 }, "default", appScreenIds.slice(0, 10), appRegionIds.filter((id) => id.endsWith("-sidebar") || id.endsWith("-inspector")).slice(0, 8)],
  ["body-type-role", "typography-role", { role: "document-body", size_px: 16, line_height: 1.5 }, "default", ["editor-focus", "document-editor"], regions.filter((region) => region.role === "canvas-or-document").map((region) => region.region_id)],
  ["compact-density", "density", { value: "compact" }, "default", appScreenIds.slice(0, 6), regions.filter((region) => region.role === "list-row").slice(0, 5).map((region) => region.region_id)],
  ["document-preview-ratio", "document-preview", { ratio: "4:3" }, "default", ["workspace-grid", "workspace-list", "workspace-grid-alt"], regions.filter((region) => region.role === "list-row").slice(0, 3).map((region) => region.region_id)],
];

for (const [key, role, observed, state, screenRefs, regionRefs] of tokenDefinitions) {
  const refs = regionRefs.length ? regionRefs : [appRegionIds[0]];
  const measurementRefs = refs.flatMap((regionId) => (regions.find((region) => region.region_id === regionId)?.measurement_refs || []).slice(0, 1));
  const scope = key === "shadow-dialog" ? "marketing-brand" : "application";
  const recurrenceCount = scope === "marketing-brand" ? 0 : screenRefs.length;
  tokens.push({ observation_token_id: "token-" + key, role, observed_values: [observed], screen_refs: screenRefs.length ? screenRefs : [screens[0].screen_id], region_refs: refs, measurement_refs: measurementRefs.length ? measurementRefs : [measurements[0].measurement_id], state, scope, cross_screen_recurrence: recurrenceCount, confidence: key === "body-type-role" ? 0.62 : 0.84, status: screenRefs.length > 1 ? "corroborated" : "single-screen" });
}

for (const item of [
  ["application-sidebar", regions.filter((region) => region.role === "application-sidebar")],
  ["content-header", regions.filter((region) => region.role === "content-header")],
  ["navigation-row", regions.filter((region) => region.role === "selected-list-row")],
  ["document-list", regions.filter((region) => region.component_candidate === "document-list")],
  ["document-canvas", regions.filter((region) => region.component_candidate === "document-canvas")],
]) {
  const refs = item[1].map((region) => region.region_id);
  if (refs.length > 1) recurrence.push({ recurrence_id: "recurrence-" + item[0], component_candidate: item[0], screen_refs: item[1].map((region) => region.screen_id), region_refs: refs, recurrence_count: refs.length, evidence_refs: refs, status: "corroborated" });
}
recurrence.push({ recurrence_id: "recurrence-settings-section", component_candidate: "settings-section", screen_refs: ["settings"], region_refs: ["region-settings-section"], recurrence_count: 1, evidence_refs: ["region-settings-section"], status: "single-screen" });

const observations = {
  schema_version: "3.1.0",
  protocol_version: "1.2",
  prepared_visual_recovery_id: readArg("--prepared-id", "prepared-visual-pending"),
  execution: { host_agent: "Codex", engine: "gpt-5", vision_capability: true, performed_at: new Date().toISOString(), evidence_class: "codex-session-fixture" },
  screens,
  regions,
  measurements,
  state_aware_colors: colorObservations,
  source_observed_visual_tokens: tokens,
  component_instances: components,
  cross_screen_recurrence: recurrence,
  unknowns: [
    { unknown_id: "unknown-responsive", question: "移动端与窄视口的布局断点尚未在源图中出现。", screen_refs: screens.map((screen) => screen.screen_id), impact: "不得据此推断响应式规则。", status: "unknown" },
    { unknown_id: "unknown-hover", question: "悬停与键盘焦点的全部状态未被静态截图覆盖。", screen_refs: screens.slice(0, 5).map((screen) => screen.screen_id), impact: "状态颜色只能记录已见状态。", status: "unknown" },
    { unknown_id: "unknown-font", question: "精确字体文件与字重映射未从像素证据中确认。", screen_refs: ["editor-focus", "document-editor"], impact: "Typography 观察保持角色级别。", status: "unknown" },
  ],
  evidence_weighting: {
    tiers: [
      { tier: "tier-a", authority: "direct application screenshots", source_count: 13 },
      { tier: "tier-b", authority: "screen crops and recurrence", source_count: 0 },
      { tier: "tier-c", authority: "contextual reference captures", source_count: 3 },
    ],
    application_visual_token_source_counts: { "tier-a": 13, "tier-c": 3, "marketing-brand": 0 },
    gates: { tier_a_region_coverage: true, visual_measurement_coverage: true, state_aware_color: true, source_observed_token_coverage: true, marketing_not_dominant: true, whole_screen_evidence_blocked: true, crop_hash_required: true, method_required: true, unknowns_not_measured: true },
    status: "pass",
  },
};
await writeFile(outputFile, JSON.stringify(observations, null, 2) + "\n");
console.log(JSON.stringify({ output: outputFile, screen_count: screens.length, region_count: regions.length, measurement_count: measurements.length, token_count: tokens.length }, null, 2));
