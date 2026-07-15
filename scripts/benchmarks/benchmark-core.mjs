import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSchema } from "../../runtime/schema_validator.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
};
const asArray = (value) => Array.isArray(value) ? value : [];
const benchmarkSchemaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../benchmarks/schemas");
const requiredFiles = [
  "corpus.json", "source/source-manifest.json", "source/region-manifest.json",
  "expectations/required-capabilities.json", "expectations/scope-boundaries.json",
  "expectations/hard-gates.json", "rubric/scorecard.json",
  "rubric/human-review-form.md", "reviews/corpus-review.md",
];

function walk(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function domainItems(packageRoot) {
  const definitions = [
    ["tokens.json", "tokens"], ["components.json", "components"],
    ["grid-rules.json", "grid_rules"], ["layout-rules.json", "layout_rules"],
    ["visual-grammar.json", "visual_grammar"],
  ];
  return definitions.flatMap(([file, key]) => {
    const absolute = path.join(packageRoot, file);
    return existsSync(absolute) ? asArray(readJson(absolute)[key]).map((item) => ({ ...item, artifact: file })) : [];
  });
}

export function validateCorpus({ repositoryRoot, corpusRoot, sourcePackRoot }) {
  const errors = [];
  for (const file of requiredFiles) if (!existsSync(path.join(corpusRoot, file))) errors.push(`missing Corpus file: ${file}`);
  if (errors.length) return { status: "failed", errors };
  const corpus = readJson(path.join(corpusRoot, "corpus.json"));
  const source = readJson(path.join(corpusRoot, "source/source-manifest.json"));
  const regions = readJson(path.join(corpusRoot, "source/region-manifest.json"));
  const capabilities = readJson(path.join(corpusRoot, "expectations/required-capabilities.json"));
  const scorecard = readJson(path.join(corpusRoot, "rubric/scorecard.json"));
  const registry = readJson(path.join(repositoryRoot, "benchmarks/registry.json"));
  const schemaChecks = [
    ["Corpus", corpus, "corpus.schema.json"],
    ["Source Manifest", source, "source-manifest.schema.json"],
    ["Region Manifest", regions, "region-manifest.schema.json"],
    ["Capability Requirements", capabilities, "capability-requirements.schema.json"],
    ["Scorecard", scorecard, "scorecard.schema.json"],
  ];
  for (const [label, value, schemaFile] of schemaChecks) {
    const schemaPath = path.join(benchmarkSchemaRoot, schemaFile);
    if (!existsSync(schemaPath)) errors.push(`missing benchmark Schema: ${schemaFile}`);
    else errors.push(...validateSchema(value, readJson(schemaPath)).map((error) => `${label} Schema: ${error}`));
  }
  if (!corpus.corpus_id || !corpus.version || corpus.status !== "candidate") errors.push("Corpus identity, version or candidate status is invalid");
  if (!registry.corpora?.some((item) => item.corpus_id === corpus.corpus_id && item.rubric_version === corpus.rubric_version)) errors.push("registry entry is missing or incompatible");
  if (source.source_pack_id !== corpus.source_pack_id || !source.source_url || !source.capture_id || !source.captured_at) errors.push("Source Pack identity is incomplete");
  if (!existsSync(sourcePackRoot)) errors.push("local Source Pack is missing");
  const sourcePackFile = path.join(sourcePackRoot, "source-pack.json");
  const pack = existsSync(sourcePackFile) ? readJson(sourcePackFile) : null;
  if (!pack || pack.source_pack_id !== corpus.source_pack_id || pack.corpus_id !== corpus.corpus_id) errors.push("local Source Pack manifest identity mismatch");
  const sourceIds = new Set(asArray(source.sources).map((item) => item.source_id));
  for (const item of asArray(source.sources)) {
    if (!item.sha256 || !/^[a-f0-9]{64}$/.test(item.sha256)) errors.push(`source hash missing: ${item.source_id ?? "unknown"}`);
    const local = path.join(sourcePackRoot, item.local_path ?? "");
    if (!existsSync(local) || !statSync(local).isFile()) errors.push(`Source Pack file missing: ${item.local_path ?? "unknown"}`);
    else if (sha(readFileSync(local)) !== item.sha256) errors.push(`Source Pack hash mismatch: ${item.local_path}`);
    if (item.redistribution_status !== "local-only") errors.push(`redistribution boundary invalid: ${item.source_id}`);
  }
  const regionIds = new Set();
  for (const region of asArray(regions.regions)) {
    if (!region.region_id || regionIds.has(region.region_id)) errors.push(`duplicate Region: ${region.region_id ?? "unknown"}`);
    regionIds.add(region.region_id);
    if (!sourceIds.has(region.source_id)) errors.push(`Region references unknown source: ${region.region_id}`);
    if (!region.classification || typeof region.confidence !== "number" || !region.review_status || !/^[a-f0-9]{64}$/.test(region.evidence_hash ?? "")) errors.push(`Region metadata incomplete: ${region.region_id}`);
  }
  if (!asArray(capabilities.capabilities).length || capabilities.capabilities.some((item) => !item.capability_id || item.required !== true || item.minimum_evidence_count < 1 || !asArray(item.allowed_output_artifacts).length)) errors.push("capability requirements are incomplete");
  const oracle = validateNoOracle(corpusRoot);
  errors.push(...oracle.errors);
  return { status: errors.length ? "failed" : "pass", errors, corpus_id: corpus.corpus_id, source_count: sourceIds.size, region_count: regionIds.size, source_pack_status: source.capture_status };
}

export function validateNoOracle(corpusRoot) {
  const errors = [];
  const roots = [path.join(corpusRoot, "expectations"), path.join(corpusRoot, "rubric")];
  for (const file of roots.flatMap(walk)) {
    const relative = path.relative(corpusRoot, file).split(path.sep).join("/");
    if (/design\.md$/i.test(relative) || /expected.*\.(?:png|jpe?g|webp|svg)$/i.test(relative)) errors.push(`hidden expected artifact: ${relative}`);
    const text = readFileSync(file, "utf8");
    if (/#[a-f0-9]{3,8}\b/i.test(text)) errors.push(`exact color answer: ${relative}`);
    if (/"expected_(?:font|font_family|typeface)[^"]*"\s*:/i.test(text)) errors.push(`expected font answer: ${relative}`);
    if (/"expected_(?:component|component_names|component_inventory)[^"]*"\s*:/i.test(text)) errors.push(`expected component inventory: ${relative}`);
    if (/"expected_(?:token|grid|layout|color)[^"]*"\s*:/i.test(text)) errors.push(`expected design answer: ${relative}`);
    if (/"prompt"\s*:\s*"[^"]*(?:static coffee|known .*answer|output the .*answer)/i.test(text)) errors.push(`source-specific answer prompt: ${relative}`);
  }
  return { status: errors.length ? "failed" : "pass", errors, files_scanned: roots.flatMap(walk).length };
}

export function auditScopeIsolation(packageRoot) {
  const excluded = new Set(["behance-platform-ui", "behance-navigation", "platform-controls", "mockup-environment", "descriptive-copy", "unrelated-thumbnail", "advertising"]);
  const findings = domainItems(packageRoot).filter((item) => excluded.has(item.source_class) && ["workspace", "global", "project"].includes(item.scope)).map((item) => ({ domain_id: item.domain_id, artifact: item.artifact, source_class: item.source_class, scope: item.scope, reason: `${item.source_class} cannot be promoted to ${item.scope}` }));
  return { status: findings.length ? "blocked" : "pass", findings };
}

function module(module_id, weight, score, mechanism, evidence) {
  return { module_id, weight, score: Number(Math.max(0, Math.min(weight, score)).toFixed(2)), mechanism, evidence };
}

export function calculateAutomaticScore({ corpusRoot, packageRoot }) {
  const evidence = asArray(readJson(path.join(packageRoot, "evidence-map.json")).evidence);
  const sourceManifest = readJson(path.join(corpusRoot, "source/source-manifest.json"));
  const regionManifest = readJson(path.join(corpusRoot, "source/region-manifest.json"));
  const claims = asArray(readJson(path.join(packageRoot, "claims.json")).claims);
  const domains = domainItems(packageRoot);
  const conflicts = asArray(readJson(path.join(packageRoot, "conflicts.json")).conflicts);
  const evidenceIds = new Set(evidence.map((item) => item.evidence_id));
  const claimIds = new Set(claims.map((item) => item.claim_id));
  const conflictIds = new Set(conflicts.map((item) => item.conflict_id));
  const domainIds = new Set(domains.map((item) => item.domain_id));
  const rawHost = evidence.filter((item) => /raw-host|possible-intent|design-rationale/i.test(item.evidence_type ?? ""));
  const provenanceFailures = domains.filter((item) => !asArray(item.evidence_refs).length || item.evidence_refs.some((ref) => !evidenceIds.has(ref)) || !asArray(item.claim_refs).length || item.claim_refs.some((ref) => !claimIds.has(ref)) || asArray(item.conflict_refs).some((ref) => !conflictIds.has(ref)));
  const conflictProvenanceFailures = conflicts.filter((item) => asArray(item.evidence_refs).some((ref) => !evidenceIds.has(ref)) || asArray(item.candidate_refs).some((ref) => !domainIds.has(ref)));
  const provenanceEntities = [...domains, ...conflicts.map((item) => ({ domain_id: item.conflict_id }))];
  const allProvenanceFailures = [...provenanceFailures, ...conflictProvenanceFailures.map((item) => ({ domain_id: item.conflict_id }))];
  const scope = auditScopeIsolation(packageRoot);
  const oracle = validateNoOracle(corpusRoot);
  const highOpen = conflicts.filter((item) => item.severity === "high" && item.status === "open");
  const packageManifest = readJson(path.join(packageRoot, "recrafts-package.json"));
  const highGateFailure = highOpen.length > 0 && packageManifest.status === "accepted";
  const currentSourceIds = new Set(evidence.filter((item) => item.status !== "superseded").map((item) => item.source_id));
  const evidencedRegions = asArray(regionManifest.regions).filter((region) => currentSourceIds.has(region.source_id));
  const regionClasses = new Set(evidencedRegions.map((region) => region.classification));
  const directClasses = new Set(evidence.map((item) => item.classification).filter(Boolean));
  const hasClass = (...classes) => classes.some((classification) => regionClasses.has(classification) || directClasses.has(classification));
  const sourceIds = asArray(sourceManifest.sources).map((item) => item.source_id);
  const completenessChecks = [
    ["source-images", sourceIds.length > 0 && sourceIds.every((sourceId) => currentSourceIds.has(sourceId)), sourceIds.filter((sourceId) => currentSourceIds.has(sourceId)).map((sourceId) => `source:${sourceId}`)],
    ["regions", asArray(regionManifest.regions).length > 0 && evidencedRegions.length === asArray(regionManifest.regions).length, evidencedRegions.map((region) => `region:${region.region_id}`)],
    ["brand-applications", hasClass("brand-application"), ["category:brand-application"]],
    ["typography", hasClass("canonical-brand-system", "editorial-layout", "typography"), ["category:typography"]],
    ["color", hasClass("canonical-brand-system", "color"), ["category:color"]],
    ["packaging", hasClass("packaging"), ["category:packaging"]],
    ["photography", hasClass("photography"), ["category:photography"]],
    ["presentation", hasClass("case-study-presentation"), ["category:case-study-presentation"]],
  ];
  const represented = completenessChecks.filter(([, passed]) => passed).flatMap(([, , refs]) => refs);
  const completenessCount = completenessChecks.filter(([, passed]) => passed).length;
  const populatedDomainArtifacts = new Set(domains.map((item) => item.artifact));
  const artifactCoverage = ["tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json"].filter((file) => populatedDomainArtifacts.has(file));
  if (existsSync(path.join(packageRoot, "conflicts.json")) && Array.isArray(readJson(path.join(packageRoot, "conflicts.json")).conflicts)) artifactCoverage.push("conflicts.json");
  const modules = [
    module("evidence-completeness", 15, 15 * completenessCount / completenessChecks.length, "Cross-reference current Package Evidence with Source and Region manifests across eight required coverage categories", represented),
    module("evidence-claim-separation", 10, rawHost.length ? 0 : 10, "Reject raw Host output, possible intent and rationale in Evidence", rawHost.map((item) => item.evidence_id)),
    module("domain-coverage", 15, 15 * artifactCoverage.length / 6, "Count populated MVP domain artifacts without requiring exact answers; an empty Conflict array is a valid investigated outcome", artifactCoverage),
    module("provenance-traceability", 15, provenanceEntities.length ? 15 * (provenanceEntities.length - allProvenanceFailures.length) / provenanceEntities.length : 0, "Validate domain Evidence, Claim and Conflict references plus Conflict Candidate/Evidence references", provenanceEntities.map((item) => item.domain_id)),
    module("scope-isolation", 10, scope.findings.length ? 0 : 10, "Detect platform, copy, thumbnail and mockup promotion into global scopes", scope.findings.map((item) => item.domain_id)),
    module("conflict-quality", 10, highGateFailure ? 0 : 10, "Require conflicts artifact and block accepted Packages with open high-impact conflicts", conflicts.map((item) => item.conflict_id)),
  ];
  const failures = [
    ...(rawHost.length ? ["raw-host-output-as-evidence"] : []),
    ...(allProvenanceFailures.length ? ["canonical-provenance"] : []),
    ...(scope.findings.length ? ["scope-isolation"] : []),
    ...(oracle.status !== "pass" ? ["no-oracle"] : []),
    ...(highGateFailure ? ["open-high-conflict-in-accepted-artifact"] : []),
  ];
  return {
    status: failures.length ? "blocked" : "pending-human-review",
    score: Number(modules.reduce((sum, item) => sum + item.score, 0).toFixed(2)),
    maximum_score: 75,
    modules,
    hard_gates: { status: failures.length ? "blocked" : "pass", failures },
    traceability: { domain_count: domains.length, conflict_count: conflicts.length, failed_domain_ids: allProvenanceFailures.map((item) => item.domain_id) },
    scope_isolation: scope,
    conflicts: { total: conflicts.length, open_high_impact: highOpen.length },
  };
}

export function mergeHumanScore(automatic, human) {
  if (!human?.reviewer?.trim()) throw new Error("human score requires reviewer identity");
  if (!human.reviewed_at || asArray(human.scores).length !== 8) throw new Error("human score requires date and all eight modules");
  for (const score of human.scores) {
    if (!Number.isFinite(score.score) || score.score < 1 || score.score > 5 || !score.reason?.trim() || !asArray(score.artifact_refs).length) throw new Error(`human score is incomplete: ${score.module_id ?? "unknown"}`);
  }
  const humanScore = Number((human.scores.reduce((sum, item) => sum + item.score, 0) / (human.scores.length * 5) * 25).toFixed(2));
  const overall = Number((automatic.score + humanScore).toFixed(2));
  const status = automatic.hard_gates.status === "blocked" ? "blocked" : overall >= 85 && automatic.modules.every((item) => item.score >= item.weight * 0.6) ? "strong-pass" : overall >= 75 ? "pass" : "regression";
  return { status, overall_score: overall, maximum_score: 100, automatic, human: { ...human, score: humanScore, maximum_score: 25 } };
}

export function validateBenchmarkRun(run) {
  const required = ["corpus_id", "corpus_version", "rubric_version", "source_pack_id", "instruction_hash", "source_pack_hash", "package_path"];
  for (const key of required) if (!run?.[key]) throw new Error(`benchmark run missing ${key.replaceAll("_", " ")}`);
  if (!/^[a-f0-9]{64}$/.test(run.source_pack_hash)) throw new Error("Source Pack hash is invalid");
  if (!/^[a-f0-9]{64}$/.test(run.instruction_hash)) throw new Error("instruction hash is invalid");
  if (!run.runtime?.version || !run.runtime?.protocol_version || !run.runtime?.schema_version) throw new Error("runtime identity is incomplete");
  if (!run.host?.agent || !run.host?.engine || run.host?.vision_capability !== true) throw new Error("auditable vision Host identity is incomplete");
  if (!existsSync(run.package_path)) throw new Error("benchmark package path is missing");
  return { status: "pass", corpus_id: run.corpus_id, source_pack_hash: run.source_pack_hash };
}

export function compareBenchmarkRuns(baseline, current) {
  const compatible = baseline.corpus_id === current.corpus_id && baseline.corpus_version === current.corpus_version && baseline.source_pack_hash === current.source_pack_hash && baseline.rubric_version === current.rubric_version;
  if (!compatible) throw new Error("Benchmark runs are not compatible: Corpus version, Source Pack or rubric changed");
  const reasons = [];
  const overallChange = Number((current.overall_score - baseline.overall_score).toFixed(2));
  if (overallChange <= -5) reasons.push(`overall score declined ${Math.abs(overallChange)} points`);
  const before = new Map(asArray(baseline.modules).map((item) => [item.module_id, item.score]));
  const module_changes = asArray(current.modules).map((item) => ({ module_id: item.module_id, change: Number((item.score - (before.get(item.module_id) ?? item.score)).toFixed(2)) }));
  for (const item of module_changes) if (item.change <= -10) reasons.push(`${item.module_id} declined ${Math.abs(item.change)} points`);
  const evidenceFor = (run, moduleId) => asArray(asArray(run.modules).find((item) => item.module_id === moduleId)?.evidence);
  const baselineEvidence = evidenceFor(baseline, "evidence-completeness");
  const currentEvidence = evidenceFor(current, "evidence-completeness");
  const evidence_coverage = { baseline: baselineEvidence.length, current: currentEvidence.length, change: currentEvidence.length - baselineEvidence.length };
  const baselineDomains = evidenceFor(baseline, "domain-coverage");
  const currentDomains = evidenceFor(current, "domain-coverage");
  const artifact_domains = {
    added: currentDomains.filter((item) => !baselineDomains.includes(item)),
    removed: baselineDomains.filter((item) => !currentDomains.includes(item)),
  };
  const baselineTraceFailures = asArray(baseline.traceability?.failed_domain_ids);
  const currentTraceFailures = asArray(current.traceability?.failed_domain_ids);
  const traceability = {
    baseline_failures: baselineTraceFailures.length,
    current_failures: currentTraceFailures.length,
    new_failures: currentTraceFailures.filter((item) => !baselineTraceFailures.includes(item)).length,
    new_failed_domain_ids: currentTraceFailures.filter((item) => !baselineTraceFailures.includes(item)),
  };
  const scope_contamination = {
    newly_blocked: current.scope_isolation?.status === "blocked" && baseline.scope_isolation?.status !== "blocked",
    current_findings: asArray(current.scope_isolation?.findings).length,
    baseline_findings: asArray(baseline.scope_isolation?.findings).length,
  };
  const conflicts = {
    baseline_open_high_impact: baseline.conflicts?.open_high_impact ?? 0,
    current_open_high_impact: current.conflicts?.open_high_impact ?? 0,
    open_high_impact_change: (current.conflicts?.open_high_impact ?? 0) - (baseline.conflicts?.open_high_impact ?? 0),
  };
  const newHardGate = current.hard_gates?.status === "blocked" && baseline.hard_gates?.status !== "blocked";
  if (newHardGate) reasons.push("new hard-gate failure");
  if (traceability.new_failures) reasons.push(`canonical provenance lost for ${traceability.new_failures} domain candidates`);
  if (scope_contamination.newly_blocked) reasons.push("new global scope contamination");
  if (conflicts.open_high_impact_change > 0) reasons.push(`${conflicts.open_high_impact_change} new open high-impact conflict(s)`);
  if (artifact_domains.removed.length) reasons.push(`Artifact domains removed: ${artifact_domains.removed.join(", ")}`);
  const blocked = newHardGate || traceability.new_failures > 0 || scope_contamination.newly_blocked;
  return { status: blocked ? "blocked" : reasons.length ? "regression" : "pass", overall_change: overallChange, module_changes, evidence_coverage, traceability, scope_contamination, conflicts, artifact_domains, reasons };
}

export function createBaselineSnapshot({ snapshotFile, run }) {
  const pendingSlot = existsSync(snapshotFile) ? readJson(snapshotFile) : null;
  if (pendingSlot && (pendingSlot.status !== "pending-human-review" || pendingSlot.baseline_run_id !== null)) throw new Error("baseline snapshot exists and is immutable; it cannot be overwritten");
  if (!run?.run_id || !run?.run_hash || run.status !== "baseline-established") throw new Error("baseline run is incomplete");
  if (pendingSlot && pendingSlot.corpus_id !== run.corpus_id) throw new Error("pending baseline slot belongs to a different Corpus");
  const snapshot = { corpus_id: run.corpus_id, status: "baseline-established", baseline_run_id: run.run_id, run_hash: run.run_hash, established_at: run.established_at ?? null, previous_run_id: null };
  if (pendingSlot) writeFileSync(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`);
  else writeJson(snapshotFile, snapshot);
  return snapshot;
}

export const benchmarkHash = (value) => sha(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value));
