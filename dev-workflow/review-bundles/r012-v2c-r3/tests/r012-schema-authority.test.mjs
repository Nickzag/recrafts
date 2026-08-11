import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import * as design from "../packages/recrafts-design/index.mjs";
const schemaRuntime = await import("../packages/recrafts-design/src/schema_runtime.mjs");

test("Ajv canonical schema is the only structural authority", async () => {
  assert.equal(typeof design.validateDesign, "function");
  const schema = JSON.parse(await readFile(new URL("../packages/recrafts-design/schemas/design-document.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.$id, "https://recrafts.local/schemas/recrafts-design/v1/design-document.schema.json");
  assert.throws(() => design.parseDesignMd(canonical.replace("agent_usable: false", "agent_usable: false\nunknown_structural_field: forbidden")), /Schema validation|unknown_structural_field/i);
  assert.throws(() => design.parseDesignMd(canonical.replace('generated_at: "2026-08-09T00:00:00.000Z"\n', "")), /generated_at|Schema validation/i);
});

test("Preview and Candidate Compare runtime consume their canonical package Schemas", () => {
  assert.equal(typeof schemaRuntime.assertPreviewIntegrityStructure, "function");
  assert.equal(typeof schemaRuntime.assertCandidateComparisonStructure, "function");
  assert.throws(() => schemaRuntime.assertPreviewIntegrityStructure({ unexpected: true }), /Schema validation/i);
  assert.throws(() => schemaRuntime.assertCandidateComparisonStructure({ unexpected: true }), /Schema validation/i);
});

test("legacy root Schema files are reference-only aliases to package authority", async () => {
  for (const file of ["design-front-matter", "design-ir", "evidence-revision", "candidate-revision", "decision-revision", "design-release", "source-fidelity-report", "design-coherence-report", "preview-integrity", "candidate-comparison", "release-diff"]) {
    const schema = JSON.parse(await readFile(new URL(`../schemas/recrafts-design-v1/${file}.schema.json`, import.meta.url), "utf8"));
    assert.equal(typeof schema.$ref, "string", file);
    assert.match(schema.$ref, /packages\/recrafts-design\/schemas|recrafts\.local\/schemas\/recrafts-design/);
    assert.equal(Object.hasOwn(schema, "properties"), false, `${file} duplicates structural authority`);
    assert.equal(Object.hasOwn(schema, "$defs"), false, `${file} duplicates structural authority`);
  }
});

test("Schema mutation and Parser behavior cannot diverge", () => {
  const parsed = design.parseDesignMd(canonical);
  assert.equal(design.validateDesign(parsed).valid, true);
  assert.throws(() => design.parseDesignMd(canonical.replace("maturity: candidate", "maturity: invented")), /maturity|Schema validation/i);
  assert.throws(() => design.parseDesignMd(canonical.replace("confidence: 0.95", "confidence: 2")), /confidence|maximum|Schema validation/i);
});
