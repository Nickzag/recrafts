import { createHash } from "node:crypto";
import { assertDesignIntelligenceStructure } from "../packages/recrafts-design/src/schema_runtime.mjs";

const sha256 = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const pass = (value) => value ? "PASS" : "FAIL";
const maturityRank = (value) => Number(value?.slice(1));

function sourceCoveragePass(receipt) {
  const ids = receipt.source_ids;
  const reviewed = receipt.sources.filter(({ status }) => status === "REVIEWED");
  const unreadableHonest = receipt.sources.filter(({ status }) => status === "UNREADABLE").every(({ unknowns }) => unknowns.length > 0);
  return receipt.coverage_complete === true && receipt.total_source_count === ids.length && receipt.reviewed_source_count === reviewed.length && reviewed.length === receipt.total_source_count && new Set(ids).size === ids.length && new Set(receipt.sources.map(({ source_id }) => source_id)).size === receipt.sources.length && receipt.sources.length === ids.length && receipt.sources.every(({ source_id }) => ids.includes(source_id)) && unreadableHonest;
}

function productUnderstandingPass(product, coverage) {
  const objectIds = new Set(product.objects.map(({ id }) => id));
  const evidence = new Set(coverage.source_ids);
  const refsValid = (refs) => refs.every((ref) => evidence.has(ref));
  return product.source_set_id === coverage.source_set_id && product.source_revision === coverage.source_revision &&
    objectIds.size === product.objects.length && new Set(product.surfaces.map(({ id }) => id)).size === product.surfaces.length && new Set(product.regions.map(({ id }) => id)).size === product.regions.length &&
    product.objects.every((object) => object.status === "UNKNOWN" ? object.evidence_refs.length === 0 : object.evidence_refs.length > 0 && refsValid(object.evidence_refs)) &&
    product.surfaces.every((surface) => surface.object_refs.every((ref) => objectIds.has(ref)) && refsValid(surface.evidence_refs)) &&
    product.regions.every((region) => objectIds.has(region.object_ref) && refsValid(region.evidence_refs));
}

function authorityPass(authority, coverage) {
  const ranks = new Map(authority.tiers.map(({ tier, authority_rank }) => [tier, authority_rank]));
  const allSources = authority.tiers.flatMap(({ source_ids }) => source_ids);
  const conflictValid = authority.conflicts.every((conflict) => {
    const orderValid = ranks.get(conflict.higher_tier) < ranks.get(conflict.lower_tier);
    const overrideAuthorized = conflict.resolution !== "LOWER_OVERRIDES" || Boolean(conflict.decision_ref && authority.decisions.includes(conflict.decision_ref));
    return orderValid && overrideAuthorized && conflict.resolution !== "UNRESOLVED";
  });
  return authority.source_set_id === coverage.source_set_id && new Set(authority.tiers.map(({ tier }) => tier)).size === authority.tiers.length && new Set(authority.tiers.map(({ authority_rank }) => authority_rank)).size === authority.tiers.length &&
    new Set(allSources).size === allSources.length && allSources.length === coverage.source_ids.length && allSources.every((id) => coverage.source_ids.includes(id)) && conflictValid;
}

function measurementPass(set, coverage) {
  const sourceRegions = new Map(coverage.sources.map((source) => [source.source_id, new Set(source.visible_regions)]));
  return set.source_revision === coverage.source_revision && set.measurements.every((measurement) => {
    const sourceValid = coverage.source_ids.includes(measurement.source_id) && sourceRegions.get(measurement.source_id)?.has(measurement.region_id);
    const exactValid = measurement.class !== "OBSERVED_EXACT" || measurement.certainty === "OBSERVED";
    const rangeValid = measurement.class !== "OBSERVED_RANGE" || Array.isArray(measurement.range);
    const unknownValid = measurement.class !== "UNKNOWN" || (measurement.certainty === "UNKNOWN" && (measurement.value === null || measurement.value === "unknown"));
    const implementationCandidateValid = measurement.class !== "IMPLEMENTATION_CANDIDATE" || measurement.certainty !== "OBSERVED";
    const contentPromotionBlocked = !["user-content", "content", "feature-specific", "marketing"].includes(measurement.source_relationship) || !["DERIVED_ROLE", "IMPLEMENTATION_CANDIDATE"].includes(measurement.class);
    return sourceValid && exactValid && rangeValid && unknownValid && implementationCandidateValid && contentPromotionBlocked;
  });
}

function componentMaturityPass(components) {
  return components.every((component) => {
    const level = maturityRank(component.maturity);
    if (level >= 1 && !component.purpose) return false;
    if (level >= 2 && (!component.anatomy.length || !component.required_parts.length)) return false;
    if (level >= 3 && (!component.states.length || !component.variants.length)) return false;
    if (level >= 4 && (!component.layout_rules.length || !component.forbidden_combinations.length || !component.variation_boundaries.length)) return false;
    if (level >= 5 && (!component.responsive_behavior.length || !component.accessibility.length || !component.content_rules.length || !component.token_relationships.length)) return false;
    return true;
  });
}

function previewPass(preview, product, components) {
  const surfaceIds = new Set(product.surfaces.map(({ id }) => id));
  const componentIds = new Set(components.map(({ id }) => id));
  return [preview.foundations, preview.core_components, preview.product_composition, preview.stress_density, preview.responsive_states].every(Boolean) && preview.product_composition_refs.every((ref) => surfaceIds.has(ref)) && preview.rendered_component_refs.every((ref) => componentIds.has(ref)) && components.every(({ id }) => preview.rendered_component_refs.includes(id));
}

