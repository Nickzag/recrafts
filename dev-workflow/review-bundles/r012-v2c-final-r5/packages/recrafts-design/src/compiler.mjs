import { assertDesignDocumentStructure, assertDesignIrStructure } from "./schema_runtime.mjs";

const values = (object) => Object.values(object ?? {}).flat();
const uniqueIds = (items, label) => {
  const ids = items.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate IDs`);
  return new Set(ids);
};
const bindingRefs = (bindings) => Object.values(bindings ?? {});

function assertRelations(ir) {
  const tokens = uniqueIds(values(ir.foundations), "Foundations");
  const states = uniqueIds(ir.states, "States");
  const components = uniqueIds(ir.components, "Components");
  const archetypes = new Set(ir.content_archetypes);
  const regions = new Set(ir.compositions.flatMap((composition) => composition.regions.map(({ id }) => id)));
  const errors = [];
  const known = (set, ref, label, owner) => { if (!set.has(ref)) errors.push(`${owner} references unknown ${label}: ${ref}`); };

  for (const component of ir.components) {
    for (const ref of component.token_usage) known(tokens, ref, "Token", component.id);
    for (const ref of bindingRefs(component.specimen.token_bindings)) known(tokens, ref, "Token", component.id);
    for (const ref of component.states) known(states, ref, "State", component.id);
    for (const ref of component.content_archetypes) known(archetypes, ref, "Content Archetype", component.id);
    for (const [stateRef, bindings] of Object.entries(component.specimen.state_bindings)) {
      known(states, stateRef, "State", component.id);
      for (const ref of bindingRefs(bindings)) known(tokens, ref, "Token", `${component.id}/${stateRef}`);
    }
    for (const part of component.required_parts) if (!component.anatomy.includes(part)) errors.push(`${component.id} required part is absent from anatomy: ${part}`);
    for (const part of component.optional_parts) if (!component.anatomy.includes(part)) errors.push(`${component.id} optional part is absent from anatomy: ${part}`);
  }
  for (const state of ir.states) for (const ref of bindingRefs(state.visual_tokens)) known(tokens, ref, "Token", state.id);
  for (const composition of ir.compositions) {
    const declared = new Set(composition.regions.map(({ id }) => id));
    for (const ref of [...composition.required_regions, ...composition.optional_regions, ...composition.layout.region_order]) known(declared, ref, "Region", composition.id);
    known(tokens, composition.layout.gap_token, "Token", composition.id);
    for (const region of composition.regions) for (const ref of region.component_refs) known(components, ref, "Component", `${composition.id}/${region.id}`);
  }
  for (const [viewport, rules] of Object.entries(ir.responsive)) for (const ref of [...rules.preserved_regions, ...rules.collapsed_regions, ...rules.relocated_regions, ...rules.priority_order]) known(regions, ref, "Region", viewport);
  if (errors.length) throw Object.assign(new Error(`Design IR referential integrity failed: ${errors.join("; ")}`), { code: "REFERENTIAL_INTEGRITY_FAILED", errors });
}

export function validateDesign(document) {
  assertDesignDocumentStructure({ frontMatter: document.frontMatter, overview: document.overview, structured: document.structured });
  return { valid: true, errors: [] };
}

export function validateDesignIr(ir) {
  assertDesignIrStructure(ir);
  assertRelations(ir);
  return { valid: true, errors: [] };
}

export function semanticDesignIrHashInput(ir) {
  const semantic = structuredClone(ir);
  semantic.design_system = { id: semantic.design_system.id, name: semantic.design_system.name };
  delete semantic.agent_usable;
  return semantic;
}

export function compileDesignIr(document) {
  validateDesign(document);
  const { content_archetypes: contentArchetypes, ...responsive } = document.structured.responsive;
  const ir = {
    schema: "recrafts.design-ir/v1",
    generated_notice: "GENERATED · DO NOT EDIT · NOT AUTHORING SOURCE",
    authoring_source: "design.md",
    design_system: {
      id: document.frontMatter.id, name: document.frontMatter.name, version: document.frontMatter.version, status: document.frontMatter.status,
      release_id: document.frontMatter.release_id, parent_release: document.frontMatter.parent_release,
      evidence_revision: document.frontMatter.evidence_revision, decision_revision: document.frontMatter.decision_revision,
      derived_from: document.frontMatter.derived_from, confidence: document.frontMatter.confidence
    },
    overview: document.overview,
    foundations: document.structured.foundations,
    compositions: document.structured.compositions,
    components: document.structured.components,
    states: document.structured.states,
    responsive,
    content_archetypes: contentArchetypes,
    agent_rules: document.structured.agentRules,
    constraints: document.structured.constraints,
    agent_usable: document.frontMatter.agent_usable
  };
  validateDesignIr(ir);
  return ir;
}
