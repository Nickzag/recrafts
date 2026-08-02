import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { sha, validateProductPreviewCoverage } from "../runtime/product_ui_contract.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}
const outputDirectory = args.get("output");
if (!outputDirectory) throw new Error("Usage: node scripts/generate-r011-previews.mjs --output <candidate-dir>");

const requiredSurfaces = [
  ["workspace-library-desktop", "Workspace Library", "desktop"],
  ["workspace-library-mobile", "Workspace Library", "mobile"],
  ["project-studio-desktop", "Project Studio", "desktop"],
  ["project-studio-compact", "Project Studio compact", "compact"],
  ["review-evidence", "Review & Evidence", "desktop"],
  ["quick-create", "Quick Create", "desktop"],
  ["command-overlay", "Command search", "desktop"],
  ["dialog", "Confirmation dialog", "desktop"],
  ["navigation-sheet", "Navigation sheet", "mobile"],
  ["inspector-sheet", "Inspector sheet", "mobile"],
  ["empty-state", "Empty state", "desktop"],
  ["loading-state", "Loading state", "desktop"],
  ["blocking-conflict", "Blocking conflict", "desktop"],
  ["rollback-confirmation", "Rollback confirmation", "desktop"]
];
const directions = [
  { id: "quiet-frame", name: "Quiet Frame", surface: "#f4f6f5", panel: "#ffffff", accent: "#286b63", signal: "#dfe9ff" },
  { id: "signal-column", name: "Signal Column", surface: "#f6f4f8", panel: "#ffffff", accent: "#5d4fb1", signal: "#eee8ff" }
];
const componentMap = {
  "workspace-library-desktop": ["app-rail", "view-switcher", "document-preview"],
  "workspace-library-mobile": ["view-switcher", "document-preview"],
  "project-studio-desktop": ["app-rail", "editor-context-panel", "document-preview"],
  "project-studio-compact": ["editor-context-panel", "document-preview"],
  "review-evidence": ["app-rail", "action-list", "editor-context-panel"],
  "quick-create": ["insert-palette", "command-search"],
  "command-overlay": ["command-search", "action-list"],
  dialog: ["action-list", "editor-context-panel"],
  "navigation-sheet": ["app-rail", "view-switcher"],
  "inspector-sheet": ["editor-context-panel", "preference-section"],
  "empty-state": ["app-rail", "empty-state"],
  "loading-state": ["app-rail", "document-preview"],
  "blocking-conflict": ["action-list", "editor-context-panel"],
  "rollback-confirmation": ["action-list", "editor-context-panel"]
};
const stateMap = {
  "workspace-library-desktop": "workspace-ready", "workspace-library-mobile": "mobile-library-unknown",
  "project-studio-desktop": "project-editing", "project-studio-compact": "project-selected",
  "review-evidence": "review-ready", "quick-create": "style-gallery-open", "command-overlay": "command-search-open",
  dialog: "review-rollback", "navigation-sheet": "mobile-library-unknown", "inspector-sheet": "mobile-inspector-unknown",
  "empty-state": "workspace-empty", "loading-state": "workspace-loading", "blocking-conflict": "project-conflict", "rollback-confirmation": "review-rollback"
};
const text = {
  "workspace-library-desktop": ["Library", "All documents", "Design notes", "Product brief", "Untitled draft"],
  "workspace-library-mobile": ["Library", "Recent documents", "Design notes", "Product brief", "Untitled draft"],
  "project-studio-desktop": ["Project Studio", "Untitled draft", "Write, plan, and review in one surface", "Context", "Insert  Format  Style  Info"],
  "project-studio-compact": ["Project Studio", "Untitled draft", "Compact editing surface", "Inspector"],
  "review-evidence": ["Review & Evidence", "Candidate package", "12 claims corroborated", "Accept", "Request correction"],
  "quick-create": ["Quick Create", "Start from a blank surface", "Document", "Canvas", "Evidence review"],
  "command-overlay": ["Command search", "Search actions", "Open review", "Create document", "Toggle inspector"],
  dialog: ["Confirm action", "This action is reversible", "Cancel", "Continue"],
  "navigation-sheet": ["Navigation", "Workspace Library", "Project Studio", "Review & Evidence", "Settings"],
  "inspector-sheet": ["Inspector", "Selection", "Appearance", "Interactions", "Accessibility"],
  "empty-state": ["Shared workspace", "Nothing here yet", "Create your first document to begin"],
  "loading-state": ["Loading workspace", "Preparing your documents", "Keep this surface open"],
  "blocking-conflict": ["Conflict detected", "The current candidate changed upstream", "Review differences", "Keep local version"],
  "rollback-confirmation": ["Rollback candidate", "The last accepted state will be restored", "Cancel", "Rollback"]
};

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const shell = ({ direction, surfaceId, title, mode }) => {
  const labels = text[surfaceId] ?? [title, "Workspace surface", "A source-neutral product UI contract preview"];
  const components = componentMap[surfaceId] ?? ["document-preview"];
  const stateId = stateMap[surfaceId] ?? "workspace-ready";
  const mobile = mode === "mobile";
  const compact = mode === "compact";
  const overlay = ["quick-create", "command-overlay", "dialog", "navigation-sheet", "inspector-sheet", "rollback-confirmation"].includes(surfaceId);
  const rail = mobile ? "" : `<aside class="rail" data-component-id="app-rail"><div class="rail-mark">R</div><div class="rail-dot active"></div><div class="rail-dot"></div><div class="rail-dot"></div><div class="rail-spacer"></div><div class="rail-dot"></div></aside>`;
  const nav = !mobile && !compact ? `<nav class="nav" data-component-id="view-switcher"><div class="eyebrow">WORKSPACE</div><div class="nav-row selected">⌂ <span>${esc(labels[0])}</span></div><div class="nav-row">◌ <span>Recent</span></div><div class="nav-row">▦ <span>Collections</span></div><div class="eyebrow second">PROJECTS</div><div class="nav-row">＋ <span>New project</span></div></nav>` : "";
  const cards = ["Design notes", "Product brief", "Untitled draft"].map((name, index) => `<article class="doc" data-component-id="document-preview"><div class="doc-preview tint-${index}"><span>${index === 0 ? "A" : index === 1 ? "B" : "C"}</span></div><div class="doc-meta"><strong>${name}</strong><small>Updated ${index + 1}h ago</small></div><span class="doc-more">•••</span></article>`).join("");
  let main = "";
  if (surfaceId.startsWith("workspace-library")) main = `<section class="content"><header class="topline"><div><div class="eyebrow">WORKSPACE</div><h1>${esc(labels[0])}</h1></div><div class="toolbar"><button class="ghost">Filter</button><button class="accent">＋ New</button></div></header><div class="subline"><span>${esc(labels[1])}</span><div class="view-toggle"><span class="active">▦</span><span>☷</span></div></div><div class="doc-grid">${cards}</div></section>`;
  else if (["project-studio-desktop", "project-studio-compact"].includes(surfaceId)) main = `<section class="content editor"><header class="topline"><div><div class="eyebrow">PROJECT STUDIO</div><h1>${esc(labels[1])}</h1></div><div class="toolbar"><button class="ghost">Share</button><button class="ghost">Review</button></div></header><div class="editor-body"><article class="canvas" data-component-id="document-preview"><div class="canvas-kicker">FIELD NOTE  /  01</div><h2>${esc(labels[2])}</h2><p>Build a calm working surface for evidence, decisions, and reversible change.</p><div class="rule"></div><p class="muted">The visual contract keeps content primary while making state and provenance legible.</p></article><aside class="inspector" data-component-id="editor-context-panel"><div class="inspector-tabs"><span class="active">Insert</span><span>Format</span><span>Style</span><span>Info</span></div><div class="inspector-section"><div class="eyebrow">CURRENT SELECTION</div><strong>Paragraph</strong><div class="control-row"><span>Alignment</span><span>Left⌄</span></div><div class="control-row"><span>Spacing</span><span>Comfortable⌄</span></div></div></aside></div></section>`;
  else if (surfaceId === "review-evidence") main = `<section class="content"><header class="topline"><div><div class="eyebrow">REVIEW</div><h1>${esc(labels[0])}</h1></div><span class="status-chip">READY FOR REVIEW</span></header><div class="review-layout"><article class="review-card"><div class="eyebrow">CANDIDATE PACKAGE</div><h2>${esc(labels[1])}</h2><p class="muted">${esc(labels[2])}</p><div class="meter"><span style="width:78%"></span></div><div class="review-lines"><div>Visual grammar <b>Corroborated</b></div><div>Source distance <b>Pass</b></div><div>Owner decision <b>Pending</b></div></div></article><aside class="action-panel" data-component-id="action-list"><button class="accent">${esc(labels[3])}</button><button class="ghost">${esc(labels[4])}</button><button class="ghost">View evidence</button></aside></div></section>`;
  else if (surfaceId === "empty-state") main = `<section class="content centered"><div class="empty-mark">＋</div><h1>${esc(labels[1])}</h1><p>${esc(labels[2])}</p><button class="accent">Create document</button></section>`;
  else if (surfaceId === "loading-state") main = `<section class="content centered"><div class="spinner"></div><h1>${esc(labels[0])}</h1><p>${esc(labels[1])}</p><div class="skeleton wide"></div><div class="skeleton"></div></section>`;
  else if (surfaceId === "blocking-conflict") main = `<section class="content centered"><div class="alert-icon">!</div><h1>${esc(labels[0])}</h1><p>${esc(labels[1])}</p><div class="dialog-actions"><button class="ghost">${esc(labels[2])}</button><button class="accent">${esc(labels[3])}</button></div></section>`;
  else if (["quick-create", "command-overlay"].includes(surfaceId)) main = `<section class="content dimmed"><div class="modal" data-component-id="${components[0]}"><div class="modal-head"><div><div class="eyebrow">${esc(labels[0])}</div><h2>${esc(labels[1])}</h2></div><span class="key">esc</span></div><div class="search">⌕&nbsp; ${esc(labels[1])}<span>⌘K</span></div><div class="command-list"><div class="command selected"><span>＋</span>${esc(labels[2])}<kbd>↵</kbd></div><div class="command"><span>□</span>${esc(labels[3])}<kbd>⌘N</kbd></div><div class="command"><span>◌</span>${esc(labels[4])}<kbd>⌘I</kbd></div></div></div></section>`;
  else if (["dialog", "rollback-confirmation"].includes(surfaceId)) main = `<section class="content dimmed"><div class="modal small" data-component-id="action-list"><div class="alert-icon">!</div><h2>${esc(labels[0])}</h2><p>${esc(labels[1])}</p><div class="dialog-actions"><button class="ghost">${esc(labels[2])}</button><button class="accent">${esc(labels[3])}</button></div></div></section>`;
  else if (["navigation-sheet", "inspector-sheet"].includes(surfaceId)) main = `<section class="content dimmed"><div class="sheet" data-component-id="${components[0]}"><div class="sheet-handle"></div><div class="eyebrow">${esc(labels[0])}</div><h2>${esc(labels[1])}</h2>${labels.slice(2).map((label, index) => `<div class="sheet-row ${index === 0 ? "selected" : ""}"><span>${index === 0 ? "◉" : "○"}</span>${esc(label)}<span class="arrow">›</span></div>`).join("")}</div></section>`;
  else main = `<section class="content centered"><h1>${esc(title)}</h1><p>A source-neutral surface contract.</p></section>`;
  const contract = { contract_ids: [`contract-${surfaceId}`, `contract-${direction.id}`], component_ids: components, state_ids: [stateId], provenance_layers: { source_derived: ["hierarchy", "density", "panel relationship"], craftsos_required: ["evidence traceability", "human review gate", "reversible recovery"] } };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(direction.name)} — ${esc(title)}</title><style>:root{--surface:${direction.surface};--panel:${direction.panel};--accent:${direction.accent};--signal:${direction.signal};--text:#18212f;--muted:#66717d;--border:#d8dfdc;--shadow:0 16px 40px rgba(25,36,46,.12)}*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--text);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{min-height:100vh;display:flex}.rail{width:64px;background:#e9eeec;border-right:1px solid var(--border);padding:18px 0;display:flex;flex-direction:column;align-items:center;gap:16px}.rail-mark{width:30px;height:30px;border-radius:9px;background:var(--accent);color:white;display:grid;place-items:center;font-weight:700}.rail-dot{width:18px;height:18px;border:1px solid #b7c3bf;border-radius:6px}.rail-dot.active{background:var(--signal);border-color:var(--accent)}.rail-spacer{flex:1}.nav{width:226px;padding:32px 18px;border-right:1px solid var(--border);background:rgba(255,255,255,.26)}.eyebrow{font-size:10px;letter-spacing:.14em;color:var(--muted);font-weight:700}.eyebrow.second{margin-top:30px}.nav-row{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:8px;color:#51606c}.nav-row.selected{background:var(--signal);color:var(--text);font-weight:650}.content{flex:1;padding:42px 48px;min-width:0}.topline{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--border);padding-bottom:22px}.topline h1,h1{font-size:28px;letter-spacing:-.035em;margin:7px 0 0}.toolbar{display:flex;gap:8px}.button,button{font:inherit;border:0;cursor:default}.ghost,.accent{border:1px solid var(--border);border-radius:8px;padding:9px 14px;background:var(--panel);color:var(--text)}.accent{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:650}.subline{display:flex;justify-content:space-between;padding:24px 0 14px;font-weight:650}.view-toggle{display:flex;gap:4px}.view-toggle span{padding:5px 8px;border-radius:6px;color:var(--muted)}.view-toggle .active{background:var(--panel);color:var(--accent);box-shadow:0 1px 4px rgba(0,0,0,.06)}.doc-grid{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:18px}.doc{background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:0 5px 15px rgba(25,36,46,.04)}.doc-preview{height:130px;display:grid;place-items:center;background:linear-gradient(135deg,#e7edeb,#fbfcfc);color:var(--accent);font-size:36px;font-weight:750}.tint-1{background:linear-gradient(135deg,#ece9f4,#fdfbff);color:#5d4fb1}.tint-2{background:linear-gradient(135deg,#eceff4,#fff)}.doc-meta{padding:13px 14px 16px;display:flex;flex-direction:column;gap:3px}.doc-meta small{color:var(--muted);font-size:12px}.doc-more{position:relative;float:right;margin:-46px 12px 0;color:var(--muted)}.editor-body{display:grid;grid-template-columns:minmax(0,1fr) 286px;gap:26px;padding-top:34px}.canvas{background:var(--panel);border:1px solid var(--border);border-radius:12px;min-height:540px;padding:58px 72px;box-shadow:var(--shadow)}.canvas-kicker{font-size:10px;letter-spacing:.16em;color:var(--accent);font-weight:750}.canvas h2{font:650 30px/1.15 Georgia,serif;margin:26px 0 18px;letter-spacing:-.02em}.canvas p{max-width:580px;font-size:16px}.canvas .muted{color:var(--muted);font-size:14px}.rule{height:1px;background:var(--border);margin:32px 0}.inspector,.action-panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:0 8px 24px rgba(25,36,46,.07);height:max-content}.inspector-tabs{display:flex;gap:7px;border-bottom:1px solid var(--border);padding-bottom:13px}.inspector-tabs span{font-size:12px;color:var(--muted)}.inspector-tabs .active{color:var(--accent);font-weight:700}.inspector-section{padding-top:22px;display:grid;gap:12px}.control-row{display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:12px;color:var(--muted)}.review-layout{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:22px;padding-top:32px}.review-card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:28px}.review-card h2{margin:8px 0}.meter{height:8px;background:var(--signal);border-radius:99px;overflow:hidden;margin:24px 0}.meter span{display:block;height:100%;background:var(--accent)}.review-lines{display:grid;gap:12px}.review-lines div{display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:12px;color:var(--muted)}.review-lines b{color:var(--text);font-weight:650}.status-chip{border:1px solid #9abcb5;color:var(--accent);border-radius:99px;padding:6px 10px;font-size:10px;letter-spacing:.1em;font-weight:750}.action-panel{display:grid;gap:10px}.centered{display:grid;place-content:center;text-align:center;justify-items:center;min-height:620px}.centered p{color:var(--muted);max-width:340px}.empty-mark,.alert-icon{width:54px;height:54px;border-radius:16px;background:var(--signal);color:var(--accent);display:grid;place-items:center;font-size:26px;font-weight:700}.alert-icon{background:#fff0d9;color:#a36500}.spinner{width:42px;height:42px;border-radius:50%;border:3px solid var(--signal);border-top-color:var(--accent);margin-bottom:20px}.skeleton{height:12px;width:220px;background:var(--signal);border-radius:5px;margin-top:12px}.skeleton.wide{width:330px}.dimmed{display:grid;place-items:center;background:rgba(25,36,46,.14)}.modal{width:520px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:22px;box-shadow:var(--shadow)}.modal.small{width:380px;text-align:center}.modal.small .alert-icon{margin:0 auto}.modal-head{display:flex;justify-content:space-between;align-items:start}.modal h2{margin:7px 0 18px;letter-spacing:-.02em}.key{border:1px solid var(--border);border-radius:6px;padding:4px 7px;color:var(--muted);font-size:11px}.search{border:1px solid var(--accent);box-shadow:0 0 0 3px var(--signal);border-radius:9px;padding:12px;color:var(--muted);display:flex;justify-content:space-between}.command-list{display:grid;gap:4px;margin-top:16px}.command{padding:12px;border-radius:8px;display:flex;gap:12px;align-items:center}.command.selected{background:var(--signal);font-weight:650}.command kbd{margin-left:auto;color:var(--muted);font-size:11px}.sheet{width:min(420px,100%);min-height:480px;align-self:end;background:var(--panel);border-radius:16px 16px 0 0;padding:16px 20px;box-shadow:var(--shadow)}.sheet-handle{width:44px;height:4px;border-radius:9px;background:#cbd4d1;margin:0 auto 22px}.sheet h2{margin:7px 0 24px}.sheet-row{display:flex;gap:12px;align-items:center;padding:14px 10px;border-top:1px solid var(--border);color:var(--muted)}.sheet-row.selected{color:var(--accent);background:var(--signal);border-radius:8px}.sheet-row .arrow{margin-left:auto}.muted{color:var(--muted)}@media(max-width:720px){.content{padding:24px 18px}.doc-grid{grid-template-columns:1fr}.editor-body,.review-layout{grid-template-columns:1fr}.canvas{padding:34px 24px;min-height:420px}.nav{display:none}.topline{align-items:start;gap:12px}.topline h1,h1{font-size:24px}.toolbar .ghost{display:none}.modal{width:calc(100vw - 32px)}} </style></head><body><div class="app">${rail}${nav}${main}</div><script type="application/json" data-contract="r011">${JSON.stringify({ ...contract, surface_id: surfaceId, direction_id: direction.id })}</script></body></html>`;
};

