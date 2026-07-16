import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CANONICAL = ["design.md", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json"];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function loadCraftsOSArtifactSet(packageDirectory) {
  const root = path.resolve(packageDirectory);
  const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), "utf8"));
  const [manifest, artifactSet, source, evidence, tokens, components, conflicts] = await Promise.all([
    readJson("recrafts-package.json"), readJson("artifact-set.json"), readJson("source-manifest.json"),
    readJson("evidence-map.json"), readJson("tokens.json"), readJson("components.json"), readJson("conflicts.json")
  ]);
  if (manifest.protocol_version !== "1.1" || manifest.schema_version !== "3.0.0" || manifest.status !== "accepted") throw new Error("CraftsOS import requires an accepted Recrafts Protocol 1.1 / Schema 3.0.0 package.");
  if (artifactSet.status !== "accepted" || artifactSet.package_id !== manifest.package_id || artifactSet.artifact_set_id !== manifest.artifact_set_id) throw new Error("Recrafts package and Artifact Set identity mismatch.");
  if ((source.sources ?? []).some((item) => !["ready", "complete"].includes(item.status))) throw new Error("Partial, blocked, or stale source cannot enter CraftsOS import.");
  const evidenceIds = new Set((evidence.evidence ?? []).map((item) => item.evidence_id));
  for (const item of [...(tokens.tokens ?? []), ...(components.components ?? [])]) if (!item.evidence_refs?.length || item.evidence_refs.some((ref) => !evidenceIds.has(ref))) throw new Error(`Invalid evidence refs for ${item.token_id ?? item.component_id}.`);
  for (const name of CANONICAL) {
    const bytes = await readFile(path.join(root, name));
    if (artifactSet.artifact_hashes?.[name] !== sha(bytes)) throw new Error(`Artifact hash mismatch: ${name}`);
  }
  return {
    adapter_version: "1.0.0",
    protocol_version: manifest.protocol_version,
    schema_version: manifest.schema_version,
    package_id: manifest.package_id,
    artifact_set_id: artifactSet.artifact_set_id,
    status: artifactSet.status,
    source_capture_ids: artifactSet.source_capture_ids,
    correction_ids: artifactSet.correction_ids,
    decision_ids: artifactSet.decision_ids,
    tokens: structuredClone(tokens.tokens ?? []),
    components: structuredClone(components.components ?? []),
    conflicts: structuredClone(conflicts.conflicts ?? []),
    evidence_ids: [...evidenceIds],
    artifact_hashes: structuredClone(artifactSet.artifact_hashes),
    source_artifact_refs: CANONICAL.map((name) => `recrafts://${manifest.package_id}/${name}#sha256=${artifactSet.artifact_hashes[name]}`),
    unsupported_fields: ["grid-rules.json", "layout-rules.json", "visual-grammar.json"].map((name) => ({ path: name, sha256: artifactSet.artifact_hashes[name], policy: "preserve-without-loss" })),
    workspace_promotion: false,
    production_ready: false
  };
}
