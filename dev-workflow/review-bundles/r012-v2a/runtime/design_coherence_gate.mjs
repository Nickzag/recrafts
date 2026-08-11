import { createHash } from "node:crypto";
import { parseDesignMd, compileDesignIr, validateDesignIr } from "../packages/recrafts-design/index.mjs";
import { validatePreviewIntegrity } from "./design_preview_renderer.mjs";

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

export function evaluateDesignCoherence({ candidate, designSource, previewHtml }) {
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
    checks.preview_visual_coverage = pass(
      same(preview.metadata.projected_token_refs, tokenIds) &&
      same(preview.metadata.projected_component_refs, ir.components.map(({ id }) => id)) &&
      same(preview.metadata.projected_state_refs, ir.states.map(({ id }) => id)) &&
      same(preview.metadata.projected_composition_refs, ir.compositions.map(({ id }) => id)) &&
      same(preview.metadata.viewport_coverage, ["desktop", "compact", "mobile"])
    );
    checks.candidate_binding = pass(candidate?.id && candidate.evidence_revision === document.frontMatter.evidence_revision && candidate.design_sha256 === sha256(designSource) && candidate.status === "candidate" && candidate.agent_usable === false);
  } catch (error) {
    checks.runtime_validation = "FAIL";
    failures.push(error.message);
  }
  for (const [check, status] of Object.entries(checks)) if (status !== "PASS") failures.push(check);
  const report = {
    schema: "recrafts.design-coherence-report/v2", verdict: failures.length ? "FAIL" : "PASS", candidate_revision: candidate?.id ?? null,
    evidence_revision: candidate?.evidence_revision ?? null, design_sha256: sha256(designSource), preview_artifact_sha256: previewMetadata?.preview_artifact_sha256 ?? null,
    checks, failures: [...new Set(failures)], proves_source_fidelity: false
  };
  return { ...report, report_sha256: sha256(JSON.stringify(report)) };
}

