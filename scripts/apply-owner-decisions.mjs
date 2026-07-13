import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [sourceDirectory, analysisFile, decisionFile, outputRoot] = process.argv.slice(2);
if (!sourceDirectory || !analysisFile || !decisionFile || !outputRoot) throw new Error("Usage: node scripts/apply-owner-decisions.mjs <source-package> <host-analysis.json> <decision-set.json> <output-root>");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const sourceManifest = await readJson(path.join(sourceDirectory, "source-manifest.json"));
const sourceClassification = await readJson(path.join(sourceDirectory, "source-classification.json"));
const originalEvidence = await readJson(path.join(sourceDirectory, "evidence-map.json"));
const originalTokens = await readJson(path.join(sourceDirectory, "tokens.json"));
const originalComponents = await readJson(path.join(sourceDirectory, "components.json"));
const layout = await readJson(path.join(sourceDirectory, "layout.json"));
const analysis = await readJson(analysisFile);
const decision = await readJson(decisionFile);
if (decision.verdict !== "PASS" || decision.source_package_id !== sourceManifest.package_id) throw new Error("Owner Decision Set does not authorize this source package");
if (!analysis.vision_capability || analysis.analysis_type !== "vision-capable-host-agent-run") throw new Error("A vision-capable Host-Agent analysis is required");
const root = path.resolve(path.dirname(analysisFile), "..");
const prompt = await readFile(path.join(root, analysis.prompt_file), "utf8");
const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const promptHash = hash(prompt);
const configurationHash = hash(analysis.analysis_configuration);
const analysisId = `analysis-${hash({ capture_id: sourceManifest.capture_id, host_agent: analysis.host_agent, engine: analysis.execution_engine, prompt_hash: promptHash, configuration_hash: configurationHash, timestamp: analysis.analysis_timestamp }).slice(0, 16)}`;
const correctionVersion = 2;
const packageId = `package-${hash({ analysis_id: analysisId, decision_set_id: decision.decision_set_id, correction_version: correctionVersion, correction_builder: "owner-correction-v2" }).slice(0, 16)}`;
const output = path.join(outputRoot, packageId);
if (existsSync(output)) throw new Error(`Corrected package already exists: ${packageId}`);
await mkdir(path.join(output, "validation"), { recursive: true });
await mkdir(path.join(output, "review"), { recursive: true });

