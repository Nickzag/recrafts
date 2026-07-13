import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const hostAnalysisSchema = loadSchema(new URL("../contracts/host-analysis.schema.json", import.meta.url));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const inside = (child, root) => { const relative = path.relative(root, child); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
const preparedIdentity = (sources) => `prepared-${sha256(JSON.stringify(sources)).slice(0, 16)}`;
const mediaType = (file) => ({ ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" })[path.extname(file).toLowerCase()] ?? "application/octet-stream";

export async function prepareAnalysis({ sources, outputDirectory }) {
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > 20) throw Object.assign(new Error("prepare-analysis requires 1–20 sources"), { code: "SCHEMA_VALIDATION_FAILED" });
  let totalBytes = 0;
  const manifestSources = [];
  await mkdir(path.join(outputDirectory, "analysis"), { recursive: true });
  await mkdir(path.join(outputDirectory, "sources"), { recursive: true });
  for (const [index, file] of sources.entries()) {
    const bytes = await readFile(file);
    if (bytes.length > 25 * 1024 * 1024) throw Object.assign(new Error("Individual source limit exceeded"), { code: "SCHEMA_VALIDATION_FAILED" });
    totalBytes += bytes.length;
    const extension = path.extname(file).toLowerCase() || ".bin";
    const preparedSourcePath = `sources/source-${index + 1}${extension}`;
    await copyFile(file, path.join(outputDirectory, preparedSourcePath));
    manifestSources.push({ source_id: `source-${index + 1}`, file: preparedSourcePath, prepared_source_path: preparedSourcePath, original_basename: path.basename(file), sha256: sha256(bytes), bytes: bytes.length, media_type: mediaType(file) });
  }
  if (totalBytes > 100 * 1024 * 1024) throw Object.assign(new Error("Total source limit exceeded"), { code: "SCHEMA_VALIDATION_FAILED" });
  const preparedAnalysisId = preparedIdentity(manifestSources);
  await writeJson(path.join(outputDirectory, "analysis/input-manifest.json"), { prepared_analysis_id: preparedAnalysisId, sources: manifestSources, semantic_analysis_completed: false });
  await writeFile(path.join(outputDirectory, "analysis/host-instructions.md"), "# Host Visual Analysis\n\nOpen each copied source through its `prepared_source_path` in input-manifest.json. Return findings, classifications, tokens and components matching `contracts/host-analysis.schema.json`. Cite only declared source or region IDs. Recrafts has not performed semantic visual interpretation.\n");
  await writeJson(path.join(outputDirectory, "analysis/evidence-bundle.json"), { prepared_analysis_id: preparedAnalysisId, evidence: manifestSources.map(({ source_id, prepared_source_path, sha256: hash }) => ({ evidence_id: source_id, source_id, prepared_source_path, evidence_type: "prepared-source", sha256: hash, status: "awaiting-host-analysis" })) });
  return { prepared_analysis_id: preparedAnalysisId, artifacts: ["analysis/input-manifest.json", "analysis/host-instructions.md", "analysis/evidence-bundle.json"], sources: manifestSources.map(({ source_id, prepared_source_path, sha256: hash, media_type }) => ({ source_id, path: prepared_source_path, sha256: hash, media_type })) };
}

async function assertPreparedSources(prepared, preparedAnalysisDirectory) {
  if (prepared.prepared_analysis_id !== preparedIdentity(prepared.sources)) throw Object.assign(new Error("Prepared analysis identity does not match its source manifest"), { code: "PACKAGE_INVALID" });
  const root = await realpath(preparedAnalysisDirectory);
  for (const source of prepared.sources) {
    if (typeof source.prepared_source_path !== "string" || path.isAbsolute(source.prepared_source_path) || source.prepared_source_path.split(/[\\/]+/).includes("..")) throw Object.assign(new Error("Prepared source path is unsafe"), { code: "PACKAGE_INVALID" });
    const file = await realpath(path.resolve(root, source.prepared_source_path)).catch(() => null);
    if (!file || !inside(file, root)) throw Object.assign(new Error("Prepared source is missing or escapes its bundle"), { code: "PACKAGE_INVALID" });
    if (sha256(await readFile(file)) !== source.sha256) throw Object.assign(new Error("Prepared source hash changed after preparation"), { code: "PACKAGE_INVALID" });
  }
}

function assertEvidenceRefs(items, allowedRefs, { sourceOnly = false } = {}) {
  for (const item of items) {
    if (item.evidence_refs.some((ref) => !allowedRefs.has(ref))) throw Object.assign(new Error(sourceOnly ? "Classification references an unknown source" : "Host Analysis contains an unknown evidence reference"), { code: "PACKAGE_INVALID" });
  }
}

function assertHostAnalysis(analysis, prepared) {
  assertSchema(analysis, hostAnalysisSchema, "Host Analysis");
  if (analysis.prepared_analysis_id !== prepared.prepared_analysis_id) throw Object.assign(new Error("Host Analysis does not match prepared analysis"), { code: "HOST_ACTION_REQUIRED" });
  const sourceRefs = new Set(prepared.sources.map(({ source_id }) => source_id));
  const classifications = analysis.source_classifications ?? [];
  if (new Set(classifications.map(({ source_id }) => source_id)).size !== classifications.length || classifications.some(({ source_id }) => !sourceRefs.has(source_id))) throw Object.assign(new Error("Source classification identity is invalid"), { code: "PACKAGE_INVALID" });
  assertEvidenceRefs(classifications, sourceRefs, { sourceOnly: true });
  const regionIds = [];
  for (const classification of classifications) {
    assertEvidenceRefs(classification.regions ?? [], sourceRefs, { sourceOnly: true });
    regionIds.push(...(classification.regions ?? []).map(({ id }) => id));
  }
  if (new Set(regionIds).size !== regionIds.length) throw Object.assign(new Error("Region classification IDs must be unique"), { code: "PACKAGE_INVALID" });
  if (regionIds.some((id) => sourceRefs.has(id))) throw Object.assign(new Error("Region classification IDs must not collide with source IDs"), { code: "PACKAGE_INVALID" });
  const allowedRefs = new Set([...sourceRefs, ...regionIds]);
  assertEvidenceRefs([...(analysis.findings ?? []), ...(analysis.tokens ?? []), ...(analysis.components ?? [])], allowedRefs);
}

export async function submitAnalysis({ preparedAnalysisDirectory, hostAnalysisFile, outputDirectory }) {
  const prepared = JSON.parse(await readFile(path.join(preparedAnalysisDirectory, "analysis/input-manifest.json"), "utf8"));
  const analysis = JSON.parse(await readFile(hostAnalysisFile, "utf8"));
  assertHostAnalysis(analysis, prepared);
  await assertPreparedSources(prepared, preparedAnalysisDirectory);
  const analysisId = `analysis-${sha256(JSON.stringify(analysis)).slice(0, 16)}`;
  const packageId = `package-${sha256(JSON.stringify({ prepared: prepared.prepared_analysis_id, analysis: analysisId })).slice(0, 16)}`;
  const classificationBySource = new Map((analysis.source_classifications ?? []).map((item) => [item.source_id, item]));
  const sources = prepared.sources.map((source) => {
    const classification = classificationBySource.get(source.source_id);
    const sourceClass = classification?.classification ?? "unknown";
    const regions = classification?.regions?.length ? classification.regions.map((region) => ({ id: region.id, class: region.classification, scope: region.scope, confidence: region.confidence, evidence_refs: region.evidence_refs, bbox: [0, 0, 1, 1] })) : [{ id: `${source.source_id}-whole`, class: sourceClass, scope: classification?.scope ?? "surface", confidence: classification?.confidence ?? 0, evidence_refs: classification?.evidence_refs ?? [source.source_id], bbox: [0, 0, 1, 1] }];
    return { ...source, priority: "host-submitted", dimensions: { width: null, height: null }, classification: sourceClass, canonical_promotion_blocked: sourceClass !== "canonical-product-ui" || regions.some((region) => region.class !== "canonical-product-ui"), regions };
  });
  const allCanonical = sources.every(({ canonical_promotion_blocked }) => !canonical_promotion_blocked);
  const evidence = sources.flatMap((source) => {
    const observation = analysis.findings.filter((item) => item.evidence_refs.includes(source.source_id) || item.evidence_refs.some((ref) => source.regions.some(({ id }) => id === ref))).map((item) => item.observation).join("; ") || "Host-declared source evidence";
    return [
      { evidence_id: source.source_id, source_id: source.source_id, region_id: source.regions[0].id, evidence_type: "host-visual-analysis", observation, scope: source.regions[0].scope, confidence: source.regions[0].confidence, status: "observed" },
      ...source.regions.map((region) => ({ evidence_id: region.id, source_id: source.source_id, region_id: region.id, evidence_type: "host-region-classification", observation, scope: region.scope, confidence: region.confidence, status: "observed", classification: region.class }))
    ];
  });
  const components = analysis.components.map((item) => ({ name: item.name, scope: item.scope, purpose: `Host-supplied ${item.name} contract`, anatomy: ["container", "content", "state-layer"], visible_variants: ["default"], visible_states: ["default"], possible_interactions: ["preview-only"], token_dependencies: analysis.tokens.map((token) => token.id), evidence_refs: item.evidence_refs, confidence: item.confidence, unknowns: ["production semantics"] }));
  const sourceManifest = { version: "2.1.0", schema_version: "2.1.0", capture_id: prepared.prepared_analysis_id.replace("prepared-", "capture-"), analysis_id: analysisId, package_id: packageId, mode: "host-agent-two-phase", skill_version: "0.3.0-rc.1", runtime_version: "r005-analysis-exchange-v2", capture_adapter_version: "interop-v2", host_agent: analysis.execution.host_agent, model: analysis.execution.engine, vision_capability: true, analysis_timestamp: analysis.execution.performed_at, owner_decision_set_id: null, decision_status: "pending", decision_source: null, sources };
  await mkdir(path.join(outputDirectory, "review"), { recursive: true });
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true });
  await Promise.all([
    writeJson(path.join(outputDirectory, "source-manifest.json"), sourceManifest),
    writeJson(path.join(outputDirectory, "source-classification.json"), { version: "2.1.0", sources }),
    writeJson(path.join(outputDirectory, "evidence-map.json"), { version: "2.1.0", evidence }),
    writeJson(path.join(outputDirectory, "tokens.json"), { version: "2.1.0", tokens: analysis.tokens }),
    writeJson(path.join(outputDirectory, "components.json"), { version: "2.1.0", components }),
    writeJson(path.join(outputDirectory, "layout.json"), { version: "2.1.0", app_shell: "three-column-workbench", column_rules: "left rail / flexible canvas / right inspector", required_states: ["default", "selected-object", "agent-suggestion"] }),
    writeFile(path.join(outputDirectory, "design.md"), `# Host-submitted Recrafts Design Contract\n\nstatus: draft\npackage_id: ${packageId}\nanalysis_id: ${analysisId}\n\n## Direction\n${analysis.findings.map((item) => `- ${item.observation} [${item.scope}; confidence ${item.confidence}]`).join("\n")}\n`),
    writeFile(path.join(outputDirectory, "open-questions.md"), "# Open Questions\n\nProject-owner review is required before canonical realization.\n"),
    writeJson(path.join(outputDirectory, "recrafts-package.json"), { package_id: packageId, capture_id: sourceManifest.capture_id, analysis_id: analysisId, owner_decision_set_id: null, decision_status: "pending", decision_source: null, status: "awaiting-owner-review", artifacts: ["source-manifest.json", "source-classification.json", "evidence-map.json", "tokens.json", "layout.json", "components.json", "design.md", "open-questions.md"] }),
    writeJson(path.join(outputDirectory, "review/owner-decision-set.json"), { decision_set_id: null, reviewed_package_id: packageId, verdict: "PENDING", decision_status: "pending", decision_source: null, confirmed_candidates: [], rejected_candidates: [] }),
    writeJson(path.join(outputDirectory, "validation/extraction-quality-summary.json"), { source_coverage: 1, provenance_coverage: 1, contamination_findings: allCanonical ? 0 : 1, open_high_impact_question_count: allCanonical ? 0 : 1, component_evidence_coverage: 1, note: "Host-submitted candidate; project-owner review pending" }),
    writeJson(path.join(outputDirectory, "validation/critical-system-coverage.json"), { status: allCanonical ? "passed" : "blocked", missing: allCanonical ? [] : ["canonical-source-classification"], note: allCanonical ? "protocol coverage only; not visual quality evidence" : "unknown or non-canonical classifications cannot be promoted" }),
    writeJson(path.join(outputDirectory, "validation/realization-readiness.json"), { status: "awaiting-owner-review", canonical_visual_generation_authorized: false, blockers: ["project-owner-extraction-review-pending", ...(allCanonical ? [] : ["canonical-source-classification-missing"])], warning: "Host-supplied analysis is a candidate until project-owner review" })
  ]);
  return { package_id: packageId, analysis_id: analysisId, package_status: "awaiting-owner-review", canonical_visual_generation_authorized: false };
}
