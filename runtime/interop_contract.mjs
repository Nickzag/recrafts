import { executeOperation, OPERATION_CAPABILITIES } from "./interop_operations.mjs";
import { resolveWorkingRoot } from "./path_security.mjs";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const PROTOCOL_VERSION = "1.2";
const envelopeRequestSchema = loadSchema(new URL("../contracts/envelope-request.schema.json", import.meta.url));
const envelopeResponseSchema = loadSchema(new URL("../contracts/envelope-response.schema.json", import.meta.url));
const operationSchemas = Object.fromEntries(Object.keys(OPERATION_CAPABILITIES).map((operation) => [operation, loadSchema(new URL(`../contracts/operations/${operation}.request.schema.json`, import.meta.url))]));
const legacyOperations = new Set(["capabilities", "prepare-analysis", "submit-analysis", "validate-package", "generate-realization", "verify-fidelity", "submit-correction", "accept-artifacts", "rollback-package"]);
const protocol12Operations = new Set(["prepare-visual-recovery", "submit-visual-observations", "generate-faithful-reconstruction", "verify-source-fidelity", "compile-portable-product-ui", "generate-target-adaptation"]);
const errorCodes = new Set(["INVALID_JSON","SCHEMA_VALIDATION_FAILED","PROTOCOL_VERSION_UNSUPPORTED","OPERATION_UNSUPPORTED","CAPABILITY_REQUIRED","HOST_ACTION_REQUIRED","UNSAFE_INPUT_PATH","UNSAFE_OUTPUT_PATH","OUTPUT_NOT_EMPTY","INPUT_NOT_FOUND","PACKAGE_INVALID","REALIZATION_NOT_AUTHORIZED","FIDELITY_SCOPE_UNSUPPORTED","VERSION_CONFLICT","R011_STAGE_BLOCKED","INTERNAL_ERROR"]);
const effectiveVersion = (request) => request?.protocol_version === "1.0" && request?.options?.compatibility_mode === "protocol-1.0" ? "1.0" : request?.protocol_version === "1.1" ? "1.1" : PROTOCOL_VERSION;
const base = (request) => ({ protocol_version: effectiveVersion(request), request_id: request?.request_id ?? "unavailable", operation: request?.operation ?? "unavailable", status: "failed", host_handshake: {}, host_action: null, artifacts: [], validation: {}, warnings: [], error: null });

function assertRequest(request) {
  if (request && typeof request === "object" && typeof request.operation === "string" && !(request.operation in OPERATION_CAPABILITIES)) throw Object.assign(new Error("Unsupported operation"), { code: "OPERATION_UNSUPPORTED" });
  const compatibility = request?.protocol_version === "1.0" && request?.options?.compatibility_mode === "protocol-1.0";
  const supported = request?.protocol_version === "1.2" || request?.protocol_version === "1.1" || compatibility;
  if (request && typeof request === "object" && Object.hasOwn(request, "protocol_version") && !supported) throw Object.assign(new Error("Unsupported protocol version; supported_versions: 1.2, 1.1 (1.0 requires explicit compatibility mode)"), { code: "PROTOCOL_VERSION_UNSUPPORTED" });
  if (request?.protocol_version !== "1.2" && protocol12Operations.has(request?.operation)) throw Object.assign(new Error("The R-011R-A operations require protocol 1.2"), { code: "PROTOCOL_VERSION_UNSUPPORTED" });
  const envelopeRequest = request?.protocol_version === "1.2" && protocol12Operations.has(request?.operation) ? { ...request, operation: "capabilities" } : request;
  assertSchema(envelopeRequest, envelopeRequestSchema, "Envelope request");
  if (!request || typeof request !== "object" || Array.isArray(request)) throw Object.assign(new Error("Request must be an object"), { code: "SCHEMA_VALIDATION_FAILED" });
  const allowed = new Set(["protocol_version","request_id","operation","host","working_root","input","output_directory","options"]);
  if (Object.keys(request).some((key) => !allowed.has(key))) throw Object.assign(new Error("Unknown top-level request field"), { code: "SCHEMA_VALIDATION_FAILED" });
  if (!supported) throw Object.assign(new Error("Unsupported protocol version"), { code: "PROTOCOL_VERSION_UNSUPPORTED" });
  if (!request.request_id || !request.operation || !request.host || !request.working_root || typeof request.input !== "object") throw Object.assign(new Error("Required envelope fields are missing"), { code: "SCHEMA_VALIDATION_FAILED" });
  if (!(request.operation in OPERATION_CAPABILITIES)) throw Object.assign(new Error("Unsupported operation"), { code: "OPERATION_UNSUPPORTED" });
  assertSchema(request, operationSchemas[request.operation], `${request.operation} request`);
  const hostAllowed = new Set(["agent","engine","capabilities","extensions"]);
  if (Object.keys(request.host).some((key) => !hostAllowed.has(key)) || !Array.isArray(request.host.capabilities)) throw Object.assign(new Error("Host metadata is invalid"), { code: "SCHEMA_VALIDATION_FAILED" });
  if (JSON.stringify(request).length > 1024 * 1024) throw Object.assign(new Error("Request byte limit exceeded"), { code: "SCHEMA_VALIDATION_FAILED" });
}

export async function handleEnvelope(request) {
  const response = base(request);
  try {
    assertRequest(request);
    const required = OPERATION_CAPABILITIES[request.operation];
    const provided = [...new Set(request.host.capabilities)].sort();
    const missingRequired = required.filter((item) => !provided.includes(item));
    response.host_handshake = { required_capabilities: required, provided_capabilities: provided, missing_required: missingRequired, host_agent: request.host.agent || "unavailable", host_engine: request.host.engine || "unavailable" };
    if (missingRequired.length) throw Object.assign(new Error(`Missing required capabilities: ${missingRequired.join(", ")}`), { code: "CAPABILITY_REQUIRED" });
    const workingRoot = await resolveWorkingRoot(request.working_root);
    const result = await executeOperation(request, workingRoot);
    Object.assign(response, { ...result, error: null, warnings: result.warnings ?? [], host_action: result.host_action ?? null });
  } catch (error) {
    const code = errorCodes.has(error.code) ? error.code : "INTERNAL_ERROR";
    response.status = "failed";
    response.error = { code, message: code === "INTERNAL_ERROR" ? "Internal operation failure" : error.message };
  }
  const responseErrors = (() => { try { assertSchema(response, envelopeResponseSchema, "Envelope response"); return null; } catch (error) { return error; } })();
  if (responseErrors) return { ...base(request), error: { code: "INTERNAL_ERROR", message: "Internal response contract failure" } };
  return response;
}

export const protocolInfo = { protocol_version: PROTOCOL_VERSION, compatible_versions: ["1.0", "1.1"], schema_version: "3.1.0", operations: Object.keys(OPERATION_CAPABILITIES), statuses: ["completed","completed_with_warnings","needs_host_action","failed"] };
