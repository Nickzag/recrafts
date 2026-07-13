export function compileTokenVariables(tokens) {
  const variables = [];
  const suggestedFallbacks = [];
  for (const token of tokens) {
    if (!token.id || !token.scope || !token.status || !token.evidence_refs?.length) throw new Error("Token compiler requires id, scope, status and provenance");
    const variable = `--${token.id.replace(/[^a-zA-Z0-9-_]/g, "-")}`;
    if (token.status === "suggested") suggestedFallbacks.push({ variable, token_id: token.id, label: "suggested" });
    else variables.push({ variable, token_id: token.id, scope: token.scope, value: token.value, evidence_refs: token.evidence_refs });
  }
  return { variables, suggested_fallbacks: suggestedFallbacks };
}
