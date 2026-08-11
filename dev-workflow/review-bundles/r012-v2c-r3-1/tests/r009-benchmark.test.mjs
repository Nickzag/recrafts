import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  auditScopeIsolation,
  calculateAutomaticScore,
  compareBenchmarkRuns,
  createBaselineSnapshot,
  mergeHumanScore,
  validateBenchmarkRun,
  validateCorpus,
  validateNoOracle,
} from "../scripts/benchmarks/benchmark-core.mjs";
import { downloadProjectModule, selectBehanceProjectModuleUrls } from "../scripts/benchmarks/capture-source-pack.mjs";
import { toInteropHost } from "../scripts/benchmarks/run-benchmark.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "recrafts-r009-"));
  const corpusRoot = path.join(root, "benchmarks/L2-brand/static-coffee");
  const sourcePackRoot = path.join(root, ".local-benchmark-sources/static-coffee-v1");
  const sourceBytes = Buffer.from("sanitized-static-coffee-section");
  const sourceRelative = "sections/section-01.png";
  mkdirSync(path.join(sourcePackRoot, "sections"), { recursive: true });
  writeFileSync(path.join(sourcePackRoot, sourceRelative), sourceBytes);
  writeJson(path.join(sourcePackRoot, "source-pack.json"), {
    source_pack_id: "static-coffee-source-pack-v1",
    corpus_id: "l2-brand-static-coffee-v1",
    source_url: "https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity",
    capture_status: "complete",
    captured_at: "2026-07-15T08:00:00.000Z",
    files: [{ path: sourceRelative, sha256: sha(sourceBytes), width: 1440, height: 900 }],
    redistribution_status: "local-only",
  });
  writeJson(path.join(corpusRoot, "corpus.json"), {
    corpus_id: "l2-brand-static-coffee-v1", version: "1.0.0", level: "L2-brand",
    domain: "brand-identity", status: "candidate", source_pack_id: "static-coffee-source-pack-v1",
    rubric_version: "1.0.0", baseline_run_id: null, latest_run_id: null,
  });
  writeJson(path.join(corpusRoot, "source/source-manifest.json"), {
    source_pack_id: "static-coffee-source-pack-v1",
    source_url: "https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity",
    capture_id: "capture-static-coffee-v1", capture_status: "complete",
    captured_at: "2026-07-15T08:00:00.000Z", viewport: { width: 1440, height: 900 },
    redistribution_policy: "metadata-and-hashes-only",
    sources: [{ source_id: "source-1", section_ref: "section-01", local_path: sourceRelative, sha256: sha(sourceBytes), dimensions: { width: 1440, height: 900 }, media_type: "image/png", redistribution_status: "local-only" }],
  });
  writeJson(path.join(corpusRoot, "source/region-manifest.json"), {
    corpus_id: "l2-brand-static-coffee-v1",
    regions: [{ region_id: "region-1", source_id: "source-1", section_ref: "section-01", classification: "packaging", confidence: 0.9, review_status: "candidate", evidence_hash: sha("region-1") }],
    excluded_regions: [],
  });
  writeJson(path.join(corpusRoot, "expectations/required-capabilities.json"), {
    version: "1.0.0",
    capabilities: ["brand-identity-narrative", "typography-system", "color-system", "packaging-system", "photography-direction", "presentation-sequence"].map((capability_id) => ({ capability_id, required: true, minimum_evidence_count: 1, allowed_output_artifacts: ["design.md"], human_review_required: true })),
  });
  writeJson(path.join(corpusRoot, "expectations/scope-boundaries.json"), {
    excluded_classes: ["behance-platform-ui", "mockup-environment", "descriptive-copy", "unrelated-thumbnail"],
    global_promotion_requires_scope_justification: true,
  });
  writeJson(path.join(corpusRoot, "expectations/hard-gates.json"), {
    gates: ["no-raw-host-output-as-evidence", "canonical-provenance", "scope-isolation", "no-oracle", "source-integrity", "reviewer-identity"],
  });
  writeJson(path.join(corpusRoot, "rubric/scorecard.json"), { rubric_version: "1.0.0", automatic_weight: 75, human_weight: 25, automatic_modules: [{ module_id: "evidence-completeness", weight: 15, mode: "automatic" }], human_modules: [{ module_id: "overall-usefulness", weight: 25, mode: "human" }], thresholds: {} });
  writeFileSync(path.join(corpusRoot, "rubric/human-review-form.md"), "# Human review\n");
  mkdirSync(path.join(corpusRoot, "reviews"), { recursive: true });
  writeFileSync(path.join(corpusRoot, "reviews/corpus-review.md"), "# Corpus review\n\nStatus: PENDING\n");
  writeJson(path.join(root, "benchmarks/registry.json"), {
    version: "1.0.0", corpora: [{ corpus_id: "l2-brand-static-coffee-v1", level: "L2-brand", domain: "brand-identity", status: "candidate", source_type: "public-case-study", source_reference: "https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity", source_pack_required: true, redistribution_policy: "metadata-and-hashes-only", rubric_version: "1.0.0", baseline_run_id: null, latest_run_id: null }],
  });
  return { root, corpusRoot, sourcePackRoot };
}

