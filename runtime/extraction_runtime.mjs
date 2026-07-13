import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SECRET_PATTERNS = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/, /gh[pousr]_[A-Za-z0-9_]{20,}/, /sk-[A-Za-z0-9_-]{20,}/, /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/];
const ALLOWED_CLASSES = new Set(["canonical-product-ui","feature-specific-ui","marketing-surface","user-generated-content","state-evidence","excluded-sensitive-content","unknown"]);

function sha256(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "source"; }
function assertSafeInput(inputPath) {
  if (/oracle|expected-/i.test(inputPath)) throw new Error("Runtime input cannot read oracle or expected-* paths");
}
function dimensions(buffer, extension) {
  if (extension === ".png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (extension === ".webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { width: null, height: null };
  if ([".jpg", ".jpeg"].includes(extension)) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      offset += 2 + size;
    }
  }
  return { width: null, height: null };
}
function validateRegions(source) {
  const seen = new Set();
  const warnings = [];
  for (const region of source.regions) {
    if (!region.id || seen.has(region.id)) throw new Error(`duplicate or missing region id: ${source.source_id}`);
    seen.add(region.id);
    if (!ALLOWED_CLASSES.has(region.class)) throw new Error(`invalid region class: ${region.class}`);
    if (!Array.isArray(region.bbox) || region.bbox.length !== 4 || region.bbox.some((x) => !Number.isFinite(x) || x < 0)) throw new Error(`invalid bbox: ${region.id}`);
    const [x, y, width, height] = region.bbox;
    if (source.dimensions.width && (x + width > source.dimensions.width || y + height > source.dimensions.height)) throw new Error(`out-of-bounds bbox: ${region.id}`);
    const ratio = source.dimensions.width ? (width * height) / (source.dimensions.width * source.dimensions.height) : null;
    region.area_ratio = ratio;
    if (ratio > 0.8 && ["canonical-product-ui", "user-generated-content"].includes(region.class)) warnings.push(`oversized-region:${source.source_id}:${region.id}`);
  }
  for (let i = 0; i < source.regions.length; i += 1) for (let j = i + 1; j < source.regions.length; j += 1) {
    const a = source.regions[i].bbox; const b = source.regions[j].bbox;
    const intersection = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
    const smaller = Math.min(a[2] * a[3], b[2] * b[3]);
    if (smaller && intersection / smaller > 0.85) warnings.push(`high-overlap:${source.source_id}:${source.regions[i].id}:${source.regions[j].id}`);
  }
  return warnings;
}

async function loadImages(inputPath, single) {
  assertSafeInput(inputPath);
  const input = path.resolve(inputPath);
  const manifestPath = !single && existsSync(path.join(input, "source-manifest.json")) ? path.join(input, "source-manifest.json") : null;
  const manifest = manifestPath ? JSON.parse(await readFile(manifestPath, "utf8")) : null;
  const imagePaths = single ? [input] : (await readdir(input, { withFileTypes: true })).filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())).map((entry) => path.join(input, entry.name));
  const resolvedPaths = imagePaths.length ? imagePaths : (manifest?.sources ?? []).map((source) => path.join(input, source.file.replace(/^sources\//, "sources/")));
  if (resolvedPaths.length < 1 || resolvedPaths.length > 20) throw new Error("Image input requires 1–20 supported images");
  const hashes = new Set();
  const sources = [];
  for (const [index, file] of resolvedPaths.entries()) {
    const extension = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension) || !existsSync(file)) throw new Error(`missing or unsupported image: ${file}`);
    const buffer = await readFile(file);
    const hash = sha256(buffer);
    if (hashes.has(hash)) throw new Error(`duplicate image hash: ${path.basename(file)}`);
    hashes.add(hash);
    const prior = manifest?.sources?.find((source) => path.basename(source.file) === path.basename(file));
    const source = {
      source_id: prior?.source_id ?? `${slug(path.basename(file, extension))}-${hash.slice(0, 8)}`,
      file: path.basename(file), sha256: hash, dimensions: dimensions(buffer, extension), source_type: "image",
      regions: structuredClone(prior?.regions ?? [{ id: "whole-source", class: "unknown", bbox: [0, 0, dimensions(buffer, extension).width ?? 0, dimensions(buffer, extension).height ?? 0], confidence: 0.2, reason: "Host-agent classification required", evidence_refs: [] }]),
      priority: prior?.priority ?? (index === 0 ? "primary" : "supporting"),
    };
    source.warnings = validateRegions(source);
    sources.push(source);
  }
  return sources;
}

