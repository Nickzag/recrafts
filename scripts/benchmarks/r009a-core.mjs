import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const REQUIRED_CAPABILITIES = [
  "brand-identity-narrative",
  "logo-wordmark-system",
  "typography-system",
  "editorial-hierarchy",
  "color-system",
  "halftone-image-treatment",
  "floral-texture-pattern",
  "packaging-system",
  "signage-spatial-system",
  "photography-direction",
  "editorial-composition",
  "presentation-sequence",
  "brand-visual-grammar",
  "cross-application-consistency",
];

const HUMAN_MODULES = [
  "brand-system-coherence",
  "typography-system-interpretation",
  "color-system-interpretation",
  "cross-application-consistency",
  "visual-grammar-usefulness",
  "presentation-grammar-usefulness",
  "possible-intent-discipline",
  "overall-usefulness",
];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = (file) => sha256(readFileSync(file));
const present = (value) => typeof value === "string" && value.trim().length > 0;

function fail(errors, message) {
  errors.push(message);
}

function safeReadJson(file, errors, label) {
  try {
    return readJson(file);
  } catch (error) {
    fail(errors, `${label}: ${error.message}`);
    return null;
  }
}

function isNonEmptyDirectory(directory) {
  return existsSync(directory) && statSync(directory).isDirectory() && readdirSync(directory).length > 0;
}

export function stabilizeStaticSourcePack({
  originalPackRoot,
  outputRoot,
  corpusId,
  sourcePackId,
  captureStatus,
  scopeDecisionFile,
}) {
  if (isNonEmptyDirectory(outputRoot)) {
    throw new Error(`Output directory must be empty; refusing to overwrite ${outputRoot}`);
  }

  const original = readJson(path.join(originalPackRoot, "source-pack.json"));
  const scopeDecision = readJson(scopeDecisionFile);
  const selected = (original.files ?? []).filter((entry) => entry.analysis_source !== false);
  if (selected.length === 0) throw new Error("Original Source Pack has no static analysis sources");

  const files = selected.map((entry) => {
    const source = path.join(originalPackRoot, entry.path);
    if (!existsSync(source)) throw new Error(`Source file is missing: ${entry.path}`);
    const actualHash = fileSha256(source);
    if (entry.sha256 && entry.sha256 !== actualHash) throw new Error(`Source hash mismatch: ${entry.path}`);
    const destination = path.join(outputRoot, entry.path);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    return { ...entry, sha256: actualHash, analysis_source: true };
  });

  const sourcePack = {
    source_pack_id: sourcePackId,
    corpus_id: corpusId,
    version: "1.0.0",
    capture_status: captureStatus,
    capture_scope: scopeDecision.mode,
    captured_at: original.captured_at ?? null,
    parent_source_pack_id: original.source_pack_id,
    scope_decision_id: scopeDecision.decision_id,
    files,
    missing_sources: [],
    excluded_modules: scopeDecision.excluded_modules ?? [],
    redistribution: {
      status: "local-only",
      policy: "metadata-and-hashes-only",
    },
  };

  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(path.join(outputRoot, "source-pack.json"), `${JSON.stringify(sourcePack, null, 2)}\n`);
  writeFileSync(
    path.join(outputRoot, "checksums.sha256"),
    `${files.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`,
  );
  return sourcePack;
}