function packageFixture(root) {
  const packageRoot = path.join(root, "package");
  const evidence = [
    { evidence_id: "ev-packaging", source_id: "source-1", evidence_type: "screenshot-region", classification: "packaging", status: "current" },
    { evidence_id: "ev-type", source_id: "source-1", evidence_type: "screenshot-region", classification: "typography", status: "current" },
    { evidence_id: "ev-color", source_id: "source-1", evidence_type: "screenshot-region", classification: "color", status: "current" },
    { evidence_id: "ev-photo", source_id: "source-1", evidence_type: "screenshot-region", classification: "photography", status: "current" },
    { evidence_id: "ev-presentation", source_id: "source-1", evidence_type: "screenshot-region", classification: "case-study-presentation", status: "current" },
  ];
  const domain = (domain_id, refs = ["ev-packaging"]) => ({ domain_id, scope: "project", status: "inferred", evidence_refs: refs, claim_refs: [`claim-${domain_id}`], conflict_refs: [] });
  writeJson(path.join(packageRoot, "recrafts-package.json"), { package_id: "package-r009", status: "awaiting-review", schema_version: "3.0.0", protocol_version: "1.1" });
  writeJson(path.join(packageRoot, "source-manifest.json"), { sources: [{ source_id: "source-1", status: "complete" }] });
  writeJson(path.join(packageRoot, "evidence-map.json"), { version: "3.0.0", evidence });
  writeJson(path.join(packageRoot, "claims.json"), { version: "3.0.0", claims: ["token.color", "component.package", "grid.editorial", "layout.sequence", "grammar.brand"].map((id) => ({ claim_id: `claim-${id}`, evidence_refs: ["ev-packaging"], claim_type: "visual-finding" })) });
  writeJson(path.join(packageRoot, "tokens.json"), { version: "3.0.0", tokens: [domain("token.color", ["ev-color"])] });
  writeJson(path.join(packageRoot, "components.json"), { version: "3.0.0", components: [domain("component.package")] });
  writeJson(path.join(packageRoot, "grid-rules.json"), { version: "3.0.0", grid_rules: [domain("grid.editorial", ["ev-presentation"])] });
  writeJson(path.join(packageRoot, "layout-rules.json"), { version: "3.0.0", layout_rules: [domain("layout.sequence", ["ev-presentation"])] });
  writeJson(path.join(packageRoot, "visual-grammar.json"), { version: "3.0.0", visual_grammar: [domain("grammar.brand", ["ev-type", "ev-color"])] });
  writeJson(path.join(packageRoot, "conflicts.json"), { version: "3.0.0", conflicts: [{ conflict_id: "conflict-scope", severity: "medium", status: "open", evidence_refs: ["ev-packaging"], candidate_refs: ["token.color"] }] });
  writeFileSync(path.join(packageRoot, "design.md"), "# Candidate design\n");
  writeJson(path.join(packageRoot, "artifact-set.json"), { artifact_set_id: "artifact-set-r009", package_id: "package-r009", status: "draft", artifacts: [], artifact_hashes: {} });
  return packageRoot;
}

test("valid candidate Corpus and Source Pack pass validation", () => {
  const value = fixture();
  const result = validateCorpus({ repositoryRoot: value.root, corpusRoot: value.corpusRoot, sourcePackRoot: value.sourcePackRoot });
  assert.equal(result.status, "pass");
});

test("Corpus schema rejects unknown top-level fields", () => {
  const value = fixture(); const file = path.join(value.corpusRoot, "corpus.json");
  const corpus = readJson(file); corpus.expected_answer = "hidden"; writeJson(file, corpus);
  const result = validateCorpus({ repositoryRoot: value.root, corpusRoot: value.corpusRoot, sourcePackRoot: value.sourcePackRoot });
  assert.equal(result.status, "failed");
  assert.match(result.errors.join("\n"), /schema|unknown field/i);
});

test("capability-only expectations pass the no-Oracle audit", () => {
  const value = fixture();
  assert.equal(validateNoOracle(value.corpusRoot).status, "pass");
});

