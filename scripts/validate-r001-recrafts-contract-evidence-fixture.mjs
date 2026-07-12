import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const root = path.resolve(argValue("--root", process.cwd()));
const craftsOS = path.resolve(argValue("--craftsos", "/Users/Nick/Documents/CraftsOS"));
const skipGitCheck = args.includes("--skip-git-check");
const fixture = path.join(root, "examples/golden-candidates/crafts-ui-multi-image");
const failures = [];
const checks = [];

function pass(message) { checks.push(message); }
function fail(message) { failures.push(message); }
function required(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) fail(`missing required file: ${relative}`);
  return absolute;
}
function json(relative) {
  const file = required(relative);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { fail(`invalid JSON ${relative}: ${error.message}`); return null; }
}
function walk(directory) {
  if (!existsSync(directory)) return [];
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "recrafts-output") continue;
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}
function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const contractFiles = [
  "SKILL.md", "manifest.json", "skill_manifest.json",
  "schemas/input.schema.json", "schemas/output.schema.json", "schemas/source-manifest.schema.json",
  "schemas/evidence-map.schema.json", "schemas/design-contract.schema.json", "schemas/components.schema.json",
  "schemas/validation-report.schema.json", "prompts/interaction-guide.md", "prompts/source-classification.md",
  "prompts/design-contract-builder.md", "prompts/preview-review.md", "prompts/correction-loop.md",
  "templates/design.md", "templates/source-manifest.json", "templates/evidence-map.json",
  "templates/component-spec.md", "templates/validation-report.md",
];
for (const file of contractFiles) required(file);
if (!failures.length) pass("Skill contract files exist");

for (const schema of contractFiles.filter((file) => file.startsWith("schemas/"))) {
  const value = json(schema);
  if (value && (!value.$schema || !value.$id || !value.type)) fail(`schema lacks required meta-fields: ${schema}`);
}
if (!failures.some((x) => x.includes("schema") || x.includes("JSON"))) pass("Schemas parse and declare dialect, id and root type");

const rel = "examples/golden-candidates/crafts-ui-multi-image";
const manifest = json(`${rel}/source-manifest.json`);
const classification = json(`${rel}/expected-source-classification.json`);
const sanitization = json(`${rel}/sanitization-manifest.json`);
const evidenceMap = json(`${rel}/evidence-map.json`);
const designContract = json(`${rel}/design-contract.json`);
const components = json(`${rel}/expected-component-inventory.json`);
const expectedSections = json(`${rel}/expected-design-contract-sections.json`);
const designDraftPath = required(`${rel}/output/design-draft.md`);
const designDraft = existsSync(designDraftPath) ? readFileSync(designDraftPath, "utf8") : "";

const expectedIds = ["library-card-view","library-list-view","library-masonry-view","editor-insert-inspector","editor-format-inspector","editor-style-inspector","style-gallery-modal","page-info-inspector","imagine-onboarding","appearance-settings","premium-pricing-modal","shared-empty-state","editor-focus-view"];
if (manifest) {
  const ids = manifest.sources?.map((source) => source.source_id) ?? [];
  if (ids.length !== 13) fail(`expected 13 sources, got ${ids.length}`);
  if (new Set(ids).size !== ids.length) fail("duplicate source id");
  for (const id of expectedIds) if (!ids.includes(id)) fail(`missing source id: ${id}`);
  for (const source of manifest.sources ?? []) {
    const file = path.join(fixture, source.file ?? "");
    if (!existsSync(file)) { fail(`missing source file: ${source.file}`); continue; }
    const buffer = readFileSync(file);
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== source.sha256) fail(`stale hash: ${source.source_id}`);
    const dimensions = pngDimensions(buffer);
    if (!dimensions || dimensions.width !== source.dimensions?.width || dimensions.height !== source.dimensions?.height) fail(`dimension mismatch: ${source.source_id}`);
    if (source.sanitized !== true || !source.sanitization_ref) fail(`unsanitized source: ${source.source_id}`);
    if (!Array.isArray(source.regions) || source.regions.length === 0) fail(`unclassified source: ${source.source_id}`);
    for (const region of source.regions ?? []) {
      if (!region.id || !region.class || !Array.isArray(region.bbox) || region.bbox.length !== 4) fail(`unclassified region: ${source.source_id}`);
    }
  }
  if (!failures.some((x) => /source|hash|dimension|region|sanit/.test(x))) pass("13 sources, hashes, dimensions and region classifications are valid");
}

if (classification && classification.sources?.length !== 13) fail("expected classification does not cover 13 sources");
if (sanitization) {
  if (sanitization.secret_scan?.status !== "passed" || sanitization.secret_scan?.findings !== 0 || sanitization.entries?.length !== 13) fail("sanitization evidence is incomplete");
  if (sanitization.entries?.some((entry) => !entry.sanitized || entry.raw_tracked || !entry.private_text_redacted || !entry.metadata_removed)) fail("sanitization entry failed closed");
}