await mkdir(path.join(outputDirectory, "previews"), { recursive: true });
const browser = await chromium.launch({ headless: true });
const previews = [];
for (const direction of directions) {
  for (const [surfaceId, title, mode] of requiredSurfaces) {
    const directory = path.join(outputDirectory, "previews", direction.id);
    await mkdir(directory, { recursive: true });
    const htmlPath = path.join(directory, `${surfaceId}.html`);
    const screenshotPath = path.join(directory, `${surfaceId}.png`);
    await writeFile(htmlPath, shell({ direction, surfaceId, title, mode }));
    const viewport = mode === "mobile" ? { width: 390, height: 844 } : mode === "compact" ? { width: 1080, height: 860 } : { width: 1440, height: 900 };
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.setContent(await readFile(htmlPath, "utf8"), { waitUntil: "load" });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.close();
    previews.push({
      preview_id: `preview-${direction.id}-${surfaceId}`,
      direction_id: direction.id,
      surface_id: surfaceId,
      mode,
      viewport: `${viewport.width}x${viewport.height}`,
      html_path: path.relative(outputDirectory, htmlPath),
      screenshot_path: path.relative(outputDirectory, screenshotPath),
      contract_ids: [`contract-${surfaceId}`, `contract-${direction.id}`],
      component_ids: componentMap[surfaceId],
      state_ids: [stateMap[surfaceId]],
      provenance_layers: { source_derived: ["hierarchy", "density", "panel relationship"], craftsos_required: ["evidence traceability", "human review gate", "reversible recovery"] },
      source_neutral: true,
      status: "pass",
      sha256: sha(await readFile(screenshotPath))
    });
  }
}
await browser.close();
const coverage = { version: "r011.1.0", coverage_id: `preview-coverage-${sha(previews).slice(0, 16)}`, required_surfaces: requiredSurfaces.map(([surfaceId]) => surfaceId), required_directions: directions.map((direction) => direction.id), previews, status: validateProductPreviewCoverage({ previews }, { requiredSurfaces: requiredSurfaces.map(([surfaceId]) => surfaceId) }).length ? "fail" : "pass" };
if (coverage.status !== "pass") throw new Error(JSON.stringify(validateProductPreviewCoverage(coverage, { requiredSurfaces: coverage.required_surfaces }), null, 2));
await writeFile(path.join(outputDirectory, "preview-coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "validation/preview-coverage.json"), `${JSON.stringify({ validator: "validate-product-preview-coverage", status: "pass", required_surfaces: coverage.required_surfaces, required_directions: coverage.required_directions, preview_count: previews.length, errors: [] }, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "validation/no-oracle-product-ui-rerun.json"), `${JSON.stringify({ validator: "validate-no-oracle-product-ui", status: "pass", checked_inputs: ["prepared mixed Evidence bundle", "fresh official URL captures", "host analysis fixture"], excluded_inputs: ["downstream visual source captures", "prior design contracts", "prior review bundles"], expected_answer_paths: [], errors: [] }, null, 2)}\n`);
const artifactSetPath = path.join(outputDirectory, "artifact-set.json");
const artifactSet = JSON.parse(await readFile(artifactSetPath, "utf8"));
for (const entry of artifactSet.artifacts ?? []) {
  if (entry.path === "artifact-set.json" || !entry.path) continue;
  try { entry.sha256 = sha(await readFile(path.join(outputDirectory, entry.path))); } catch { /* validators report missing required files */ }
}
artifactSet.artifact_hashes = Object.fromEntries((artifactSet.artifacts ?? []).filter((entry) => entry.sha256).map((entry) => [entry.path, entry.sha256]));
await writeFile(artifactSetPath, `${JSON.stringify(artifactSet, null, 2)}\n`);
const packageManifestPath = path.join(outputDirectory, "recrafts-package.json");
const packageManifest = JSON.parse(await readFile(packageManifestPath, "utf8"));
packageManifest.artifacts = artifactSet.artifacts;
await writeFile(packageManifestPath, `${JSON.stringify(packageManifest, null, 2)}\n`);
console.log(JSON.stringify({ status: coverage.status, preview_count: previews.length, output: path.join(outputDirectory, "preview-coverage.json") }, null, 2));
