import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateSchema } from "../runtime/schema_validator.mjs";
import {
  combineBenchmarkScores,
  stabilizeStaticSourcePack,
  validateAcceptedBaseline,
  validateGoldenPromotion,
  validateHumanScore,
  validateSourcePackStability,
} from "../scripts/benchmarks/r009a-core.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const writeJson = (file, value) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

test("benchmark Schemas accept an explicit Mode B static-only Corpus", () => {
  const corpusSchema = readJson(path.resolve("benchmarks/schemas/corpus.schema.json"));
  const sourceSchema = readJson(path.resolve("benchmarks/schemas/source-manifest.schema.json"));
  const corpus = {
    corpus_id: "l2-brand-static-coffee-static-v1", version: "1.0.0", level: "L2-brand", domain: "brand-identity", status: "candidate",
    scope: "static brand identity and case-study presentation", source_pack_id: "static-coffee-static-source-pack-v1", source_pack_status: "stable-static",
    rubric_version: "1.0.0", baseline_run_id: null, latest_run_id: null,
  };
  const source = {
    corpus_id: corpus.corpus_id, source_pack_id: corpus.source_pack_id, source_pack_version: "1.0.0", parent_source_pack_id: "static-coffee-source-pack-v1",
    source_url: "https://example.com/case-study", capture_id: "capture-static", capture_status: "stable-static", captured_at: "2026-07-15T08:00:00Z",
    viewport: { width: 1400, height: 900 }, capture_scope: corpus.scope, missing_sources: [], intentional_exclusions: ["animated-project-module-01"],
    scope_decision_id: "scope-mode-b", redistribution_policy: "metadata-and-hashes-only",
    sources: [{ source_id: "source-1", section_ref: "module-1", local_path: "sections/source-1.webp", sha256: sha("source"), dimensions: { width: 1400, height: 900 }, media_type: "image/webp", redistribution_status: "local-only" }],
  };
  assert.deepEqual(validateSchema(corpus, corpusSchema), []);
  assert.deepEqual(validateSchema(source, sourceSchema), []);
});

const capabilityIds = [
  "brand-identity-narrative", "logo-wordmark-system", "typography-system", "editorial-hierarchy", "color-system",
  "halftone-image-treatment", "floral-texture-pattern", "packaging-system", "signage-spatial-system", "photography-direction",
  "editorial-composition", "presentation-sequence", "brand-visual-grammar", "cross-application-consistency",
];
const humanModuleIds = [
  "brand-system-coherence", "typography-system-interpretation", "color-system-interpretation", "cross-application-consistency",
  "visual-grammar-usefulness", "presentation-grammar-usefulness", "possible-intent-discipline", "overall-usefulness",
];

