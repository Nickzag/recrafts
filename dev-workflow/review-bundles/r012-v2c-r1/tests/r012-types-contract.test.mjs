import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public TypeScript contract names the governed design and release structures", async () => {
  const source = await readFile(new URL("../packages/recrafts-design/types.d.ts", import.meta.url), "utf8");
  for (const name of [
    "DesignFrontMatter",
    "FoundationToken",
    "ComponentSpecimen",
    "DesignComponent",
    "DesignComposition",
    "DesignIr",
    "DesignRelease",
    "LoadedDesignRelease"
  ]) assert.match(source, new RegExp(`interface ${name}\\b`));
  assert.doesNotMatch(source, /interface DesignIr[^}]*\[key: string\]: unknown/s);
  assert.doesNotMatch(source, /release: Record<string, unknown>/);
});
