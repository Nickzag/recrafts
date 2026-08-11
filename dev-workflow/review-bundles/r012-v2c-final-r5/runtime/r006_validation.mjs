import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const evidenceSchema = loadSchema(new URL("../schemas/evidence-record.schema.json", import.meta.url));
const claimSchema = loadSchema(new URL("../schemas/claim-record.schema.json", import.meta.url));
const conflictSchema = loadSchema(new URL("../schemas/conflict-record.schema.json", import.meta.url));
const read = async (root, file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const fail = (message) => { throw Object.assign(new Error(message), { code: "PACKAGE_INVALID" }); };

export async function validateR006Package(root) {
  const manifest = await read(root, "recrafts-package.json");
  if (manifest.schema_version !== "3.0.0" || manifest.protocol_version !== "1.1") fail("R-006 package version mismatch");
  if (["accepted", "rolled-back"].includes(manifest.status)) fail("R-006 cannot emit accepted or rolled-back state");
  const evidence = (await read(root, "evidence-map.json")).evidence;
  for (const item of evidence) {
    assertSchema(item, evidenceSchema, "Evidence record");
    if (/host|model/i.test(item.evidence_type)) fail("Host output cannot be Evidence");
    if (item.evidence_type === "screenshot-region" && !item.parent_evidence_id) fail("Screenshot region lacks parent screenshot");
  }
  const evidenceIds = new Set(evidence.map((item) => item.evidence_id));
  if (evidenceIds.size !== evidence.length) fail("Duplicate Evidence ID");
  const claims = (await read(root, "claims.json")).claims;
  for (const item of claims) { assertSchema(item, claimSchema, "Claim record"); if (item.evidence_refs.some((ref) => !evidenceIds.has(ref))) fail("Claim references unknown Evidence"); }
  const claimIds = new Set(claims.map((item) => item.claim_id));
  const domains = [];
  for (const [file, key] of [["tokens.json", "tokens"], ["components.json", "components"], ["grid-rules.json", "grid_rules"]]) {
    for (const item of (await read(root, file))[key]) {
      if (!item.evidence_refs?.length || item.evidence_refs.some((ref) => !evidenceIds.has(ref))) fail(`${key} provenance is invalid`);
      if (!item.claim_refs?.length || item.claim_refs.some((ref) => !claimIds.has(ref))) fail(`${key} Claim provenance is invalid`);
      domains.push(item);
    }
  }
  const domainIds = new Set(domains.map((item) => item.domain_id));
  const conflicts = (await read(root, "conflicts.json")).conflicts;
  for (const item of conflicts) {
    assertSchema(item, conflictSchema, "Conflict record");
    if (item.evidence_refs.some((ref) => !evidenceIds.has(ref)) || item.candidate_refs.some((ref) => !domainIds.has(ref))) fail("Conflict reference integrity failed");
  }
  if (conflicts.some((item) => item.severity === "high" && item.status === "open") && manifest.status !== "blocked") fail("Open high-impact conflict must block package");
  const stale = evidence.some((item) => item.status === "stale");
  if (stale && manifest.status !== "blocked") fail("Stale mandatory Evidence must block package");
  return { status: "pass", package_id: manifest.package_id, schema_version: manifest.schema_version, evidence_count: evidence.length, claim_count: claims.length, domain_count: domains.length, conflict_count: conflicts.length };
}
