import { executeOperation, OPERATION_CAPABILITIES } from "./interop_operations.mjs";
import { resolveWorkingRoot } from "./path_security.mjs";

const PROTOCOL_VERSION = "1.0";
const errorCodes = new Set(["INVALID_JSON","SCHEMA_VALIDATION_FAILED","PROTOCOL_VERSION_UNSUPPORTED","OPERATION_UNSUPPORTED","CAPABILITY_REQUIRED","HOST_ACTION_REQUIRED","UNSAFE_INPUT_PATH","UNSAFE_OUTPUT_PATH","OUTPUT_NOT_EMPTY","INPUT_NOT_FOUND","PACKAGE_INVALID","REALIZATION_NOT_AUTHORIZED","FIDELITY_SCOPE_UNSUPPORTED","VERSION_CONFLICT","INTERNAL_ERROR"]);
const base = (request) => ({ protocol_version: PROTOCOL_VERSION, request_id: request?.request_id ?? "unavailable", operation: request?.operation ?? "unavailable", status: "failed", host_handshake: {}, host_action: null, artifacts: [], validation: {}, warnings: [], error: null });

function assertRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) throw Object.assign(new Error("Request must be an object"), { code: "SCHEMA_VALIDATION_FAILED" });
  const allowed = new Set(["protocol_version","request_id","operation","host","working_root","input","output_directory","options"]);
  if (Object.keys(request).some((key) => !allowed.has(key))) throw Object.assign(new Error("Unknown top-level request field"), { code: "SCHEMA_VALIDATION_FAILED" });
  if (request.protocol_version !== PROTOCOL_VERSION) throw Object.assign(new Error("Unsupported protocol version; supported_versions: 1.0"), { code: "PROTOCOL_VERSION_UNSUPPORTED" });
  if (!request.request_id || !request.operation || !request.host || !request.working_root || typeof request.input !== "object") throw Object.assign(new Error("Required envelope fields are missing"), { code: "SCHEMA_VALIDATION_FAILED" });
  if (!(request.operation in OPERATION_CAPABILITIES)) throw Object.assign(new Error("Unsupported operation"), { code: "OPERATION_UNSUPPORTED" });
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
  return response;
}

export const protocolInfo = { protocol_version: PROTOCOL_VERSION, operations: Object.keys(OPERATION_CAPABILITIES), statuses: ["completed","completed_with_warnings","needs_host_action","failed"] };
