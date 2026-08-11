import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import { createSourceNeutralRealization } from "../realization/source_neutral_realization.mjs";
import { validateSourceNeutralFidelity } from "../runtime/source_neutral_fidelity.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (file, value) => writeFileSync(file, `${JSON.stringify(value)}\n`);

test("accepted pilot-ready contracts produce a fidelity-verifiable realization", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-realization-"));
  const pkg = path.join(root, "package"); const previews = path.join(root, "previews"); const output = path.join(root, "output");
  mkdirSync(pkg); mkdirSync(previews); mkdirSync(path.join(previews, "web"));
  const design = "# portable"; writeFileSync(path.join(pkg, "design.md"), design);
  json(path.join(pkg, "recrafts-package.json"), { package_id: "package-test", status: "accepted" });
  json(path.join(pkg, "delivery-readiness.json"), { status: "pilot-ready", owner_visual_review: true });
  json(path.join(pkg, "artifact-set.json"), { artifact_set_id: "artifact-set-test", decision_ids: ["decision-owner"], artifacts: [{ path: "design.md" }], artifact_hashes: { "design.md": sha(design) } });
  writeFileSync(path.join(previews, "web", "a.png"), "png");
  json(path.join(previews, "capture-manifest.json"), { results: [{ file: "previews/web/a.png" }] });
  const result = await createSourceNeutralRealization({ packageDirectory: pkg, previewDirectory: previews, outputDirectory: output });
  assert.equal(result.owner_decision_set_id, "decision-owner");
  assert.equal((await validateSourceNeutralFidelity(output)).status, "passed");
  assert.equal(JSON.parse(readFileSync(path.join(output, "realization.json"))).delivery_readiness, "pilot-ready");
});

test("reviewable packages fail closed before realization", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r010-blocked-")); const pkg = path.join(root, "package"); const previews = path.join(root, "previews");
  mkdirSync(pkg); mkdirSync(previews); json(path.join(pkg, "recrafts-package.json"), { package_id: "package-test", status: "awaiting-review" });
  json(path.join(pkg, "delivery-readiness.json"), { status: "reviewable", owner_visual_review: false }); json(path.join(pkg, "artifact-set.json"), { artifacts: [] }); json(path.join(previews, "capture-manifest.json"), { results: [] });
  await assert.rejects(() => createSourceNeutralRealization({ packageDirectory: pkg, previewDirectory: previews, outputDirectory: path.join(root, "output") }), /pilot-ready/i);
});
