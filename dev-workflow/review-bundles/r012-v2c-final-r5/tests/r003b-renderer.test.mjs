import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRealization } from "../realization/realization_runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDirectory = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/packages/package-ffa63ca8b0ea69af");

test("corrected package renders contract-driven R-003B artifacts", async () => {
  const outputDirectory = mkdtempSync(path.join(os.tmpdir(), "recrafts-r003b-"));
  const result = await createRealization({ packageDirectory, outputDirectory });
  assert.match(result.realization_id, /^realization-/);
  const read = (relative) => readFileSync(path.join(outputDirectory, relative), "utf8");
  const contract = JSON.parse(read("preview/runtime/compiled-contract.json"));
  assert.equal(contract.package_id, "package-ffa63ca8b0ea69af");
  assert.equal(contract.preview_fallbacks.filter((item) => item.token_id).length, 2);
  assert.match(read("preview/runtime/tokens.css"), /--app-background:/);
  assert.match(read("preview/runtime/tokens.css"), /--preview-interaction-accent:/);

  const board = read("preview/system-board.html");
  for (const section of ["Package identity","Capability limits","Global tokens","Scoped tokens","Typography direction","Spacing, radius, border &amp; shadow","Surface hierarchy","Three-column grammar","Content isolation","Component inventory","State inventory","Decision status","Not-testable","Evidence trace"]) assert.match(board, new RegExp(section));
  assert.match(board, /data-token-ids=/);
  assert.match(board, /preview-only fallback/);

  const gallery = read("preview/component-gallery.html");
  assert.ok((gallery.match(/data-component-contract-id=/g) ?? []).length >= 27);
  assert.ok((gallery.match(/data-state-matrix=/g) ?? []).length >= 10);
  for (const family of ["Button","IconButton","Tabs","SegmentedControl","SearchField","Toggle","NavigationRail","DocumentCard","InspectorPanel","EditorCanvas","AgentSuggestionCard","LoadingSkeleton"]) assert.match(gallery, new RegExp(`>${family}<`));

  const surface = read("preview/surface-preview.html");
  assert.doesNotMatch(surface, /<header/i);
  assert.equal((surface.match(/data-workbench-column=/g) ?? []).length, 3);
  for (const state of ["default","selected-object","agent-suggestion"]) assert.match(surface, new RegExp(`data-preview-state="${state}"`));
  assert.match(surface, /data-component-contract-id="component-agent-suggestion-card"/);
});

test("realization refuses to overwrite a non-empty output", async () => {
  const outputDirectory = mkdtempSync(path.join(os.tmpdir(), "recrafts-r003b-collision-"));
  writeFileSync(path.join(outputDirectory, "existing.txt"), "existing");
  await assert.rejects(() => createRealization({ packageDirectory, outputDirectory }), /empty|overwrite/i);
});