for (const [name, mutation, expected] of [
  ["exact color answer", (v) => { v.expected_color = "#6f4e37"; }, /color/i],
  ["font answer", (v) => { v.expected_font_family = "Example Sans"; }, /font/i],
  ["component inventory", (v) => { v.expected_component_names = ["CoffeeBagCard"]; }, /component/i],
  ["source-specific answer prompt", (v) => { v.prompt = "For Static Coffee, output the known warm palette answer"; }, /prompt|source-specific/i],
]) test(`no-Oracle rejects ${name}`, () => {
  const value = fixture();
  const file = path.join(value.corpusRoot, "expectations/required-capabilities.json");
  const payload = readJson(file); mutation(payload); writeJson(file, payload);
  assert.match(validateNoOracle(value.corpusRoot).errors.join("\n"), expected);
});

test("no-Oracle rejects a hidden expected design.md", () => {
  const value = fixture();
  writeFileSync(path.join(value.corpusRoot, "expectations/design.md"), "# Hidden answer\n");
  assert.match(validateNoOracle(value.corpusRoot).errors.join("\n"), /design\.md/i);
});

test("automatic score reports auditable metrics and leaves human judgment pending", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  const score = calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot });
  assert.equal(score.status, "pending-human-review");
  assert.equal(score.maximum_score, 75);
  assert.equal(score.hard_gates.status, "pass");
  assert.ok(score.modules.every((module) => module.mechanism && Array.isArray(module.evidence)));
});

test("automatic Evidence completeness can be derived from Source and Region metadata", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  const file = path.join(packageRoot, "evidence-map.json"); const map = readJson(file);
  map.evidence = [{ evidence_id: "ev-packaging", source_id: "source-1", evidence_type: "screenshot", status: "current" }];
  writeJson(file, map);
  const score = calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot });
  const completeness = score.modules.find((item) => item.module_id === "evidence-completeness");
  assert.ok(completeness.score > 0);
  assert.ok(completeness.evidence.some((item) => item.includes("region-1")));
});

test("empty domain artifacts do not receive Domain coverage credit", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  writeJson(path.join(packageRoot, "layout-rules.json"), { version: "3.0.0", layout_rules: [] });
  writeJson(path.join(packageRoot, "visual-grammar.json"), { version: "3.0.0", visual_grammar: [] });
  const score = calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot });
  const coverage = score.modules.find((item) => item.module_id === "domain-coverage");
  assert.equal(coverage.evidence.includes("layout-rules.json"), false);
  assert.equal(coverage.evidence.includes("visual-grammar.json"), false);
  assert.ok(coverage.score < coverage.weight);
});

test("human score merge requires reviewer identity", () => {
  const value = fixture(); const automatic = calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot: packageFixture(value.root) });
  assert.throws(() => mergeHumanScore(automatic, { reviewer: "", reviewed_at: "2026-07-15", scores: [] }), /reviewer/i);
});

test("completed human score merges without changing automatic module evidence", () => {
  const value = fixture(); const automatic = calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot: packageFixture(value.root) });
  const scores = ["brand-system-coherence", "typography-system-interpretation", "color-system-interpretation", "cross-application-consistency", "visual-grammar-usefulness", "presentation-grammar-usefulness", "possible-intent-discipline", "overall-usefulness"].map((module_id) => ({ module_id, score: 4, reason: "Evidence-bounded review", artifact_refs: ["tokens.json"], evidence_refs: ["ev-color"] }));
  const merged = mergeHumanScore(automatic, { reviewer: "authorized-reviewer", reviewed_at: "2026-07-15", scores });
  assert.equal(merged.status, "strong-pass");
  assert.equal(merged.maximum_score, 100);
  assert.deepEqual(merged.automatic.modules, automatic.modules);
});

test("scope isolation detects Behance UI and mockup background promotion", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  const tokensFile = path.join(packageRoot, "tokens.json"); const tokens = readJson(tokensFile);
  tokens.tokens.push({ ...tokens.tokens[0], domain_id: "token.behance-nav", scope: "workspace", source_class: "behance-platform-ui" });
  tokens.tokens.push({ ...tokens.tokens[0], domain_id: "token.mockup-wall", scope: "workspace", source_class: "mockup-environment" });
  writeJson(tokensFile, tokens);
  const report = auditScopeIsolation(packageRoot);
  assert.equal(report.status, "blocked");
  assert.equal(report.findings.length, 2);
});

test("raw Host output stored as Evidence blocks scoring", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  const file = path.join(packageRoot, "evidence-map.json"); const map = readJson(file);
  map.evidence.push({ evidence_id: "ev-raw", source_id: "host", evidence_type: "raw-host-output", status: "current" }); writeJson(file, map);
  assert.equal(calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot }).hard_gates.status, "blocked");
});

