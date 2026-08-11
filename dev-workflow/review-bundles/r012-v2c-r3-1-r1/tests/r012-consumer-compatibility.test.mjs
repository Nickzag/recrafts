import assert from "node:assert/strict";
import test from "node:test";
import { loadDesignSystem } from "../packages/recrafts-design/index.mjs";
import { canonical } from "./r012-design-parser.test.mjs";

test("default consumer refuses candidate systems", () => {
  assert.throws(() => loadDesignSystem(canonical), /candidate|accepted/i);
  assert.equal(loadDesignSystem(canonical, { allowCandidate: true }).ir.agent_usable, false);
});

