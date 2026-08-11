import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRealization } from "../realization/realization_runtime.mjs";
import { loadExtractionPackage } from "../realization/package_loader.mjs";
import { validateFidelity } from "../scripts/validate-r004-fidelity.mjs";
import { prepareAnalysis, submitAnalysis } from "./analysis_exchange.mjs";
import { prepareEvidenceAnalysis, submitEvidenceAnalysis } from "./evidence_truth.mjs";
import { importOwnerDecision } from "./owner_decision_import.mjs";
import { resolveSafeInput, resolveSafeOutput, toArtifactPath } from "./path_security.mjs";
import { validateR006Package } from "./r006_validation.mjs";
import { acceptArtifacts, rollbackPackage, submitCorrection } from "./package_evolution.mjs";
import { validateR007Package } from "./r007_validation.mjs";
import { createSourceNeutralRealization } from "../realization/source_neutral_realization.mjs";
import { validateSourceNeutralFidelity } from "./source_neutral_fidelity.mjs";
import { prepareVisualRecovery, submitVisualObservations } from "./visual_recovery_a.mjs";
import { DESIGN_OPERATIONS, executeDesignOperation } from "./design_system_runtime.mjs";

const hashFile = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const artifact = async ({ type, file, outputRoot, mediaType, schemaVersion = "2.1.0" }) => ({ type, path: toArtifactPath({ file, outputRoot }), sha256: await hashFile(file), media_type: mediaType, schema_version: schemaVersion });

export const OPERATION_CAPABILITIES = {
  capabilities: [],
  "prepare-analysis": ["files"],
  "submit-analysis": ["files", "structured-output"],
  "validate-package": ["files"],
  "generate-realization": ["files"],
  "verify-fidelity": ["files"],
  "submit-correction": ["files", "structured-output"],
  "accept-artifacts": ["files", "structured-output"],
  "rollback-package": ["files", "structured-output"],
  "prepare-visual-recovery": ["files"],
  "submit-visual-observations": ["files", "structured-output", "vision"],
  "generate-faithful-reconstruction": ["files", "vision"],
  "verify-source-fidelity": ["files"],
  "compile-portable-product-ui": ["files", "structured-output"],
  "generate-target-adaptation": ["files", "structured-output"],
  "parse-design-md": ["files"],
  "compile-design-ir": ["files", "structured-output"],
  "validate-design": ["files", "structured-output"],
  "render-design-preview": ["files"],
  "compare-design-candidates": ["files", "structured-output"],
  "import-design-owner-decision": ["files", "structured-output"],
  "create-design-release": ["files", "structured-output"],
  "validate-design-release": ["files", "structured-output"],
  "rollback-design-release": ["files", "structured-output"],
  "compare-design-releases": ["files", "structured-output"],
};
const LEGACY_OPERATIONS = ["capabilities", "prepare-analysis", "submit-analysis", "validate-package", "generate-realization", "verify-fidelity", "submit-correction", "accept-artifacts", "rollback-package"];

