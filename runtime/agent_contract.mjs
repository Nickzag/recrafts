export function validateAgentContract(value) {
  const errors = [];
  const tokens = new Set((value.tokens ?? []).map((item) => item.token_id));
  const themes = new Set((value.themes ?? []).map((item) => item.theme_id));
  const components = new Map((value.components ?? []).map((item) => [item.component_id, item]));
  const templates = new Map((value.templates ?? []).map((item) => [item.template_id, item]));
  const previewed = new Set(value.preview_component_ids ?? []);
  for (const component of components.values()) {
    for (const dependency of component.token_dependencies ?? []) if (!tokens.has(dependency)) errors.push(`${component.component_id} references unknown token ${dependency}`);
    if (component.maturity === "core" && !previewed.has(component.component_id)) errors.push(`${component.component_id} Core component is not represented in a preview`);
  }
  for (const request of value.render_requests ?? []) {
    if (!themes.has(request.theme_ref)) errors.push(`${request.request_id} references unknown theme ${request.theme_ref}`);
    const template = templates.get(request.template_ref);
    if (!template) errors.push(`${request.request_id} references unknown template ${request.template_ref}`);
    for (const ref of request.component_refs ?? []) if (!components.has(ref)) errors.push(`${request.request_id} references unknown component ${ref}`);
    for (const slot of template?.required_slots ?? []) if (request.content?.[slot] === undefined) errors.push(`${request.request_id} omits required slot ${slot}`);
    for (const ref of template?.component_refs ?? []) if (!(request.component_refs ?? []).includes(ref)) errors.push(`${request.request_id} omits template component ${ref}`);
  }
  if ((value.render_requests ?? []).length < 2) errors.push("Agent contract requires two independent render requests");
  return { status: errors.length ? "fail" : "pass", errors, render_requests_validated: (value.render_requests ?? []).length };
}
