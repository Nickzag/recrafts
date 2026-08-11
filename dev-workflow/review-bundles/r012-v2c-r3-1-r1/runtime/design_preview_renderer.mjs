import { createHash } from "node:crypto";
import { parseDesignMd, compileDesignIr } from "../packages/recrafts-design/index.mjs";
import { assertPreviewIntegrityStructure } from "../packages/recrafts-design/src/schema_runtime.mjs";

export const PREVIEW_COMPILER_VERSION = "2.0.0";
export const RENDERER_INFRASTRUCTURE_ALLOWLIST = Object.freeze({
  review_background: "#ecece8",
  review_border: "#aaa9a2",
  review_radius: "5px",
  review_label: "#4c4b47",
  review_gap: "18px",
  review_font: "600 12px/1.3 system-ui"
});

const ZERO_HASH = "0".repeat(64);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const cssId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
const varName = (id) => `--recrafts-${cssId(id)}`;
const cssValue = (value, id) => {
  const output = String(value);
  if (/[{};<>]/.test(output)) throw new Error(`Token ${id} contains an unsafe CSS value`);
  return output;
};

function tokenMap(ir) { return new Map(Object.values(ir.foundations).flat().map((token) => [token.id, token])); }
function tokenVar(id) { return `var(${varName(id)})`; }
function tokenDeclarations(ir) { return [...tokenMap(ir).values()].filter((token) => Object.hasOwn(token, "value")).map((token) => `${varName(token.id)}:${cssValue(token.value, token.id)}`).join(";"); }

const CSS_PROPERTIES = {
  background: "background", text: "color", border: "border-color", border_width: "border-width",
  radius: "border-radius", padding: "padding", gap: "gap", font: "font", accent: "accent-color"
};

function bindingCss(bindings) {
  return Object.entries(bindings).map(([role, token]) => `${CSS_PROPERTIES[role]}:${tokenVar(token)}`).join(";");
}

function componentStyles(ir) {
  return ir.components.flatMap((component) => {
    const layout = component.specimen.layout;
    const gap = tokenVar(layout.internal_gap);
    const flowCss = layout.flow === "vertical" ? `flex-direction:column` : `flex-direction:row`;
    const alignCss = layout.alignment === "stretch" ? `align-items:stretch` : layout.alignment === "start" ? `align-items:flex-start` : layout.alignment === "end" ? `align-items:flex-end` : `align-items:center`;
    const slotCss = layout.slot_order.map((part, i) => `[data-recrafts-part=\"${esc(part)}\"]{order:${i}}`).join("");
    const selector = `[data-recrafts-specimen="${component.id}"]`;
    const base = `${selector}{${bindingCss(component.specimen.token_bindings)};border-style:solid;display:flex;${flowCss};${alignCss};gap:${gap}}${slotCss ? `${slotCss}` : ""}`;
    const states = Object.entries(component.specimen.state_bindings).map(([state, bindings]) => `${selector}[data-recrafts-state="${state}"]{${bindingCss(bindings)}}`);
    return [base, ...states];
  }).join("");
}

function compositionStyles(ir) {
  return ir.compositions.map((composition) => `[data-recrafts-composition="${composition.id}"]{display:${composition.layout.display};grid-template-columns:${composition.layout.columns.join(" ")};gap:${tokenVar(composition.layout.gap_token)}}`).join("");
}

function projectedStyle(ir) {
  const token = tokenMap(ir);
  const first = (id, fallback) => token.has(id) ? tokenVar(id) : fallback;
  const responsive = Object.entries(ir.responsive).filter(([,v]) => v.min_width || v.max_width).map(([name, vp]) => {
    const cond = vp.min_width && vp.max_width ? `(min-width:${vp.min_width}px) and (max-width:${vp.max_width}px)` : vp.min_width ? `(min-width:${vp.min_width}px)` : `(max-width:${vp.max_width}px)`;
    const collapsed = [...vp.collapsed_regions].map((id) => `[data-recrafts-region="${id}"]{display:none}`).join("");
    const order = vp.priority_order.map((id, i) => `[data-recrafts-region="${id}"]{order:${i}}`).join("");
    return `@media ${cond}{${collapsed}${order}}`;
  }).join("");
  return `:root{${tokenDeclarations(ir)}}` +
    `[data-recrafts-visual-region]{background:${first("color.surface", "transparent")};color:${first("color.text", "inherit")};font:${first("typography.body", "inherit")};padding:${first("spacing.section", "0")}}` +
    `[data-recrafts-region]{min-width:0}` + componentStyles(ir) + compositionStyles(ir) +
    `[data-recrafts-stress="dense"]{gap:calc(${first("spacing.row", "0px")} / 2)}` +
    `[data-recrafts-stress="sparse"]{gap:calc(${first("spacing.section", "0px")} * 2)}` +
    responsive;
}

