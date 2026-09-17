import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  attachRebiuHandoffContext,
  deriveTypographyContext,
  normalizeHandoffCertainty,
  normalizeRebiuHandoff,
  validateHandoffIntake,
  validateRebiuHandoff
} from "../runtime/rebiu_handoff.mjs";

const valid = {
  schemaVersion: "rebiu.recrafts-handoff/v1", target: "recrafts", sourceSkill: "rebiu", sourceSkillVersion: "0.6.0",
  referenceType: "layout_editorial", status: "handoff-ready", intent: "Recover DS", fidelityDrivers: [{ claim: "editorial hierarchy", certainty: "observed" }],
  sourceBound: ["logo"], userLocks: ["preserve hierarchy"], variables: ["copy"], uncertain: ["exact typeface"], referenceSet: { items: [] },
  requestedOutputs: ["canonical Recrafts design.md"], preferences: { chineseTypography: { preferredFamily: "Source Han Sans SC", displayWeights: [700,900], headingWeight: 700, subheadingWeight: 500, bodyWeight: 400, secondaryWeights: [300,400], rendererFallback: "Noto Sans CJK SC", authority: "preference-not-source-evidence" } }, rebiuResume: { allowed: true }
};

test("handoff schema v1 accepted", () => assert.equal(validateRebiuHandoff(valid).valid, true));
test("unknown handoff schema rejected", () => assert.throws(() => validateRebiuHandoff({ ...valid, schemaVersion: "rebiu.recrafts-handoff/v2" }), /Schema validation failed/));
test("handoff requires actual source descriptors", () => assert.throws(() => validateHandoffIntake({ handoff: valid, sources: [] }), { code: "HANDOFF_SOURCE_REQUIRED" }));
test("handoff certainty never promotes to measured", () => { assert.equal(normalizeHandoffCertainty("observed"), "observed"); assert.equal(normalizeHandoffCertainty("inferred"), "inferred"); assert.equal(normalizeHandoffCertainty("measured"), "observed"); });
test("normalized handoff is context only", () => { const ctx = normalizeRebiuHandoff(valid); assert.equal(ctx.authority, "context-only"); assert.equal(ctx.evidence_revision_authority, false); assert.equal(ctx.source_fidelity_authority, false); assert.equal(ctx.release_authority, false); });
test("Source Han Sans SC default is inferred and role based", () => { const t = deriveTypographyContext({ handoff: valid, evidence: [] }); assert.deepEqual(t.roles.display.weights, [700,900]); assert.deepEqual(t.roles.subheading.weights, [500]); assert.deepEqual(t.roles.body.weights, [400]); assert.equal(t.roles.body.certainty, "inferred"); assert.equal(Object.values(t.roles).flatMap((x) => x.weights).includes(600), false); });
test("verified source font evidence overrides Chinese default", () => { const evidence = [{ evidence_type: "font", status: "current", evidence_id: "ev-font-1", value: { family: "Verified Source Sans", weight: 650 } }]; const t = deriveTypographyContext({ handoff: valid, evidence }); assert.equal(t.source_font_override, true); assert.equal(t.roles.body.family[0], "Verified Source Sans"); assert.equal(t.roles.body.certainty, "observed"); });
test("renderer fallback is explicit", () => { const t = deriveTypographyContext({ handoff: valid, evidence: [] }); assert.equal(t.renderer_fallback.family, "Noto Sans CJK SC"); assert.equal(t.renderer_fallback.record_substitution, true); });
test("mixed asset remains asset-only and Recrafts owns final composition", () => { const handoff = { ...valid, referenceType: "mixed", referenceSet: { items: [{ id: "img-1", role: "generated-image-asset", generated: true, assetPath: "assets/img-1.png" }] } }; const ctx = normalizeRebiuHandoff(handoff); assert.equal(ctx.mixed_assets.length, 1); assert.equal(ctx.mixed_assets[0].authority, "asset-only"); assert.equal(ctx.mixed_assets[0].final_composition_authority, "recrafts"); assert.ok(ctx.mixed_assets[0].forbidden_claim_scope.includes("typography")); });
test("attaching handoff context does not mutate Evidence bundle", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "recrafts-boundary-")); await mkdir(path.join(dir, "analysis")); const evidence = { version: "3.0.0", prepared_analysis_id: "prepared-x", evidence: [{ evidence_type: "font", status: "current", evidence_id: "ev-font", value: { family: "Verified Source Sans" } }] }; await writeFile(path.join(dir, "analysis/evidence-bundle.json"), JSON.stringify(evidence)); await writeFile(path.join(dir, "analysis/input-manifest.json"), JSON.stringify({ version: "3.0.0", prepared_analysis_id: "prepared-x", sources: [{ source_id: "source-1" }] })); await writeFile(path.join(dir, "analysis/host-instructions.md"), "# Host Analysis\n"); const before = await readFile(path.join(dir, "analysis/evidence-bundle.json"), "utf8"); const result = await attachRebiuHandoffContext({ handoff: valid, outputDirectory: dir }); const after = await readFile(path.join(dir, "analysis/evidence-bundle.json"), "utf8"); assert.equal(after, before); assert.ok(result.context_files.includes("analysis/rebiu-handoff-context.json")); const manifest = JSON.parse(await readFile(path.join(dir, "analysis/input-manifest.json"), "utf8")); assert.equal(manifest.context_authority, "non-evidentiary"); });
