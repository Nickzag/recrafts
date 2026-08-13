import assert from "node:assert/strict";
import test from "node:test";
import {
  createDecisionLedgerCandidate,
  evaluateDesignIntelligence,
  projectDesignIntelligenceArtifacts,
  qualifyDownstreamUtility,
} from "../runtime/design_intelligence.mjs";
import { readFileSync } from "node:fs";

const clone = (value) => structuredClone(value);
const sources = ["alpha", "beta", "gamma"];

const bundle = {
  schema: "recrafts.design-intelligence/v1",
  source_coverage: {
    source_set_id: "holdout-kanban", source_revision: "E1", total_source_count: 3, reviewed_source_count: 3,
    source_ids: sources, sources: sources.map((source_id) => ({ source_id, status: "REVIEWED", surface_hypothesis: "workspace", visible_regions: [`${source_id}-main`], visible_components: ["task-item"], visible_states: ["default"], major_observations: ["distinct topology"], unknowns: [] })), coverage_complete: true
  },
  product_understanding: {
    source_set_id: "holdout-kanban", source_revision: "E1",
    objects: [
      { id: "board", class: "PRODUCT_OBJECT", label: "work board", status: "OBSERVED", evidence_refs: ["alpha"] },
      { id: "main", class: "UI_REGION", label: "primary board", status: "OBSERVED", evidence_refs: ["alpha"] },
      { id: "task", class: "SYSTEM_COMPONENT", label: "task item", status: "OBSERVED", evidence_refs: ["beta"] }
    ], surfaces: [{ id: "board-surface", object_refs: ["board", "main", "task"], evidence_refs: ["alpha", "beta"] }], regions: [{ id: "board-main", object_ref: "main", persistence: "PERSISTENT", evidence_refs: ["alpha"] }], unknowns: []
  },
  evidence_authority: {
    source_set_id: "holdout-kanban", tiers: [
      { tier: "A", authority_rank: 1, source_ids: ["alpha", "beta"], purpose: "primary interface truth" },
      { tier: "B", authority_rank: 2, source_ids: ["gamma"], purpose: "semantic understanding" }
    ], conflicts: [], decisions: []
  },
  measurements: {
    source_revision: "E1", measurements: [
      { id: "m1", source_id: "alpha", region_id: "alpha-main", measurement_method: "pixel-bounds", class: "OBSERVED_EXACT", value: 320, unit: "px", certainty: "OBSERVED", confidence: 0.98, source_relationship: "system-chrome" },
      { id: "m2", source_id: "beta", region_id: "beta-main", measurement_method: "cluster", class: "DERIVED_ROLE", value: "#1d4ed8", unit: "color", certainty: "INFERRED", confidence: 0.82, source_relationship: "system-chrome" }
    ]
  },
  components: [{ id: "task-item", maturity: "M5", purpose: "Represent work", anatomy: ["title", "status"], required_parts: ["title"], optional_parts: ["status"], allowed_children: ["label"], forbidden_combinations: ["loading+complete"], variants: ["compact"], states: ["default", "selected"], token_relationships: ["color.accent"], content_rules: ["title required"], layout_rules: ["single row"], responsive_behavior: ["wrap labels"], accessibility: ["keyboard selectable"], variation_boundaries: ["preserve title"], unknowns: [] }],
  preview_coverage: { foundations: true, core_components: true, product_composition: true, stress_density: true, responsive_states: true, product_composition_refs: ["board-surface"], rendered_component_refs: ["task-item"] },
  downstream_utility: { consumer_class: "application-ui", required_component_maturity: "M5", token_completeness: "PASS", component_maturity: "PASS", state_completeness: "PASS", composition_constraints: "PASS", responsive_semantics: "PASS", agent_rules: "PASS", unknown_semantics: "PASS", invention_required: false, gaps: [] }
};

test("checked-in non-Craft holdout is structurally and semantically qualified", () => {
  const fixture = JSON.parse(readFileSync(new URL("../fixtures/r013/holdout-kanban/design-intelligence.json", import.meta.url), "utf8"));
  assert.equal(evaluateDesignIntelligence(fixture).verdict, "PASS");
  const domainContent = JSON.stringify({ source_coverage: fixture.source_coverage, product_understanding: fixture.product_understanding, components: fixture.components });
  assert.doesNotMatch(domainContent, /craft notes|craft\.do/i);
});

test("canonical Intelligence projects the required review artifacts without creating a parallel authoring source", () => {
  const artifacts = projectDesignIntelligenceArtifacts(bundle);
  assert.deepEqual(Object.keys(artifacts).sort(), [
    "authority-conflict-report.json", "component-maturity.json", "coverage-receipt.json", "design-intelligence-result.json",
    "downstream-utility.json", "evidence-authority.json", "preview-coverage.json", "product-object-model.json",
    "product-understanding.md", "region-taxonomy.json", "surface-taxonomy.json", "visual-measurements.json"
  ]);
  assert.equal(artifacts["design-intelligence-result.json"].verdict, "PASS");
  assert.equal(Object.hasOwn(artifacts, "design.md"), false);
});

