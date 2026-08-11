import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runFidelityRound } from "../realization/fidelity_runtime.mjs";
import { validateFidelity } from "../scripts/validate-r004-fidelity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonical = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/fidelity/r004-v2");
const packageDirectory = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/packages/package-ffa63ca8b0ea69af");
const realizationDirectory = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/realizations/r003b-v2");
const reviewFile = path.join(root, "review/visual-realization-review.md");
const fixture = () => { const directory = mkdtempSync(path.join(os.tmpdir(), "recrafts-r004-")); cpSync(canonical, directory, { recursive: true }); return directory; };
const mutateJson = (directory, relative, update) => { const file = path.join(directory, relative); const value = JSON.parse(readFileSync(file, "utf8")); update(value); writeFileSync(file, JSON.stringify(value)); };

test("canonical bounded fidelity round passes", async () => {
  assert.equal((await validateFidelity(canonical, { writeReport: false })).status, "passed");
});

for (const [name, mutate, check] of [
  ["unsupported viewport", (dir) => mutateJson(dir, "validation/fidelity-profile.json", (v) => v.viewports.push("390x844")), "bounded_viewports"],
  ["unsupported surface", (dir) => mutateJson(dir, "validation/fidelity-profile.json", (v) => v.surfaces.push("pricing-page")), "bounded_surfaces"],
  ["reused realization identity", (dir) => mutateJson(dir, "corrections/corrected-realization/r004-v1/realization.json", (v) => { v.realization_id = "realization-84978bde0e3b2ccb"; }), "new_realization_identity"],
  ["renderer hides upstream extraction error", (dir) => mutateJson(dir, "corrections/correction-request.json", (v) => { v.upstream_extraction_error = true; }), "serialized_correction"],
  ["preview fallback promotion", (dir) => mutateJson(dir, "corrections/correction-request.json", (v) => { v.preview_fallback_promotion = true; }), "no_fallback_promotion"],
]) test(`fails closed on ${name}`, async () => { const directory = fixture(); mutate(directory); const result = await validateFidelity(directory, { writeReport: false }); assert.equal(result.status, "failed"); assert.equal(result.checks[check], false); });

for (const phrase of ["100% clone", "exact-pixel claim", "exact-font claim", "../oracle/design-contract.json"]) test(`rejects unsupported claim/path: ${phrase}`, async () => {
  const directory = fixture();
  writeFileSync(path.join(directory, "validation/fidelity-summary.md"), phrase);
  assert.equal((await validateFidelity(directory, { writeReport: false })).status, "failed");
});

test("fidelity runtime requires accepted owner visual review", async () => {
  const review = path.join(mkdtempSync(path.join(os.tmpdir(), "recrafts-r004-review-")), "review.md");
  writeFileSync(review, "Project-owner Visual Verdict\n\n`PENDING`");
  await assert.rejects(() => runFidelityRound({ baselinePackageDirectory: packageDirectory, baselineRealizationDirectory: realizationDirectory, ownerReviewFile: review, outputDirectory: path.join(os.tmpdir(), `r004-rejected-${Date.now()}`) }), /accepted.*review/i);
});

test("fidelity runtime refuses output overwrite", async () => {
  const output = mkdtempSync(path.join(os.tmpdir(), "recrafts-r004-overwrite-"));
  writeFileSync(path.join(output, "existing.txt"), "preserve");
  await assert.rejects(() => runFidelityRound({ baselinePackageDirectory: packageDirectory, baselineRealizationDirectory: realizationDirectory, ownerReviewFile: reviewFile, outputDirectory: output }), /empty|overwrite/i);
});
