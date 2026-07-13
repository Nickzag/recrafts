import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkTokenCompliance } from "./check-r003-token-compliance.mjs";

const REQUIRED_STATES = ["default", "selected-object", "agent-suggestion"];
const REQUIRED_FILES = ["preview/system-board.html", "preview/component-gallery.html", "preview/surface-preview.html"];

const count = (text, pattern) => (text.match(pattern) ?? []).length;

export async function validateRealization(realizationDirectory, { writeReports = true } = {}) {
  const read = (relative) => readFile(path.join(realizationDirectory, relative), "utf8");
  const [manifestText, contractText, board, gallery, surface, previewJs, ...css] = await Promise.all([
    read("realization.json"), read("preview/runtime/compiled-contract.json"), ...REQUIRED_FILES.map(read),
    read("preview/runtime/preview.js"),
    ...["tokens.css", "base.css", "components.css", "surfaces.css"].map((file) => read(`preview/runtime/${file}`)),
  ]);
  const manifest = JSON.parse(manifestText);
  const contract = JSON.parse(contractText);
  const allText = [board, gallery, surface, previewJs, ...css].join("\n");
  const evidence = new Set(contract.evidence_ids);
  const referencedEvidence = [...allText.matchAll(/data-evidence-refs="([^"]*)"/g)].flatMap((match) => match[1].split(/[ ,]+/).filter(Boolean));
  const unresolved = [...new Set(referencedEvidence.filter((id) => !evidence.has(id)))];
  const forbidden = {
    oracle_input: /(?:^|[/'"])oracle(?:[/'"]|$)/i.test(allText),
    remote_asset: /(?:src|href)="https?:\/\//i.test(allText),
    direct_craftsos_import: /(?:from\s+['"]|src=['"])[^'"]*(?:CraftsOS|layoutcrafts)/i.test(allText),
    fidelity_claim: /(?:pixel[- ]perfect|fidelity achieved|production[- ]ready|视觉还原完成)/i.test(allText),
  };
  const token = await checkTokenCompliance(realizationDirectory);
  const components = { status: contract.components.length + contract.preview_fallback_components.length >= 27 && count(gallery, /data-component-contract-id=/g) >= 27 ? "passed" : "failed", required: 27, contract_count: contract.components.length + contract.preview_fallback_components.length, rendered_count: count(gallery, /data-component-contract-id=/g) };
  const states = { status: count(gallery, /data-state-matrix=/g) >= 12 && REQUIRED_STATES.every((state) => surface.includes(`data-preview-state="${state}"`)) ? "passed" : "failed", required_state_matrices: 12, rendered_state_matrices: count(gallery, /data-state-matrix=/g), workbench_states: Object.fromEntries(REQUIRED_STATES.map((state) => [state, surface.includes(`data-preview-state="${state}"`)])) };
  const traceability = { status: unresolved.length === 0 && count(allText, /data-component-contract-id=/g) > 0 && count(allText, /data-token-ids=/g) > 0 ? "passed" : "failed", referenced_evidence_count: referencedEvidence.length, unresolved_evidence_refs: unresolved };
  const screenshotChecks = await Promise.all((manifest.screenshots ?? []).map(async ({ file, viewport }) => {
    const png = await readFile(path.join(realizationDirectory, file));
    const dimensions = png.length >= 24 && png.subarray(1, 4).toString() === "PNG" ? `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}` : null;
    return png.length > 1000 && dimensions === viewport;
  }));
  const checks = { artifact_files: REQUIRED_FILES.every((file) => manifest.artifacts.includes(file)), required_screenshots: screenshotChecks.length === 5 && screenshotChecks.every(Boolean), three_columns: count(surface, /data-workbench-column=/g) === 3, no_global_header: !/<header\b/i.test(surface), ...Object.fromEntries(Object.entries(forbidden).map(([key, found]) => [key, !found])), token_compliance: token.status === "passed", component_coverage: components.status === "passed", state_coverage: states.status === "passed", traceability: traceability.status === "passed" };
  const result = { realization_id: manifest.realization_id, package_id: contract.package_id, status: Object.values(checks).every(Boolean) ? "passed" : "failed", checks };
  if (writeReports) {
    const validation = path.join(realizationDirectory, "validation");
    await Promise.all([
      writeFile(path.join(validation, "token-compliance.json"), `${JSON.stringify(token, null, 2)}\n`),
      writeFile(path.join(validation, "component-coverage.json"), `${JSON.stringify(components, null, 2)}\n`),
      writeFile(path.join(validation, "state-coverage.json"), `${JSON.stringify(states, null, 2)}\n`),
      writeFile(path.join(validation, "traceability-report.json"), `${JSON.stringify(traceability, null, 2)}\n`),
      writeFile(path.join(validation, "realization-readiness.json"), `${JSON.stringify(result, null, 2)}\n`),
    ]);
  }
  return result;
}

if (process.argv[1]?.endsWith("validate-r003-realization.mjs")) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: node scripts/validate-r003-realization.mjs <realization-dir>");
  const result = await validateRealization(path.resolve(directory));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "passed") process.exitCode = 1;
}