function stabilityFixture({ mode = "static-only" } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r009a-stability-"));
  const originalCorpusRoot = path.join(root, "benchmarks/L2-brand/static-coffee");
  const corpusRoot = path.join(root, mode === "static-only" ? "benchmarks/L2-brand/static-coffee-static" : "benchmarks/L2-brand/static-coffee-multimedia");
  const originalPackRoot = path.join(root, ".local-benchmark-sources/static-coffee-v1");
  const sourcePackRoot = path.join(root, `.local-benchmark-sources/${mode === "static-only" ? "static-coffee-static-v1" : "static-coffee-multimedia-v1"}`);
  const sourceBytes = Buffer.from("static-source");
  const sourceHash = sha(sourceBytes);
  mkdirSync(path.join(originalPackRoot, "sections"), { recursive: true });
  writeFileSync(path.join(originalPackRoot, "sections/source-1.webp"), sourceBytes);
  writeJson(path.join(originalPackRoot, "source-pack.json"), {
    source_pack_id: "static-coffee-source-pack-v1", corpus_id: "l2-brand-static-coffee-v1", capture_status: "partial",
    files: [{ path: "sections/source-1.webp", sha256: sourceHash, analysis_source: true }], missing_sources: ["animated-project-modules"],
  });
  writeJson(path.join(originalCorpusRoot, "corpus.json"), { corpus_id: "l2-brand-static-coffee-v1", version: "1.0.0", status: "candidate", source_pack_id: "static-coffee-source-pack-v1" });
  writeJson(path.join(originalCorpusRoot, "source/source-manifest.json"), { capture_status: "partial", missing_sources: ["animated-project-modules"] });
  const corpusId = mode === "static-only" ? "l2-brand-static-coffee-static-v1" : "l2-brand-static-coffee-multimedia-v1";
  const packId = mode === "static-only" ? "static-coffee-static-source-pack-v1" : "static-coffee-multimedia-source-pack-v1";
  writeJson(path.join(corpusRoot, "corpus.json"), { corpus_id: corpusId, version: "1.0.0", level: "L2-brand", domain: "brand-identity", status: "candidate", source_pack_id: packId, rubric_version: "1.0.0", baseline_run_id: null, latest_run_id: null });
  writeJson(path.join(corpusRoot, "source/source-manifest.json"), {
    source_pack_id: packId, source_url: "https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity", capture_id: `capture-${mode}`,
    capture_status: mode === "static-only" ? "stable-static" : "complete", captured_at: "2026-07-15T08:00:00Z", viewport: { width: 1400, height: 900 },
    capture_scope: mode, missing_sources: [], redistribution_policy: "metadata-and-hashes-only",
    sources: [{ source_id: "source-1", section_ref: "module-1", local_path: "sections/source-1.webp", sha256: sourceHash, dimensions: { width: 1400, height: 900 }, media_type: "image/webp", redistribution_status: "local-only" }],
  });
  writeJson(path.join(corpusRoot, "source/region-manifest.json"), { corpus_id: corpusId, regions: [{ region_id: "region-1", source_id: "source-1", section_ref: "module-1", classification: "canonical-brand-system", confidence: 0.9, review_status: "candidate", evidence_hash: sourceHash }], excluded_regions: [] });
  writeJson(path.join(corpusRoot, "expectations/required-capabilities.json"), { version: "1.0.0", capabilities: capabilityIds.map((capability_id) => ({ capability_id, required: true, minimum_evidence_count: 1, allowed_output_artifacts: ["design.md"], human_review_required: true })) });
  const excludedModules = mode === "static-only" ? Array.from({ length: 4 }, (_, index) => ({
    module_id: `animated-module-${index + 1}`, source_url: `https://example.com/module-${index + 1}.gif`, reason: "Motion is outside the declared static-only scope",
    impact_assessment: "No impact on the fourteen static capability categories", capability_impact: ["motion-presentation-grammar"], owner_approved: true,
  })) : [];
  writeJson(path.join(corpusRoot, "source/scope-decision.json"), {
    decision_id: `scope-${mode}`, mode, owner_name: "Nick", owner_role: "Project Owner", approved_at: "2026-07-15T09:30:00Z",
    original_corpus_id: "l2-brand-static-coffee-v1", derived_corpus_id: corpusId, scope: mode === "static-only" ? "static brand identity and case-study presentation" : "brand identity including motion",
    excluded_capabilities: mode === "static-only" ? ["motion-presentation-grammar"] : [], excluded_modules: excludedModules,
  });
  writeJson(path.join(corpusRoot, "source/capability-reviewability.json"), { corpus_id: corpusId, capabilities: capabilityIds.map((capability_id) => ({ capability_id, reviewable: true, region_refs: ["region-1"] })) });
  stabilizeStaticSourcePack({ originalPackRoot, outputRoot: sourcePackRoot, corpusId, sourcePackId: packId, captureStatus: mode === "static-only" ? "stable-static" : "complete", scopeDecisionFile: path.join(corpusRoot, "source/scope-decision.json") });
  return { root, corpusRoot, originalCorpusRoot, originalPackRoot, sourcePackRoot };
}

function reviewFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r009a-review-"));
  const candidateRunRoot = path.join(root, "run-candidate");
  const packageRoot = path.join(candidateRunRoot, "recrafts-package");
  mkdirSync(packageRoot, { recursive: true });
  writeJson(path.join(packageRoot, "evidence-map.json"), { evidence: [{ evidence_id: "ev-1" }, { evidence_id: "ev-2" }] });
  for (const file of ["tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json", "design.md"]) writeFileSync(path.join(packageRoot, file), file.endsWith(".json") ? "{}\n" : "# Design\n");
  writeJson(path.join(candidateRunRoot, "run.json"), { run_id: "run-candidate", corpus_id: "l2-brand-static-coffee-static-v1", corpus_version: "1.0.0", source_pack_id: "static-coffee-static-source-pack-v1" });
  const human = {
    status: "complete", reviewer_name: "Nick", reviewer_role: "Project Owner", review_date: "2026-07-15", corpus_id: "l2-brand-static-coffee-static-v1", corpus_version: "1.0.0",
    source_pack_id: "static-coffee-static-source-pack-v1", candidate_run_id: "run-candidate", review_environment: "local side-by-side workspace", correction_proposals_reviewed: true,
    scores: humanModuleIds.map((module_id) => ({ module_id, score: 4, reason: "Evidence-backed human review", artifact_refs: ["tokens.json"], evidence_refs: ["ev-1"] })),
  };
  const humanScoreFile = path.join(root, "human-score.json"); writeJson(humanScoreFile, human);
  const automaticScoreFile = path.join(root, "automatic-score.json"); writeJson(automaticScoreFile, { status: "pending-human-review", score: 70, maximum_score: 75, hard_gates: { status: "pass", failures: [] }, modules: [] });
  return { root, candidateRunRoot, humanScoreFile, automaticScoreFile, human };
}

function baselineFixture() {
  const review = reviewFixture();
  const candidatePackage = path.join(review.candidateRunRoot, "recrafts-package/recrafts-package.json");
  writeJson(candidatePackage, { package_id: "package-candidate", status: "awaiting-review" });
  const candidateHash = sha(readFileSync(candidatePackage));
  const acceptedRunRoot = path.join(review.root, "run-accepted"); const acceptedPackageRoot = path.join(acceptedRunRoot, "recrafts-package");
  mkdirSync(acceptedPackageRoot, { recursive: true });
  const canonical = { "tokens.json": "{\"tokens\":[]}", "components.json": "{\"components\":[]}", "grid-rules.json": "{\"grid_rules\":[]}", "layout-rules.json": "{\"layout_rules\":[]}", "visual-grammar.json": "{\"visual_grammar\":[]}", "conflicts.json": "{\"conflicts\":[]}", "design.md": "# Accepted" };
  const artifactHashes = {};
  for (const [file, contents] of Object.entries(canonical)) { writeFileSync(path.join(acceptedPackageRoot, file), contents); artifactHashes[file] = sha(Buffer.from(contents)); }
  writeJson(path.join(acceptedPackageRoot, "recrafts-package.json"), { package_id: "package-accepted", parent_package_id: "package-corrected", status: "accepted", artifact_set_id: "artifact-set-accepted" });
  writeJson(path.join(acceptedPackageRoot, "artifact-set.json"), { artifact_set_id: "artifact-set-accepted", package_id: "package-accepted", parent_package_id: "package-corrected", source_capture_ids: ["capture-1"], analysis_ids: ["analysis-1"], correction_ids: ["correction-1"], decision_ids: ["decision-1"], status: "accepted", artifacts: [], artifact_hashes: artifactHashes, created_at: "2026-07-15T11:00:00Z" });
  writeJson(path.join(acceptedRunRoot, "hard-gates-final.json"), { status: "pass", failures: [] });
  const baseline = {
    status: "baseline-established", baseline_run_id: "run-accepted", candidate_run_id: "run-candidate", accepted_run_id: "run-accepted",
    candidate_package_id: "package-candidate", candidate_package_sha256: candidateHash, accepted_package_id: "package-accepted", artifact_set_id: "artifact-set-accepted",
    corpus_id: "l2-brand-static-coffee-static-v1", corpus_version: "1.0.0", source_pack_id: "static-coffee-static-source-pack-v1", source_pack_version: "1.0.0",
    rubric_id: "brand-system-v1", rubric_version: "1.0.0", installed_recrafts_version: "0.4.0-rc.1", protocol_version: "1.1", schema_version: "3.0.0",
    host: { agent: "Codex", engine: "GPT-5", vision_capability: true }, instruction_hash: sha("instruction"), host_analysis_hash: sha("analysis"),
    correction_ids: ["correction-1"], decision_ids: ["decision-1"], artifact_hashes: artifactHashes, automatic_score: 70, human_score: 20, combined_score: 90,
    hard_gate_status: "pass", created_at: "2026-07-15T11:00:00Z",
  };
  const baselineFile = path.join(review.root, "baseline.json"); writeJson(baselineFile, baseline);
  return { ...review, acceptedRunRoot, baselineFile, baseline, candidateHash };
}

