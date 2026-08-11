export function normalizeComponentContracts(components, evidenceIds) {
  return components.map((component) => {
    if (!component.name || !component.scope || !component.evidence_refs?.length) throw new Error(`Incomplete component contract: ${component.name ?? "unknown"}`);
    if (component.evidence_refs.some((id) => !evidenceIds.has(id))) throw new Error(`Component evidence does not resolve: ${component.name}`);
    return { ...component, contract_id: `component-${component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, trace: { scope: component.scope, evidence_refs: component.evidence_refs } };
  });
}
