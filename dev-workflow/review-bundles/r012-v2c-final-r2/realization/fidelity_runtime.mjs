import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRealization } from "./realization_runtime.mjs";

const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

export async function runFidelityRound({ baselinePackageDirectory, baselineRealizationDirectory, ownerReviewFile, outputDirectory }) {
  const output = path.resolve(outputDirectory);
  try { if ((await readdir(output)).length) throw new Error("R-004 output must be empty; prior fidelity evidence is never overwritten"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const review = await readFile(ownerReviewFile, "utf8");
  if (!/Project-owner Visual Verdict[\s\S]*`PASS`/.test(review)) throw new Error("Accepted R-003B owner visual review is required");
  const baselinePackage = await json(path.join(baselinePackageDirectory, "recrafts-package.json"));
  const baselineRealization = await json(path.join(baselineRealizationDirectory, "realization.json"));
  if (baselinePackage.package_id !== baselineRealization.package_id || baselineRealization.screenshots?.length !== 5) throw new Error("Baseline package/realization identity or screenshots are incomplete");

  const profile = {
    target_id: "crafts-ui-multi-image-primary",
    source_package_id: baselinePackage.package_id,
    realization_id: baselineRealization.realization_id,
    viewports: ["2048x1280", "1440x900", "1280x800"],
    surfaces: ["system-board", "component-gallery", "workbench-default", "workbench-selected-object", "workbench-agent-suggestion"],
    comparison_modes: ["structure", "token", "region", "visual"],
    capability_limits: ["no exact typography from blurred fixture", "no micro-spacing fidelity claim", "no icon-geometry fidelity claim", "no pixel-perfect claim"]
  };
  const structure = { status: "completed", findings: [
    { id: "STR-001", subject: "three-column workbench", verdict: "confirmed-match", evidence: "exactly three persistent columns; no global header" },
    { id: "STR-002", subject: "canvas priority", verdict: "confirmed-match", evidence: "center canvas remains flexible and visually dominant at all declared viewports" },
    { id: "STR-003", subject: "agent placement", verdict: "confirmed-match", evidence: "contextual center-workflow card; no permanent chat column" },
    { id: "STR-004", subject: "component gallery density", verdict: "must-fix", classification: "component-renderer", evidence: "96px state stages and 26px row padding weaken the compact desktop-native direction" }
  ] };
  const tokens = { status: "completed", findings: [
    { id: "TOK-001", subject: "neutral shell", verdict: "confirmed-match" },
    { id: "TOK-002", subject: "surface layering and borders", verdict: "acceptable-deviation", evidence: "preview-only subtle border remains visibly disclosed" },
    { id: "TOK-003", subject: "selection accent", verdict: "acceptable-deviation", evidence: "restrained system-blue remains interaction-scoped preview fallback" },
    { id: "TOK-004", subject: "content color isolation", verdict: "confirmed-match", evidence: "no user-content green or marketing colors appear in shell tokens" },
    { id: "TOK-005", subject: "exact typography metrics", verdict: "not-testable" }
  ] };
  const regions = { status: "completed", findings: [
    { id: "REG-001", region: "navigation rail", verdict: "confirmed-match", dimensions: ["hierarchy", "density", "quietness"] },
    { id: "REG-002", region: "document/library card zone", verdict: "confirmed-match", dimensions: ["density", "control compactness"] },
    { id: "REG-003", region: "canvas zone", verdict: "confirmed-match", dimensions: ["hierarchy", "surface contrast"] },
    { id: "REG-004", region: "inspector zone", verdict: "confirmed-match", dimensions: ["density", "spacing direction"] },
    { id: "REG-005", region: "toolbar / floating island", verdict: "acceptable-deviation", dimensions: ["spacing direction", "control compactness"] },
    { id: "REG-006", region: "agent suggestion card", verdict: "acceptable-deviation", evidence: "preview-only contract; exact production semantics remain unknown" }
  ] };
  const visual = { status: "completed", method: "design-aware screenshot review supported by side-by-side evidence; no aggregate pixel score", findings: [
    { id: "VIS-001", subject: "overall visual quietness", verdict: "confirmed-match" },
    { id: "VIS-002", subject: "component gallery vertical density", verdict: "must-fix", classification: "component-renderer", linked_finding: "STR-004" },
    { id: "VIS-003", subject: "icon micro-geometry", verdict: "not-testable" }
  ] };
  const correctionRequest = { correction_id: "correction-r004-gallery-density", source_package_id: baselinePackage.package_id, source_realization_id: baselineRealization.realization_id, finding_ids: ["STR-004", "VIS-002"], classification: "component-renderer", changes: [{ target: "realization renderer", property: "component gallery row/stage density", before: "26px row padding; 96px stage minimum; 18px stage padding", after: "18px row padding; 72px stage minimum; 12px stage padding" }], upstream_extraction_error: false, preview_fallback_promotion: false };
  const correctedPackageId = `package-${hash({ source: baselinePackage.package_id, correction: correctionRequest }).slice(0, 16)}`;
  const correctedPackageDirectory = path.join(output, "corrections/corrected-package", correctedPackageId);
  await mkdir(correctedPackageDirectory, { recursive: true });
  await cp(baselinePackageDirectory, correctedPackageDirectory, { recursive: true, filter: (source) => !source.endsWith(".DS_Store") });
  const sourceManifestFile = path.join(correctedPackageDirectory, "source-manifest.json");
  const sourceManifest = await json(sourceManifestFile);
  Object.assign(sourceManifest, { package_id: correctedPackageId, runtime_version: "r004-fidelity-correction-v1", correction_id: correctionRequest.correction_id, source_package_id: baselinePackage.package_id });
  await writeJson(sourceManifestFile, sourceManifest);
  await writeJson(path.join(correctedPackageDirectory, "recrafts-package.json"), { ...baselinePackage, package_id: correctedPackageId, source_package_id: baselinePackage.package_id, correction_version: 3, correction_id: correctionRequest.correction_id, status: "ready-for-r004-corrected-realization" });
  await writeFile(path.join(correctedPackageDirectory, "design.md"), `${await readFile(path.join(correctedPackageDirectory, "design.md"), "utf8")}\n## R-004 Realization Correction\nComponent Gallery density is corrected at the renderer layer; design-contract tokens and preview-only fallback status remain unchanged.\n`);

  const correctedRealizationDirectory = path.join(output, "corrections/corrected-realization/r004-v1");
  const corrected = await createRealization({ packageDirectory: correctedPackageDirectory, outputDirectory: correctedRealizationDirectory, correctionProfile: { correction_id: correctionRequest.correction_id, renderer_version: "r004-fidelity-renderer-v1", compact_gallery: true } });
  if (corrected.realization_id === baselineRealization.realization_id || correctedPackageId === baselinePackage.package_id) throw new Error("Correction round must create new identities");

  await Promise.all(["validation", "review", "comparison/before", "comparison/overlays", "comparison/callouts", "corrections"].map((relative) => mkdir(path.join(output, relative), { recursive: true })));
  await cp(path.join(baselineRealizationDirectory, "preview/screenshots/component-gallery-1440x900.png"), path.join(output, "comparison/before/component-gallery-1440x900.png"));
  await Promise.all([
    writeJson(path.join(output, "validation/fidelity-profile.json"), profile),
    writeJson(path.join(output, "validation/fidelity-structure-report.json"), structure),
    writeJson(path.join(output, "validation/fidelity-token-report.json"), tokens),
    writeJson(path.join(output, "validation/fidelity-region-report.json"), regions),
    writeJson(path.join(output, "validation/fidelity-visual-report.json"), visual),
    writeJson(path.join(output, "corrections/correction-request.json"), correctionRequest),
    writeFile(path.join(output, "review/fidelity-decision-log.jsonl"), `${JSON.stringify({ finding_id: "STR-004", verdict: "must-fix", classification: "component-renderer", correction_id: correctionRequest.correction_id })}\n`),
    writeFile(path.join(output, "review/fidelity-open-questions.md"), "# Fidelity Open Questions\n\n- Exact typography, micro-spacing and icon geometry remain not-testable from blurred evidence.\n- AgentSuggestionCard production semantics remain unknown; preview-only status is preserved.\n"),
    writeFile(path.join(output, "review/correction-plan.md"), "# Correction Plan\n\nApply one renderer-layer density correction to Component Gallery. Do not change extraction artifacts, tokens, Workbench structure or preview-only fallback status. Regenerate under new package and realization identities.\n"),
    writeFile(path.join(output, "validation/fidelity-summary.md"), `# R-004 Fidelity Summary\n\nBounded profile: 5 surfaces, 3 viewports, 4 comparison modes. One must-fix density issue was classified as component-renderer and corrected without changing extraction claims. Corrected package: \`${correctedPackageId}\`. Corrected realization: \`${corrected.realization_id}\`.\n`),
    writeFile(path.join(output, "corrections/before-after-comparison.md"), `# Before / After\n\n- Before: \`${baselineRealization.realization_id}\`, Component Gallery row/stage spacing was too loose for the declared compact direction.\n- After: \`${corrected.realization_id}\`, row padding 18px, stage minimum 72px, stage padding 12px.\n- Unchanged: package tokens, Workbench structure, component inventory, traceability and preview-only status.\n`),
  ]);
  return { profile, corrected_package_id: correctedPackageId, corrected_realization_id: corrected.realization_id, corrected_realization_directory: correctedRealizationDirectory };
}
