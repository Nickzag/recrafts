import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const root = path.resolve(rootIndex >= 0 ? args[rootIndex + 1] : process.cwd());
const failures = [];
const warnings = [];
const required = (file) => { const full = path.join(root, file); if (!existsSync(full)) failures.push(`missing ${file}`); return full; };
const json = (file) => { const full = required(file); if (!existsSync(full)) return null; try { return JSON.parse(readFileSync(full, "utf8")); } catch (error) { failures.push(`invalid JSON ${file}: ${error.message}`); return null; } };

const r001Evidence = ["validate-r001.log","test-r001.log","git-status.log","tracked-files.log","secret-scan-summary.json","environment.json"];
for (const file of r001Evidence) required(`dev-workflow/evidence/r-001/${file}`);
const environment = json("dev-workflow/evidence/r-001/environment.json");
if (environment && !environment.baseline_commit) failures.push("R-001 environment lacks baseline commit");

const packageJson = json("package.json");
if (packageJson?.files?.some((entry) => /oracle|examples/.test(entry))) failures.push("production package includes oracle or examples");
const runtimeFiles = ["runtime/recraft-cli.mjs","runtime/extraction_runtime.mjs","runtime/local_adapter.mjs"];
for (const file of runtimeFiles) {
  const body = readFileSync(required(file), "utf8");
  if (/(?:readFile|readdir|glob|import)[^\n]*(?:expected-|oracle\/)/i.test(body)) failures.push(`runtime reads oracle: ${file}`);
  if (/^\s*import[^\n]*(?:CraftsOS|apps\/layoutcrafts)|^\s*export[^\n]*from[^\n]*(?:CraftsOS|apps\/layoutcrafts)/im.test(body)) failures.push(`runtime has private dependency: ${file}`);
}

const fixtureRoot = "examples/golden-candidates/crafts-ui-multi-image";
const inputManifest = json(`${fixtureRoot}/input/source-manifest.json`);
const capability = json(`${fixtureRoot}/input/fixture-capability.json`);
if (inputManifest?.sources?.length !== 13) failures.push("primary input must contain 13 sources");
if (capability?.fixture_capability?.pixel_fidelity !== "unsupported") failures.push("blurred fixture pixel fidelity must be unsupported");

const runs = [
  ["primary", `${fixtureRoot}/generated`, "multi-source"],
  ["single", "examples/golden-candidates/single-image/generated", "limited"],
  ["website", "examples/golden-candidates/website-smoke/generated", "limited"],
  ["website-craft-do", "examples/golden-candidates/website-smoke-craft-do/generated", "limited"],
];
const requiredArtifacts = ["source-manifest.json","source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md","run-log.json"];
for (const [name, directory, coverage] of runs) {
  for (const artifact of requiredArtifacts) required(`${directory}/${artifact}`);
  const manifest = json(`${directory}/source-manifest.json`);
  const classification = json(`${directory}/source-classification.json`);
  const evidence = json(`${directory}/evidence-map.json`);
  const tokens = json(`${directory}/tokens.json`);
  const components = json(`${directory}/components.json`);
  const runLog = readFileSync(required(`${directory}/run-log.json`), "utf8");
  const design = readFileSync(required(`${directory}/design.md`), "utf8");
  if (/oracle|expected-/i.test(runLog)) failures.push(`${name} run read oracle`);
  if (!new RegExp(`source_coverage: ${coverage}`).test(design) || !/status: draft/.test(design) || !/readiness: extraction-complete/.test(design) || !/preview_readiness: pending/.test(design) || !/fidelity_readiness: not-started/.test(design)) failures.push(`${name} design status claim invalid`);
  if (/pixel fidelity (?:passed|complete)|full website clone|100%|production-ready/i.test(design)) failures.push(`${name} overclaims capability`);
  const sourceMap = new Map(manifest?.sources?.map((source) => [source.source_id, source]) ?? []);
  for (const source of manifest?.sources ?? []) {
    const capturedFile = path.join(root, directory, source.file);
    if (source.source_type === "public-website") {
      if (!existsSync(capturedFile)) failures.push(`${name} captured source file missing`);
      else if (createHash("sha256").update(readFileSync(capturedFile)).digest("hex") !== source.sha256) failures.push(`${name} captured source hash mismatch`);
    }
  }
  const evidenceIds = new Set(evidence?.evidence?.map((item) => item.evidence_id) ?? []);
  for (const source of classification?.sources ?? []) {
    const original = sourceMap.get(source.source_id);
    const regionIds = new Set();
    for (const region of source.regions ?? []) {
      if (regionIds.has(region.id)) failures.push(`${name} duplicate region id`); regionIds.add(region.id);
      const [x,y,width,height] = region.bbox ?? [];
      if ([x,y,width,height].some((value) => !Number.isFinite(value) || value < 0) || (original?.dimensions?.width && (x + width > original.dimensions.width || y + height > original.dimensions.height))) failures.push(`${name} invalid bbox`);
    }
  }
  for (const token of tokens?.tokens ?? []) {
    if (token.status === "suggested") failures.push(`${name} suggested canonical token`);
    if (!token.evidence_refs?.length || token.evidence_refs.some((id) => !evidenceIds.has(id))) failures.push(`${name} token missing evidence`);
    if (token.scope === "global" && ["user-generated-content","marketing-surface"].includes(token.source_class)) failures.push(`${name} content contamination`);
    if (["exact","pixel"].includes(token.measurement_capability)) failures.push(`${name} unsupported exact measurement`);
  }
  for (const item of evidence?.evidence ?? []) if (item.status === "confirmed" && !item.human_decision_ref) failures.push(`${name} confirmed evidence lacks decision`);
  for (const component of components?.components ?? []) if (component.evidence_refs?.some((id) => !evidenceIds.has(id))) failures.push(`${name} component evidence invalid`);
}
const websiteCapture = json("examples/golden-candidates/website-smoke/generated/website-capture.json");
if (!websiteCapture?.url?.startsWith("https://") || websiteCapture?.viewport?.width !== 1440) failures.push("website capture safety or viewport evidence missing");
const craftWebsiteCapture = json("examples/golden-candidates/website-smoke-craft-do/generated/website-capture.json");
if (craftWebsiteCapture?.url !== "https://www.craft.do/" || craftWebsiteCapture?.viewport?.width !== 1440) failures.push("Craft.do supplemental website evidence missing");

try { execFileSync("git", ["tag", "--list", "recrafts-r001-baseline"], { cwd: root, encoding: "utf8" }); } catch { warnings.push("git tag check unavailable"); }
if (failures.length) { console.error(`R-002 validation failed (${failures.length})`); for (const item of failures) console.error(`- ${item}`); process.exit(1); }
console.log(`R-002 validation passed (${runs.length} runtime fixtures, ${r001Evidence.length} remediation evidence files)`);
for (const item of warnings) console.log(`warning: ${item}`);
