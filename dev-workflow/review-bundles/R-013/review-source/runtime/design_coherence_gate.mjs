import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDesignMd, compileDesignIr, validateDesignIr } from "../packages/recrafts-design/index.mjs";
import { validatePreviewIntegrity } from "./design_preview_renderer.mjs";
import { assertBrowserEvidence } from "../packages/recrafts-design/src/schema_runtime.mjs";
import { evaluateDesignIntelligence, qualifyDownstreamUtility } from "./design_intelligence.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pass = (condition) => condition ? "PASS" : "FAIL";
const sorted = (values) => [...values].sort();
const same = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const REQUIRED_TOKENS = ["color.surface", "color.panel", "color.text", "color.border", "color.accent", "spacing.row", "spacing.section", "radius.control", "border.hairline", "typography.body"];
const BINDING_PREFIX = { background: "color.", text: "color.", border: "color.", border_width: "border.", radius: "radius.", padding: "spacing.", gap: "spacing.", font: "typography.", accent: "color." };

function responsiveIsContiguous(responsive) {
  return responsive.mobile.max_width + 1 === responsive.compact.min_width && responsive.compact.max_width + 1 === responsive.desktop.min_width && responsive.mobile.max_width < responsive.compact.max_width;
}

function bindingsAreTyped(ir) {
  for (const component of ir.components) {
    const required = ["background", "text", "border", "border_width", "radius", "padding", "font"];
    if (required.some((role) => !component.specimen.token_bindings[role])) return false;
    for (const bindings of [component.specimen.token_bindings, ...Object.values(component.specimen.state_bindings)]) for (const [role, ref] of Object.entries(bindings)) if (!ref.startsWith(BINDING_PREFIX[role] ?? "never.")) return false;
  }
  return true;
}

function forbiddenPatternsAbsent(ir) {
  const projectedContent = ir.components.flatMap((component) => [component.id, component.role, ...component.specimen.sample_content, ...component.anatomy]).join(" ").toLowerCase();
  return ir.constraints.forbidden_patterns.every((pattern) => !projectedContent.includes(pattern.toLowerCase()));
}

