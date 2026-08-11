import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8"));
export const designDocumentSchema = load("design-document.schema.json");
export const designIrSchema = load("design-ir.schema.json");
export const sourceFidelityArtifactsSchema = load("source-fidelity-artifacts.schema.json");
export const governanceSchema = load("governance.schema.json");
export const gateReportsSchema = load("gate-reports.schema.json");
export const previewIntegritySchema = load("preview-integrity.schema.json");
export const candidateComparisonSchema = load("candidate-comparison.schema.json");
export const releaseDiffSchema = load("release-diff.schema.json");
export const browserEvidenceSchema = load("browser-evidence.schema.json");

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
ajv.addSchema(designDocumentSchema);
ajv.addSchema(designIrSchema);
ajv.addSchema(sourceFidelityArtifactsSchema);
ajv.addSchema(governanceSchema);
ajv.addSchema(gateReportsSchema);
ajv.addSchema(previewIntegritySchema);
ajv.addSchema(candidateComparisonSchema);
ajv.addSchema(releaseDiffSchema);
ajv.addSchema(browserEvidenceSchema);

const validators = {
  document: ajv.getSchema(designDocumentSchema.$id),
  ir: ajv.getSchema(designIrSchema.$id)
  ,preview: ajv.getSchema(previewIntegritySchema.$id)
  ,candidateComparison: ajv.getSchema(candidateComparisonSchema.$id)
  ,releaseDiff: ajv.getSchema(releaseDiffSchema.$id)
};

const fidelityValidators = Object.fromEntries(Object.keys(sourceFidelityArtifactsSchema.$defs).filter((key) => key !== "sha256" && key !== "id").map((key) => [key, ajv.getSchema(`${sourceFidelityArtifactsSchema.$id}#/$defs/${key}`)]));
const governanceValidators = Object.fromEntries(Object.keys(governanceSchema.$defs).filter((key) => !["sha256", "id", "dateTime"].includes(key)).map((key) => [key, ajv.getSchema(`${governanceSchema.$id}#/$defs/${key}`)]));
const gateValidators = Object.fromEntries(["gateA", "gateB"].map((key) => [key, ajv.getSchema(`${gateReportsSchema.$id}#/$defs/${key}`)]));
const browserEvidenceValidator = ajv.getSchema(browserEvidenceSchema.$id);

function assertValid(kind, value) {
  const validate = validators[kind];
  if (validate(value)) return;
  const detail = validate.errors.map((error) => `${error.instancePath || "$"} ${error.message}${error.params?.additionalProperty ? `: ${error.params.additionalProperty}` : ""}`).join("; ");
  throw Object.assign(new Error(`recrafts.design/v1 Schema validation failed: ${detail}`), { code: "SCHEMA_VALIDATION_FAILED", validation_errors: validate.errors });
}

export const assertDesignDocumentStructure = (value) => assertValid("document", value);
export const assertDesignIrStructure = (value) => assertValid("ir", value);
export const assertPreviewIntegrityStructure = (value) => assertValid("preview", value);
export const assertCandidateComparisonStructure = (value) => assertValid("candidateComparison", value);
export const assertReleaseDiffStructure = (value) => assertValid("releaseDiff", value);
export function assertSourceFidelityArtifact(kind, value) {
  const validate = fidelityValidators[kind];
  if (!validate) throw new Error(`Unknown Source Fidelity Artifact kind: ${kind}`);
  if (validate(value)) return;
  const detail = validate.errors.map((error) => `${error.instancePath || "$"} ${error.message}`).join("; ");
  throw Object.assign(new Error(`${kind} Schema validation failed: ${detail}`), { code: "SCHEMA_VALIDATION_FAILED", validation_errors: validate.errors });
}
export function assertGovernanceObject(kind, value) {
  const validate = governanceValidators[kind];
  if (!validate) throw new Error(`Unknown governance object kind: ${kind}`);
  if (validate(value)) return;
  const detail = validate.errors.map((error) => `${error.instancePath || "$"} ${error.message}${error.params?.additionalProperty ? `: ${error.params.additionalProperty}` : ""}`).join("; ");
  throw Object.assign(new Error(`${kind} Schema validation failed: ${detail}`), { code: "SCHEMA_VALIDATION_FAILED", validation_errors: validate.errors });
}
export function assertBrowserEvidence(value) {
  if (browserEvidenceValidator(value)) return;
  const detail = browserEvidenceValidator.errors.map((error) => `${error.instancePath || "$"} ${error.message}`).join("; ");
  throw Object.assign(new Error(`Browser Evidence Schema validation failed: ${detail}`), { code: "SCHEMA_VALIDATION_FAILED", validation_errors: browserEvidenceValidator.errors });
}

export function assertGateReport(kind, value) {
  const validate = gateValidators[kind];
  if (!validate) throw new Error(`Unknown Gate report kind: ${kind}`);
  if (validate(value)) return;
  const detail = validate.errors.map((error) => `${error.instancePath || "$"} ${error.message}`).join("; ");
  throw Object.assign(new Error(`${kind} Schema validation failed: ${detail}`), { code: "SCHEMA_VALIDATION_FAILED", validation_errors: validate.errors });
}