test("Mode B static-only Source Pack is stable with four intentional exclusions", () => {
  const value = stabilityFixture();
  const result = validateSourcePackStability({ repositoryRoot: value.root, corpusRoot: value.corpusRoot, sourcePackRoot: value.sourcePackRoot, originalCorpusRoot: value.originalCorpusRoot });
  assert.equal(result.status, "pass");
  assert.equal(result.mode, "static-only");
  assert.equal(result.excluded_module_count, 4);
  assert.equal(result.reviewable_capability_count, 14);
});

test("complete multimedia Source Pack can pass without exclusions", () => {
  const value = stabilityFixture({ mode: "complete-multimedia" });
  assert.equal(validateSourcePackStability({ repositoryRoot: value.root, corpusRoot: value.corpusRoot, sourcePackRoot: value.sourcePackRoot, originalCorpusRoot: value.originalCorpusRoot }).status, "pass");
});

test("partial Source Pack and undocumented animation omission fail stability", () => {
  const value = stabilityFixture();
  const manifest = readJson(path.join(value.corpusRoot, "source/source-manifest.json")); manifest.capture_status = "partial"; writeJson(path.join(value.corpusRoot, "source/source-manifest.json"), manifest);
  const decision = readJson(path.join(value.corpusRoot, "source/scope-decision.json")); decision.excluded_modules.pop(); writeJson(path.join(value.corpusRoot, "source/scope-decision.json"), decision);
  const result = validateSourcePackStability({ repositoryRoot: value.root, corpusRoot: value.corpusRoot, sourcePackRoot: value.sourcePackRoot, originalCorpusRoot: value.originalCorpusRoot });
  assert.equal(result.status, "failed");
  assert.match(result.errors.join("\n"), /partial|four|exclusion/i);
});

test("human score validates reviewer, reasons and Artifact/Evidence refs", () => {
  const value = reviewFixture();
  const result = validateHumanScore({ humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot });
  assert.equal(result.status, "pass");
  assert.equal(result.score, 20);
});

test("human score accepts empty optional Artifact and Evidence refs", () => {
  const value = reviewFixture(); const human = readJson(value.humanScoreFile);
  for (const entry of human.scores) { entry.artifact_refs = []; entry.evidence_refs = []; }
  writeJson(value.humanScoreFile, human);
  const result = validateHumanScore({ humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot });
  assert.equal(result.status, "pass", result.errors.join("\n"));
});

test("human score still rejects invalid non-empty optional refs", () => {
  const value = reviewFixture(); const human = readJson(value.humanScoreFile);
  human.scores[0].artifact_refs = ["unknown.json"];
  human.scores[1].evidence_refs = ["ev-unknown"];
  writeJson(value.humanScoreFile, human);
  const result = validateHumanScore({ humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot });
  assert.equal(result.status, "failed");
  assert.match(result.errors.join("\n"), /Unknown Artifact ref|Unknown Evidence ref/);
});