export function validateSourcePackStability({ corpusRoot, sourcePackRoot, originalCorpusRoot }) {
  const errors = [];
  const corpus = safeReadJson(path.join(corpusRoot, "corpus.json"), errors, "Corpus");
  const manifest = safeReadJson(path.join(corpusRoot, "source/source-manifest.json"), errors, "Source manifest");
  const regions = safeReadJson(path.join(corpusRoot, "source/region-manifest.json"), errors, "Region manifest");
  const requirements = safeReadJson(path.join(corpusRoot, "expectations/required-capabilities.json"), errors, "Required capabilities");
  const decision = safeReadJson(path.join(corpusRoot, "source/scope-decision.json"), errors, "Scope decision");
  const reviewability = safeReadJson(path.join(corpusRoot, "source/capability-reviewability.json"), errors, "Capability reviewability");
  const pack = safeReadJson(path.join(sourcePackRoot, "source-pack.json"), errors, "Local Source Pack");
  const originalCorpus = safeReadJson(path.join(originalCorpusRoot, "corpus.json"), errors, "Original Corpus");
  const originalManifest = safeReadJson(path.join(originalCorpusRoot, "source/source-manifest.json"), errors, "Original source manifest");
  if ([corpus, manifest, regions, requirements, decision, reviewability, pack, originalCorpus, originalManifest].some((value) => !value)) {
    return { status: "failed", errors };
  }

  if (originalCorpus.status !== "candidate") fail(errors, "Original partial Corpus must remain candidate");
  if (originalManifest.capture_status !== "partial") fail(errors, "Original source manifest must remain partial and unchanged");
  if (corpus.corpus_id !== decision.derived_corpus_id || corpus.corpus_id !== manifest.corpus_id && manifest.corpus_id !== undefined) {
    fail(errors, "Derived Corpus identifiers do not match");
  }
  if (corpus.source_pack_id !== manifest.source_pack_id || corpus.source_pack_id !== pack.source_pack_id) {
    fail(errors, "Source Pack identifiers do not match");
  }
  if (pack.corpus_id !== corpus.corpus_id) fail(errors, "Local Source Pack corpus_id does not match");
  if ((manifest.missing_sources ?? []).length > 0 || (pack.missing_sources ?? []).length > 0) {
    fail(errors, "Stable Source Pack cannot declare missing sources");
  }

  const mode = decision.mode;
  const exclusions = decision.excluded_modules ?? [];
  if (mode === "static-only") {
    if (manifest.capture_status !== "stable-static" || pack.capture_status !== "stable-static") {
      fail(errors, "Static-only Source Pack must use stable-static, not partial, status");
    }
    if (exclusions.length !== 4) fail(errors, "Static-only scope must document all four animated-module exclusions");
    if (!(decision.excluded_capabilities ?? []).includes("motion-presentation-grammar")) {
      fail(errors, "Static-only scope must explicitly exclude motion-presentation-grammar");
    }
    exclusions.forEach((entry, index) => {
      if (![entry.module_id, entry.source_url, entry.reason, entry.impact_assessment].every(present)) {
        fail(errors, `Exclusion ${index + 1} is incomplete`);
      }
      if (!Array.isArray(entry.capability_impact) || entry.capability_impact.length === 0) {
        fail(errors, `Exclusion ${index + 1} lacks capability impact`);
      }
      if (entry.owner_approved !== true) fail(errors, `Exclusion ${index + 1} lacks owner approval`);
    });
  } else if (mode === "complete-multimedia") {
    if (manifest.capture_status !== "complete" || pack.capture_status !== "complete") {
      fail(errors, "Complete multimedia Source Pack must use complete status");
    }
    if (exclusions.length !== 0) fail(errors, "Complete multimedia Source Pack cannot declare exclusions");
  } else {
    fail(errors, `Unsupported scope mode: ${mode}`);
  }

  const packFiles = new Map((pack.files ?? []).map((entry) => [entry.path, entry]));
  for (const source of manifest.sources ?? []) {
    const entry = packFiles.get(source.local_path);
    if (!entry) {
      fail(errors, `Manifest source is absent from local Source Pack: ${source.local_path}`);
      continue;
    }
    const file = path.join(sourcePackRoot, source.local_path);
    if (!existsSync(file)) fail(errors, `Source file is missing: ${source.local_path}`);
    else if (fileSha256(file) !== source.sha256 || fileSha256(file) !== entry.sha256) fail(errors, `Source hash mismatch: ${source.local_path}`);
  }

  const sourceIds = new Set((manifest.sources ?? []).map((entry) => entry.source_id));
  const regionIds = new Set((regions.regions ?? []).map((entry) => entry.region_id));
  for (const region of regions.regions ?? []) {
    if (!sourceIds.has(region.source_id)) fail(errors, `Region references unknown source: ${region.region_id}`);
  }

  const requiredIds = new Set((requirements.capabilities ?? []).filter((entry) => entry.required).map((entry) => entry.capability_id));
  for (const capabilityId of REQUIRED_CAPABILITIES) {
    if (!requiredIds.has(capabilityId)) fail(errors, `Required capability is absent: ${capabilityId}`);
  }
  const reviewable = new Map((reviewability.capabilities ?? []).map((entry) => [entry.capability_id, entry]));
  for (const capabilityId of REQUIRED_CAPABILITIES) {
    const entry = reviewable.get(capabilityId);
    if (!entry?.reviewable) fail(errors, `Capability is not reviewable: ${capabilityId}`);
    else if (!(entry.region_refs ?? []).some((regionId) => regionIds.has(regionId))) fail(errors, `Capability lacks valid Region evidence: ${capabilityId}`);
  }

  return {
    status: errors.length === 0 ? "pass" : "failed",
    errors,
    mode,
    source_count: manifest.sources?.length ?? 0,
    region_count: regions.regions?.length ?? 0,
    excluded_module_count: exclusions.length,
    reviewable_capability_count: [...reviewable.values()].filter((entry) => entry.reviewable).length,
  };
}

