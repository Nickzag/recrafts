import assert from "node:assert/strict";
import test from "node:test";
import { validateAgentContract } from "../runtime/agent_contract.mjs";

const fixture = () => ({
  core_grammar: { grammar_id: "grammar-1", rules: [{ rule_id: "rule-proof", allowed: ["semantic attachment"], forbidden: ["decorative data"], validation_method: "semantic-overlay" }] },
  tokens: [{ token_id: "color.surface" }, { token_id: "space.4" }],
  themes: [{ theme_id: "theme-derived" }, { theme_id: "theme-alternative-a" }],
  components: [{ component_id: "proof-canvas", maturity: "core", token_dependencies: ["color.surface", "space.4"], states: ["default", "empty"], keyboard: "not-interactive", validation_rules: ["previewed"] }],
  templates: [{ template_id: "web-instrument", component_refs: ["proof-canvas"], required_slots: ["title", "evidence"] }],
  preview_component_ids: ["proof-canvas"],
  render_requests: [
    { request_id: "render-web", media: "web", theme_ref: "theme-derived", template_ref: "web-instrument", component_refs: ["proof-canvas"], content: { title: "Measure", evidence: "42%" } },
    { request_id: "render-slide", media: "slide", theme_ref: "theme-alternative-a", template_ref: "web-instrument", component_refs: ["proof-canvas"], content: { title: "Explain", evidence: "18ms" } }
  ]
});

test("two independent render requests resolve entirely from JSON contracts", () => {
  const result = validateAgentContract(fixture());
  assert.equal(result.status, "pass");
  assert.equal(result.render_requests_validated, 2);
});

test("unknown tokens, hidden template assumptions and unpreviewed Core components fail", () => {
  const value = fixture();
  value.components[0].token_dependencies.push("token.only-in-prose");
  value.templates[0].required_slots.push("subtitle");
  value.preview_component_ids = [];
  const result = validateAgentContract(value);
  assert.ok(result.errors.some((error) => /unknown token/i.test(error)));
  assert.ok(result.errors.some((error) => /required slot subtitle/i.test(error)));
  assert.ok(result.errors.some((error) => /preview/i.test(error)));
});
