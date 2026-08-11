import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadExtractionPackage(packageDirectory) {
  if (/oracle|expected-/i.test(packageDirectory)) throw new Error("Realization cannot load oracle or expected-* inputs");
  const required = ["source-manifest.json","source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md"];
  const artifacts = {};
  for (const file of required) {
    const body = await readFile(path.join(packageDirectory, file), "utf8");
    artifacts[file] = file.endsWith(".json") ? JSON.parse(body) : body;
  }
  const manifest = artifacts["source-manifest.json"];
  if (manifest.schema_version !== "2.1.0" || !manifest.capture_id || !manifest.analysis_id || !manifest.package_id) throw new Error("Unsupported or unversioned extraction package");
  return { directory: path.resolve(packageDirectory), artifacts, manifest };
}