export function validateHumanScore({ humanScoreFile, candidateRunRoot, scopeDecisionFile, derivedSourcePackFile }) {
  const errors = [];
  const human = safeReadJson(humanScoreFile, errors, "Human score");
  const run = safeReadJson(path.join(candidateRunRoot, "run.json"), errors, "Candidate run");
  const evidenceMap = safeReadJson(path.join(candidateRunRoot, "recrafts-package/evidence-map.json"), errors, "Evidence map");
  if (!human || !run || !evidenceMap) return { status: "failed", errors, score: 0, maximum_score: 25 };

  if (human.status !== "complete") fail(errors, "Human score status must be complete");
  for (const [label, value] of [
    ["reviewer name", human.reviewer_name], ["reviewer role", human.reviewer_role], ["review date", human.review_date],
    ["review environment", human.review_environment], ["Corpus ID", human.corpus_id], ["Corpus version", human.corpus_version],
    ["Source Pack ID", human.source_pack_id], ["candidate run ID", human.candidate_run_id],
  ]) if (!present(value)) fail(errors, `Missing ${label}`);
  if (human.candidate_run_id !== run.run_id) fail(errors, "Human score candidate run ID does not match run.json");
  const directIdentityMatch = human.corpus_id === run.corpus_id && human.corpus_version === run.corpus_version && human.source_pack_id === run.source_pack_id;
  let approvedDerivedIdentity = false;
  if (!directIdentityMatch && scopeDecisionFile && derivedSourcePackFile) {
    const scopeDecision = safeReadJson(scopeDecisionFile, errors, "Scope decision");
    const derivedSourcePack = safeReadJson(derivedSourcePackFile, errors, "Derived Source Pack");
    approvedDerivedIdentity = Boolean(
      scopeDecision?.mode === "static-only"
      && scopeDecision.owner_name === human.reviewer_name
      && scopeDecision.owner_role === human.reviewer_role
      && scopeDecision.original_corpus_id === run.corpus_id
      && scopeDecision.derived_corpus_id === human.corpus_id
      && derivedSourcePack?.source_pack_id === human.source_pack_id
      && derivedSourcePack.corpus_id === human.corpus_id
      && derivedSourcePack.parent_source_pack_id === run.source_pack_id
      && derivedSourcePack.scope_decision_id === scopeDecision.decision_id
    );
  }
  if (!directIdentityMatch && !approvedDerivedIdentity) {
    fail(errors, "Human score Corpus or Source Pack identity does not match candidate run");
  }

  const scores = human.scores ?? [];
  const byModule = new Map(scores.map((entry) => [entry.module_id, entry]));
  if (scores.length !== HUMAN_MODULES.length || byModule.size !== HUMAN_MODULES.length) fail(errors, "Human score must contain exactly eight unique modules");
  const evidenceIds = new Set((evidenceMap.evidence ?? evidenceMap.entries ?? []).map((entry) => entry.evidence_id));
  let rawScore = 0;
  for (const moduleId of HUMAN_MODULES) {
    const entry = byModule.get(moduleId);
    if (!entry) {
      fail(errors, `Missing human-score module: ${moduleId}`);
      continue;
    }
    if (!Number.isInteger(entry.score) || entry.score < 1 || entry.score > 5) fail(errors, `Module ${moduleId} score must be an integer from 1 to 5`);
    else rawScore += entry.score;
    if (!present(entry.reason)) fail(errors, `Module ${moduleId} requires a reason`);
    if (!Array.isArray(entry.artifact_refs)) fail(errors, `Module ${moduleId} Artifact refs must be an array`);
    for (const artifactRef of entry.artifact_refs ?? []) {
      const direct = path.join(candidateRunRoot, artifactRef);
      const packaged = path.join(candidateRunRoot, "recrafts-package", artifactRef);
      if (!existsSync(direct) && !existsSync(packaged)) fail(errors, `Unknown Artifact ref for ${moduleId}: ${artifactRef}`);
    }
    if (!Array.isArray(entry.evidence_refs)) fail(errors, `Module ${moduleId} Evidence refs must be an array`);
    for (const evidenceRef of entry.evidence_refs ?? []) if (!evidenceIds.has(evidenceRef)) fail(errors, `Unknown Evidence ref for ${moduleId}: ${evidenceRef}`);
  }

  return {
    status: errors.length === 0 ? "pass" : "failed",
    errors,
    score: Math.round((rawScore / (HUMAN_MODULES.length * 5)) * 25 * 100) / 100,
    maximum_score: 25,
    raw_score: rawScore,
    raw_maximum_score: HUMAN_MODULES.length * 5,
  };
}

