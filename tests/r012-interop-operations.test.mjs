import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { handleEnvelope } from "../runtime/interop_contract.mjs";
import { canonical } from "./r012-design-parser.test.mjs";

const host = { agent: "test-host", engine: "node", capabilities: ["files", "structured-output"] };

test("Protocol 1.2 advertises and executes R-012 design operations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "r012-interop-"));
  await writeFile(path.join(root, "design.md"), canonical);
  const capabilities = await handleEnvelope({ protocol_version: "1.2", request_id: "cap", operation: "capabilities", host, working_root: root, input: {} });
  for (const operation of ["parse-design-md", "compile-design-ir", "validate-design", "verify-source-fidelity", "render-design-preview", "compare-design-candidates", "import-design-owner-decision", "create-design-release", "validate-design-release", "rollback-design-release", "compare-design-releases"]) assert.ok(capabilities.validation.operations.includes(operation));
  const response = await handleEnvelope({ protocol_version: "1.2", request_id: "parse", operation: "parse-design-md", host, working_root: root, input: { design_file: "design.md" } });
  assert.equal(response.status, "completed");
  assert.equal(response.validation.sections, 8);
});
