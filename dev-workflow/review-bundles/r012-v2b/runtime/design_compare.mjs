import { assertCandidateComparisonStructure, assertDesignIrStructure, assertReleaseDiffStructure } from "../packages/recrafts-design/src/schema_runtime.mjs";

export function classifyDesignChange(change = {}) {
  if (change.shell_topology_changed || change.component_anatomy_changed || change.state_model_changed || change.deprecated_compositions?.length) return "major";
  if (change.added_components?.length || change.added_states?.length || change.added_mobile_rules?.length || change.added_content_archetypes?.length || change.token_precision_increased) return "minor";
  return "patch";
}

const mapItems = (items) => Object.fromEntries(items.map((item) => [item.id, item]));
const domainMaps = (ir) => ({
  foundations: mapItems(Object.values(ir.foundations).flat()),
  components: mapItems(ir.components), states: mapItems(ir.states), compositions: mapItems(ir.compositions),
  responsive: { responsive: ir.responsive },
  agent_rules: Object.fromEntries(ir.agent_rules.map((rule, index) => [`rule-${index + 1}`, rule])),
  constraints: Object.fromEntries(Object.entries(ir.constraints)),
  unknowns: Object.fromEntries([...new Set([...ir.constraints.known_unknowns, ...ir.components.flatMap(({ unknowns }) => unknowns)])].sort().map((value) => [value, value]))
});

function normalizeEvidenceMetadata(value) {
  if (Array.isArray(value)) return value.map(normalizeEvidenceMetadata);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["confidence", "source_relationship"].includes(key)).map(([key, child]) => [key, normalizeEvidenceMetadata(child)]));
}

const isUnknown = (value) => value && typeof value === "object" && !Array.isArray(value) && value.certainty === "unknown";
const supported = (candidate, domain, key) => Boolean(candidate.evidence_support?.[domain]?.[key]?.length || candidate.evidence_support?.[domain]?.["*"]?.length);

function classify(records, candidates, domain, key) {
  if (records.some((value, index) => value === undefined || !supported(candidates[index], domain, key))) return "unsupported";
  if (records.some(isUnknown)) return "unknown";
  const serialized = records.map((value) => JSON.stringify(value));
  if (new Set(serialized).size === 1) return "agreement";
  const normalized = records.map((value) => JSON.stringify(normalizeEvidenceMetadata(value)));
  if (new Set(normalized).size === 1) return "compatible-difference";
  return "conflict";
}

export function compareDesignCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 2) throw new Error("Semantic Candidate comparison requires at least two independent Candidates");
  for (const candidate of candidates) {
    if (!candidate.id || !candidate.evidence_revision || !candidate.design_ir || !candidate.evidence_support) throw new Error("Semantic Candidate comparison requires Candidate identity, Evidence Revision, Design IR, and Evidence support");
    assertDesignIrStructure(candidate.design_ir);
  }
  const maps = candidates.map(({ design_ir }) => domainMaps(design_ir));
  const domains = {};
  const summary = { agreement: 0, "compatible-difference": 0, conflict: 0, unsupported: 0, unknown: 0 };
  for (const domain of ["foundations", "components", "states", "compositions", "responsive", "agent_rules", "constraints", "unknowns"]) {
    const keys = [...new Set(maps.flatMap((map) => Object.keys(map[domain])))].sort();
    domains[domain] = keys.map((key) => {
      const values = maps.map((map) => map[domain][key]);
      const classification = classify(values, candidates, domain, key);
      summary[classification] += 1;
      return { key, classification, candidates: Object.fromEntries(candidates.map((candidate, index) => [candidate.id, values[index] ?? null])), evidence_refs: Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate.evidence_support?.[domain]?.[key] ?? candidate.evidence_support?.[domain]?.["*"] ?? []])) };
    });
  }
  const result = { schema: "recrafts.candidate-comparison/v2", candidate_ids: candidates.map(({ id }) => id), evidence_revisions: [...new Set(candidates.map(({ evidence_revision }) => evidence_revision))], domains, summary, voting_used: false, automatic_merge: false, decision_required: true };
  assertCandidateComparisonStructure(result);
  return result;
}

export function compareDesignReleases({ current, next, change }) {
  const result = { schema: "recrafts.release-diff/v1", current_release: current.release_id, next_release: next.release_id, required_semver: classifyDesignChange(change), semantic_change: change, visual_diff_required: true };
  assertReleaseDiffStructure(result);
  return result;
}
