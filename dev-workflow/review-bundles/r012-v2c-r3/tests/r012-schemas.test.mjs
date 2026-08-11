import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("all legacy R-012 schemas are parseable reference-only aliases", async () => {
  const root = new URL("../schemas/recrafts-design-v1/", import.meta.url);
  const files = (await readdir(root)).filter((file) => file.endsWith(".schema.json"));
  assert.equal(files.length, 11);
  for (const file of files) {
    const schema = JSON.parse(await readFile(new URL(file, root), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(typeof schema.$ref, "string", path.basename(file));
    assert.equal(Object.hasOwn(schema, "properties"), false);
  }
});
