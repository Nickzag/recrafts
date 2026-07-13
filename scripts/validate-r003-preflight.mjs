import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const corrected = "examples/golden-candidates/crafts-ui-multi-image/packages/package-ffa63ca8b0ea69af";
const required = ["realization/package_loader.mjs","realization/preflight.mjs","realization/token_compiler.mjs","realization/component_renderer.mjs","realization/surface_composer.mjs","schemas/realization-package.schema.json","schemas/realization-readiness.schema.json",`${corrected}/validation/extraction-quality-summary.json`,`${corrected}/validation/critical-system-coverage.json`,`${corrected}/validation/realization-readiness.json`,"dev-workflow/evidence/r-002/audit-bundle/README.md","dev-workflow/evidence/r-002/audit-bundle/review-evidence/source-contact-sheet-redacted.png","dev-workflow/evidence/r-002/audit-bundle/review-evidence/artifact-to-source-map.html"];
const failures = required.filter((file) => !existsSync(path.join(root, file))).map((file) => `missing ${file}`);
if (!failures.length) {
  const readiness = JSON.parse(readFileSync(path.join(root, corrected, "validation/realization-readiness.json"), "utf8"));
  if (!["ready","ready-with-warnings"].includes(readiness.status) || readiness.canonical_visual_generation_authorized !== true) failures.push("corrected package has not passed R-003B preflight");
  const coverage = JSON.parse(readFileSync(path.join(root, corrected, "validation/critical-system-coverage.json"), "utf8"));
  if (coverage.status !== "passed" || coverage.missing.length) failures.push("critical system coverage is incomplete");
  const previewRoot = path.join(root, corrected, "preview");
  if (existsSync(previewRoot)) failures.push("R-003B preview exists before visual design approval");
}
if (failures.length) { console.error(`R-003 preflight validation failed (${failures.length})`); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("R-003 preflight validation passed: five blockers closed, R-003B authorized, visual output awaits approved design spec");
