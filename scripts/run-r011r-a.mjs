import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { prepareVisualRecovery, submitVisualObservations } from "../runtime/visual_recovery_a.mjs";

const arg = (flag, fallback) => { const index = process.argv.indexOf(flag); return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback; };
const sourceRoot = arg("--sources", ".local-benchmark-sources/craft-notes-v1");
const preparedDirectory = arg("--prepared", path.join(sourceRoot, "prepared-r011r-a"));
const outputDirectory = arg("--output", "examples/golden-candidates/craft-product-ui-r011r/evidence-package");
const observationsFile = arg("--host", "/private/tmp/craftdo-r011r-a-observations.json");
const sourcePackId = arg("--source-pack-id", "craft-notes-v1");
const families = ["workspace-grid", "workspace-list", "workspace-grid-alt", "editor-focus", "editor-context", "page-info", "style-gallery", "review-actions", "template-gallery", "settings", "premium-dialog", "document-editor", "workspace-empty"];

async function ensureMissing(directory) {
  try { await access(directory); throw new Error("Output directory already exists; use a fresh isolated directory: " + directory); } catch (error) { if (error.code !== "ENOENT") throw error; }
}

await ensureMissing(preparedDirectory);
await ensureMissing(outputDirectory);
const sources = families.map((screenId, index) => ({ path: path.join(sourceRoot, "source-" + (index + 1) + ".png"), screen_id: screenId, screen_family: screenId, platform: "macOS desktop", viewport: "native", source_role: "product-app-screenshot", known_state_labels: ["default", "selected", "active"] }));
const prepared = await prepareVisualRecovery({ sources, sourcePackId, outputDirectory: preparedDirectory });
const create = spawnSync(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname), "create-r011r-a-observations.mjs"), "--sources", sourceRoot, "--output", observationsFile, "--prepared-id", prepared.prepared_visual_recovery_id, "--source-pack-id", sourcePackId], { stdio: "inherit" });
if (create.status !== 0) throw new Error("Observation fixture generation failed");
const observations = JSON.parse(await readFile(observationsFile, "utf8"));
if (observations.prepared_visual_recovery_id !== prepared.prepared_visual_recovery_id) throw new Error("Prepared ID mismatch in generated observations");
const submitted = await submitVisualObservations({ preparedDirectory, observationsFile, outputDirectory });
console.log(JSON.stringify({ prepared, submitted, prepared_directory: preparedDirectory, output_directory: outputDirectory, observations_file: observationsFile }, null, 2));
