import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (root, file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const field = (design, name) => design.match(new RegExp(`^${name}:\\s*(?:\\\`([^\\\`]+)\\\`|(.+?))\\s{0,2}$`, "im"))?.slice(1).find(Boolean)?.trim();

function safePackagePath(root, relative) {
  if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error(`unsafe validation report path: ${relative}`);
  return path.join(root, relative);
}

export async function validateAcceptanceFinalization(root) {
  const errors = [];
  const [manifest, set, lineage, delivery, index, design] = await Promise.all([
    readJson(root, "recrafts-package.json"), readJson(root, "artifact-set.json"), readJson(root, "lineage.json"), readJson(root, "delivery-readiness.json"), readJson(root, "validation/index.json"), readFile(path.join(root, "design.md"), "utf8")
  ]);
  const decisions = (await readFile(path.join(root, "decisions.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(JSON.parse);
  const ownerDecisionId = field(design, "Owner Decision");
  const ownerDecision = decisions.find((decision) => decision.decision_id === ownerDecisionId && decision.actor_role === "project-owner" && ["PASS", "PASS_WITH_CHANGES"].includes(decision.verdict));
  if (manifest.status !== "accepted" || field(design, "Status") !== manifest.status) errors.push("design status does not match accepted package state");
  if (field(design, "Package") !== manifest.package_id) errors.push("design package ID does not match current package");
  if (lineage.package_id !== manifest.package_id || lineage.parent_package_id !== manifest.parent_package_id || lineage.event_type !== "accepted") errors.push("Artifact Set state or accepted lineage does not match package state");
  if (set.status !== "accepted") errors.push("Artifact Set state does not match accepted package state");
  if (field(design, "Parent Package") !== manifest.parent_package_id) errors.push("design parent Package does not match lineage");
  if (field(design, "Artifact Set") !== set.artifact_set_id || manifest.artifact_set_id !== set.artifact_set_id) errors.push("design Artifact Set does not match package state");
  if (field(design, "Delivery readiness") !== delivery.status || !["pilot-ready", "production-ready"].includes(delivery.status)) errors.push("delivery readiness does not match accepted artifact state");
  if (!ownerDecision || !(lineage.decision_ids ?? []).includes(ownerDecisionId) || !(set.decision_ids ?? []).includes(ownerDecisionId)) errors.push("Owner Decision ID does not match decision history and lineage");
  if (/project owner must confirm|realization is not authorized|pilot-ready after[^\n]*accept/i.test(design)) errors.push("unresolved review-stage authorization language remains in design.md");
  if (!index.validation_run_id || !Array.isArray(index.reports) || !index.reports.length) errors.push("validation index is incomplete");
  const authorityErrors = [];
  for (const report of index.reports ?? []) {
    try {
      const reportFile = safePackagePath(root, report.authoritative_report_path);
      const bytes = await readFile(reportFile);
      const parsed = JSON.parse(bytes);
      if (sha(bytes) !== report.report_sha256) authorityErrors.push(`authoritative report hash mismatch: ${report.validation_id}`);
      if (parsed.status !== report.report_status || report.report_status !== "pass") authorityErrors.push(`authoritative report is not PASS: ${report.validation_id}`);
      if (!report.superseded_reason || !report.superseded_report_paths?.length) authorityErrors.push(`superseded report metadata is incomplete: ${report.validation_id}`);
      for (const superseded of report.superseded_report_paths ?? []) await access(safePackagePath(root, superseded));
    } catch (error) {
      authorityErrors.push(error.message);
    }
  }
  errors.push(...authorityErrors);
  return {
    status: errors.length ? "blocked" : "pass",
    package_id: manifest.package_id,
    metadata_consistency: { status: errors.some((error) => !authorityErrors.includes(error)) ? "blocked" : "pass", errors: errors.filter((error) => !authorityErrors.includes(error)) },
    validation_authority: { status: authorityErrors.length ? "blocked" : "pass", validation_run_id: index.validation_run_id, errors: authorityErrors },
    errors
  };
}
