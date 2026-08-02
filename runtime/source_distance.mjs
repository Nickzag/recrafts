export const DISTANCE_DIMENSIONS = [
  "identity_and_trademark", "copy_and_naming", "exact_color_dependence", "typography_dependence",
  "shape_motif_dependence", "page_topology", "component_combination", "imagery_and_proprietary_assets",
  "motion_signature", "overall_combination_risk"
];

const statusFor = (score) => score >= 70 ? "high" : score >= 35 ? "medium" : "low";
const clamp = (score) => Math.max(0, Math.min(100, Number(score) || 0));

export function assessSourceDistance({ dimension_scores = {}, source_traits = [], output_traits = [], topology = {}, evidence_refs = [] }) {
  const dimensions = DISTANCE_DIMENSIONS.map((dimension) => {
    const score = clamp(dimension_scores[dimension]);
    return {
      dimension, score, status: statusFor(score), evidence_refs,
      observed_source_traits: source_traits,
      portable_output_traits: output_traits,
      mitigation: score >= 70 ? "transform at least two signature dimensions" : "retain mechanism-level relationship only",
      review_status: "machine-assessed"
    };
  });
  const matchedTraits = [...new Set(output_traits.filter((trait) => source_traits.includes(trait)))];
  const motifCombinationRisk = matchedTraits.length >= 4 ? "high" : matchedTraits.length >= 2 ? "medium" : "low";
  const total = Math.max(1, Number(topology.total_relationships) || 0);
  const ratio = clamp((Number(topology.matched_relationships) || 0) / total * 100);
  const topologyRisk = statusFor(ratio);
  const blockingReasons = [];
  if (topologyRisk === "high" && motifCombinationRisk === "high") blockingReasons.push("High topology risk and high motif-combination risk cannot be pilot-ready");
  if (matchedTraits.length >= 4) blockingReasons.push(`Portable surface combines ${matchedTraits.length} source-specific traits`);
  return {
    assessment_id: `source-distance-${Math.round(ratio)}-${matchedTraits.length}`,
    dimensions, topology_risk: topologyRisk, topology_similarity_ratio: ratio,
    motif_combination_risk: motifCombinationRisk, matched_signature_traits: matchedTraits,
    gate_status: blockingReasons.length ? "blocked" : "pass", blocking_reasons: blockingReasons
  };
}
