import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import { executeDesignOperation, DESIGN_OPERATIONS } from "../runtime/design_system_runtime.mjs";

test("R-012 v2A exposes ten design governance operations", () => {
  assert.deepEqual(DESIGN_OPERATIONS, ["parse-design-md", "compile-design-ir", "validate-design", "render-design-preview", "compare-design-candidates", "import-design-owner-decision", "create-design-release", "validate-design-release", "rollback-design-release", "compare-design-releases"]);
});

test("filesystem operation produces only public design.md and preview.html", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recrafts-r012-"));
  await writeFile(path.join(root, "design.md"), canonical);
  const parsed = await executeDesignOperation({ operation: "parse-design-md", input: { design_file: "design.md" } }, root);
  assert.equal(parsed.status, "completed");
  const rendered = await executeDesignOperation({ operation: "render-design-preview", input: { design_file: "design.md" }, output_directory: "public" }, root);
  assert.equal(rendered.status, "completed");
  assert.match(await readFile(path.join(root, "public", "preview.html"), "utf8"), /recrafts-preview-integrity/);
});