export async function evaluateDesignCoherence({ candidate, designSource, previewHtml, browserEvidence = null, browserEvidenceRoot = null, productionGate = false, designIntelligence = null, requireDesignIntelligence = false }) {
  const failures = [];
  const checks = {};
  let previewMetadata = null;
  try {
    const document = parseDesignMd(designSource);
    const ir = compileDesignIr(document);
    validateDesignIr(ir);
    checks.schema_and_ir = "PASS";
    const tokenIds = new Set(Object.values(ir.foundations).flat().map(({ id }) => id));
    checks.critical_token_coverage = pass(REQUIRED_TOKENS.every((id) => tokenIds.has(id)));
    checks.component_visual_contracts = pass(bindingsAreTyped(ir));
    const usedStates = new Set(ir.components.flatMap(({ states }) => states));
    checks.state_coverage = pass(ir.states.every(({ id }) => usedStates.has(id)) && ir.components.every((component) => component.states.every((state) => state === "state.default" || component.specimen.state_bindings[state])));
    checks.composition_grammar = pass(ir.compositions.every((composition) => composition.required_regions.every((id) => composition.layout.region_order.includes(id))));
    checks.responsive_validity = pass(responsiveIsContiguous(ir.responsive));
    checks.accessibility = pass(ir.components.every((component) => component.accessibility_behavior && !/unknown/i.test(component.accessibility_behavior)) && ir.states.every((state) => state.keyboard_behavior && state.accessibility_semantics));
    const governedUnknowns = new Set(ir.constraints.known_unknowns);
    checks.unknown_governance = pass(ir.components.every((component) => component.unknowns.every((unknown) => governedUnknowns.has(unknown))) && ir.agent_rules.some((rule) => /preserve unknown/i.test(rule)));
    checks.agent_rules = pass(ir.agent_rules.some((rule) => /composition/i.test(rule)) && ir.agent_rules.some((rule) => /preserve unknown/i.test(rule)) && ir.agent_rules.some((rule) => /do not introduce|forbid/i.test(rule)));
    checks.forbidden_patterns = pass(forbiddenPatternsAbsent(ir));
    const preview = validatePreviewIntegrity({ designSource, html: previewHtml });
    previewMetadata = preview.metadata;
    checks.preview_integrity = "PASS";
    let browserEvidenceValid = false;
    let browserEvidenceHash = null;
    if (browserEvidence) { browserEvidenceHash = sha256(JSON.stringify(browserEvidence)); }
    if (browserEvidence && browserEvidence.status === "PASS" && browserEvidence.screenshots && Object.keys(browserEvidence.screenshots).length >= 3) {
      assertBrowserEvidence(browserEvidence);
      const previewHash = sha256(previewHtml);
      browserEvidenceValid = browserEvidence.preview_sha256 === previewHash;
      if (browserEvidenceValid && browserEvidence.screenshots) {
      for (const [name, shot] of Object.entries(browserEvidence.screenshots)) {
        if (shot.file) {
          try {
            const resolvedFile = path.isAbsolute(shot.file) ? shot.file : path.join(browserEvidenceRoot || process.cwd(), shot.file);
            const bytes = await readFile(resolvedFile);
            const actual = sha256(bytes);
            if (actual !== shot.sha256) { browserEvidenceValid = false; break; }
          } catch { browserEvidenceValid = false; break; }
        }
      }
    }
    if (productionGate) {
      // Production gate: empty tokens → FAIL
      const hasAnyToken = browserEvidence && browserEvidence.computed_styles &&
        Object.values(browserEvidence.computed_styles).some((vp) => vp && vp.root_tokens && Object.keys(vp.root_tokens).length > 0);
      if (!hasAnyToken) { browserEvidenceValid = false; }
      // Production gate: empty regions → FAIL
      const hasAnyRegion = browserEvidence && browserEvidence.computed_styles &&
        Object.values(browserEvidence.computed_styles).some((vp) => vp && vp.regions && vp.regions.length > 0);
      if (!hasAnyRegion) { browserEvidenceValid = false; }
      // Production gate: verify PNG magic bytes
      if (browserEvidence && browserEvidence.screenshots) {
        for (const [name, shot] of Object.entries(browserEvidence.screenshots)) {
          // Verify viewport metadata
          if (!shot.viewport || !shot.viewport.width || !shot.viewport.height) { browserEvidenceValid = false; break; }
          // Verify PNG magic bytes (first 8 bytes: \x89PNG\r\n\x1a\n)
          if (shot.file) {
            try {
              const resolvedFile = path.isAbsolute(shot.file) ? shot.file : path.join(browserEvidenceRoot || process.cwd(), shot.file);
              const fd = await import("node:fs/promises").then((fs) => fs.open(resolvedFile, "r"));
              const buf = Buffer.alloc(8);
              await fd.read(buf, 0, 8, 0);
              await fd.close();
              if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) { browserEvidenceValid = false; break; }
            } catch { browserEvidenceValid = false; break; }
          }
        }
      }
    }
    if (browserEvidenceValid && browserEvidence.computed_styles) {
        const ir = compileDesignIr(parseDesignMd(designSource));
        const allTokens = Object.values(ir.foundations).flat().filter((t) => t && t.id && t.value !== undefined);
        const desktop = browserEvidence.computed_styles.desktop || browserEvidence.computed_styles;
        const hasPerViewport = !!(browserEvidence.computed_styles.desktop && browserEvidence.computed_styles.compact && browserEvidence.computed_styles.mobile);
        // FAIL-CLOSED: every Foundation token with a value MUST be present
        for (const token of allTokens) {
          const cssVar = `--recrafts-${token.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          if (!desktop.root_tokens || !(cssVar in desktop.root_tokens)) { browserEvidenceValid = false; break; }
          if (desktop.root_tokens[cssVar] !== String(token.value)) { browserEvidenceValid = false; break; }
        }
        // R3 per-viewport responsive evidence validation — FAIL-CLOSED
        if (browserEvidenceValid && hasPerViewport) {
          for (const [vp, rules] of Object.entries(ir.responsive)) {
            const vpStyles = browserEvidence.computed_styles[vp];
            if (!vpStyles) { browserEvidenceValid = false; break; }
            const regions = vpStyles.regions || [];
            // FAIL-CLOSED: every collapsed region MUST be present and hidden
            for (const regionId of rules.collapsed_regions) {
              const region = regions.find((r) => r && r.id === regionId);
              if (!region) { browserEvidenceValid = false; break; }
              if (region.display !== "none") { browserEvidenceValid = false; break; }
            }
            if (!browserEvidenceValid) break;
            // FAIL-CLOSED: every preserved region MUST be present and visible
            for (const regionId of rules.preserved_regions) {
              const region = regions.find((r) => r && r.id === regionId);
              if (!region) { browserEvidenceValid = false; break; }
              if (region.display === "none") { browserEvidenceValid = false; break; }
            }
            if (!browserEvidenceValid) break;
            // relocated_regions MUST be present
            for (const regionId of rules.relocated_regions) {
              const region = regions.find((r) => r && r.id === regionId);
              if (!region) { browserEvidenceValid = false; break; }
            }
            if (!browserEvidenceValid) break;
            // priority_order: validate actual DOM order
            if (rules.priority_order && rules.priority_order.length) {
              const orderedIds = rules.priority_order;
              const observedIds = regions.filter((r) => r.display !== "none").map((r) => r.id);
              // Check that observed visible region order respects priority
              for (let i = 0; i < orderedIds.length - 1; i++) {
                const a = observedIds.indexOf(orderedIds[i]);
                const b = observedIds.indexOf(orderedIds[i + 1]);
                if (a >= 0 && b >= 0 && a > b) { browserEvidenceValid = false; break; }
              }
            }
          }
        }
      }
    }
    checks.browser_bound_visual = browserEvidenceValid ? "PASS" : browserEvidence ? "FAIL" : productionGate ? "FAIL" : "NOT_RUN";
    checks.preview_visual_coverage = pass(
      same(preview.metadata.projected_token_refs, tokenIds) &&
      same(preview.metadata.projected_component_refs, ir.components.map(({ id }) => id)) &&
      same(preview.metadata.projected_state_refs, ir.states.map(({ id }) => id)) &&
      same(preview.metadata.projected_composition_refs, ir.compositions.map(({ id }) => id)) &&
      same(preview.metadata.viewport_coverage, ["desktop", "compact", "mobile"])
    );
    checks.candidate_binding = pass(candidate?.id && candidate.evidence_revision === document.frontMatter.evidence_revision && candidate.design_sha256 === sha256(designSource) && candidate.status === "candidate" && candidate.agent_usable === false);
    if (designIntelligence) {
      const intelligence = evaluateDesignIntelligence(designIntelligence);
      checks.intelligence_component_maturity = intelligence.gates.component_maturity;
      checks.intelligence_preview_coverage = intelligence.gates.preview_intelligence;
      checks.intelligence_evidence_revision = pass(designIntelligence.source_coverage.source_revision === candidate?.evidence_revision);
      const compositionIds = new Set(ir.compositions.map(({ id }) => id));
      const componentIds = new Set(ir.components.map(({ id }) => id));
      checks.product_composition_proof = pass(designIntelligence.preview_coverage.product_composition && designIntelligence.preview_coverage.product_composition_refs.length > 0 && designIntelligence.preview_coverage.product_composition_refs.every((id) => compositionIds.has(id)));
      checks.component_preview_binding = pass(designIntelligence.preview_coverage.rendered_component_refs.length > 0 && designIntelligence.preview_coverage.rendered_component_refs.every((id) => componentIds.has(id)));
    } else if (requireDesignIntelligence) checks.design_intelligence = "FAIL";
  } catch (error) {
    checks.runtime_validation = "FAIL";
    failures.push(error.message);
  }
  for (const [check, status] of Object.entries(checks)) if (status === "FAIL") failures.push(check);
  const report = {
    schema: "recrafts.design-coherence-report/v2", verdict: failures.length ? "FAIL" : "PASS", candidate_revision: candidate?.id ?? null,
    evidence_revision: candidate?.evidence_revision ?? null, design_sha256: sha256(designSource), preview_artifact_sha256: previewMetadata?.preview_artifact_sha256 ?? null,
    checks, failures: [...new Set(failures)], proves_source_fidelity: false, production_gate: productionGate, browser_evidence_sha256: typeof browserEvidenceHash !== "undefined" ? browserEvidenceHash : null,
    ...(designIntelligence ? { design_intelligence_report_sha256: evaluateDesignIntelligence(designIntelligence).report_sha256, downstream_utility: qualifyDownstreamUtility(designIntelligence.downstream_utility, designIntelligence.components) } : {})
  };
  return { ...report, report_sha256: sha256(JSON.stringify(report)) };
}