function infrastructureStyle() {
  const value = RENDERER_INFRASTRUCTURE_ALLOWLIST;
  return `.rc-review-shell{background:${value.review_background};padding:${value.review_gap}}` +
    `.rc-review-section{margin-block:${value.review_gap}}` +
    `.rc-review-label{color:${value.review_label};font:${value.review_font};margin:0 0 ${value.review_gap}}` +
    `.rc-viewport-frame{outline:1px solid ${value.review_border};border-radius:${value.review_radius};overflow:auto}`;
}

function renderComponent(component, state = component.states[0], content = component.specimen.sample_content) {
  const slotOrder = component.specimen.layout.slot_order;
  const partContent = new Map(slotOrder.map((part, i) => [part, content[i % content.length] ?? part]));
  const parts = slotOrder.map((part) => `<span data-recrafts-part="${esc(part)}">${esc(partContent.get(part))}</span>`).join("");
  return `<${component.specimen.element} data-recrafts-rule="${esc(component.id)}" data-recrafts-specimen="${esc(component.id)}" data-recrafts-state="${esc(state)}" aria-label="${esc(component.role)}">${parts}</${component.specimen.element}>`;
}

function renderComposition(composition, components, viewportRules = null) {
  const componentById = new Map(components.map((component) => [component.id, component]));
  const collapsed = new Set(viewportRules?.collapsed_regions ?? []);
  const relocated = new Set(viewportRules?.relocated_regions ?? []);
  const preserved = new Set(viewportRules?.preserved_regions ?? []);
  const priority = viewportRules?.priority_order ?? composition.layout.region_order;
  const ordered = priority.map((id) => composition.regions.find((r) => r.id === id)).filter(Boolean);
  const regions = ordered.map((region) => {
    const isCollapsed = collapsed.has(region.id);
    const isRelocated = relocated.has(region.id);
    const visibility = isCollapsed ? "collapsed" : isRelocated ? "relocated" : "preserved";
    const style = isCollapsed ? " style=\"display:none\"" : "";
    const specimens = region.component_refs.map((ref) => componentById.get(ref)).filter(Boolean).map((component) => renderComponent(component)).join("");
    return `<section data-recrafts-region="${esc(region.id)}" data-recrafts-visibility="${visibility}"${style}><h3>${esc(region.role)}</h3>${specimens}</section>`;
  }).join("");
  return `<div data-recrafts-rule="${esc(composition.id)}" data-recrafts-composition="${esc(composition.id)}" data-recrafts-viewport="${viewportRules?.name ?? "desktop"}">${regions}</div>`;
}

function stressCases(ir) {
  const component = ir.components[0];
  const repeated = Array.from({ length: 6 }, (_, index) => renderComponent(component, component.states[index % component.states.length], [`Document ${index + 1}`, "Metadata"])).join("");
  const cases = [
    ["empty", "Empty", `<div aria-label="Empty state"></div>`],
    ["dense", "Dense", repeated],
    ["sparse", "Sparse", renderComponent(component)],
    ["long", "Long content", renderComponent(component, component.states[0], ["A deliberately long document title that exercises wrapping and content resilience", "Updated a long time ago"])],
    ["loading", "Loading", `<div aria-busy="true">${renderComponent(component, component.states[0], ["Loading…", "Please wait"])}</div>`],
    ["error", "Error", `<div role="alert">${renderComponent(component, component.states[0], ["Unable to load", "Try again"])}</div>`]
  ];
  return cases.map(([id, label, specimen]) => `<article class="rc-review-section"><h3 class="rc-review-label">${label}</h3><div data-recrafts-visual-region data-recrafts-stress="${id}">${specimen}</div></article>`).join("");
}

function visualBody(ir) {
  const foundationItems = Object.values(ir.foundations).flat().map((token) => `<li data-recrafts-rule="${esc(token.id)}"><code>${esc(token.id)}</code> · ${esc(token.role)} · ${esc(token.certainty)}</li>`).join("");
  const componentStates = ir.components.flatMap((component) => component.states.map((state) => renderComponent(component, state))).join("");
  const compositions = ir.compositions.map((composition) => renderComposition(composition, ir.components)).join("");
  const viewports = ["desktop", "compact", "mobile"].map((vp) => { const rules = { ...ir.responsive[vp], name: vp }; const label = vp === "desktop" ? "Desktop viewport" : vp === "compact" ? "Compact viewport" : "Mobile viewport"; return `<article class="rc-review-section"><h3 class="rc-review-label">${label}</h3><div class="rc-viewport-frame"><div data-recrafts-visual-region>${ir.compositions.map((composition) => renderComposition(composition, ir.components, rules)).join("")}</div></div></article>`; }).join("");
  return `<main class="rc-review-shell"><h1 class="rc-review-label">${esc(ir.design_system.name)} Preview</h1>` +
    `<section class="rc-review-section"><h2 class="rc-review-label">Foundations</h2><div data-recrafts-visual-region><ul>${foundationItems}</ul></div></section>` +
    `<section class="rc-review-section"><h2 class="rc-review-label">Core Components</h2><div data-recrafts-visual-region>${componentStates}</div></section>` +
    `<section class="rc-review-section"><h2 class="rc-review-label">Composition</h2><div data-recrafts-visual-region>${compositions}</div></section>` +
    `<section class="rc-review-section"><h2 class="rc-review-label">Stress Cases</h2>${stressCases(ir)}${viewports}</section></main>`;
}

