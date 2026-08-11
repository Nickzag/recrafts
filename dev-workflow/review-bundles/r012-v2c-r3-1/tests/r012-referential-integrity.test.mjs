import assert from "node:assert/strict";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import * as design from "../packages/recrafts-design/index.mjs";

test("compiler rejects unknown Token, State, Component, Region, and Content Archetype references", () => {
  const mutations = [
    canonical.replace("color.panel, color.text", "color.missing, color.text"),
    canonical.replace("states: [state.default, state.selected]", "states: [state.default, state.missing]"),
    canonical.replace("component_refs: [component.document-row]", "component_refs: [component.missing]"),
    canonical.replace("region_order: [sidebar, canvas]", "region_order: [sidebar, missing-region]"),
    canonical.replace("content_archetypes: [text-heavy, image-led]", "content_archetypes: [unknown-archetype]")
  ];
  assert.equal(typeof design.validateDesignIr, "function");
  for (const source of mutations) assert.throws(() => design.compileDesignIr(design.parseDesignMd(source)), /unknown|reference|referential/i);
});

test("compiled IR passes canonical structure and semantic relation checks", () => {
  assert.equal(typeof design.validateDesignIr, "function");
  const ir = design.compileDesignIr(design.parseDesignMd(canonical));
  assert.deepEqual(design.validateDesignIr(ir), { valid: true, errors: [] });
  const bad = structuredClone(ir);
  bad.components[0].token_usage.push("color.fabricated");
  assert.throws(() => design.validateDesignIr(bad), /unknown Token/i);
});
