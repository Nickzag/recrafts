import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseDesignMd, compileDesignIr, loadDesignRelease, validateDesign } from "../packages/recrafts-design/index.mjs";
import { renderDesignPreview } from "./design_preview_renderer.mjs";
import { compareDesignCandidates, compareDesignReleases } from "./design_compare.mjs";
import { evaluateDesignCoherence } from "./design_coherence_gate.mjs";
import { evaluateSourceFidelity } from "./design_fidelity_gate.mjs";
import { validateCandidateIsolation } from "./design_qualification.mjs";
import { importDesignOwnerDecision } from "./design_owner_decision.mjs";
import { createDesignRelease, rollbackDesignRelease } from "./design_release_store.mjs";
import { resolveSafeInput, resolveSafeOutput, resolveWorkingRoot } from "./path_security.mjs";

export const DESIGN_OPERATIONS = ["parse-design-md", "compile-design-ir", "validate-design", "verify-source-fidelity", "render-design-preview", "compare-design-candidates", "import-design-owner-decision", "create-design-release", "validate-design-release", "rollback-design-release", "compare-design-releases"];

export function semanticCandidateArtifactSha256(candidate) {
  const { artifact_sha256: _declared, ...content } = candidate;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
async function inputFile(value, root) { return resolveSafeInput({ value, workingRoot: root, allowedTypes: ["file"] }); }
async function inputDirectory(value, root) { return resolveSafeInput({ value, workingRoot: root, allowedTypes: ["directory"] }); }
async function outputDirectory(value, root, inputs = []) { const output = await resolveSafeOutput({ value, workingRoot: root, inputs }); await mkdir(output, { recursive: true }); return output; }
const artifact = (type, file, root) => ({ type, path: path.relative(root, file).split(path.sep).join("/") });

export async function executeDesignOperation(request, workingRoot) {
  workingRoot = await resolveWorkingRoot(workingRoot);
  if (!DESIGN_OPERATIONS.includes(request.operation)) throw Object.assign(new Error("Design operation is not supported"), { code: "OPERATION_UNSUPPORTED" });
  const input = request.input ?? {};
  if (["parse-design-md", "compile-design-ir", "render-design-preview"].includes(request.operation)) {
    const designFile = await inputFile(input.design_file, workingRoot);
    const designSource = await readFile(designFile, "utf8");
    const document = parseDesignMd(designSource);
    if (request.operation === "parse-design-md") return { status: "completed", artifacts: [], validation: { schema: document.frontMatter.schema, sections: document.sections.length, status: document.frontMatter.status } };
    const ir = compileDesignIr(document);
    if (request.operation === "compile-design-ir") return { status: "completed", artifacts: [], validation: ir };
    const output = await outputDirectory(request.output_directory, workingRoot, [designFile]);
    const rendered = renderDesignPreview({ designSource });
    const previewFile = path.join(output, "preview.html");
    await writeFile(previewFile, rendered.html);
    return { status: "completed", artifacts: [artifact("design-preview", previewFile, workingRoot)], validation: rendered.integrity };
  }
  if (request.operation === "validate-design") {
    const [designFile, candidateFile, previewFile] = await Promise.all([inputFile(input.design_file, workingRoot), inputFile(input.candidate_file, workingRoot), inputFile(input.preview_file, workingRoot)]);
    const [designSource, candidate, previewHtml] = await Promise.all([readFile(designFile, "utf8"), readJson(candidateFile), readFile(previewFile, "utf8")]);
    let browserEvidence = null;
    let browserEvidenceRoot = null;
    if (input.browser_evidence_file) {
      const bevFile = await inputFile(input.browser_evidence_file, workingRoot);
      browserEvidence = await readJson(bevFile);
      browserEvidenceRoot = path.dirname(bevFile);
    }
    const designIntelligence = input.design_intelligence_file ? await readJson(await inputFile(input.design_intelligence_file, workingRoot)) : null;
    validateDesign(parseDesignMd(designSource));
    return { status: "completed", artifacts: [], validation: await evaluateDesignCoherence({ candidate, designSource, previewHtml, browserEvidence, browserEvidenceRoot, productionGate: true, designIntelligence, requireDesignIntelligence: input.qualification_profile === "r013-evidence-grounded" }) };
  }

  if (request.operation === "verify-source-fidelity") {
    const candidateFile = await inputFile(input.candidate_file, workingRoot);
    const candidate = await readJson(candidateFile);
    const artifacts = {};
    for (const name of ["source_manifest", "region_set", "measurement_set", "source_token_set", "reconstruction", "comparison_report", "geometry_report"]) {
      if (input[`${name}_file`]) {
        const f = await inputFile(input[`${name}_file`], workingRoot);
        artifacts[name] = { path: f, sha256: (await import("node:crypto")).createHash("sha256").update(await readFile(f)).digest("hex") };
      }
    }
    const visualFiles = {};
    if (input.source_visual_file) visualFiles.source_visual = await inputFile(input.source_visual_file, workingRoot);
    if (input.reconstruction_visual_file) visualFiles.reconstruction_visual = await inputFile(input.reconstruction_visual_file, workingRoot);
    if (input.overlay_visual_file) visualFiles.overlay_visual = await inputFile(input.overlay_visual_file, workingRoot);
    const designIntelligence = input.design_intelligence_file ? await readJson(await inputFile(input.design_intelligence_file, workingRoot)) : null;
    const report = await evaluateSourceFidelity({ candidate, artifacts, visualFiles: Object.keys(visualFiles).length ? visualFiles : null, designIntelligence }, { productionGate: input.production_gate !== false, requireDesignIntelligence: input.qualification_profile === "r013-evidence-grounded" });
    return { status: "completed", artifacts: [], validation: report };
  }
  if (request.operation === "compare-design-candidates") {
    const file = await inputFile(input.candidates_file, workingRoot);
    const candidates = await readJson(file);
    if (!input.candidate_runs_file) throw Object.assign(new Error("compare-design-candidates requires candidate_runs_file"), { code: "CANDIDATE_RUNS_FILE_REQUIRED" });
    const runsData = await readJson(await inputFile(input.candidate_runs_file, workingRoot));
    if (!input.canonical_allowed_input_manifest_sha256) throw Object.assign(new Error("compare-design-candidates requires canonical_allowed_input_manifest_sha256"), { code: "MANIFEST_SHA_REQUIRED" });
    const frozenManifestSha = input.canonical_allowed_input_manifest_sha256;
    let manifest = null, manifestHash = null;
    if (input.canonical_allowed_input_manifest) {
      const mf = await inputFile(input.canonical_allowed_input_manifest, workingRoot);
      manifest = await readJson(mf);
      manifestHash = (await import("node:crypto")).createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
      if (manifestHash !== frozenManifestSha) throw Object.assign(new Error(`Authority Manifest SHA mismatch: expected ${frozenManifestSha}, got ${manifestHash}`), { code: "MANIFEST_SHA_MISMATCH" });
    }
    if (!input.target_lock) throw Object.assign(new Error("compare-design-candidates requires target_lock"), { code: "TARGET_LOCK_REQUIRED" });
    if (!input.evidence_revision) throw Object.assign(new Error("compare-design-candidates requires evidence_revision"), { code: "EVIDENCE_REVISION_REQUIRED" });
    const targetLock = input.target_lock;
    const evidenceRev = input.evidence_revision;
    const isolationRuns = runsData;
    for (const run of isolationRuns) {
      if (!run.input_manifest_sha256 || run.input_manifest_sha256 !== frozenManifestSha) throw Object.assign(new Error(`Run input_manifest_sha256 mismatch: expected ${frozenManifestSha}`), { code: "INPUT_MANIFEST_SHA_MISMATCH" });
      if (!run.target_lock || run.target_lock !== targetLock) throw Object.assign(new Error(`Target lock mismatch or missing: expected ${targetLock}`), { code: "TARGET_LOCK_MISMATCH" });
      if (!run.evidence_revision || run.evidence_revision !== evidenceRev) throw Object.assign(new Error(`Evidence revision mismatch or missing: expected ${evidenceRev}`), { code: "EVIDENCE_REVISION_MISMATCH" });
    }
    const candidateList = Array.isArray(candidates) ? candidates : [];
    const candidateIds = new Set(candidateList.map((c) => c.id));
    const runCandidateIds = new Set((isolationRuns || []).map((r) => r.candidate_id));
    const runCounts = new Map();
    for (const run of isolationRuns || []) runCounts.set(run.candidate_id, (runCounts.get(run.candidate_id) || 0) + 1);
    const duplicateRuns = [...runCounts].filter(([,c]) => c > 1).map(([id]) => id);
    if (duplicateRuns.length) throw Object.assign(new Error(`Duplicate runs for candidates: ${duplicateRuns.join(", ")}`), { code: "DUPLICATE_CANDIDATE_RUN" });
    const missingRuns = [...candidateIds].filter((id) => !runCandidateIds.has(id));
    const extraRuns = [...runCandidateIds].filter((id) => !candidateIds.has(id));
    if (missingRuns.length) throw Object.assign(new Error(`Candidate runs missing for: ${missingRuns.join(", ")}`), { code: "CANDIDATE_RUN_MISMATCH" });
    if (extraRuns.length) throw Object.assign(new Error(`Extra candidate runs without candidates: ${extraRuns.join(", ")}`), { code: "CANDIDATE_RUN_MISMATCH" });
    // Bind run output_sha256 to candidate artifact
    const candidateById = new Map(candidateList.map((c) => [c.id, c]));
    for (const run of isolationRuns || []) {
      const cand = candidateById.get(run.candidate_id);
      const candArtifactSha = cand.artifact_sha256;
      if (!candArtifactSha) throw Object.assign(new Error(`Candidate ${run.candidate_id} is missing artifact_sha256`), { code: "CANDIDATE_ARTIFACT_SHA_REQUIRED" });
      if (semanticCandidateArtifactSha256(cand) !== candArtifactSha) throw Object.assign(new Error(`Candidate ${run.candidate_id} artifact_sha256 does not match its canonical content`), { code: "CANDIDATE_ARTIFACT_HASH_MISMATCH" });
      if (!run.output_sha256) throw Object.assign(new Error(`Run ${run.run_id} is missing output_sha256`), { code: "RUN_OUTPUT_SHA_REQUIRED" });
      if (candArtifactSha !== run.output_sha256) throw Object.assign(new Error(`Run output_sha256 ${run.output_sha256} does not match candidate ${run.candidate_id} artifact_sha256 ${candArtifactSha}`), { code: "CANDIDATE_OUTPUT_MISMATCH" });
    }
    const isolation = isolationRuns ? validateCandidateIsolation(isolationRuns, manifest ? { canonicalAllowedInputManifest: manifest, manifestSha256: manifestHash } : {}) : { status: "SKIPPED", compare_authorized: true, failures: [] };
    if (isolation.status !== "PASS") throw Object.assign(new Error(`Candidate isolation failed: ${isolation.failures.join("; ")}`), { code: "ISOLATION_FAILED", isolation });
    const comparison = compareDesignCandidates(Array.isArray(candidates) ? candidates : candidates.candidates || []);
    return { status: "completed", artifacts: [], validation: { ...comparison, isolation } };
  }
  if (request.operation === "import-design-owner-decision") {
    const [decisionFile, candidateFile, gateAFile, gateBFile] = await Promise.all([inputFile(input.decision_file, workingRoot), inputFile(input.candidate_file, workingRoot), inputFile(input.gate_a_report_file, workingRoot), inputFile(input.gate_b_report_file, workingRoot)]);
    const output = await outputDirectory(request.output_directory, workingRoot, [decisionFile, candidateFile, gateAFile, gateBFile]);
    const receipt = await importDesignOwnerDecision({ decisionFile, candidate: await readJson(candidateFile), gateAReport: await readJson(gateAFile), gateBReport: await readJson(gateBFile), outputDirectory: output });
    return { status: "completed", artifacts: [artifact("owner-decision-receipt", path.join(output, `${receipt.decision_id}.receipt.json`), workingRoot)], validation: receipt };
  }
  if (request.operation === "create-design-release") {
    const [store, candidateFile, designFile, gateAFile, gateBFile, receiptFile] = await Promise.all([
      inputDirectory(input.design_store_directory, workingRoot), inputFile(input.candidate_file, workingRoot), inputFile(input.design_file, workingRoot),
      inputFile(input.gate_a_report_file, workingRoot), inputFile(input.gate_b_report_file, workingRoot), inputFile(input.owner_decision_receipt_file, workingRoot)
    ]);
    const release = await createDesignRelease({ storeDirectory: store, releaseId: input.release_id, version: input.version, parentReleaseId: input.parent_release_id, candidate: await readJson(candidateFile), designSource: await readFile(designFile, "utf8"), gateAReport: await readJson(gateAFile), gateBReport: await readJson(gateBFile), decisionReceipt: await readJson(receiptFile) });
    return { status: "completed", artifacts: [artifact("design-release", path.join(store, "releases", release.release_id, "release.json"), workingRoot)], validation: release };
  }
  if (request.operation === "validate-design-release") {
    const store = await inputDirectory(input.design_store_directory, workingRoot);
    const loaded = await loadDesignRelease({ releaseDirectory: path.join(store, "releases", input.release_id), expectedReleaseId: input.release_id, expectedVersion: input.expected_version });
    return { status: "completed", artifacts: [], validation: { valid: true, release_id: loaded.release.release_id, version: loaded.release.version } };
  }
  if (request.operation === "rollback-design-release") {
    const [store, decisionFile] = await Promise.all([inputDirectory(input.design_store_directory, workingRoot), inputFile(input.rollback_decision_file, workingRoot)]);
    const decision = await readJson(decisionFile);
    const release = await rollbackDesignRelease({ storeDirectory: store, currentReleaseId: decision.current_release, targetReleaseId: decision.target_release, newReleaseId: decision.new_release_id, newVersion: decision.new_version, rollbackDecision: decision });
    return { status: "completed", artifacts: [artifact("rollback-design-release", path.join(store, "releases", release.release_id, "release.json"), workingRoot)], validation: release };
  }
  const [current, next, change] = await Promise.all([inputFile(input.current_release_file, workingRoot).then(readJson), inputFile(input.next_release_file, workingRoot).then(readJson), inputFile(input.change_file, workingRoot).then(readJson)]);
  return { status: "completed", artifacts: [], validation: compareDesignReleases({ current, next, change }) };
}
