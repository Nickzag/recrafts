import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRealization } from "../realization/realization_runtime.mjs";
import { loadExtractionPackage } from "../realization/package_loader.mjs";
import { validateFidelity } from "../scripts/validate-r004-fidelity.mjs";
import { prepareAnalysis, submitAnalysis } from "./analysis_exchange.mjs";
import { importOwnerDecision } from "./owner_decision_import.mjs";
import { resolveSafeInput, resolveSafeOutput, toArtifactPath } from "./path_security.mjs";

const hashFile = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const artifact = async ({ type, file, outputRoot, mediaType, schemaVersion = "2.1.0" }) => ({ type, path: toArtifactPath({ file, outputRoot }), sha256: await hashFile(file), media_type: mediaType, schema_version: schemaVersion });

export const OPERATION_CAPABILITIES = {
  capabilities: [],
  "prepare-analysis": ["files"],
  "submit-analysis": ["files", "structured-output"],
  "validate-package": ["files"],
  "generate-realization": ["files"],
  "verify-fidelity": ["files"],
};

export async function executeOperation(request, workingRoot) {
  const input = request.input ?? {};
  if (request.operation === "capabilities") return { status: "completed", artifacts: [], validation: { protocol_version: "1.0", operations: Object.keys(OPERATION_CAPABILITIES), response_statuses: ["completed","completed_with_warnings","needs_host_action","failed"], embedded_vision_provider: false } };
  if (request.operation === "prepare-analysis") {
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
    const result = await submitAnalysis({ preparedAnalysisDirectory: prepared, hostAnalysisFile: hostAnalysis, outputDirectory: output });
    return { status: "completed_with_warnings", artifacts: [await artifact({ type: "design-contract", file: path.join(output, "design.md"), outputRoot: output, mediaType: "text/markdown" }), await artifact({ type: "extraction-package", file: path.join(output, "recrafts-package.json"), outputRoot: output, mediaType: "application/json" })], validation: result, warnings: ["Host-supplied analysis remains subject to project-owner visual review"] };
  }
  if (request.operation === "validate-package") {
    const directory = await resolveSafeInput({ value: input.package_directory, workingRoot, allowedTypes: ["directory"] });
    const loaded = await loadExtractionPackage(directory);
    return { status: "completed", artifacts: [], validation: { package_id: loaded.manifest.package_id, schema_version: loaded.manifest.schema_version, valid: true } };
  }
  if (request.operation === "generate-realization") {
    const directory = await resolveSafeInput({ value: input.package_directory, workingRoot, allowedTypes: ["directory"] });
    const readiness = JSON.parse(await readFile(path.join(directory, "validation/realization-readiness.json"), "utf8"));
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
    const result = await validateFidelity(directory, { writeReport: false });
    if (result.status !== "passed") throw Object.assign(new Error("Fidelity scope validation failed"), { code: "FIDELITY_SCOPE_UNSUPPORTED" });
    return { status: "completed", artifacts: [], validation: result };
  }
  throw Object.assign(new Error("Operation is not supported"), { code: "OPERATION_UNSUPPORTED" });
}