export function combineBenchmarkScores({ automaticScoreFile, humanScoreFile, candidateRunRoot, scopeDecisionFile, derivedSourcePackFile }) {
  const automatic = readJson(automaticScoreFile);
  const human = validateHumanScore({ humanScoreFile, candidateRunRoot, scopeDecisionFile, derivedSourcePackFile });
  if (automatic.hard_gates?.status !== "pass") throw new Error("Automatic-score hard gates must pass before score combination");
  if (human.status !== "pass") throw new Error(`Human score validation failed: ${human.errors.join("; ")}`);
  const overallScore = Number(automatic.score) + human.score;
  return {
    status: overallScore >= 85 ? "strong-pass" : overallScore >= 75 ? "pass" : "below-threshold",
    automatic_score: automatic.score,
    automatic_maximum_score: automatic.maximum_score,
    human_score: human.score,
    human_maximum_score: human.maximum_score,
    overall_score: overallScore,
    maximum_score: Number(automatic.maximum_score) + human.maximum_score,
    hard_gate_status: automatic.hard_gates.status,
  };
}

export function validateAcceptedBaseline({ baselineFile, candidateRunRoot, acceptedRunRoot }) {
  const errors = [];
  const baseline = safeReadJson(baselineFile, errors, "Baseline");
  const candidateManifestFile = path.join(candidateRunRoot, "recrafts-package/recrafts-package.json");
  const candidate = safeReadJson(candidateManifestFile, errors, "Candidate Package");
  const accepted = safeReadJson(path.join(acceptedRunRoot, "recrafts-package/recrafts-package.json"), errors, "Accepted Package");
  const artifactSet = safeReadJson(path.join(acceptedRunRoot, "recrafts-package/artifact-set.json"), errors, "Accepted Artifact Set");
  const hardGates = safeReadJson(path.join(acceptedRunRoot, "hard-gates-final.json"), errors, "Final hard gates");
  if ([baseline, candidate, accepted, artifactSet, hardGates].some((value) => !value)) return { status: "failed", errors };

  if (baseline.status !== "baseline-established") fail(errors, "Baseline status must be baseline-established");
  if (fileSha256(candidateManifestFile) !== baseline.candidate_package_sha256) fail(errors, "Candidate Package was overwritten after scoring");
  if (candidate.package_id !== baseline.candidate_package_id) fail(errors, "Candidate Package ID does not match baseline");
  if (accepted.status !== "accepted") fail(errors, "Baseline Package must be accepted, not awaiting-review");
  if (accepted.package_id === candidate.package_id) fail(errors, "Accepted Package must have a new immutable identity");
  if (accepted.package_id !== baseline.accepted_package_id || accepted.artifact_set_id !== baseline.artifact_set_id) fail(errors, "Accepted Package identity does not match baseline");
  if (artifactSet.status !== "accepted" || artifactSet.package_id !== accepted.package_id || artifactSet.artifact_set_id !== accepted.artifact_set_id) {
    fail(errors, "Accepted Artifact Set identity or status is invalid");
  }
  if (!Array.isArray(artifactSet.decision_ids) || artifactSet.decision_ids.length === 0) fail(errors, "Accepted Artifact Set is missing an acceptance decision");
  if (hardGates.status !== "pass") fail(errors, "Final hard gates must pass");
  for (const [artifact, expectedHash] of Object.entries(baseline.artifact_hashes ?? {})) {
    const file = path.join(acceptedRunRoot, "recrafts-package", artifact);
    if (!existsSync(file)) fail(errors, `Baseline Artifact is missing: ${artifact}`);
    else if (fileSha256(file) !== expectedHash) fail(errors, `Baseline Artifact hash mismatch: ${artifact}`);
    if (artifactSet.artifact_hashes?.[artifact] !== expectedHash) fail(errors, `Artifact Set hash mismatch: ${artifact}`);
  }
  for (const field of ["baseline_run_id", "candidate_run_id", "accepted_run_id", "corpus_id", "corpus_version", "source_pack_id", "rubric_id", "rubric_version"]) {
    if (!present(baseline[field])) fail(errors, `Baseline is missing ${field}`);
  }
  return { status: errors.length === 0 ? "pass" : "failed", errors };
}

