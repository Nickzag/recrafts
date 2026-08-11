import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertSchema } from "../runtime/schema_validator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const operations = ["capabilities","prepare-analysis","submit-analysis","validate-package","generate-realization","verify-fidelity"];
test("R-005 contracts parse and declare exact operations/statuses", () => {
  const envelope = JSON.parse(readFileSync(path.join(root, "contracts/envelope-request.schema.json")));
  const response = JSON.parse(readFileSync(path.join(root, "contracts/envelope-response.schema.json")));
  assert.deepEqual(envelope.properties.operation.enum.slice(0, operations.length), operations);
  assert.deepEqual(response.properties.status.enum, ["completed","completed_with_warnings","needs_host_action","failed"]);
  for (const operation of operations) {
    const schema = JSON.parse(readFileSync(path.join(root, `contracts/operations/${operation}.request.schema.json`)));
    assert.equal(schema.properties.operation.const, operation);
    assert.ok(schema["x-recrafts"].statuses.length);
    assert.ok(Array.isArray(schema["x-recrafts"].error_codes));
  }
});

test("each operation Schema rejects a required-field mutation", () => {
  const valid = {
    capabilities: { operation: "capabilities" },
    "prepare-analysis": { operation: "prepare-analysis", input: { sources: ["fixture.svg"] }, output_directory: "prepared" },
    "submit-analysis": { operation: "submit-analysis", input: { prepared_analysis_directory: "prepared", host_analysis_file: "host.json" }, output_directory: "package" },
    "validate-package": { operation: "validate-package", input: { package_directory: "package" } },
    "generate-realization": { operation: "generate-realization", input: { package_directory: "package" }, output_directory: "realization" },
    "verify-fidelity": { operation: "verify-fidelity", input: { fidelity_directory: "fidelity" } },
  };
  for (const operation of operations) {
    const schema = JSON.parse(readFileSync(path.join(root, `contracts/operations/${operation}.request.schema.json`)));
    assert.doesNotThrow(() => assertSchema(valid[operation], schema));
    const mutated = structuredClone(valid[operation]);
    delete mutated[schema.required[0]];
    assert.throws(() => assertSchema(mutated, schema), /Schema validation failed/);
  }
});

test("response Schema rejects an unsupported status mutation", () => {
  const schema = JSON.parse(readFileSync(path.join(root, "contracts/envelope-response.schema.json")));
  const response = { protocol_version: "1.0", request_id: "x", operation: "capabilities", status: "invented", host_handshake: {}, host_action: null, artifacts: [], validation: {}, warnings: [], error: null };
  assert.throws(() => assertSchema(response, schema), /Schema validation failed/);
});