test("human score accepts an explicitly approved derived static Corpus without rewriting the candidate run", () => {
  const value = reviewFixture(); const human = readJson(value.humanScoreFile);
  const runFile = path.join(value.candidateRunRoot, "run.json"); const run = readJson(runFile);
  run.corpus_id = "l2-brand-static-coffee-v1"; run.source_pack_id = "static-coffee-source-pack-v1"; writeJson(runFile, run);
  human.corpus_id = "l2-brand-static-coffee-static-v1";
  human.source_pack_id = "static-coffee-static-source-pack-v1";
  writeJson(value.humanScoreFile, human);
  const scopeDecisionFile = path.join(value.root, "scope-decision.json");
  writeJson(scopeDecisionFile, {
    decision_id: "scope-mode-b", mode: "static-only", owner_name: "Nick", owner_role: "Project Owner",
    original_corpus_id: "l2-brand-static-coffee-v1", derived_corpus_id: "l2-brand-static-coffee-static-v1",
  });
  const derivedSourcePackFile = path.join(value.root, "source-pack.json");
  writeJson(derivedSourcePackFile, { source_pack_id: "static-coffee-static-source-pack-v1", corpus_id: "l2-brand-static-coffee-static-v1", parent_source_pack_id: "static-coffee-source-pack-v1", scope_decision_id: "scope-mode-b" });
  const accepted = validateHumanScore({ humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot, scopeDecisionFile, derivedSourcePackFile });
  assert.equal(accepted.status, "pass", accepted.errors.join("\n"));
  const combined = combineBenchmarkScores({ automaticScoreFile: value.automaticScoreFile, humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot, scopeDecisionFile, derivedSourcePackFile });
  assert.equal(combined.overall_score, 90);
  const rejected = validateHumanScore({ humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot });
  assert.equal(rejected.status, "failed");
});

test("human score rejects missing identity, reason and unknown Artifact refs", () => {
  const value = reviewFixture(); const human = readJson(value.humanScoreFile);
  human.reviewer_name = ""; human.scores[0].reason = ""; human.scores[1].artifact_refs = ["unknown.json"]; writeJson(value.humanScoreFile, human);
  const result = validateHumanScore({ humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot });
  assert.equal(result.status, "failed");
  assert.match(result.errors.join("\n"), /reviewer|reason|Artifact/i);
});

test("automatic and human scores combine without mutating either input", () => {
  const value = reviewFixture(); const beforeAutomatic = readFileSync(value.automaticScoreFile, "utf8"); const beforeHuman = readFileSync(value.humanScoreFile, "utf8");
  const combined = combineBenchmarkScores({ automaticScoreFile: value.automaticScoreFile, humanScoreFile: value.humanScoreFile, candidateRunRoot: value.candidateRunRoot });
  assert.equal(combined.overall_score, 90); assert.equal(combined.status, "strong-pass");
  assert.equal(readFileSync(value.automaticScoreFile, "utf8"), beforeAutomatic); assert.equal(readFileSync(value.humanScoreFile, "utf8"), beforeHuman);
});

test("accepted baseline validates immutable Package and Artifact hashes", () => {
  const value = baselineFixture();
  assert.equal(validateAcceptedBaseline({ baselineFile: value.baselineFile, candidateRunRoot: value.candidateRunRoot, acceptedRunRoot: value.acceptedRunRoot }).status, "pass");
});

for (const mode of ["candidate-overwritten", "awaiting-review", "missing-decision", "hash-mismatch"]) test(`baseline rejects ${mode}`, () => {
  const value = baselineFixture();
  if (mode === "candidate-overwritten") writeJson(path.join(value.candidateRunRoot, "recrafts-package/recrafts-package.json"), { package_id: "package-candidate", status: "changed" });
  if (mode === "awaiting-review") { const file = path.join(value.acceptedRunRoot, "recrafts-package/recrafts-package.json"); const manifest = readJson(file); manifest.status = "awaiting-review"; writeJson(file, manifest); }
  if (mode === "missing-decision") { const file = path.join(value.acceptedRunRoot, "recrafts-package/artifact-set.json"); const set = readJson(file); set.decision_ids = []; writeJson(file, set); }
  if (mode === "hash-mismatch") { const baseline = readJson(value.baselineFile); baseline.artifact_hashes["tokens.json"] = sha("wrong"); writeJson(value.baselineFile, baseline); }
  assert.equal(validateAcceptedBaseline({ baselineFile: value.baselineFile, candidateRunRoot: value.candidateRunRoot, acceptedRunRoot: value.acceptedRunRoot }).status, "failed");
});

