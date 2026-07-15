import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadCraftsOSArtifactSet } from "../runtime/craftsos_contract_adapter.mjs";

const canonical = ["design.md", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json"];
const sha = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(change = async () => {}) {
  const root = await mkdtemp(path.join(tmpdir(), "recrafts-craftsos-v3-"));
  const values = {
    "design.md": "# Accepted\n", "tokens.json": JSON.stringify({ version: "3.0.0", tokens: [{ token_id: "color.ink", value: "#111", evidence_refs: ["ev-1"] }] }),
    "components.json": JSON.stringify({ version: "3.0.0", components: [{ component_id: "component.button", evidence_refs: ["ev-1"] }] }),
    "grid-rules.json": JSON.stringify({ version: "3.0.0", grid_rules: [] }), "layout-rules.json": JSON.stringify({ version: "3.0.0", layout_rules: [] }),
    "visual-grammar.json": JSON.stringify({ version: "3.0.0" }), "conflicts.json": JSON.stringify({ version: "3.0.0", conflicts: [] })
  };
  for (const [name, value] of Object.entries(values)) await writeFile(path.join(root, name), value);
  const hashes = Object.fromEntries(canonical.map((name) => [name, sha(values[name])]));
  const manifest = { protocol_version: "1.1", schema_version: "3.0.0", package_id: "package-fixture", artifact_set_id: "artifact-set-fixture", status: "accepted" };
  const artifactSet = { artifact_set_id: "artifact-set-fixture", package_id: "package-fixture", status: "accepted", source_capture_ids: ["capture-1"], correction_ids: ["correction-1"], decision_ids: ["decision-1"], artifact_hashes: hashes };
  const source = { sources: [{ source_id: "source-1", kind: "image", status: "ready" }] };
  const evidence = { evidence: [{ evidence_id: "ev-1" }] };
  await change({ root, values, hashes, manifest, artifactSet, source, evidence });
  for (const [name, value] of [["recrafts-package.json", manifest], ["artifact-set.json", artifactSet], ["source-manifest.json", source], ["evidence-map.json", evidence]]) await writeFile(path.join(root, name), JSON.stringify(value));
  return root;
}

test("exports an accepted Schema 3 Artifact Set without Layoutcrafts dependency", async () => {
  const output = await loadCraftsOSArtifactSet(await fixture());
  assert.equal(output.schema_version, "3.0.0"); assert.equal(output.tokens.length, 1); assert.equal(output.unsupported_fields.length, 3);
  assert.equal(output.workspace_promotion, false); assert.equal(output.production_ready, false);
});
test("accepts complete URL evidence as well as ready image evidence", async () => {
  const output = await loadCraftsOSArtifactSet(await fixture(({ source }) => { source.sources[0] = { source_id: "source-1", kind: "url", status: "complete" }; }));
  assert.equal(output.status, "accepted");
});
test("rejects incomplete sources, broken identity, evidence refs, and artifact hashes", async () => {
  const cases = [
    ({ source }) => { source.sources[0].status = "partial"; },
    ({ artifactSet }) => { artifactSet.package_id = "package-wrong"; },
    ({ evidence }) => { evidence.evidence = []; },
    ({ hashes }) => { hashes["tokens.json"] = "0".repeat(64); }
  ];
  for (const change of cases) await assert.rejects(async () => loadCraftsOSArtifactSet(await fixture(change)));
});
