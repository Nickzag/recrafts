import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "examples/golden-candidates/crafts-ui-multi-image");

const sources = [
  ["library-card-view", "workspace-library", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
  ["library-list-view", "workspace-library", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
  ["library-masonry-view", "workspace-library", ["canonical-product-ui", "user-generated-content"]],
  ["editor-insert-inspector", "layoutcrafts-workbench", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
  ["editor-format-inspector", "inspector", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
  ["editor-style-inspector", "inspector", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
  ["style-gallery-modal", "modal", ["canonical-product-ui", "feature-specific-ui", "user-generated-content", "state-evidence"]],
  ["page-info-inspector", "inspector", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
  ["imagine-onboarding", "marketing", ["canonical-product-ui", "marketing-surface", "feature-specific-ui"]],
  ["appearance-settings", "settings", ["canonical-product-ui", "feature-specific-ui", "state-evidence"]],
  ["premium-pricing-modal", "marketing", ["canonical-product-ui", "marketing-surface", "state-evidence"]],
  ["shared-empty-state", "workspace-library", ["canonical-product-ui", "state-evidence"]],
  ["editor-focus-view", "layoutcrafts-workbench", ["canonical-product-ui", "user-generated-content", "state-evidence"]],
];

const componentNames = ["Button","IconButton","Tabs","SegmentedControl","SearchField","Toggle","Divider","Badge","Tooltip","Popover","Modal","ScrollArea","NavigationRail","NavigationItem","FolderTreeItem","DocumentCard","DocumentListRow","ViewSwitcher","ToolbarGroup","InspectorPanel","InspectorSection","PropertyRow","EditorCanvas","FloatingControlIsland","SettingsRow","EmptyState","LoadingSkeleton","PricingCard","ThemePreviewCard"];

function pngDimensions(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") throw new Error("Only PNG fixture sources are supported");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function regionsFor(width, height, classes) {
  const sidebarWidth = Math.round(width * 0.19);
  const inspectorWidth = Math.round(width * 0.18);
  const entries = [
    { id: "navigation-shell", class: classes[0], bbox: [0, 0, sidebarWidth, height] },
    { id: "primary-surface", class: classes[1] ?? classes[0], bbox: [sidebarWidth, 0, width - sidebarWidth - inspectorWidth, height] },
  ];
  if (classes[2]) entries.push({ id: "state-or-inspector", class: classes[2], bbox: [width - inspectorWidth, 0, inspectorWidth, height] });
  if (classes[3]) entries.push({ id: "overlay", class: classes[3], bbox: [Math.round(width * 0.3), Math.round(height * 0.15), Math.round(width * 0.4), Math.round(height * 0.7)] });
  entries.push({ id: "redacted-private-text", class: "excluded-sensitive-content", bbox: [0, 0, width, height], treatment: "whole-image box blur; metadata stripped" });
  return entries;
}

const manifestSources = [];
for (const [sourceId, scope, classes] of sources) {
  const relativeFile = `sources/${sourceId}.png`;
  const buffer = await readFile(path.join(fixture, relativeFile));
  const dimensions = pngDimensions(buffer);
  manifestSources.push({
    source_id: sourceId,
    file: relativeFile,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    dimensions,
    source_type: "sanitized-screenshot",
    capture_date: "2026-07-11",
    platform: "macOS desktop",
    viewport: `${dimensions.width}x${dimensions.height}`,
    sanitized: true,
    sanitization_ref: `san-${sourceId}`,
    regions: regionsFor(dimensions.width, dimensions.height, classes),
    priority: "golden-candidate",
    notes: `Fixture evidence for ${scope}; manually prepared expected data, not model-extraction proof.`,
  });
}

const sourceManifest = { version: "1.0.0", evidence_type: "fixture", sources: manifestSources };
const classifications = {
  version: "1.0.0",
  evidence_type: "manually-authored-expected-fixture",
  sources: manifestSources.map(({ source_id, regions }) => ({ source_id, regions: regions.map(({ id, class: className, bbox }) => ({ id, class: className, bbox })) })),
};
const sanitization = {
  version: "1.0.0",
  source_location: "gitignored external/local evidence only",
  method: "ffmpeg boxblur=6:2 with metadata removed",
  secret_scan: { engine: "Apple Vision OCR + deterministic credential patterns", status: "passed", findings: 0, scanned: 13 },
  entries: sources.map(([sourceId]) => ({ id: `san-${sourceId}`, source_id: sourceId, raw_tracked: false, sanitized: true, private_text_redacted: true, metadata_removed: true })),
};
const evidence = {
  version: "1.0.0",
  evidence: [
    { evidence_id: "ev-app-shell", source_id: "editor-format-inspector", region_id: "navigation-shell", evidence_type: "visual-observation", observation: "Persistent navigation and inspector shell", candidate_rule: "Use stable shell regions around the editing surface", scope: "layoutcrafts-workbench", confidence: 0.96, status: "observed" },
    { evidence_id: "ev-document-artwork", source_id: "editor-format-inspector", region_id: "primary-surface", evidence_type: "content-isolation", observation: "Document artwork is user-generated content", candidate_rule: "Do not promote artwork colors or typography", scope: "document-content", confidence: 1, status: "observed" },
    { evidence_id: "ev-imagine-background", source_id: "imagine-onboarding", region_id: "primary-surface", evidence_type: "scope-boundary", observation: "Blue cloud field belongs to onboarding marketing surface", candidate_rule: "Keep feature background scoped to marketing", scope: "marketing", confidence: 0.98, status: "observed" },
    { evidence_id: "ev-neutral-surfaces", source_id: "appearance-settings", region_id: "primary-surface", evidence_type: "visual-inference", observation: "Settings uses quiet neutral grouped surfaces", candidate_rule: "Prefer neutral grouped settings surfaces", scope: "settings", confidence: 0.76, status: "inferred" },
    { evidence_id: "ev-spacing-suggestion", source_id: "library-card-view", region_id: "primary-surface", evidence_type: "design-suggestion", observation: "Card gutters appear regular", candidate_rule: "Test a 16px base gutter in preview", scope: "workspace-library", confidence: 0.55, status: "suggested" }
  ],
};
const designContract = {
  status: "draft",
  readiness: "partial",
  scopes: ["global","workspace-library","layoutcrafts-workbench","inspector","settings","modal","marketing","document-content"],
  tokens: [
    { id: "settings.surface.group", value: "neutral-translucent", scope: "settings", status: "inferred", source_class: "canonical-product-ui", evidence_refs: ["ev-neutral-surfaces"] },
    { id: "marketing.imagine.background", value: "soft-blue-cloud-field", scope: "marketing", status: "observed", source_class: "marketing-surface", evidence_refs: ["ev-imagine-background"] }
  ],
};
const components = {
  status: "inventory-only",
  evidence_type: "manually-authored-expected-fixture",
  components: componentNames.map((name, index) => ({ name, evidence_refs: [index % 3 === 0 ? "ev-app-shell" : "ev-neutral-surfaces"], states: ["default", "unknown"] })),
};
const expectedSections = { status: "draft", readiness: "partial", sections: ["Metadata","Source Summary","Source Classification","Rights / Use Mode","Observed / Inferred / Suggested","System Scope","Visual Direction","Tokens","Layout Grammar","Component Inventory","State Matrix","Motion unknowns","Accessibility unknowns","Content Isolation","Open Questions","Preview Plan","Known Limitations","Change Log"] };

const designDraft = `# Crafts UI Multi-Image Design Contract Draft

status: draft
readiness: partial

## Metadata
Golden Candidate fixture; deterministic fixture evidence, not runtime extraction evidence.

## Source Summary
13/13 sanitized macOS screenshots are registered with hashes, dimensions and region classifications.

## Source Classification
Product UI, feature UI, marketing, user-generated content, state evidence and excluded sensitive content remain distinct at region level.

## Rights / Use Mode
Analysis-only local fixture. Raw inputs remain outside Git; committed copies are blurred and metadata-free.

## Observed / Inferred / Suggested
Observed shell/content boundaries, inferred neutral settings surfaces and suggested spacing experiments remain separate. No rule is confirmed.

## System Scope
global, workspace-library, layoutcrafts-workbench, inspector, settings, modal, marketing and document-content.

## Visual Direction
Quiet desktop productivity shell with neutral surfaces, compact controls and content-first work areas.

## Tokens
Only scoped candidate tokens exist. User artwork green, Imagine blue and Premium illustration colors are excluded from global tokens.

## Layout Grammar
Persistent navigation, content workspace and contextual inspector/overlay regions.

## Component Inventory
29 inventory-only component candidates are recorded in expected-component-inventory.json.

## State Matrix
Selection, modal-open, empty, loading and toggle states are evidence candidates; coverage remains partial.

## Motion unknowns
Static screenshots do not establish easing, duration or interruption behavior.

## Accessibility unknowns
Keyboard order, semantics, contrast under all states and assistive labels are not testable from these sources.

## Content Isolation
User document typography/colors, Imagine marketing blue and Premium illustration palettes cannot become global UI tokens.

## Open Questions
Exact typefaces, spacing scale, responsive behavior and component state completeness require runtime or human evidence.

## Preview Plan
R-003 may consume validated scoped tokens and component contracts; this task creates no visual realization.

## Known Limitations
Expected results are manually prepared. Blur preserves macro structure but prevents exact text and fine-detail analysis. No visual realization, fidelity, integration or production readiness is proven.

## Change Log
- 2026-07-13: R-001 draft fixture established.
`;

await mkdir(path.join(fixture, "output"), { recursive: true });
const writes = {
  "source-manifest.json": sourceManifest,
  "expected-source-classification.json": classifications,
  "sanitization-manifest.json": sanitization,
  "evidence-map.json": evidence,
  "design-contract.json": designContract,
  "expected-component-inventory.json": components,
  "expected-design-contract-sections.json": expectedSections,
};
for (const [name, value] of Object.entries(writes)) await writeFile(path.join(fixture, name), `${JSON.stringify(value, null, 2)}\n`);
await writeFile(path.join(fixture, "output/design-draft.md"), designDraft);
console.log(`Generated R-001 metadata for ${manifestSources.length} sanitized sources.`);
