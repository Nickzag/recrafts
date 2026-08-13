import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("all legacy R-012 schemas are parseable reference-only aliases", async () => {
  const root = new URL("../schemas/recrafts-design-v1/", import.meta.url);
  const files = (await readdir(root)).filter((file) => file.endsWith(".schema.json")).sort();
  assert.deepEqual(files, [
    "candidate-comparison.schema.json", "candidate-revision.schema.json", "decision-revision.schema.json",
    "design-coherence-report.schema.json", "design-front-matter.schema.json", "design-intelligence.schema.json",
    "design-ir.schema.json", "design-release.schema.json", "evidence-revision.schema.json",
    "preview-integrity.schema.json", "release-diff.schema.json", "source-fidelity-report.schema.json"
  ]);
  for (const file of files) {
    const schema = JSON.parse(await readFile(new URL(file, root), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(typeof schema.$ref, "string", path.basename(file));
    assert.equal(Object.hasOwn(schema, "properties"), false);
  }
});
