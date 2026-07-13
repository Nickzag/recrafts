import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const operations = ["capabilities","prepare-analysis","submit-analysis","validate-package","generate-realization","verify-fidelity"];
test("R-005 contracts parse and declare exact operations/statuses", () => {
  const envelope = JSON.parse(readFileSync(path.join(root, "contracts/envelope-request.schema.json")));
  const response = JSON.parse(readFileSync(path.join(root, "contracts/envelope-response.schema.json")));
  assert.deepEqual(envelope.properties.operation.enum, operations);
  assert.deepEqual(response.properties.status.enum, ["completed","completed_with_warnings","needs_host_action","failed"]);
  for (const operation of operations) {
    const schema = JSON.parse(readFileSync(path.join(root, `contracts/operations/${operation}.request.schema.json`)));
    assert.equal(schema.properties.operation.const, operation);
    assert.ok(schema["x-recrafts"].statuses.length);
    assert.ok(Array.isArray(schema["x-recrafts"].error_codes));
  }
});
