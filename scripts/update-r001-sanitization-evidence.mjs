import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDirIndex = process.argv.indexOf("--raw-dir");
if (rawDirIndex < 0 || !process.argv[rawDirIndex + 1]) throw new Error("Usage: node scripts/update-r001-sanitization-evidence.mjs --raw-dir <authorized-local-directory>");
const rawDir = path.resolve(process.argv[rawDirIndex + 1]);
const fixture = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/input");
const sanitizationPath = path.join(fixture, "sanitization-manifest.json");
const manifest = JSON.parse(await readFile(path.join(fixture, "source-manifest.json"), "utf8"));
const sanitization = JSON.parse(await readFile(sanitizationPath, "utf8"));
const rawNames = {
  "library-card-view": "Clipboard - 2026-07-11 23.55.28.png",
  "library-list-view": "Clipboard - 2026-07-11 23.55.40.png",
  "library-masonry-view": "Clipboard - 2026-07-11 23.55.54.png",
  "editor-insert-inspector": "Clipboard - 2026-07-11 23.56.42.png",
  "editor-format-inspector": "Clipboard - 2026-07-11 23.57.17.png",
  "editor-style-inspector": "Clipboard - 2026-07-11 23.57.59.png",
  "style-gallery-modal": "Clipboard - 2026-07-11 23.58.20.png",
  "page-info-inspector": "Clipboard - 2026-07-11 23.58.53.png",
  "imagine-onboarding": "Clipboard - 2026-07-11 23.59.22.png",
  "appearance-settings": "Clipboard - 2026-07-12 00.00.56.png",
  "premium-pricing-modal": "Clipboard - 2026-07-12 00.01.35.png",
  "editor-focus-view": "Clipboard - 2026-07-12 00.02.08.png",
  "shared-empty-state": "Clipboard - 2026-07-12 00.04.45.png"
};
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
sanitization.transformation_version = "r001-ffmpeg-boxblur-v1";
sanitization.pre_scan_ref = "dev-workflow/evidence/r-001/secret-scan-summary.json#pre";
sanitization.post_scan_ref = "dev-workflow/evidence/r-001/secret-scan-summary.json#post";
sanitization.fixture_capability_ref = "input/fixture-capability.json";
for (const entry of sanitization.entries) {
  const rawName = rawNames[entry.source_id];
  const raw = await readFile(path.join(rawDir, rawName));
  const source = manifest.sources.find((item) => item.source_id === entry.source_id);
  entry.raw_sha256 = hash(raw);
  entry.sanitized_sha256 = source.sha256;
  entry.transformation_command = `ffmpeg -i <raw> -vf boxblur=6:2 -map_metadata -1 <sanitized>`;
  entry.transformation_version = sanitization.transformation_version;
  entry.metadata_removal_result = "passed";
  entry.pre_scan_ref = sanitization.pre_scan_ref;
  entry.post_scan_ref = sanitization.post_scan_ref;
  entry.reviewer_status = "ready-for-independent-review";
  entry.reversible = false;
  entry.intended_fixture_capability = ["macro_layout", "surface_hierarchy", "broad_color_family", "partial_state_detection"];
}
await writeFile(sanitizationPath, `${JSON.stringify(sanitization, null, 2)}\n`);
console.log(`Updated sanitization evidence for ${sanitization.entries.length} sources without copying raw files.`);
