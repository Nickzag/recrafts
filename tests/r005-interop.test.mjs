import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { handleEnvelope } from "../runtime/interop_contract.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r005-interop-"));
const request = (operation, extra = {}) => ({ protocol_version: "1.0", request_id: `req-${operation}`, operation, host: { agent: "test", engine: "node", capabilities: ["files","structured-output"] }, working_root: root, input: {}, ...extra });
test("capabilities exposes two-phase protocol without embedded vision", async () => {
  const response = await handleEnvelope(request("capabilities"));
  assert.equal(response.status, "completed");
  assert.equal(response.validation.embedded_vision_provider, false);
  assert.ok(response.validation.operations.includes("prepare-analysis"));
  assert.ok(!response.validation.operations.includes("analyze-image"));
});
test("protocol, operation and capability errors fail closed", async () => {
  assert.equal((await handleEnvelope({ ...request("capabilities"), protocol_version: "2.0" })).error.code, "PROTOCOL_VERSION_UNSUPPORTED");
  assert.equal((await handleEnvelope({ ...request("unknown"), operation: "unknown" })).error.code, "OPERATION_UNSUPPORTED");
  assert.equal((await handleEnvelope({ ...request("submit-analysis"), host: { agent: "x", engine: "y", capabilities: [] } })).error.code, "CAPABILITY_REQUIRED");
});