test("unknown Conflict provenance references block automatic scoring", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  const tokensFile = path.join(packageRoot, "tokens.json"); const tokens = readJson(tokensFile);
  tokens.tokens[0].conflict_refs = ["conflict-does-not-exist"]; writeJson(tokensFile, tokens);
  const score = calculateAutomaticScore({ corpusRoot: value.corpusRoot, packageRoot });
  assert.equal(score.hard_gates.status, "blocked");
  assert.ok(score.traceability.failed_domain_ids.includes(tokens.tokens[0].domain_id));
});

test("possible intent remains a Claim and optional presentation grammar is accepted", () => {
  const value = fixture(); const packageRoot = packageFixture(value.root);
  writeJson(path.join(packageRoot, "presentation-grammar.json"), { status: "candidate", evidence_refs: ["ev-presentation"] });
  writeFileSync(path.join(packageRoot, "design-rationale.md"), "Observation: packaging repetition\nEvidence: ev-packaging\nPossible Design Intent: likely consistency\nConfidence: 0.7\nAlternative Interpretation: mockup convention\nReview Status: candidate\n");
  const run = validateBenchmarkRun({ corpus_id: "l2-brand-static-coffee-v1", corpus_version: "1.0.0", rubric_version: "1.0.0", source_pack_id: "static-coffee-source-pack-v1", runtime: { version: "0.4.0-rc.1", protocol_version: "1.1", schema_version: "3.0.0" }, host: { agent: "Codex", engine: "GPT-5", vision_capability: true }, instruction_hash: sha("instruction"), source_pack_hash: sha("source-pack"), package_path: packageRoot });
  assert.equal(run.status, "pass");
});

test("missing Source Pack hash fails run validation", () => {
  assert.throws(() => validateBenchmarkRun({ corpus_id: "l2-brand-static-coffee-v1", corpus_version: "1.0.0", rubric_version: "1.0.0", source_pack_id: "static-coffee-source-pack-v1", runtime: {}, host: {}, instruction_hash: sha("instruction"), package_path: "package" }), /source.pack.hash/i);
});

test("compatible run comparison detects overall and module regression", () => {
  const baseline = { corpus_id: "c", corpus_version: "1", source_pack_hash: sha("s"), rubric_version: "1", overall_score: 90, modules: [{ module_id: "provenance", score: 15 }] };
  const current = { ...baseline, overall_score: 84, modules: [{ module_id: "provenance", score: 4 }] };
  const result = compareBenchmarkRuns(baseline, current);
  assert.equal(result.status, "regression");
  assert.ok(result.reasons.length >= 2);
});

test("comparison reports Evidence, provenance, scope, conflict and Artifact-domain changes", () => {
  const baseline = {
    corpus_id: "c", corpus_version: "1", source_pack_hash: sha("s"), rubric_version: "1", overall_score: 90,
    modules: [{ module_id: "evidence-completeness", score: 15, evidence: ["source:a", "source:b"] }, { module_id: "domain-coverage", score: 15, evidence: ["tokens.json", "visual-grammar.json"] }],
    traceability: { failed_domain_ids: [] }, scope_isolation: { status: "pass", findings: [] }, conflicts: { open_high_impact: 0 }, hard_gates: { status: "pass" },
  };
  const current = {
    ...baseline, overall_score: 80,
    modules: [{ module_id: "evidence-completeness", score: 10, evidence: ["source:a"] }, { module_id: "domain-coverage", score: 10, evidence: ["tokens.json"] }],
    traceability: { failed_domain_ids: ["token.missing"] }, scope_isolation: { status: "blocked", findings: [{ domain_id: "token.platform" }] }, conflicts: { open_high_impact: 1 }, hard_gates: { status: "blocked" },
  };
  const result = compareBenchmarkRuns(baseline, current);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence_coverage.change, -1);
  assert.deepEqual(result.artifact_domains.removed, ["visual-grammar.json"]);
  assert.equal(result.traceability.new_failures, 1);
  assert.equal(result.conflicts.open_high_impact_change, 1);
  assert.equal(result.scope_contamination.newly_blocked, true);
});

test("incompatible Corpus versions cannot be compared", () => {
  const baseline = { corpus_id: "c", corpus_version: "1", source_pack_hash: sha("s"), rubric_version: "1", overall_score: 80, modules: [] };
  assert.throws(() => compareBenchmarkRuns(baseline, { ...baseline, corpus_version: "2" }), /compatible|corpus version/i);
});

