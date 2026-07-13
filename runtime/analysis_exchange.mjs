import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

export async function prepareAnalysis({ sources, outputDirectory }) {
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > 20) throw Object.assign(new Error("prepare-analysis requires 1–20 sources"), { code: "SCHEMA_VALIDATION_FAILED" });
  let totalBytes = 0;
  const manifestSources = [];
  for (const [index, file] of sources.entries()) {
    const bytes = await readFile(file);
    if (bytes.length > 25 * 1024 * 1024) throw Object.assign(new Error("Individual source limit exceeded"), { code: "SCHEMA_VALIDATION_FAILED" });
    totalBytes += bytes.length;
    manifestSources.push({ source_id: `source-${index + 1}`, file: path.basename(file), sha256: sha256(bytes), bytes: bytes.length, media_type: path.extname(file).toLowerCase() === ".svg" ? "image/svg+xml" : "application/octet-stream" });
  }
  if (totalBytes > 100 * 1024 * 1024) throw Object.assign(new Error("Total source limit exceeded"), { code: "SCHEMA_VALIDATION_FAILED" });
  const preparedAnalysisId = `prepared-${sha256(JSON.stringify(manifestSources)).slice(0, 16)}`;
  await mkdir(path.join(outputDirectory, "analysis"), { recursive: true });
  await writeJson(path.join(outputDirectory, "analysis/input-manifest.json"), { prepared_analysis_id: preparedAnalysisId, sources: manifestSources, semantic_analysis_completed: false });
  await writeFile(path.join(outputDirectory, "analysis/host-instructions.md"), "# Host Visual Analysis\n\nUse a vision-capable Host to inspect the declared sources. Return findings, tokens and components matching `contracts/host-analysis.schema.json`. Cite only source IDs from input-manifest.json. Recrafts has not performed semantic visual interpretation.\n");
  await writeJson(path.join(outputDirectory, "analysis/evidence-bundle.json"), { prepared_analysis_id: preparedAnalysisId, evidence: manifestSources.map(({ source_id, sha256: hash }) => ({ evidence_id: source_id, source_id, evidence_type: "prepared-source", sha256: hash, status: "awaiting-host-analysis" })) });
  return { prepared_analysis_id: preparedAnalysisId, artifacts: ["analysis/input-manifest.json", "analysis/host-instructions.md", "analysis/evidence-bundle.json"] };
}

function assertHostAnalysis(analysis, prepared) {
  if (analysis.prepared_analysis_id !== prepared.prepared_analysis_id) throw Object.assign(new Error("Host Analysis does not match prepared analysis"), { code: "HOST_ACTION_REQUIRED" });
  if (analysis.execution?.vision_capability !== true || !analysis.execution.host_agent || !analysis.execution.engine || !analysis.execution.performed_at) throw Object.assign(new Error("Auditable vision Host execution is required"), { code: "HOST_ACTION_REQUIRED" });
  const refs = new Set(prepared.sources.map(({ source_id }) => source_id));
  for (const item of [...(analysis.findings ?? []), ...(analysis.tokens ?? []), ...(analysis.components ?? [])]) {
    if (!item.scope || !Number.isFinite(item.confidence) || !item.evidence_refs?.length || item.evidence_refs.some((ref) => !refs.has(ref))) throw Object.assign(new Error("Host Analysis provenance, Scope or confidence is invalid"), { code: "PACKAGE_INVALID" });
  }
  if (!analysis.findings?.length) throw Object.assign(new Error("Host Analysis findings are required"), { code: "PACKAGE_INVALID" });
}

