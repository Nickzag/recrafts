export function compileTokenVariables(tokens) {
  const variables = [];
  const suggestedFallbacks = [];
  for (const token of tokens) {
    if (!token.id || !token.scope || !token.status || !token.evidence_refs?.length) throw new Error("Token compiler requires id, scope, status and provenance");
    const baseName = token.id.replace(/[^a-zA-Z0-9-_]/g, "-");
    const variable = token.status === "suggested" ? `--preview-${baseName}` : `--${baseName}`;
    if (token.status === "suggested") suggestedFallbacks.push({ variable, token_id: token.id, value: token.value, scope: token.scope, evidence_refs: token.evidence_refs, label: "preview-only fallback" });
    else variables.push({ variable, token_id: token.id, scope: token.scope, value: token.value, evidence_refs: token.evidence_refs });
  }
  return { variables, suggested_fallbacks: suggestedFallbacks };
}