export function validateGoldenPromotion({
  registryFile,
  corpusFile,
  decisionFile,
  baselineFile,
  acceptedRunRoot,
  noOracleStatus,
  sourceStabilityStatus,
  humanScoreStatus,
}) {
  const errors = [];
  const registry = safeReadJson(registryFile, errors, "Registry");
  const corpus = safeReadJson(corpusFile, errors, "Corpus");
  const decision = safeReadJson(decisionFile, errors, "Promotion decision");
  const baseline = safeReadJson(baselineFile, errors, "Baseline");
  if ([registry, corpus, decision, baseline].some((value) => !value)) return { status: "failed", lifecycle: "unknown", errors };
  const registryEntry = (registry.corpora ?? []).find((entry) => entry.corpus_id === corpus.corpus_id);
  if (!registryEntry) fail(errors, "Registry has no matching Corpus entry");
  if (!present(decision.owner_name) || !present(decision.owner_role) || !present(decision.decided_at)) fail(errors, "Promotion decision lacks Project Owner identity or timestamp");

  if (decision.verdict === "REMAIN_CANDIDATE") {
    if (corpus.status !== "candidate" || registryEntry?.status !== "candidate") fail(errors, "Candidate retention requires candidate status in Corpus and registry");
    if (corpus.baseline_run_id !== null || corpus.latest_run_id !== null || registryEntry?.baseline_run_id !== null || registryEntry?.latest_run_id !== null) {
      fail(errors, "Candidate retention cannot pretend a Golden baseline promotion");
    }
    return { status: errors.length === 0 ? "pass" : "failed", lifecycle: "candidate", errors };
  }

  if (decision.verdict !== "GOLDEN") fail(errors, `Unsupported promotion verdict: ${decision.verdict}`);
  const hardGates = safeReadJson(path.join(acceptedRunRoot, "hard-gates-final.json"), errors, "Accepted-run hard gates");
  if (corpus.status !== "golden" || registryEntry?.status !== "golden") fail(errors, "Golden promotion requires golden status in Corpus and registry");
  if (decision.baseline_run_id !== baseline.baseline_run_id || corpus.baseline_run_id !== baseline.baseline_run_id || registryEntry?.baseline_run_id !== baseline.baseline_run_id) {
    fail(errors, "Golden baseline identity does not match decision, Corpus, or registry");
  }
  if (corpus.latest_run_id !== baseline.accepted_run_id || registryEntry?.latest_run_id !== baseline.accepted_run_id) fail(errors, "Golden latest-run identity does not match accepted run");
  if (hardGates?.status !== "pass") fail(errors, "Accepted-run hard-gate status is not pass");
  if (noOracleStatus !== "pass") fail(errors, "No-Oracle validation did not pass");
  if (sourceStabilityStatus !== "pass") fail(errors, "Source Pack stability validation did not pass");
  if (humanScoreStatus !== "pass") fail(errors, "Human score validation did not pass");
  return { status: errors.length === 0 ? "pass" : "failed", lifecycle: "golden", errors };
}