function extract(sources, mode) {
  const evidence = [];
  const classes = new Set();
  for (const source of sources) for (const region of source.regions) {
    classes.add(region.class);
    if (["excluded-sensitive-content"].includes(region.class)) continue;
    evidence.push({ evidence_id: `ev-${source.source_id}-${region.id}`, source_id: source.source_id, region_id: region.id, evidence_type: "region-classification", observation: `${region.class} region observed`, candidate_rule: "Host Agent must interpret this bounded region", scope: region.class === "marketing-surface" ? "marketing" : region.class === "user-generated-content" ? "document-content" : "surface", confidence: region.confidence ?? 0.65, status: "observed" });
  }
  const validEvidence = evidence.filter((item) => item.scope !== "document-content");
  const tokens = [];
  if (classes.has("canonical-product-ui")) tokens.push({ id: "surface.hierarchy.direction", type: "surface-hierarchy", status: "inferred", scope: "surface", value: "layered-neutral-shell", usage: "preview candidate only", evidence_refs: validEvidence.slice(0, 3).map((x) => x.evidence_id), confidence: 0.55, measurement_capability: "broad-only" });
  if (classes.has("marketing-surface")) tokens.push({ id: "marketing.visual-family", type: "image-treatment", status: "observed", scope: "marketing", value: "feature-specific", usage: "marketing scope only", evidence_refs: evidence.filter((x) => x.scope === "marketing").map((x) => x.evidence_id), confidence: 0.8, measurement_capability: "broad-only" });
  const components = [];
  if (classes.has("canonical-product-ui")) components.push({ name: "ApplicationSurface", scope: "surface", purpose: "Organize persistent product regions", anatomy: ["navigation-region","content-region","context-region"], visible_variants: [], visible_states: [], possible_interactions: ["unknown"], token_dependencies: ["surface.hierarchy.direction"], evidence_refs: validEvidence.slice(0, 5).map((x) => x.evidence_id), confidence: 0.6, unknowns: ["exact spacing","icon geometry","typography"] });
  if (classes.has("state-evidence")) components.push({ name: "StateContainer", scope: "surface", purpose: "Represent an observed UI state", anatomy: ["state-region"], visible_variants: ["observed"], visible_states: ["partial"], possible_interactions: ["unknown"], token_dependencies: [], evidence_refs: evidence.filter((x) => x.candidate_rule).slice(0, 4).map((x) => x.evidence_id), confidence: 0.5, unknowns: ["transition","semantics"] });
  if (classes.has("marketing-surface")) components.push({ name: "MarketingPageSection", scope: "marketing", purpose: "Represent a bounded public marketing-page section", anatomy: ["content-region","media-region"], visible_variants: ["homepage"], visible_states: [], possible_interactions: ["navigation"], token_dependencies: ["marketing.visual-family"], evidence_refs: evidence.filter((item) => item.scope === "marketing").map((item) => item.evidence_id), confidence: 0.55, unknowns: ["responsive variants","interaction motion","exact typography"] });
  const layout = { app_shell: classes.has("canonical-product-ui") ? "multi-region" : "unknown", region_hierarchy: sources.flatMap((source) => source.regions.map((region) => ({ source_id: source.source_id, region_id: region.id, class: region.class }))), column_rules: "inferred-from-regions", alignment: "not-testable", density: "broad-only", whitespace: "broad-only", relationships: "candidate", responsive_unknowns: ["breakpoints","reflow"], platform_assumptions: ["desktop screenshots unless manifest states otherwise"] };
  const questions = sources.flatMap((source) => source.regions.filter((region) => region.class === "unknown" || (region.confidence ?? 1) < 0.6).map((region) => `- Confirm classification for ${source.source_id}/${region.id}.`));
  return { evidence, tokens, components, layout, questions, mode };
}