test("Golden promotion validates registry, baseline, hard gates and owner verdict", () => {
  const value = baselineFixture();
  const corpusFile = path.join(value.root, "corpus.json"); const registryFile = path.join(value.root, "registry.json"); const decisionFile = path.join(value.root, "promotion.json");
  writeJson(corpusFile, { corpus_id: value.baseline.corpus_id, status: "golden", baseline_run_id: value.baseline.baseline_run_id, latest_run_id: value.baseline.accepted_run_id });
  writeJson(registryFile, { corpora: [{ corpus_id: value.baseline.corpus_id, status: "golden", baseline_run_id: value.baseline.baseline_run_id, latest_run_id: value.baseline.accepted_run_id }] });
  writeJson(decisionFile, { verdict: "GOLDEN", owner_name: "Nick", owner_role: "Project Owner", decided_at: "2026-07-15T12:00:00Z", baseline_run_id: value.baseline.baseline_run_id });
  assert.equal(validateGoldenPromotion({ registryFile, corpusFile, decisionFile, baselineFile: value.baselineFile, acceptedRunRoot: value.acceptedRunRoot, noOracleStatus: "pass", sourceStabilityStatus: "pass", humanScoreStatus: "pass" }).status, "pass");
});

test("candidate retention is valid without pretending Golden promotion", () => {
  const value = baselineFixture();
  const corpusFile = path.join(value.root, "corpus.json"); const registryFile = path.join(value.root, "registry.json"); const decisionFile = path.join(value.root, "promotion.json");
  writeJson(corpusFile, { corpus_id: value.baseline.corpus_id, status: "candidate", baseline_run_id: null, latest_run_id: null });
  writeJson(registryFile, { corpora: [{ corpus_id: value.baseline.corpus_id, status: "candidate", baseline_run_id: null, latest_run_id: null }] });
  writeJson(decisionFile, { verdict: "REMAIN_CANDIDATE", owner_name: "Nick", owner_role: "Project Owner", decided_at: "2026-07-15T12:00:00Z", baseline_run_id: null });
  const result = validateGoldenPromotion({ registryFile, corpusFile, decisionFile, baselineFile: value.baselineFile, acceptedRunRoot: value.acceptedRunRoot, noOracleStatus: "pass", sourceStabilityStatus: "pass", humanScoreStatus: "pass" });
  assert.equal(result.status, "pass"); assert.equal(result.lifecycle, "candidate");
});

test("Golden promotion fails on registry mismatch or hard-gate failure", () => {
  const value = baselineFixture();
  const corpusFile = path.join(value.root, "corpus.json"); const registryFile = path.join(value.root, "registry.json"); const decisionFile = path.join(value.root, "promotion.json");
  writeJson(corpusFile, { corpus_id: value.baseline.corpus_id, status: "golden", baseline_run_id: value.baseline.baseline_run_id, latest_run_id: value.baseline.accepted_run_id });
  writeJson(registryFile, { corpora: [{ corpus_id: "wrong", status: "golden", baseline_run_id: value.baseline.baseline_run_id }] });
  writeJson(decisionFile, { verdict: "GOLDEN", owner_name: "Nick", owner_role: "Project Owner", decided_at: "2026-07-15T12:00:00Z", baseline_run_id: value.baseline.baseline_run_id });
  writeJson(path.join(value.acceptedRunRoot, "hard-gates-final.json"), { status: "blocked", failures: ["oracle"] });
  const result = validateGoldenPromotion({ registryFile, corpusFile, decisionFile, baselineFile: value.baselineFile, acceptedRunRoot: value.acceptedRunRoot, noOracleStatus: "failed", sourceStabilityStatus: "pass", humanScoreStatus: "pass" });
  assert.equal(result.status, "failed"); assert.match(result.errors.join("\n"), /registry|hard.gate|Oracle/i);
});

test("static Source Pack build refuses a non-empty output", () => {
  const value = stabilityFixture();
  assert.ok(existsSync(path.join(value.sourcePackRoot, "source-pack.json")));
  assert.throws(() => stabilizeStaticSourcePack({ originalPackRoot: value.originalPackRoot, outputRoot: value.sourcePackRoot, corpusId: "c", sourcePackId: "p", captureStatus: "stable-static", scopeDecisionFile: path.join(value.corpusRoot, "source/scope-decision.json") }), /empty|overwrite/i);
});
