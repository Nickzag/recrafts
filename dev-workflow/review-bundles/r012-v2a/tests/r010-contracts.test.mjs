import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateSchema } from "../runtime/schema_validator.mjs";
import { validateSourceNeutralArtifactSet } from "../runtime/source_neutral_contract.mjs";

const load = (name) => JSON.parse(readFileSync(new URL(`../contracts/${name}`, import.meta.url), "utf8"));
const observation = {
  observation_id: "obs-color-1", domain: "color", value: "#173f35", source_scope: "spade-brand",
  evidence_refs: ["ev-color-1"], claim_refs: ["claim-color-1"], confidence: "high",
  source_specificity: "high", portability_risk: "high"
};
const rule = {
  rule_id: "grammar-evidence-first", scope: "all-media", status: "portable",
  rationale: "Proof-bearing content precedes decoration.", evidence_refs: ["ev-layout-1"], claim_refs: ["claim-layout-1"],
  allowed: ["semantic data attachment"], forbidden: ["decorative data"], validation_method: "agent-contract"
};
const component = {
  component_id: "proof-canvas", maturity: "core", purpose: "Attach evidence to one visual protagonist", scope: ["web", "slide"],
  anatomy: ["protagonist", "evidence layer"], required_slots: ["title", "evidence"], optional_slots: ["caption"],
  variants: ["object", "place"], states: ["default", "empty", "error"], interaction: "none", keyboard: "not-interactive",
  responsive_behavior: "stack below 390px", accessibility_semantics: "figure with figcaption", token_dependencies: ["color.surface"],
  content_constraints: ["evidence must describe protagonist"], allowed_compositions: ["single protagonist"], forbidden_compositions: ["decorative data"],
  evidence_refs: ["ev-component-1"], claim_refs: ["claim-component-1"], validation_rules: ["previewed"]
};
const fixture = () => ({
  source_observations: [observation],
  core_grammar: { grammar_id: "instrument-grammar-v2", rules: [rule], forbidden_requirements: ["exact source colors", "source logo"] },
  tokens: [{ token_id: "color.signal.primary", domain: "color", role: "single prioritized signal", value: "theme-bound", scope: "all-media", status: "portable", confidence: "high", evidence_refs: ["ev-color-1"], claim_refs: ["claim-color-1"], source_observation_refs: ["obs-color-1"], portability_classification: "transformed", allowed_usages: ["signal"], forbidden_usages: ["body text without contrast"], validation_method: "contrast-pairs" }],
  themes: [
    { theme_id: "theme-derived", primary_family: "teal", boundary_form: "offset-frame", core_grammar_ref: "instrument-grammar-v2", source_distance: "medium" },
    { theme_id: "theme-alternative-a", primary_family: "cobalt", boundary_form: "offset-frame", core_grammar_ref: "instrument-grammar-v2", source_distance: "high" },
    { theme_id: "theme-alternative-b", primary_family: "amber", boundary_form: "rule-and-field", core_grammar_ref: "instrument-grammar-v2", source_distance: "high" }
  ],
  components: [component],
  delivery: { status: "reviewable", owner_visual_review: false, identity_legal_gate: "pass", source_distance_gate: "pass", machine_contract_gate: "pass", accessibility_gate: "pass", responsive_gate: "pass", production_validation: false }
});

test("R-010 schemas are strict and accept a source observation", () => {
  const schema = load("source-observation.schema.json");
  assert.deepEqual(validateSchema(observation, schema), []);
  assert.ok(validateSchema({ ...observation, invented: true }, schema).some((error) => /unknown field/.test(error)));
  assert.ok(validateSchema({ ...observation, evidence_refs: [] }, schema).length > 0);
});

test("portable system preserves one Core Grammar across three materially different themes", () => {
  const result = validateSourceNeutralArtifactSet(fixture());
  assert.deepEqual(result.errors, []);
  assert.equal(result.status, "reviewable");
});

test("exact source values and signature requirements cannot become mandatory Core Grammar", () => {
  const value = fixture();
  value.core_grammar.rules[0].allowed.push("#173f35");
  value.core_grammar.rules[0].forbidden = [];
  const result = validateSourceNeutralArtifactSet(value);
  assert.ok(result.errors.some((error) => /exact source value/i.test(error)));
});

test("pilot-ready requires owner review and production-ready requires production validation", () => {
  const pilot = fixture();
  pilot.delivery.status = "pilot-ready";
  assert.ok(validateSourceNeutralArtifactSet(pilot).errors.some((error) => /owner visual review/i.test(error)));
  const production = fixture();
  production.delivery.status = "production-ready";
  production.delivery.owner_visual_review = true;
  assert.ok(validateSourceNeutralArtifactSet(production).errors.some((error) => /production validation/i.test(error)));
});

test("a Core component must include states, keyboard semantics and preview validation", () => {
  const value = fixture();
  value.components[0] = { ...value.components[0], states: [], keyboard: "", validation_rules: [] };
  const result = validateSourceNeutralArtifactSet(value);
  assert.ok(result.errors.some((error) => /states/i.test(error)));
  assert.ok(result.errors.some((error) => /keyboard/i.test(error)));
  assert.ok(result.errors.some((error) => /preview/i.test(error)));
});
