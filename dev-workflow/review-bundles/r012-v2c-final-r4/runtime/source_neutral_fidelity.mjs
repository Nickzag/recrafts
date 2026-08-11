import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

export async function validateSourceNeutralFidelity(directory) {
  const realization = await readJson(path.join(directory, "realization.json"));
  const compiled = await readJson(path.join(directory, realization.compiled_contract));
  const failures = [];
  for (const [file, expected] of Object.entries(compiled.contract_hashes)) {
    const actual = sha(await readFile(path.join(directory, realization.contract_snapshot, file)));
    if (actual !== expected) failures.push(`contract hash mismatch: ${file}`);
  }
  for (const [file, expected] of Object.entries(compiled.preview_file_hashes)) {
    const actual = sha(await readFile(path.join(directory, file)));
    if (actual !== expected) failures.push(`preview hash mismatch: ${file}`);
  }
  await access(path.join(directory, realization.preview_root, "capture-manifest.json"));
  if (compiled.fidelity_basis !== "accepted-portable-contract") failures.push("fidelity basis is not the accepted portable contract");
  if (!compiled.owner_decision_set_id) failures.push("owner decision lineage is missing");
  return { status: failures.length ? "failed" : "passed", realization_id: realization.realization_id, package_id: realization.package_id, fidelity_basis: compiled.fidelity_basis, contract_count: Object.keys(compiled.contract_hashes).length, preview_count: Object.keys(compiled.preview_file_hashes).length, failures };
}
