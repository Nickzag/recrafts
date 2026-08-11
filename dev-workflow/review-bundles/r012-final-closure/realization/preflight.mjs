export function evaluateRealizationPreflight({ packageData, metrics, ownerReview, criticalCoverage }) {
  const blockers = [];
  if (metrics.provenance_coverage < 1) blockers.push("incomplete-provenance");
  if (metrics.contamination_findings > 0) blockers.push("scope-contamination");
  if (metrics.open_high_impact_question_count > 0) blockers.push("open-high-impact-question");
  if (metrics.component_evidence_coverage < 1) blockers.push("incomplete-component-evidence");
  if (!packageData.manifest.package_id) blockers.push("missing-package-id");
  if (packageData.manifest.host_agent === "unavailable" || packageData.manifest.model === "unavailable" || packageData.manifest.vision_capability !== true) blockers.push("auditable-vision-analysis-missing");
  if (criticalCoverage?.status !== "passed") blockers.push("critical-system-coverage-incomplete");
  if (!["PASS", "PASS WITH CHANGES"].includes(ownerReview?.verdict)) blockers.push("project-owner-extraction-review-pending");
  return { status: blockers.length ? "blocked" : "ready", blockers, canonical_visual_generation_authorized: blockers.length === 0 };
}