function refs(ir) {
  return {
    projected_token_refs: [...tokenMap(ir).keys()].sort(),
    projected_component_refs: ir.components.map(({ id }) => id).sort(),
    projected_state_refs: ir.states.map(({ id }) => id).sort(),
    projected_composition_refs: ir.compositions.map(({ id }) => id).sort(),
    viewport_coverage: ["desktop", "compact", "mobile"]
  };
}

function composeHtml({ ir, projected, infrastructure, body, metadata }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(ir.design_system.name)} Preview</title><style id="recrafts-renderer-infrastructure">${infrastructure}</style><style id="recrafts-design-projected">${projected}</style><script id="recrafts-preview-integrity" type="application/json">${JSON.stringify(metadata)}</script></head><body>${body}</body></html>`;
}

export function renderDesignPreview({ designSource, generatedAt = new Date().toISOString() }) {
  const ir = compileDesignIr(parseDesignMd(designSource));
  const projected = projectedStyle(ir);
  const infrastructure = infrastructureStyle();
  const body = visualBody(ir);
  const referenceCoverage = refs(ir);
  let metadata = {
    schema: "recrafts.preview-integrity/v2", design_sha256: sha256(designSource), compiler_version: PREVIEW_COMPILER_VERSION,
    design_ir_sha256: sha256(JSON.stringify(ir)), projected_style_sha256: sha256(projected), preview_content_sha256: sha256(body),
    renderer_infrastructure_sha256: sha256(infrastructure), renderer_infrastructure_allowlist_sha256: sha256(JSON.stringify(RENDERER_INFRASTRUCTURE_ALLOWLIST)),
    preview_artifact_sha256: ZERO_HASH, generated_at: generatedAt, infrastructure_affects_visual_region: false,
    projected_rule_ids: [...new Set([...referenceCoverage.projected_token_refs, ...referenceCoverage.projected_component_refs, ...referenceCoverage.projected_state_refs, ...referenceCoverage.projected_composition_refs])].sort(),
    ...referenceCoverage
  };
  const canonicalHtml = composeHtml({ ir, projected, infrastructure, body, metadata });
  metadata = { ...metadata, preview_artifact_sha256: sha256(canonicalHtml) };
  assertPreviewIntegrityStructure(metadata);
  const html = composeHtml({ ir, projected, infrastructure, body, metadata });
  return { html, integrity: { ...metadata, preview_html_sha256: sha256(html) }, ir };
}

function extract(html, expression, label) {
  const match = html.match(expression);
  if (!match) throw new Error(`Preview integrity failed: ${label} is missing`);
  return match[1];
}

export function validatePreviewIntegrity({ designSource, html }) {
  const metadataText = extract(html, /<script id="recrafts-preview-integrity" type="application\/json">([^<]+)<\/script>/, "metadata");
  const metadata = JSON.parse(metadataText);
  assertPreviewIntegrityStructure(metadata);
  const projected = extract(html, /<style id="recrafts-design-projected">([\s\S]*?)<\/style>/, "projected style");
  const infrastructure = extract(html, /<style id="recrafts-renderer-infrastructure">([\s\S]*?)<\/style>/, "renderer infrastructure");
  const body = extract(html, /<body>([\s\S]*?)<\/body>/, "body");
  if (metadata.design_sha256 !== sha256(designSource)) throw new Error("Preview is stale: design.md hash mismatch");
  if (metadata.projected_style_sha256 !== sha256(projected)) throw new Error("Preview integrity failed: projected style hash mismatch");
  if (metadata.preview_content_sha256 !== sha256(body)) throw new Error("Preview integrity failed: body hash mismatch");
  if (metadata.renderer_infrastructure_sha256 !== sha256(infrastructure)) throw new Error("Preview integrity failed: infrastructure hash mismatch");
  if (metadata.renderer_infrastructure_allowlist_sha256 !== sha256(JSON.stringify(RENDERER_INFRASTRUCTURE_ALLOWLIST)) || metadata.infrastructure_affects_visual_region !== false) throw new Error("Preview integrity failed: infrastructure allowlist mismatch");
  const canonicalArtifact = html.replace(/"preview_artifact_sha256":"[a-f0-9]{64}"/, `"preview_artifact_sha256":"${ZERO_HASH}"`);
  if (metadata.preview_artifact_sha256 !== sha256(canonicalArtifact)) throw new Error("Preview integrity failed: full artifact hash mismatch");
  const expected = renderDesignPreview({ designSource, generatedAt: metadata.generated_at });
  if (html !== expected.html) throw new Error("Preview integrity failed: deterministic projection tampered");
  return { valid: true, metadata };
}
