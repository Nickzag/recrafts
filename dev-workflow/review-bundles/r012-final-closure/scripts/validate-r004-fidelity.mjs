import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_VIEWPORTS = new Set(["2048x1280", "1440x900", "1280x800"]);
const ALLOWED_SURFACES = new Set(["system-board", "component-gallery", "workbench-default", "workbench-selected-object", "workbench-agent-suggestion"]);
const REQUIRED = ["fidelity-profile.json", "fidelity-structure-report.json", "fidelity-token-report.json", "fidelity-region-report.json", "fidelity-visual-report.json"];

export async function validateFidelity(directory, { writeReport = true } = {}) {
  const read = (relative) => readFile(path.join(directory, relative), "utf8");
  const missing = [];
  for (const relative of [...REQUIRED.map((file) => `validation/${file}`), "validation/fidelity-summary.md", "review/fidelity-open-questions.md", "review/fidelity-decision-log.jsonl", "review/correction-plan.md", "corrections/correction-request.json", "corrections/before-after-comparison.md", "comparison/diff-contact-sheet.png"]) if (!existsSync(path.join(directory, relative))) missing.push(relative);
  if (missing.length) return { status: "failed", failures: missing.map((file) => `missing:${file}`) };
  const profile = JSON.parse(await read("validation/fidelity-profile.json"));
  const request = JSON.parse(await read("corrections/correction-request.json"));
  const correctedPackages = (await readdir(path.join(directory, "corrections/corrected-package"))).filter((name) => name.startsWith("package-"));
  const correctedRealization = JSON.parse(await read("corrections/corrected-realization/r004-v1/realization.json"));
  const corpus = (await Promise.all(["validation/fidelity-summary.md", "review/fidelity-open-questions.md", "review/correction-plan.md", "corrections/before-after-comparison.md"].map(read))).join("\n");
  const checks = {
    bounded_viewports: profile.viewports?.length > 0 && profile.viewports.every((item) => ALLOWED_VIEWPORTS.has(item)),
    bounded_surfaces: profile.surfaces?.length > 0 && profile.surfaces.every((item) => ALLOWED_SURFACES.has(item)),
    comparison_modes: ["structure", "token", "region", "visual"].every((mode) => profile.comparison_modes?.includes(mode)),
    capability_limits: profile.capability_limits?.includes("no pixel-perfect claim"),
    serialized_correction: request.correction_id && request.classification === "component-renderer" && request.upstream_extraction_error === false,
    new_package_identity: correctedPackages.length === 1 && correctedPackages[0] !== profile.source_package_id,
    new_realization_identity: correctedRealization.realization_id !== profile.realization_id,
    before_after: existsSync(path.join(directory, "comparison/before/component-gallery-1440x900.png")) && existsSync(path.join(directory, "comparison/callouts/component-gallery-density.md")),
    no_unsupported_claim: !/(?:100% clone|perfect recreation|exact match|exact[- ]pixel|exact[- ]font|pixel-perfect recreation|production[- ]ready)/i.test(corpus),
    no_oracle: !/(?:^|[/'"])oracle(?:[/'"]|$)|expected-/i.test(corpus),
    no_direct_integration: !/(?:from\s+['"]|src=['"])[^'"]*(?:CraftsOS|layoutcrafts)/i.test(corpus),
    no_fallback_promotion: request.preview_fallback_promotion === false,
  };
  const result = { status: Object.values(checks).every(Boolean) ? "passed" : "failed", profile_id: profile.target_id, corrected_package_id: correctedPackages[0], corrected_realization_id: correctedRealization.realization_id, checks, failures: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key) };
  if (writeReport) await writeFile(path.join(directory, "validation/fidelity-readiness.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1]?.endsWith("validate-r004-fidelity.mjs")) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: node scripts/validate-r004-fidelity.mjs <fidelity-dir>");
  const result = await validateFidelity(path.resolve(directory));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "passed") process.exitCode = 1;
}