async function prepareOutput(outputDir) {
  const output = path.resolve(outputDir);
  if (existsSync(output) && (await readdir(output)).length) throw new Error("Output directory must be empty; prior runs are never overwritten");
  await mkdir(path.join(output, ".stages"), { recursive: true });
  return output;
}
async function writeJson(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
async function saveStage(output, number, name, value) { await writeJson(path.join(output, ".stages", `${number}-${name}.json`), { stage: name, status: "completed", ...value }); }

async function exportDraft(output, sources, extracted, mode) {
  const runId = `run-${sha256(Buffer.from(sources.map((source) => source.sha256).sort().join(""))).slice(0, 12)}`;
  const manifest = { version: "2.0.0", run_id: runId, mode, sources };
  await saveStage(output, 1, "intake", { mode });
  await saveStage(output, 2, "capture", { source_count: sources.length });
  await saveStage(output, 3, "normalize", { source_ids: sources.map((source) => source.source_id) });
  await writeJson(path.join(output, "source-manifest.json"), manifest);
  await writeJson(path.join(output, "source-classification.json"), { version: "2.0.0", sources: sources.map(({ source_id, regions, warnings }) => ({ source_id, regions, warnings })) });
  await saveStage(output, 4, "classify", { warnings: sources.flatMap((source) => source.warnings) });
  await writeJson(path.join(output, "evidence-map.json"), { version: "2.0.0", evidence: extracted.evidence });
  await writeJson(path.join(output, "tokens.json"), { status: "candidate", tokens: extracted.tokens });
  await writeJson(path.join(output, "layout.json"), extracted.layout);
  await writeJson(path.join(output, "components.json"), { status: "candidate", components: extracted.components });
  await saveStage(output, 5, "extract", { evidence_count: extracted.evidence.length, token_count: extracted.tokens.length, component_count: extracted.components.length });
  const limited = sources.length === 1;
  const design = `# Recrafts Extraction Draft\n\nstatus: draft\nreadiness: extraction-complete\npreview_readiness: pending\nfidelity_readiness: not-started\nsource_coverage: ${limited ? "limited" : "multi-source"}\nsystem_confidence: ${limited ? "partial" : "evidence-bounded"}\nrun_id: ${runId}\n\n## Metadata\nHost-Agent Skill Mode; deterministic composition from validated input evidence.\n\n## Source Summary\n${sources.length} source(s): ${sources.map((source) => `${source.source_id} (${source.sha256.slice(0, 12)})`).join(", ")}\n\n## Source Classification\nRegion-level classes are stored in source-classification.json.\n\n## Scoped Token Candidates\n${extracted.tokens.length ? extracted.tokens.map((token) => `- ${token.id}: ${token.value} [${token.scope}; ${token.status}; ${token.measurement_capability}]`).join("\n") : "- No canonical visual token can be measured from current evidence."}\n\n## Layout Grammar\nApp shell: ${extracted.layout.app_shell}; responsive behavior remains unknown.\n\n## Component Candidates\n${extracted.components.length ? extracted.components.map((component) => `- ${component.name}: ${component.purpose}`).join("\n") : "- No component candidate has sufficient evidence."}\n\n## Provenance\nEvery observed candidate references evidence-map.json; excluded regions do not feed inference.\n\n## Content Isolation\nUser-generated content and marketing surfaces cannot become global tokens.\n\n## Measurement Limits\nExact typography, micro spacing, icon geometry and pixel fidelity are not-testable for blurred evidence.\n\n## Open Questions\nSee open-questions.md.\n\n## Known Limitations\nNo preview, production component, fidelity, full-site reconstruction, VIS, CraftsOS integration or production-readiness claim.\n`;
  await writeFile(path.join(output, "design.md"), design);
  await writeFile(path.join(output, "open-questions.md"), `# Open Questions\n\n${extracted.questions.length ? extracted.questions.join("\n") : "- Human review must confirm scope and candidate promotion."}\n`);
  await saveStage(output, 6, "compose", { design_status: "draft" });
  await saveStage(output, 7, "validate", { status: "pending-external-validator" });
  await writeJson(path.join(output, "run-log.json"), { run_id: runId, mode, stages: ["intake","capture","normalize","classify","extract","compose","validate","export-draft"], inputs: sources.map((source) => ({ source_id: source.source_id, sha256: source.sha256 })) });
  await saveStage(output, 8, "export-draft", { run_id: runId });
  return { run_id: runId, output };
}

export async function analyzeImages({ input, output, single = false }) {
  const target = await prepareOutput(output);
  const sources = await loadImages(input, single);
  return exportDraft(target, sources, extract(sources, single ? "single-image" : "multi-image"), single ? "single-image" : "multi-image");
}

export async function analyzeWebsite({ url, output, routes = [], action, screenshot }) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Website URL must use http or https");
  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) || /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) throw new Error("Private-network website capture is not allowed");
  if (routes.length > 3) throw new Error("Website route limit is 3");
  const routeUrls = routes.map((route) => new URL(route, parsed));
  if (routeUrls.some((route) => route.origin !== parsed.origin)) throw new Error("Website routes must remain same-origin");
  if (action) throw new Error("Destructive or form browser actions are not allowed");
  const target = await prepareOutput(output);
  let response;
  try { response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Recrafts-MVP-Evidence-Capture/0.2" } }); }
  catch (error) { throw new Error(`Website inaccessible or redirected: ${error.message}`); }
  if (!response.ok) throw new Error(`Website inaccessible: HTTP ${response.status}`);
  const html = await response.text();
  const hasCredentialForm = /<form[\s\S]{0,4000}type=["']password/i.test(html);
  if (hasCredentialForm || /captcha|paywall/i.test(html)) throw new Error("Login wall, captcha or paywall detected");
  if (SECRET_PATTERNS.some((pattern) => pattern.test(html))) throw new Error("Secret-like website evidence detected");
  const cssVariables = [...html.matchAll(/(--[a-zA-Z0-9-_]+)\s*:\s*([^;}]+)/g)].slice(0, 200).map((match) => ({ name: match[1], value: match[2].trim() }));
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].slice(0, 300).map((match) => match[1]);
  const routeMetadata = [];
  for (const route of routeUrls) {
    let routeResponse;
    try { routeResponse = await fetch(route, { redirect: "error", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Recrafts-MVP-Evidence-Capture/0.2" } }); }
    catch (error) { throw new Error(`Website route inaccessible or redirected: ${route.pathname}: ${error.message}`); }
    if (!routeResponse.ok) throw new Error(`Website route inaccessible: ${route.pathname} HTTP ${routeResponse.status}`);
    const routeHtml = await routeResponse.text();
    if (/<form[\s\S]{0,4000}type=["']password|captcha|paywall/i.test(routeHtml)) throw new Error(`Login wall, captcha or paywall detected: ${route.pathname}`);
    routeMetadata.push({ url: route.href, status: routeResponse.status, html_sha256: sha256(Buffer.from(routeHtml)), title: routeHtml.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "" });
  }
  const capture = { url, final_url: response.url, status: response.status, viewport: { width: 1440, height: 900 }, html_sha256: sha256(Buffer.from(html)), routes: routeMetadata, dom_summary: { title: html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "", headings: [...html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gis)].slice(0, 30).map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) }, css_variable_candidates: cssVariables, assets_manifest: assets, screenshot: screenshot ? path.basename(screenshot) : null };
  await writeJson(path.join(target, "website-capture.json"), capture);
  await writeFile(path.join(target, "page.html"), html);
  if (screenshot) {
    assertSafeInput(screenshot);
    const buffer = await readFile(screenshot);
    await writeFile(path.join(target, path.basename(screenshot)), buffer);
  }
  const captureArtifact = Buffer.from(`${JSON.stringify(capture, null, 2)}\n`);
  const source = { source_id: `${slug(parsed.hostname)}-${capture.html_sha256.slice(0, 8)}`, file: "website-capture.json", sha256: sha256(captureArtifact), dimensions: capture.viewport, source_type: "public-website", regions: [{ id: "captured-page", class: "marketing-surface", bbox: [0,0,1440,900], confidence: 0.7, reason: "Explicit public marketing homepage capture; Host Agent must refine subregions", evidence_refs: [] }], priority: "primary", warnings: [] };
  return exportDraft(target, [source], extract([source], "public-website"), "public-website");
}