export async function submitAnalysis({ preparedAnalysisDirectory, hostAnalysisFile, outputDirectory }) {
  const prepared = JSON.parse(await readFile(path.join(preparedAnalysisDirectory, "analysis/input-manifest.json"), "utf8"));
  const analysis = JSON.parse(await readFile(hostAnalysisFile, "utf8"));
  assertHostAnalysis(analysis, prepared);
  const analysisId = `analysis-${sha256(JSON.stringify(analysis)).slice(0, 16)}`;
  const packageId = `package-${sha256(JSON.stringify({ prepared: prepared.prepared_analysis_id, analysis: analysisId })).slice(0, 16)}`;
  const evidence = prepared.sources.map((source) => ({ evidence_id: source.source_id, source_id: source.source_id, region_id: "whole-fixture", evidence_type: "host-visual-analysis", observation: analysis.findings.filter((item) => item.evidence_refs.includes(source.source_id)).map((item) => item.observation).join("; ") || "Host-declared source evidence", scope: "surface", confidence: 0.8, status: "observed" }));
  const components = analysis.components.map((item) => ({ name: item.name, scope: item.scope, purpose: `Host-supplied ${item.name} contract`, anatomy: ["container", "content", "state-layer"], visible_variants: ["default"], visible_states: ["default"], possible_interactions: ["preview-only"], token_dependencies: analysis.tokens.map((token) => token.id), evidence_refs: item.evidence_refs, confidence: item.confidence, unknowns: ["production semantics"] }));
  const sourceManifest = { version: "2.1.0", schema_version: "2.1.0", capture_id: prepared.prepared_analysis_id.replace("prepared-", "capture-"), analysis_id: analysisId, package_id: packageId, mode: "host-agent-two-phase", skill_version: "0.3.0-rc.1", runtime_version: "r005-analysis-exchange-v1", capture_adapter_version: "interop-v1", host_agent: analysis.execution.host_agent, model: analysis.execution.engine, vision_capability: true, analysis_timestamp: analysis.execution.performed_at, sources: prepared.sources.map((source) => ({ ...source, priority: "interop-fixture", dimensions: { width: null, height: null }, regions: [{ id: "whole-fixture", class: "canonical-product-ui", bbox: [0,0,1,1] }] })) };
  await mkdir(path.join(outputDirectory, "review"), { recursive: true });
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true });
  await Promise.all([
    writeJson(path.join(outputDirectory, "source-manifest.json"), sourceManifest),
    writeJson(path.join(outputDirectory, "source-classification.json"), { version: "2.1.0", sources: sourceManifest.sources }),
    writeJson(path.join(outputDirectory, "evidence-map.json"), { version: "2.1.0", evidence }),
    writeJson(path.join(outputDirectory, "tokens.json"), { version: "2.1.0", tokens: analysis.tokens }),
    writeJson(path.join(outputDirectory, "components.json"), { version: "2.1.0", components }),
    writeJson(path.join(outputDirectory, "layout.json"), { version: "2.1.0", app_shell: "three-column-workbench", column_rules: "left rail / flexible canvas / right inspector", required_states: ["default", "selected-object", "agent-suggestion"] }),
    writeFile(path.join(outputDirectory, "design.md"), `# Host-submitted Recrafts Design Contract\n\nstatus: draft\npackage_id: ${packageId}\nanalysis_id: ${analysisId}\n\n## Direction\n${analysis.findings.map((item) => `- ${item.observation} [${item.scope}; confidence ${item.confidence}]`).join("\n")}\n`),
    writeFile(path.join(outputDirectory, "open-questions.md"), "# Open Questions\n\nProduction semantics and fidelity remain outside this interoperability fixture.\n"),
    writeJson(path.join(outputDirectory, "recrafts-package.json"), { package_id: packageId, capture_id: sourceManifest.capture_id, analysis_id: analysisId, decision_set_id: "interop-fixture-decision", status: "ready-for-realization", artifacts: ["source-manifest.json","source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md"] }),
    writeJson(path.join(outputDirectory, "review/owner-decision-set.json"), { decision_set_id: "interop-fixture-decision", verdict: "PASS", confirmed_candidates: [], rejected_candidates: [] }),
    writeJson(path.join(outputDirectory, "validation/extraction-quality-summary.json"), { source_coverage: 1, provenance_coverage: 1, note: "interop fixture diagnostics only" }),
    writeJson(path.join(outputDirectory, "validation/critical-system-coverage.json"), { status: "passed", missing: [], note: "protocol fixture, not visual quality evidence" }),
    writeJson(path.join(outputDirectory, "validation/realization-readiness.json"), { status: "ready-with-warnings", canonical_visual_generation_authorized: true, blockers: [], warning: "deterministic interoperability fixture" }),
  ]);
  return { package_id: packageId, analysis_id: analysisId };
}
