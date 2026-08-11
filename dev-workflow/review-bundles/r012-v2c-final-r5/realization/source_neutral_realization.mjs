import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

export async function createSourceNeutralRealization({ packageDirectory, previewDirectory, outputDirectory }) {
  const manifest = await readJson(path.join(packageDirectory, "recrafts-package.json"));
  const delivery = await readJson(path.join(packageDirectory, "delivery-readiness.json"));
  const artifactSet = await readJson(path.join(packageDirectory, "artifact-set.json"));
  const captureManifest = await readJson(path.join(previewDirectory, "capture-manifest.json"));
  if (manifest.status !== "accepted" || !["pilot-ready", "production-ready"].includes(delivery.status) || delivery.owner_visual_review !== true) {
    throw Object.assign(new Error("Accepted pilot-ready package is required before source-neutral realization"), { code: "REALIZATION_NOT_AUTHORIZED" });
  }
  await mkdir(path.join(outputDirectory, "contract-snapshot"), { recursive: true });
  for (const artifact of artifactSet.artifacts) {
    const target = path.join(outputDirectory, "contract-snapshot", artifact.path);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(packageDirectory, artifact.path), target);
  }
  await cp(previewDirectory, path.join(outputDirectory, "previews"), { recursive: true });
  const previewFileHashes = {};
  for (const item of captureManifest.results) {
    const relative = item.file.replace(/^previews\//, "");
    previewFileHashes[item.file] = sha(await readFile(path.join(previewDirectory, relative)));
  }
  const ownerDecisionId = artifactSet.decision_ids.at(-1);
  const realizationId = `realization-${sha(JSON.stringify({ package_id: manifest.package_id, artifact_set_id: artifactSet.artifact_set_id, owner_decision_id: ownerDecisionId, preview_file_hashes: previewFileHashes })).slice(0, 16)}`;
  const compiled = {
    realization_id: realizationId,
    package_id: manifest.package_id,
    artifact_set_id: artifactSet.artifact_set_id,
    owner_decision_set_id: ownerDecisionId,
    delivery_readiness: delivery.status,
    fidelity_basis: "accepted-portable-contract",
    contract_hashes: artifactSet.artifact_hashes,
    preview_file_hashes: previewFileHashes
  };
  await writeJson(path.join(outputDirectory, "compiled-contract.json"), compiled);
  await writeJson(path.join(outputDirectory, "realization.json"), {
    realization_id: realizationId,
    realization_kind: "source-neutral-portable-system",
    package_id: manifest.package_id,
    artifact_set_id: artifactSet.artifact_set_id,
    owner_decision_set_id: ownerDecisionId,
    delivery_readiness: delivery.status,
    preview_count: captureManifest.results.length,
    compiled_contract: "compiled-contract.json",
    contract_snapshot: "contract-snapshot",
    preview_root: "previews"
  });
  return { realization_id: realizationId, approved_package_id: manifest.package_id, owner_decision_set_id: ownerDecisionId, preview_count: captureManifest.results.length };
}
