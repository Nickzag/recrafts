import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = ["realization/package_loader.mjs","realization/preflight.mjs","realization/token_compiler.mjs","realization/component_renderer.mjs","realization/surface_composer.mjs","schemas/realization-package.schema.json","schemas/realization-readiness.schema.json","examples/golden-candidates/crafts-ui-multi-image/generated/validation/extraction-quality-summary.json","examples/golden-candidates/crafts-ui-multi-image/generated/validation/realization-readiness.json","dev-workflow/evidence/r-002/audit-bundle/README.md"];
const failures = required.filter((file) => !existsSync(path.join(root, file))).map((file) => `missing ${file}`);
if (!failures.length) {
  const readiness = JSON.parse(readFileSync(path.join(root, "examples/golden-candidates/crafts-ui-multi-image/generated/validation/realization-readiness.json"), "utf8"));
  if (readiness.status !== "blocked" || readiness.canonical_visual_generation_authorized !== false || !readiness.blockers.includes("project-owner-extraction-review-pending")) failures.push("canonical visual generation must remain blocked pending owner review");
  const previewRoot = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/generated/preview");
  if (existsSync(previewRoot)) failures.push("canonical preview exists before preflight approval");
}
if (failures.length) { console.error(`R-003 preflight validation failed (${failures.length})`); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("R-003 preflight validation passed: scaffolding ready, canonical visual generation blocked");