const evidenceRefs = {
  shell: ["ev-editor-format-inspector-navigation-shell","ev-editor-format-inspector-primary-surface","ev-editor-format-inspector-state-or-inspector"],
  controls: ["ev-appearance-settings-primary-surface","ev-page-info-inspector-state-or-inspector"],
  modal: ["ev-style-gallery-modal-overlay","ev-premium-pricing-modal-primary-surface"],
  library: ["ev-library-card-view-primary-surface","ev-library-list-view-primary-surface"],
};
const stateful = new Set(["Button","IconButton","Tabs","SegmentedControl","SearchField","Toggle","NavigationItem","DocumentCard","DocumentListRow","InspectorSection","PropertyRow","Modal","EmptyState","LoadingSkeleton"]);
const components = analysis.component_candidates.map((name) => {
  const refs = /Modal|Popover|Tooltip/.test(name) ? evidenceRefs.modal : /Document|ViewSwitcher|Navigation/.test(name) ? evidenceRefs.library : /Inspector|EditorCanvas|Toolbar|Floating/.test(name) ? evidenceRefs.shell : evidenceRefs.controls;
  return { name, scope: /Settings/.test(name) ? "settings" : /Document/.test(name) ? "workspace-library" : "surface", purpose: `Evidence-bound ${name} preview contract`, anatomy: ["container","content","state-layer"], visible_variants: ["default"], visible_states: stateful.has(name) ? ["default","active","disabled"] : ["default"], possible_interactions: ["preview-only"], token_dependencies: ["surface.primary","text.primary","border.subtle","radius.direction","spacing.direction"], evidence_refs: refs, confidence: 0.8, unknowns: ["production semantics","exact geometry"] };
});
const visualEvidence = analysis.visual_findings.map((finding) => ({ evidence_id: `host-${finding.finding_id}`, source_id: "multi-source-host-analysis", region_id: "cross-source", evidence_type: "vision-capable-host-analysis", observation: finding.observation, candidate_rule: finding.observation, scope: finding.scope, confidence: finding.confidence, status: "observed", source_evidence_refs: finding.evidence_refs }));
const rejectedEvidence = decision.rejected_candidates.map((candidate, index) => ({ evidence_id: `rejected-${index + 1}`, source_id: "owner-decision", region_id: "cross-source", evidence_type: "owner-rejection", observation: candidate, candidate_rule: candidate, scope: candidate.includes("typography") ? "surface" : candidate.includes("imagine") ? "marketing" : "document-content", confidence: 1, status: "rejected", human_decision_ref: decision.decision_set_id }));
const evidence = { version: "2.1.0", evidence: [...originalEvidence.evidence, ...visualEvidence, ...rejectedEvidence] };
const manifest = { ...sourceManifest, analysis_id: analysisId, package_id: packageId, skill_version: analysis.skill_version, runtime_version: "r002-extraction-v2+owner-correction-v2", schema_version: "2.1.0", host_agent: analysis.host_agent, model: analysis.execution_engine, vision_capability: true, prompt_hash: promptHash, configuration_hash: configurationHash, analysis_timestamp: analysis.analysis_timestamp, human_edits_before_export: analysis.human_edits_before_export, human_edits_after_export: analysis.human_edits_after_export, owner_decision_set_id: decision.decision_set_id, correction_version: correctionVersion };
const correctedLayout = { ...layout, app_shell: "three-column-workbench", column_rules: "left artboard rail / flexible center canvas / right inspector", required_states: analysis.required_states, owner_decision_ref: decision.decision_set_id };
const design = `# Corrected Recrafts Design Contract\n\nstatus: draft\nreadiness: extraction-reviewed\npreview_readiness: ready-with-warnings\nfidelity_readiness: not-started\ncapture_id: ${manifest.capture_id}\nanalysis_id: ${analysisId}\npackage_id: ${packageId}\nowner_decision_set: ${decision.decision_set_id}\n\n## Visual Direction\nNeutral, compact, softly rounded productivity shell with quiet surfaces, dark neutral text and restrained boundaries.\n\n## Scope\nProduct shell tokens remain surface-scoped. Document artwork and marketing visuals remain isolated. No global accent is inferred; a selection accent may exist only as a labeled preview fallback.\n\n## Tokens\n${analysis.token_candidates.map((token) => `- ${token.id}: ${token.value} [${token.status}; ${token.scope}; ${token.measurement_capability}]`).join("\n")}\n\n## Layout Grammar\nNo global header; exactly three columns: left artboard rail, flexible center canvas with agent suggestions, right inspector.\n\n## Component Contracts\n${components.map((component) => `- ${component.name}: ${component.visible_states.join(", ")}`).join("\n")}\n\n## Decisions\nConfirmed: ${decision.confirmed_candidates.join(", ")}. Rejected: ${decision.rejected_candidates.join(", ")}.\n\n## Measurement Limits\nExact typography, micro spacing, icon geometry and pixel fidelity remain not-testable. Preview-only fallbacks are labeled and do not become canonical source claims.\n\n## Open Questions\nNo unresolved high-impact Scope question. Production semantics and fidelity remain future work.\n`;
const packageManifest = { package_id: packageId, source_package_id: sourceManifest.package_id, capture_id: manifest.capture_id, analysis_id: analysisId, decision_set_id: decision.decision_set_id, correction_version: correctionVersion, status: "ready-for-r003b-preflight", artifacts: ["source-manifest.json","source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md"] };
const writes = {
  "recrafts-package.json": packageManifest,
  "source-manifest.json": manifest,
  "source-classification.json": sourceClassification,
  "evidence-map.json": evidence,
  "tokens.json": { status: "candidate", tokens: analysis.token_candidates },
  "layout.json": correctedLayout,
  "components.json": { status: "candidate", components },
  "design.md": design,
  "open-questions.md": "# Open Questions\n\n- No unresolved high-impact Scope question.\n- Production semantics and fidelity remain out of scope.\n",
  "review/owner-decision-set.json": decision,
  "review/correction-diff.json": { source_package_id: sourceManifest.package_id, corrected_package_id: packageId, token_count: { before: originalTokens.tokens.length, after: analysis.token_candidates.length }, component_count: { before: originalComponents.components.length, after: components.length }, confirmed: decision.confirmed_candidates, rejected: decision.rejected_candidates }
};
for (const [relative, value] of Object.entries(writes)) await writeFile(path.join(output, relative), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
console.log(JSON.stringify({ source_package_id: sourceManifest.package_id, analysis_id: analysisId, package_id: packageId, output }));