export function qualifyDownstreamUtility(utility, components = []) {
  const statuses = [utility.token_completeness, utility.component_maturity, utility.state_completeness, utility.composition_constraints, utility.responsive_semantics, utility.agent_rules, utility.unknown_semantics];
  const maturityInsufficient = components.length > 0 && components.some((component) => maturityRank(component.maturity) < maturityRank(utility.required_component_maturity));
  const gaps = maturityInsufficient ? [...new Set([...utility.gaps, `component maturity below ${utility.required_component_maturity}`])] : utility.gaps;
  const inventionRequired = utility.invention_required || maturityInsufficient;
  const verdict = inventionRequired || statuses.includes("BLOCK") ? "BLOCK" : statuses.includes("DEGRADED") || gaps.length ? "DEGRADED" : "PASS";
  return { schema: "recrafts.downstream-utility-result/v1", consumer_class: utility.consumer_class, verdict, gaps, invention_required: inventionRequired };
}

export function evaluateDesignIntelligence(bundle) {
  assertDesignIntelligenceStructure(bundle);
  const gates = {
    full_source_comprehension: pass(sourceCoveragePass(bundle.source_coverage)),
    product_understanding_layer: pass(productUnderstandingPass(bundle.product_understanding, bundle.source_coverage)),
    evidence_tier_authority: pass(authorityPass(bundle.evidence_authority, bundle.source_coverage)),
    visual_measurement: pass(measurementPass(bundle.measurements, bundle.source_coverage)),
    component_maturity: pass(componentMaturityPass(bundle.components)),
    preview_intelligence: pass(previewPass(bundle.preview_coverage, bundle.product_understanding, bundle.components)),
    downstream_utility: qualifyDownstreamUtility(bundle.downstream_utility, bundle.components).verdict === "PASS" ? "PASS" : "FAIL"
  };
  const failures = Object.entries(gates).filter(([, status]) => status === "FAIL").map(([gate]) => gate);
  const report = { schema: "recrafts.design-intelligence-result/v1", verdict: failures.length ? "FAIL" : "PASS", gates, failures };
  return { ...report, report_sha256: sha256(report) };
}

export function projectDesignIntelligenceArtifacts(bundle) {
  const report = evaluateDesignIntelligence(bundle);
  const product = bundle.product_understanding;
  const markdown = `# Product Understanding\n\nSource set: ${product.source_set_id}\nEvidence revision: ${product.source_revision}\n\n## Objects\n${product.objects.map((item) => `- ${item.id}: ${item.class} · ${item.status}`).join("\n")}\n\n## Unknowns\n${product.unknowns.map((item) => `- ${item}`).join("\n") || "- None disclosed"}\n`;
  return {
    "coverage-receipt.json": bundle.source_coverage,
    "product-object-model.json": { schema: "recrafts.product-object-model/v1", source_set_id: product.source_set_id, source_revision: product.source_revision, objects: product.objects, unknowns: product.unknowns },
    "surface-taxonomy.json": { schema: "recrafts.surface-taxonomy/v1", source_set_id: product.source_set_id, source_revision: product.source_revision, surfaces: product.surfaces },
    "region-taxonomy.json": { schema: "recrafts.region-taxonomy/v1", source_set_id: product.source_set_id, source_revision: product.source_revision, regions: product.regions },
    "product-understanding.md": markdown,
    "evidence-authority.json": { schema: "recrafts.evidence-authority/v1", source_set_id: bundle.evidence_authority.source_set_id, tiers: bundle.evidence_authority.tiers, decisions: bundle.evidence_authority.decisions },
    "authority-conflict-report.json": { schema: "recrafts.authority-conflict-report/v1", conflicts: bundle.evidence_authority.conflicts },
    "visual-measurements.json": bundle.measurements,
    "component-maturity.json": { schema: "recrafts.component-maturity/v1", components: bundle.components },
    "preview-coverage.json": bundle.preview_coverage,
    "downstream-utility.json": qualifyDownstreamUtility(bundle.downstream_utility, bundle.components),
    "design-intelligence-result.json": report
  };
}

export function createDecisionLedgerCandidate(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 2 || candidates.some((candidate) => !Array.isArray(candidate.claims))) throw new Error("Decision Ledger requires at least two Candidates with evidence-backed claims; score voting is prohibited");
  const units = [...new Set(candidates.flatMap(({ claims }) => claims.map(({ unit_id }) => unit_id)))].sort();
  const records = units.map((unitId) => {
    const claims = candidates.map((candidate) => ({ candidate_id: candidate.id, claim: candidate.claims.find(({ unit_id }) => unit_id === unitId) ?? null }));
    const present = claims.map(({ claim }) => claim).filter(Boolean);
    let classification = "UNSUPPORTED";
    if (present.some(({ certainty }) => certainty === "UNKNOWN")) classification = "UNKNOWN";
    else if (present.length === candidates.length) {
      const values = new Set(present.map(({ value }) => JSON.stringify(value)));
      classification = values.size === 1 ? "AGREEMENT" : present.every(({ evidence_refs }) => evidence_refs.length) ? "CONFLICT" : "UNSUPPORTED";
    }
    return { unit_id: unitId, domain: present[0]?.domain ?? "unknown", classification, candidate_claims: claims, evidence_refs: Object.fromEntries(claims.map(({ candidate_id, claim }) => [candidate_id, claim?.evidence_refs ?? []])), conflict_reason: classification === "CONFLICT" ? "evidence-backed claims differ" : null };
  });
  return { schema: "recrafts.decision-ledger-candidate/v1", candidate_ids: candidates.map(({ id }) => id), records, voting_used: false, numeric_averaging_used: false, automatic_authorization: false, decision_required: true };
}