test("generic non-Craft holdout passes all R-013 intelligence dimensions", () => {
  const result = evaluateDesignIntelligence(bundle);
  assert.equal(result.verdict, "PASS");
  assert.deepEqual(Object.values(result.gates), Array(7).fill("PASS"));
  assert.equal(qualifyDownstreamUtility(bundle.downstream_utility).verdict, "PASS");
});

test("Source Coverage fails closed on missing, duplicate, unreadable, or false-complete sources", () => {
  const cases = [
    (value) => { value.source_coverage.reviewed_source_count = 2; },
    (value) => { value.source_coverage.source_ids[2] = "beta"; },
    (value) => { value.source_coverage.sources[1].status = "UNREADABLE"; value.source_coverage.sources[1].unknowns = []; },
    (value) => { value.source_coverage.coverage_complete = true; value.source_coverage.sources.pop(); }
  ];
  for (const mutate of cases) {
    const value = clone(bundle);
    mutate(value);
    try {
      assert.equal(evaluateDesignIntelligence(value).gates.full_source_comprehension, "FAIL");
    } catch (error) {
      assert.equal(error.code, "SCHEMA_VALIDATION_FAILED");
    }
  }
});

test("authority inversion and content-color promotion fail closed", () => {
  const inverted = clone(bundle);
  inverted.evidence_authority.conflicts.push({ id: "c1", higher_tier: "A", lower_tier: "B", semantic_unit: "layout", resolution: "LOWER_OVERRIDES", decision_ref: null });
  assert.equal(evaluateDesignIntelligence(inverted).gates.evidence_tier_authority, "FAIL");
  const contaminated = clone(bundle);
  contaminated.measurements.measurements[1].source_relationship = "user-content";
  contaminated.measurements.measurements[1].class = "DERIVED_ROLE";
  assert.equal(evaluateDesignIntelligence(contaminated).gates.visual_measurement, "FAIL");
});

test("measurement class and component maturity cannot be falsely promoted", () => {
  const badMeasurement = clone(bundle);
  badMeasurement.measurements.measurements[0].class = "UNKNOWN";
  badMeasurement.measurements.measurements[0].value = 320;
  assert.equal(evaluateDesignIntelligence(badMeasurement).gates.visual_measurement, "FAIL");
  const falseMaturity = clone(bundle);
  falseMaturity.components[0].accessibility = [];
  assert.equal(evaluateDesignIntelligence(falseMaturity).gates.component_maturity, "FAIL");
  assert.equal(qualifyDownstreamUtility(bundle.downstream_utility, [{ ...bundle.components[0], maturity: "M3" }]).verdict, "BLOCK");
});

test("Preview proof and downstream utility are independently fail-closed", () => {
  const preview = clone(bundle);
  preview.preview_coverage.product_composition = false;
  assert.equal(evaluateDesignIntelligence(preview).gates.preview_intelligence, "FAIL");
  assert.equal(qualifyDownstreamUtility({ ...bundle.downstream_utility, invention_required: true, gaps: ["missing responsive topology"] }).verdict, "BLOCK");
  assert.equal(qualifyDownstreamUtility({ ...bundle.downstream_utility, state_completeness: "DEGRADED", gaps: ["hover unknown"] }).verdict, "DEGRADED");
});

test("Decision Ledger compares evidence-backed rules without voting or averaging", () => {
  const ledger = createDecisionLedgerCandidate([
    { id: "A", claims: [{ unit_id: "accent", domain: "foundations", value: "blue", evidence_refs: ["alpha"], certainty: "OBSERVED", confidence: 0.9, source_relationship: "system-chrome" }] },
    { id: "B", claims: [{ unit_id: "accent", domain: "foundations", value: "blue", evidence_refs: ["beta"], certainty: "OBSERVED", confidence: 0.85, source_relationship: "system-chrome" }] },
    { id: "C", claims: [{ unit_id: "accent", domain: "foundations", value: "unknown", evidence_refs: [], certainty: "UNKNOWN", confidence: 0.2, source_relationship: "unknown" }] }
  ]);
  assert.equal(ledger.schema, "recrafts.decision-ledger-candidate/v1");
  assert.equal(ledger.records[0].classification, "UNKNOWN");
  assert.equal(ledger.voting_used, false);
  assert.equal(ledger.numeric_averaging_used, false);
  assert.equal(ledger.automatic_authorization, false);
  assert.throws(() => createDecisionLedgerCandidate([{ id: "A", score: 95 }, { id: "B", score: 90 }]), /claims|voting|score/i);
});