export async function executeOperation(request, workingRoot) {
  const input = request.input ?? {};
  if (DESIGN_OPERATIONS.includes(request.operation)) return executeDesignOperation(request, workingRoot);
  if (request.operation === "capabilities") {
    const legacy = request.protocol_version === "1.0" || request.protocol_version === "1.1";
    return { status: "completed", artifacts: [], validation: { protocol_version: legacy ? request.protocol_version : "1.2", compatible_versions: legacy ? ["1.0"] : ["1.0", "1.1"], schema_version: legacy ? "3.0.0" : "3.1.0", source_kinds: ["image","image-set","url"], operations: legacy ? LEGACY_OPERATIONS : Object.keys(OPERATION_CAPABILITIES), response_statuses: ["completed","completed_with_warnings","needs_host_action","failed"], embedded_vision_provider: false, browser_adapter: { command: "recraft-capture", engine: "playwright-chromium", browser_binary_prerequisite: "npx playwright install chromium" } } };
  }
  if (request.operation === "prepare-visual-recovery") {
    const sources = await Promise.all((input.sources ?? []).map(async (source) => ({ ...source, path: await resolveSafeInput({ value: source.path, workingRoot, allowedTypes: ["file"] }) })));
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: sources.map((source) => source.path) });
    const result = await prepareVisualRecovery({ sources, sourcePackId: input.source_pack_id, outputDirectory: output });
    const artifacts = await Promise.all(result.artifacts.map((file) => artifact({ type: path.basename(file, path.extname(file)), file: path.join(output, file), outputRoot: output, mediaType: file.endsWith(".md") ? "text/markdown" : "application/json", schemaVersion: "3.1.0" })));
    return { status: "needs_host_action", artifacts, validation: { prepared_visual_recovery_id: result.prepared_visual_recovery_id, semantic_analysis_completed: false, source_count: result.screen_count }, host_action: { type: "visual-observations", screen_manifest: "screen-manifest.json", region_preparation: "analysis/region-preparation.json", measurement_request: "analysis/measurement-request.json", response_schema: "contracts/product-ui-visual-observations.schema.json", required_capabilities: ["vision", "structured-output"] } };
  }
  if (request.operation === "submit-visual-observations") {
    const prepared = await resolveSafeInput({ value: input.prepared_visual_recovery_directory, workingRoot, allowedTypes: ["directory"] });
    const observations = await resolveSafeInput({ value: input.observations_file, workingRoot, allowedTypes: ["file"] });
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [prepared, observations] });
    const result = await submitVisualObservations({ preparedDirectory: prepared, observationsFile: observations, outputDirectory: output });
    const artifacts = await Promise.all(["r011r-a-evidence-package.json", "artifact-set.json", "screen-manifest.json", "region-manifest.json", "visual-measurements.json", "state-aware-color-observations.json", "source-observed-visual-tokens.json", "component-instances.json", "cross-screen-recurrence.json", "evidence-weighting-report.json", "unknowns.json"].map((file) => artifact({ type: path.basename(file, path.extname(file)), file: path.join(output, file), outputRoot: output, mediaType: "application/json", schemaVersion: "3.1.0" })));
    return { status: "completed_with_warnings", artifacts, validation: result, warnings: ["R-011R-A package awaits explicit project-owner review; downstream generation remains blocked"] };
  }
  if (["generate-faithful-reconstruction", "verify-source-fidelity", "compile-portable-product-ui", "generate-target-adaptation"].includes(request.operation)) {
    throw Object.assign(new Error("R-011R-A must be accepted before downstream recovery or adaptation operations are authorized"), { code: "R011_STAGE_BLOCKED" });
  }
  if (request.operation === "prepare-analysis") {
    if (request.protocol_version === "1.1" || request.protocol_version === "1.2") {
      const typed = [];
      for (const source of input.sources ?? []) {
        if (!source || typeof source !== "object" || Array.isArray(source)) throw Object.assign(new Error("Protocol 1.1 requires typed source objects"), { code: "SCHEMA_VALIDATION_FAILED" });
        if (source.kind === "image") typed.push({ kind: "image", file: await resolveSafeInput({ value: source.path, workingRoot, allowedTypes: ["file"] }) });
        else if (source.kind === "image-set") typed.push({ kind: "image-set", files: await Promise.all((source.paths ?? []).map((value) => resolveSafeInput({ value, workingRoot, allowedTypes: ["file"] }))) });
        else if (source.kind === "url") typed.push({ kind: "url", url: source.url, routes: source.routes, viewports: source.viewports, fixture: source.capture_fixture ? await resolveSafeInput({ value: source.capture_fixture, workingRoot, allowedTypes: ["file"] }) : null, captureRecord: source.browser_capture_record ? await resolveSafeInput({ value: source.browser_capture_record, workingRoot, allowedTypes: ["file"] }) : null });
        else throw Object.assign(new Error("Input kind must be image, image-set or url"), { code: "SCHEMA_VALIDATION_FAILED" });
      }
      const localInputs = typed.flatMap((source) => source.file ? [source.file] : source.files ? source.files : source.fixture ? [source.fixture] : source.captureRecord ? [source.captureRecord] : []);
      const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: localInputs });
      const result = await prepareEvidenceAnalysis({ sources: typed, outputDirectory: output });
      const artifacts = await Promise.all(result.artifacts.map((file) => artifact({ type: path.basename(file, path.extname(file)), file: path.join(output, file), outputRoot: output, mediaType: file.endsWith(".md") ? "text/markdown" : "application/json", schemaVersion: "3.0.0" })));
      if (result.sources.some((source) => source.status === "blocked")) return { status: "completed_with_warnings", artifacts, validation: { prepared_analysis_id: result.prepared_analysis_id, capture_status: "blocked", semantic_analysis_completed: false }, warnings: ["URL capture was blocked; no Host analysis is requested for fabricated evidence"] };
      return { status: "needs_host_action", artifacts, validation: { prepared_analysis_id: result.prepared_analysis_id, capture_status: result.capture_status, semantic_analysis_completed: false }, host_action: { type: "visual-analysis", instructions_file: "analysis/host-instructions.md", input_manifest: "analysis/input-manifest.json", evidence_bundle: "analysis/evidence-bundle.json", response_schema: "contracts/host-analysis.schema.json", required_capabilities: ["vision", "structured-output"] } };
    }
    const sources = await Promise.all((input.sources ?? []).map((value) => resolveSafeInput({ value, workingRoot, allowedTypes: ["file"] })));
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: sources });
    const result = await prepareAnalysis({ sources, outputDirectory: output });
    const artifacts = await Promise.all([
      artifact({ type: "input-manifest", file: path.join(output, result.artifacts[0]), outputRoot: output, mediaType: "application/json" }),
      artifact({ type: "host-instructions", file: path.join(output, result.artifacts[1]), outputRoot: output, mediaType: "text/markdown" }),
      artifact({ type: "evidence-bundle", file: path.join(output, result.artifacts[2]), outputRoot: output, mediaType: "application/json" }),
      ...result.sources.map((source) => artifact({ type: "prepared-source", file: path.join(output, source.path), outputRoot: output, mediaType: source.media_type })),
    ]);
    return { status: "needs_host_action", artifacts, validation: { prepared_analysis_id: result.prepared_analysis_id, semantic_analysis_completed: false }, host_action: { type: "visual-analysis", instructions_file: result.artifacts[1], input_manifest: result.artifacts[0], sources: result.sources, response_schema: "contracts/host-analysis.schema.json", required_capabilities: ["vision", "structured-output"] } };
  }
  if (request.operation === "submit-analysis") {
    const prepared = await resolveSafeInput({ value: input.prepared_analysis_directory, workingRoot, allowedTypes: ["directory"] });
    const hostAnalysis = await resolveSafeInput({ value: input.host_analysis_file, workingRoot, allowedTypes: ["file"] });
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [prepared, hostAnalysis] });
    const result = request.protocol_version === "1.1" || request.protocol_version === "1.2" ? await submitEvidenceAnalysis({ preparedAnalysisDirectory: prepared, hostAnalysisFile: hostAnalysis, outputDirectory: output }) : await submitAnalysis({ preparedAnalysisDirectory: prepared, hostAnalysisFile: hostAnalysis, outputDirectory: output });
    return { status: "completed_with_warnings", artifacts: [await artifact({ type: "design-contract", file: path.join(output, "design.md"), outputRoot: output, mediaType: "text/markdown" }), await artifact({ type: "extraction-package", file: path.join(output, "recrafts-package.json"), outputRoot: output, mediaType: "application/json" })], validation: result, warnings: ["Host-supplied analysis remains subject to project-owner visual review"] };
  }
  if (request.operation === "validate-package") {
    const directory = await resolveSafeInput({ value: input.package_directory, workingRoot, allowedTypes: ["directory"] });
    const candidate = JSON.parse(await readFile(path.join(directory, "recrafts-package.json"), "utf8"));
    try { await readFile(path.join(directory, "artifact-set.json")); return { status: "completed", artifacts: [], validation: await validateR007Package(directory) }; } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (candidate.schema_version === "3.0.0") return { status: "completed", artifacts: [], validation: await validateR006Package(directory) };
    const loaded = await loadExtractionPackage(directory);
    return { status: "completed", artifacts: [], validation: { package_id: loaded.manifest.package_id, schema_version: loaded.manifest.schema_version, valid: true } };
  }
  if (request.operation === "submit-correction") {
    const base = await resolveSafeInput({ value: input.base_package_directory, workingRoot, allowedTypes: ["directory"] });
    const correction = await resolveSafeInput({ value: input.correction_file, workingRoot, allowedTypes: ["file"] });
    const authority = input.authoritative_validation_report ? await resolveSafeInput({ value: input.authoritative_validation_report, workingRoot, allowedTypes: ["file"] }) : null;
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [base, correction, ...(authority ? [authority] : [])] });
    const result = await submitCorrection({ basePackageDirectory: base, correctionFile: correction, authoritativeValidationReport: authority, outputDirectory: output });
    return { status: "completed_with_warnings", artifacts: [await artifact({ type: "corrected-package", file: path.join(output, "recrafts-package.json"), outputRoot: output, mediaType: "application/json", schemaVersion: "3.0.0" })], validation: result, warnings: ["Corrected package still requires explicit artifact acceptance"] };
  }
  if (request.operation === "accept-artifacts") {
    const candidate = await resolveSafeInput({ value: input.candidate_package_directory, workingRoot, allowedTypes: ["directory"] });
    const decision = await resolveSafeInput({ value: input.decision_file, workingRoot, allowedTypes: ["file"] });
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [candidate, decision] });
    const result = await acceptArtifacts({ candidatePackageDirectory: candidate, decisionFile: decision, outputDirectory: output });
    return { status: "completed", artifacts: [await artifact({ type: "accepted-package", file: path.join(output, "recrafts-package.json"), outputRoot: output, mediaType: "application/json", schemaVersion: "3.0.0" })], validation: result };
  }
  if (request.operation === "rollback-package") {
    const current = await resolveSafeInput({ value: input.current_package_directory, workingRoot, allowedTypes: ["directory"] });
    const target = await resolveSafeInput({ value: input.restore_target_directory, workingRoot, allowedTypes: ["directory"] });
    const decision = await resolveSafeInput({ value: input.decision_file, workingRoot, allowedTypes: ["file"] });
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [current, target, decision] });
    const result = await rollbackPackage({ currentPackageDirectory: current, restoreTargetDirectory: target, decisionFile: decision, outputDirectory: output });
    return { status: "completed", artifacts: [await artifact({ type: "rollback-package", file: path.join(output, "recrafts-package.json"), outputRoot: output, mediaType: "application/json", schemaVersion: "3.0.0" })], validation: result };
  }
  if (request.operation === "generate-realization") {
    const directory = await resolveSafeInput({ value: input.package_directory, workingRoot, allowedTypes: ["directory"] });
    const sourceNeutralDelivery = await readFile(path.join(directory, "delivery-readiness.json"), "utf8").then(JSON.parse).catch(() => null);
    if (sourceNeutralDelivery) {
      const previews = await resolveSafeInput({ value: input.preview_directory ?? path.join(path.dirname(path.dirname(directory)), "previews"), workingRoot, allowedTypes: ["directory"] });
      const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [directory, previews] });
      const result = await createSourceNeutralRealization({ packageDirectory: directory, previewDirectory: previews, outputDirectory: output });
      return { status: "completed", artifacts: [await artifact({ type: "realization", file: path.join(output, "realization.json"), outputRoot: workingRoot, mediaType: "application/json", schemaVersion: "3.0.0" })], validation: result };
    }
    const readiness = JSON.parse(await readFile(path.join(directory, "validation/realization-readiness.json"), "utf8"));
    const packageManifest = JSON.parse(await readFile(path.join(directory, "recrafts-package.json"), "utf8"));
    if (packageManifest.schema_version === "3.0.0") throw Object.assign(new Error("R-006 packages cannot be accepted or realized before the R-007 correction and acceptance protocol"), { code: "REALIZATION_NOT_AUTHORIZED" });
    let approvedDirectory = directory;
    let approval = null;
    const decisionInputsPresent = Boolean(input.owner_decision_file || input.approved_package_directory);
    if (readiness.canonical_visual_generation_authorized !== true) {
      if (!input.owner_decision_file || !input.approved_package_directory) throw Object.assign(new Error("Project-owner decision is required before realization"), { code: "REALIZATION_NOT_AUTHORIZED" });
      const decisionFile = await resolveSafeInput({ value: input.owner_decision_file, workingRoot, allowedTypes: ["file"] });
      approvedDirectory = await resolveSafeOutput({ value: input.approved_package_directory, workingRoot, inputs: [directory, decisionFile] });
      approval = await importOwnerDecision({ packageDirectory: directory, decisionFile, approvedPackageDirectory: approvedDirectory, interoperabilityFixture: request.options?.interoperability_fixture === true });
    } else if (decisionInputsPresent) {
      throw Object.assign(new Error("An already-authorized package cannot import another decision during realization"), { code: "PACKAGE_INVALID" });
    }
    const output = await resolveSafeOutput({ value: request.output_directory, workingRoot, inputs: [directory, approvedDirectory] });
    const result = await createRealization({ packageDirectory: approvedDirectory, outputDirectory: output });
    const artifacts = [await artifact({ type: "realization", file: path.join(output, "realization.json"), outputRoot: workingRoot, mediaType: "application/json" })];
    if (approval) artifacts.unshift(await artifact({ type: "approved-extraction-package", file: path.join(approvedDirectory, "recrafts-package.json"), outputRoot: workingRoot, mediaType: "application/json" }));
    return { status: "completed", artifacts, validation: { realization_id: result.realization_id, ...(approval ?? { approved_package_id: (await loadExtractionPackage(approvedDirectory)).manifest.package_id }) } };
  }
  if (request.operation === "verify-fidelity") {
    const directory = await resolveSafeInput({ value: input.fidelity_directory, workingRoot, allowedTypes: ["directory"] });
    const sourceNeutral = await readFile(path.join(directory, "realization.json"), "utf8").then(JSON.parse).catch(() => null);
    if (sourceNeutral?.realization_kind === "source-neutral-portable-system") {
      const result = await validateSourceNeutralFidelity(directory);
      if (result.status !== "passed") throw Object.assign(new Error("Source-neutral fidelity validation failed"), { code: "FIDELITY_SCOPE_UNSUPPORTED" });
      return { status: "completed", artifacts: [], validation: result };
    }
    const result = await validateFidelity(directory, { writeReport: false });
    if (result.status !== "passed") throw Object.assign(new Error("Fidelity scope validation failed"), { code: "FIDELITY_SCOPE_UNSUPPORTED" });
    return { status: "completed", artifacts: [], validation: result };
  }
  throw Object.assign(new Error("Operation is not supported"), { code: "OPERATION_UNSUPPORTED" });
}