test("first baseline snapshot is immutable and has no fictional comparison", () => {
  const value = fixture(); const snapshot = path.join(value.corpusRoot, "snapshots/baseline.json");
  mkdirSync(path.dirname(snapshot), { recursive: true });
  const run = { run_id: "run-static-coffee-001", corpus_id: "l2-brand-static-coffee-v1", status: "baseline-established", run_hash: sha("run") };
  const result = createBaselineSnapshot({ snapshotFile: snapshot, run });
  assert.equal(result.previous_run_id, null);
  assert.throws(() => createBaselineSnapshot({ snapshotFile: snapshot, run }), /overwrite|exists/i);
});

test("an explicit pending baseline slot can be established once", () => {
  const value = fixture(); const snapshot = path.join(value.corpusRoot, "snapshots/baseline.json");
  writeJson(snapshot, { corpus_id: "l2-brand-static-coffee-v1", status: "pending-human-review", baseline_run_id: null, run_hash: null, established_at: null, previous_run_id: null });
  const run = { run_id: "run-static-coffee-001", corpus_id: "l2-brand-static-coffee-v1", status: "baseline-established", run_hash: sha("run"), established_at: "2026-07-15T10:00:00Z" };
  assert.equal(createBaselineSnapshot({ snapshotFile: snapshot, run }).baseline_run_id, run.run_id);
  assert.throws(() => createBaselineSnapshot({ snapshotFile: snapshot, run }), /overwrite|exists|immutable/i);
});

test("Corpus and no-Oracle CLIs expose machine-readable validation", () => {
  const value = fixture();
  const corpus = spawnSync(process.execPath, [path.join(REPO, "scripts/benchmarks/validate-corpus.mjs"), value.root, value.corpusRoot, value.sourcePackRoot], { encoding: "utf8" });
  assert.equal(corpus.status, 0, corpus.stderr || corpus.stdout);
  assert.equal(JSON.parse(corpus.stdout).status, "pass");
  const oracle = spawnSync(process.execPath, [path.join(REPO, "scripts/benchmarks/validate-no-oracle.mjs"), value.corpusRoot], { encoding: "utf8" });
  assert.equal(oracle.status, 0, oracle.stderr || oracle.stdout);
  assert.equal(JSON.parse(oracle.stdout).status, "pass");
});

test("live benchmark harness invokes an installed CLI and never imports private runtime", () => {
  const source = readFileSync(path.join(REPO, "scripts/benchmarks/run-benchmark.mjs"), "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:runtime|realization)\//);
  assert.match(source, /recraft-interop/);
  assert.match(source, /spawn/);
  assert.match(source, /installed/i);
});

test("benchmark Host audit identity is separated from the strict interop Envelope", () => {
  const host = toInteropHost({ agent: "Codex", engine: "GPT-5", capabilities: ["vision"], vision_capability: true, audit_note: "benchmark-only" });
  assert.deepEqual(host, { agent: "Codex", engine: "GPT-5", capabilities: ["vision"] });
});

test("Behance Source Pack selection excludes platform and recommendation images", () => {
  const assets = [
    { kind: "img", url: "https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/a251828539.png" },
    { kind: "img", url: "https://mir-s3-cdn-cf.behance.net/projects/original/recommendation.png" },
    { kind: "img", url: "https://a5.behance.net/img/project/tools/illustrator.png" },
  ];
  assert.deepEqual(selectBehanceProjectModuleUrls(assets, "251828539"), ["https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/a251828539.png"]);
});

test("project module downloader uses the configured proxy transport", async () => {
  const capture = await import("../scripts/benchmarks/capture-source-pack.mjs");
  assert.equal(capture.selectDownloadTransport?.({ HTTPS_PROXY: "http://127.0.0.1:7890" }), "curl");
  assert.equal(capture.selectDownloadTransport?.({}), "fetch");
});

test("direct project module download returns bytes without requiring an output path", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(Buffer.from("project-module"), { status: 200 });
  try {
    assert.equal((await downloadProjectModule("https://example.com/project-module.webp", {})).toString(), "project-module");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("captured module metadata follows WebP bytes instead of a misleading URL suffix", async () => {
  const capture = await import("../scripts/benchmarks/capture-source-pack.mjs");
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii"); bytes.writeUInt32LE(22, 4); bytes.write("WEBP", 8, "ascii"); bytes.write("VP8X", 12, "ascii");
  bytes.writeUIntLE(1399, 24, 3); bytes.writeUIntLE(899, 27, 3);
  assert.deepEqual(capture.detectImageMetadata?.(bytes), { format: "webp", extension: ".webp", width: 1400, height: 900 });
});