const rawDir = path.join(fixture, "local-raw-sources");
const rawFiles = walk(rawDir).filter((file) => path.basename(file) !== ".gitkeep");
if (rawFiles.length) fail("raw source exists inside repository fixture");
if (!skipGitCheck && existsSync(path.join(root, ".git"))) {
  try {
    const tracked = execFileSync("git", ["ls-files", "examples/golden-candidates/crafts-ui-multi-image/local-raw-sources"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (tracked.some((file) => !file.endsWith(".gitkeep"))) fail("raw source is Git tracked");
  } catch (error) { fail(`Git raw-source check failed: ${error.message}`); }
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /(?:api[_ -]?key|secret|token|password|passwd)\s*[:=]\s*[^\s]{8,}/i,
];
for (const file of walk(root).filter((file) => /\.(?:md|json|mjs|js|txt)$/i.test(file) && !file.includes(`${path.sep}tests${path.sep}`))) {
  const body = readFileSync(file, "utf8");
  if (secretPatterns.some((pattern) => pattern.test(body))) fail(`secret-like string: ${path.relative(root, file)}`);
}
if (!failures.some((x) => x.includes("secret"))) pass("Repository text secret scan passed");

const evidenceIds = new Set(evidenceMap?.evidence?.map((entry) => entry.evidence_id) ?? []);
const sourceById = new Map(manifest?.sources?.map((source) => [source.source_id, source]) ?? []);
for (const entry of evidenceMap?.evidence ?? []) {
  const source = sourceById.get(entry.source_id);
  const region = source?.regions?.find((item) => item.id === entry.region_id);
  if (!entry.evidence_id || !source || !region) fail(`missing evidence ref: ${entry.evidence_id ?? "unknown"}`);
  if (entry.status === "observed" && (!entry.source_id || !entry.region_id)) fail(`observed evidence lacks source/region: ${entry.evidence_id}`);
  if (entry.status === "inferred" && (!entry.source_id || typeof entry.confidence !== "number")) fail(`inferred evidence lacks source/confidence: ${entry.evidence_id}`);
  if (entry.status === "confirmed" && !entry.human_decision_ref) fail(`confirmed evidence lacks human decision: ${entry.evidence_id}`);
}

const requiredScopes = ["global","workspace-library","layoutcrafts-workbench","inspector","settings","modal","marketing","document-content"];
for (const scope of requiredScopes) if (!designContract?.scopes?.includes(scope)) fail(`missing scope: ${scope}`);
for (const token of designContract?.tokens ?? []) {
  if (!token.evidence_refs?.length || token.evidence_refs.some((id) => !evidenceIds.has(id))) fail(`token missing evidence ref: ${token.id}`);
  if (token.status === "suggested") fail(`suggested rule is canonical: ${token.id}`);
  if (token.scope === "global" && token.source_class === "user-generated-content") fail("user-content value promoted to global token");
  if (token.scope === "global" && token.source_class === "marketing-surface") fail("marketing value promoted to global token");
}
if (designContract?.status !== "draft" || designContract?.readiness !== "partial") fail("design contract exceeds draft/partial status");

if (components?.status !== "inventory-only" || components?.components?.length < 29) fail("component inventory is incomplete");
for (const component of components?.components ?? []) if (!component.evidence_refs?.every((id) => evidenceIds.has(id))) fail(`component missing evidence: ${component.name}`);

for (const section of expectedSections?.sections ?? []) if (!designDraft.includes(`## ${section}`)) fail(`design draft missing section: ${section}`);
if (!/status:\s*draft/.test(designDraft) || !/readiness:\s*partial/.test(designDraft)) fail("design draft makes final/stable claim");
if (/status:\s*(?:final|approved|stable)/i.test(designDraft)) fail("design draft makes final/stable claim");

for (const file of walk(path.join(root, "runtime")).filter((file) => /\.(?:mjs|js|ts|tsx|jsx)$/i.test(file))) {
  const body = readFileSync(file, "utf8");
  if (/from\s+['"][^'"]*layoutcrafts|import\s*\([^)]*layoutcrafts|\/apps\/layoutcrafts\//i.test(body)) fail(`direct Layoutcrafts import: ${path.relative(root, file)}`);
}
if (existsSync(craftsOS)) {
  const linkedSkill = path.join(craftsOS, "skills/recrafts");
  if (!existsSync(linkedSkill) || !lstatSync(linkedSkill).isSymbolicLink()) fail("CraftsOS integration is not a foundation-skill symlink");
}

if (failures.length) {
  console.error(`R-001 validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`R-001 validation passed (${checks.length} check groups)`);
for (const check of checks) console.log(`- ${check}`);
