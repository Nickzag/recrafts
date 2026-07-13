import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const artifactSchema = loadSchema(new URL("../contracts/artifact-set.schema.json", import.meta.url));
const lineageSchema = loadSchema(new URL("../contracts/package-lineage.schema.json", import.meta.url));
const correctionSchema = loadSchema(new URL("../contracts/correction.schema.json", import.meta.url));
const decisionSchema = loadSchema(new URL("../contracts/artifact-decision.schema.json", import.meta.url));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (root, file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const fail = (message) => { throw Object.assign(new Error(message), { code: "PACKAGE_INVALID" }); };

export async function validateR007Package(root) {
  const manifest = await readJson(root, "recrafts-package.json"); const set = await readJson(root, "artifact-set.json"); const lineage = await readJson(root, "lineage.json");
  assertSchema(set, artifactSchema, "Artifact Set"); assertSchema(lineage, lineageSchema, "Package lineage");
  if (set.package_id !== manifest.package_id || lineage.package_id !== manifest.package_id || set.artifact_set_id !== manifest.artifact_set_id) fail("Package, Artifact Set and lineage identities diverge");
  if (lineage.artifact_set_hash !== sha(await readFile(path.join(root, "artifact-set.json")))) fail("Lineage Artifact Set hash mismatch");
  for (const artifact of set.artifacts) {
    const actual = sha(await readFile(path.join(root, artifact.path)));
    if (actual !== artifact.sha256 || set.artifact_hashes[artifact.path] !== actual) fail(`Artifact hash mismatch: ${artifact.path}`);
  }
  for (const file of ["evidence-map.json", "claims.json"]) {
    const current = sha(await readFile(path.join(root, file))); const initial = sha(await readFile(path.join(root, "extraction-snapshot", file)));
    if (current !== initial) fail(`${file} differs from immutable extraction snapshot`);
  }
  const evidence = (await readJson(root, "evidence-map.json")).evidence; const claims = (await readJson(root, "claims.json")).claims;
  const evidenceIds = new Set(evidence.map((item) => item.evidence_id)); const claimIds = new Set(claims.map((item) => item.claim_id));
  const domains = [];
  for (const [file, key] of [["tokens.json", "tokens"], ["components.json", "components"], ["grid-rules.json", "grid_rules"]]) for (const item of (await readJson(root, file))[key]) {
    if (!item.evidence_refs?.length || item.evidence_refs.some((ref) => !evidenceIds.has(ref))) fail(`${file} Evidence provenance invalid`);
    if (!item.claim_refs?.length || item.claim_refs.some((ref) => !claimIds.has(ref))) fail(`${file} Claim provenance invalid`);
    domains.push(item);
  }
  const conflicts = (await readJson(root, "conflicts.json")).conflicts; const conflictIds = new Set(conflicts.map((item) => item.conflict_id)); const domainIds = new Set(domains.map((item) => item.domain_id));
  for (const item of domains) if ((item.conflict_refs ?? []).some((ref) => !conflictIds.has(ref))) fail("Domain Conflict provenance invalid");
  for (const conflict of conflicts) if (conflict.evidence_refs.some((ref) => !evidenceIds.has(ref)) || conflict.candidate_refs.some((ref) => !domainIds.has(ref))) fail("Conflict provenance invalid");
  const corrections = (await readFile(path.join(root, "corrections.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(JSON.parse);
  for (const correction of corrections) { assertSchema(correction, correctionSchema, "Correction event"); if (!correction.decision_context || !Object.keys(correction.decision_context).length) fail("Correction lacks decision context"); }
  const decisions = (await readFile(path.join(root, "decisions.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(JSON.parse);
  for (const decision of decisions) assertSchema(decision, decisionSchema, "Artifact decision");
  if (manifest.status === "accepted") {
    if (conflicts.some((item) => item.severity === "high" && item.status === "open")) fail("Accepted package contains open high-impact conflict");
    if (evidence.some((item) => item.status === "stale")) fail("Accepted package contains stale mandatory Evidence");
    const source = await readJson(root, "source-manifest.json"); if ((source.sources ?? []).some((item) => item.status === "blocked")) fail("Accepted package contains blocked source");
    if (!decisions.length && lineage.event_type !== "rollback-created") fail("Accepted package lacks project-owner decision history");
  }
  return { status: "pass", package_id: manifest.package_id, package_status: manifest.status, artifact_set_id: set.artifact_set_id, correction_count: corrections.length, decision_count: decisions.length, lineage_event_type: lineage.event_type };
}
