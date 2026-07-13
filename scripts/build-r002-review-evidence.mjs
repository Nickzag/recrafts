import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "examples/golden-candidates/crafts-ui-multi-image/input");
const bundle = path.join(root, "dev-workflow/evidence/r-002/audit-bundle/review-evidence");
const overlayRoot = path.join(bundle, "source-region-overlays");
const assets = path.join(overlayRoot, "assets");
mkdirSync(assets, { recursive: true });
const manifest = JSON.parse(readFileSync(path.join(fixture, "source-manifest.json"), "utf8"));
const colors = { "canonical-product-ui": "#2563eb", "feature-specific-ui": "#7c3aed", "marketing-surface": "#db2777", "user-generated-content": "#16a34a", "state-evidence": "#d97706", "excluded-sensitive-content": "#dc2626", unknown: "#64748b" };
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);

for (const source of manifest.sources) {
  const filename = path.basename(source.file);
  copyFileSync(path.join(fixture, source.file), path.join(assets, filename));
  const overlays = source.regions.map((region, index) => {
    const [x,y,width,height] = region.bbox;
    const color = colors[region.class] ?? colors.unknown;
    const labelY = Math.max(24, y + 24 + index * 4);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" fill-opacity="0.05" stroke="${color}" stroke-width="6"/><rect x="${x}" y="${labelY - 22}" width="${Math.min(width, 680)}" height="28" fill="${color}" fill-opacity="0.9"/><text x="${x + 8}" y="${labelY}" font-family="system-ui,sans-serif" font-size="18" fill="white">${escapeXml(region.id)} · ${escapeXml(region.class)}</text>`;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${source.dimensions.width}" height="${source.dimensions.height}" viewBox="0 0 ${source.dimensions.width} ${source.dimensions.height}"><image href="assets/${escapeXml(filename)}" width="${source.dimensions.width}" height="${source.dimensions.height}"/>${overlays}</svg>`;
  writeFileSync(path.join(overlayRoot, `${source.source_id}.svg`), svg);
}

const thumbs = mkdtempSync(path.join(os.tmpdir(), "recrafts-review-thumbs-"));
for (const [index, source] of manifest.sources.entries()) {
  const input = path.join(fixture, source.file);
  const output = path.join(thumbs, `${String(index).padStart(2, "0")}.png`);
  const result = spawnSync("ffmpeg", ["-loglevel","error","-y","-i",input,"-vf","scale=600:376:force_original_aspect_ratio=decrease,pad=600:376:(ow-iw)/2:(oh-ih)/2:white",output], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Contact-sheet thumbnail failed: ${result.stderr}`);
}
const sheet = spawnSync("ffmpeg", ["-loglevel","error","-y","-framerate","1","-pattern_type","glob","-i",path.join(thumbs,"*.png"),"-vf","tile=4x4:padding=8:margin=8","-frames:v","1","-update","1",path.join(bundle,"source-contact-sheet-redacted.png")], { encoding: "utf8" });
if (sheet.status !== 0) throw new Error(`Contact-sheet build failed: ${sheet.stderr}`);

const rows = manifest.sources.map((source) => `<tr><td>${escapeXml(source.source_id)}</td><td><a href="source-region-overlays/${source.source_id}.svg">Region overlay</a></td><td>${source.regions.map((region) => escapeXml(`${region.id}: ${region.class}`)).join("<br>")}</td></tr>`).join("\n");
const artifactMap = `<!doctype html><meta charset="utf-8"><title>R-002 Artifact-to-Source Map</title><style>body{font:14px system-ui;margin:32px;color:#222}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:10px;text-align:left;vertical-align:top}img{max-width:100%}</style><h1>R-002 Artifact-to-Source Map</h1><p>All images are committed sanitized evidence. Oracle and expected answers are excluded.</p><img src="source-contact-sheet-redacted.png" alt="Redacted source contact sheet"><h2>Source regions</h2><table><thead><tr><th>Source</th><th>Overlay</th><th>Regions / scopes</th></tr></thead><tbody>${rows}</tbody></table><h2>Artifact mapping</h2><ul><li>tokens.json → evidence-map.json evidence refs → source/region overlays</li><li>components.json → component evidence refs → source/region overlays</li><li>layout.json → region hierarchy → source-classification.json → overlays</li><li>design.md → summarized tokens/components/decisions → structured artifacts above</li></ul>`;
writeFileSync(path.join(bundle, "artifact-to-source-map.html"), artifactMap);
writeFileSync(path.join(bundle, "README.md"), "# Safe Visual Review Evidence\n\nThis directory contains only the already-sanitized, metadata-stripped, blurred fixture sources. The contact sheet preserves macro layout, broad color hierarchy and component position while private text remains unreadable. SVG overlays identify source region IDs and classes. Raw sources, Oracle files and expected answers are absent.\n");
console.log(`Built safe visual review evidence for ${manifest.sources.length} sources.`);
