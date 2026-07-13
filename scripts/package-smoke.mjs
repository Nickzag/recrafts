import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const request = { protocol_version: "1.1", request_id: "package-smoke", operation: "capabilities", host: { agent: "package-smoke", engine: "node", capabilities: [] }, working_root: root, input: {} };
const result = spawnSync(process.execPath, [path.join(root, "runtime/interop_cli.mjs")], { input: JSON.stringify(request), encoding: "utf8" });
assert.equal(result.status, 0);
const response = JSON.parse(result.stdout);
assert.equal(response.status, "completed");
assert.equal(response.validation.embedded_vision_provider, false);
process.stdout.write("Recrafts package-local smoke passed (1 protocol check)\n");
