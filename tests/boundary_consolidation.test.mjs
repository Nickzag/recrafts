import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleEnvelope } from "../runtime/interop_contract.mjs";
import {
  attachRebiuHandoffContext,
  deriveTypographyContext,
  normalizeHandoffCertainty,
  normalizeRebiuHandoff,
  validateHandoffIntake,
  validateRebiuHandoff
} from "../runtime/rebiu_handoff.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const valid = {
  schemaVersion: "rebiu.recrafts-handoff/v1", target: "recrafts", sourceSkill: "rebiu", sourceSkillVersion: "0.6.0",
  referenceType: "layout_editorial", status: "handoff-ready", intent: "Recover DS", fidelityDrivers: [{ claim: "editorial hierarchy", certainty: "observed" }],
  sourceBound: ["logo"], userLocks: ["preserve hierarchy"], variables: ["copy"], uncertain: ["exact typeface"], referenceSet: { items: [] },
  requestedOutputs: ["canonical Recrafts design.md"], preferences: { chineseTypography: { preferredFamily: "Source Han Sans SC", displayWeights: [700,900], headingWeight: 700, subheadingWeight: 500, bodyWeight: 400, secondaryWeights: [300,400], rendererFallback: "Noto Sans CJK SC", authority: "preference-not-source-evidence" } }, rebiuResume: { allowed: true }
};
const host = { agent: "boundary-test", engine: "node", capabilities: ["vision", "files", "structured-output"] };
const request = (root, operation, input = {}, output_directory) => ({ protocol_version: "1.2", request_id: `${operation}-${Date.now()}-${Math.random()}`, operation, host, working_root: root, input, ...(output_directory ? { output_directory } : {}) });
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const bindEvidenceRefs = (value, evidenceId) => {
  if (Array.isArray(value)) return value.map((entry) => bindEvidenceRefs(entry, evidenceId));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key === "evidence_refs" && Array.isArray(entry) ? [evidenceId] : bindEvidenceRefs(entry, evidenceId)]));
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

test("handoff-assisted prepare-analysis to submit-analysis keeps context non-evidentiary", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recrafts-boundary-e2e-"));
  await copyFile(path.join(repo, "fixtures/interop/sanitized-analysis-fixture.svg"), path.join(root, "source.svg"));
  await writeFile(path.join(root, "handoff.json"), `${JSON.stringify(valid, null, 2)}\n`);
  const prepared = await handleEnvelope(request(root, "prepare-analysis", { sources: [{ kind: "image", path: "source.svg" }], rebiu_handoff_file: "handoff.json" }, "prepared"));
  assert.equal(prepared.status, "needs_host_action", JSON.stringify(prepared));
  assert.ok(prepared.host_action.context_files.includes("analysis/rebiu-handoff-context.json"));
  const bundleBefore = await json(path.join(root, "prepared/analysis/evidence-bundle.json"));
  const evidenceId = bundleBefore.evidence[0].evidence_id;
  const fixture = await json(path.join(repo, "fixtures/interop/host-analysis.fixture.json"));
  const analysis = bindEvidenceRefs({ ...fixture, prepared_analysis_id: prepared.validation.prepared_analysis_id }, evidenceId);
  await writeFile(path.join(root, "host-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
  const submitted = await handleEnvelope(request(root, "submit-analysis", { prepared_analysis_directory: "prepared", host_analysis_file: "host-analysis.json" }, "package"));
  assert.equal(submitted.status, "completed_with_warnings", JSON.stringify(submitted));
  const packageEvidence = await json(path.join(root, "package/evidence-map.json"));
  assert.ok(packageEvidence.evidence.length > 0);
  assert.ok(packageEvidence.evidence.every((entry) => !/handoff|rebiu/i.test(entry.evidence_type)));
  const context = await json(path.join(root, "prepared/analysis/rebiu-handoff-context.json"));
  assert.equal(context.authority, "context-only");
  assert.equal(context.release_authority, false);
});
