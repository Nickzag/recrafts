import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { assertGateReport, assertGovernanceObject } from "../packages/recrafts-design/src/schema_runtime.mjs";
import { compareVersions, compileDesignIr, parseDesignMd, semanticDesignIrHashInput } from "../packages/recrafts-design/index.mjs";
import { renderDesignPreview, validatePreviewIntegrity } from "./design_preview_renderer.mjs";
import { validateOwnerDecisionReceipt } from "./design_owner_decision.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => access(file).then(() => true).catch(() => false);
const jsonBytes = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const reportHashValid = (report) => { const { report_sha256: declared, ...body } = report; return declared === sha256(JSON.stringify(body)); };

async function initializeStore(root) {
  for (const directory of ["releases", "versions", "evidence", "candidates", "decisions", "gates", "rollbacks"]) await mkdir(path.join(root, directory), { recursive: true });
}

function splitDesignSource(source) {
  if (!source.startsWith("---\n")) throw new Error("Design source Front Matter is missing");
  const end = source.indexOf("\n---\n", 4);
  if (end < 0) throw new Error("Design source Front Matter is not closed");
  return { frontMatter: parseYaml(source.slice(4, end)), markdown: source.slice(end + 5) };
}

function acceptedDesignSource(source, { releaseId, version, parentReleaseId, decisionRevision }) {
  const { frontMatter, markdown } = splitDesignSource(source);
  const accepted = { ...frontMatter, version, status: "accepted", release_id: releaseId, parent_release: parentReleaseId, decision_revision: decisionRevision, agent_usable: true };
  return `---\n${stringifyYaml(accepted).trimEnd()}\n---\n${markdown}`;
}

function semanticIrSha(source) {
  return sha256(JSON.stringify(semanticDesignIrHashInput(compileDesignIr(parseDesignMd(source)))));
}

async function writeExclusiveJson(file, value) {
  const bytes = jsonBytes(value);
  if (await exists(file)) {
    if (await readFile(file, "utf8") !== bytes) throw new Error(`Immutable governance artifact collision: ${path.basename(file)}`);
    return;
  }
  await writeFile(file, bytes, { flag: "wx" });
}

async function reserveIdentity(root, releaseId, version, parentReleaseId) {
  const releasePath = path.join(root, "releases", releaseId);
  const versionPath = path.join(root, "versions", version);
  if (await exists(releasePath)) throw new Error(`duplicate Release ID: ${releaseId}`);
  if (await exists(versionPath)) throw new Error(`duplicate version: ${version}`);
  const releases = await readdir(path.join(root, "releases"));
  if (parentReleaseId === null && releases.length) throw new Error("A non-initial Release requires a parent");
  if (parentReleaseId !== null) {
    if (!(await exists(path.join(root, "releases", parentReleaseId, "release.json")))) throw new Error(`Parent Release does not exist: ${parentReleaseId}`);
    const parent = await loadAndValidateRelease(root, parentReleaseId);
    if (compareVersions(parent.version, version) !== 1) throw new Error("Release version must increase from parent");
  }
  await mkdir(versionPath, { recursive: false });
  await writeFile(path.join(versionPath, "release-id"), `${releaseId}\n`, { flag: "wx" });
  return releasePath;
}


async function cleanupVersionReservation(root, releasePath, versionPath) {
  try { if (releasePath) await rm(releasePath, { recursive: true, force: true }); } catch {}
  try { if (versionPath) await rm(versionPath, { recursive: true, force: true }); } catch {}
}
async function writeIndex(root) {
  const ids = (await readdir(path.join(root, "releases"))).filter((id) => !id.startsWith(".staging-"));
  const releases = [];
  for (const id of ids) {
    const release = await readJson(path.join(root, "releases", id, "release.json"));
    releases.push({ release_id: release.release_id, version: release.version, parent_release: release.parent_release, release_kind: release.release_kind, release_sha256: release.release_sha256 });
  }
  releases.sort((left, right) => -compareVersions(left.version, right.version));
  const index = { schema: "recrafts.design-release-index/v1", releases };
  const temporary = path.join(root, `release-index.next-${randomUUID()}.json`);
  await writeFile(temporary, jsonBytes(index), { flag: "wx" });
  await rename(temporary, path.join(root, "release-index.json"));
}

async function persistRelease({ root, releasePath, releaseBody, artifacts }) {
  const staging = path.join(root, "releases", `.staging-${releaseBody.release_id}-${randomUUID()}`);
  await mkdir(staging, { recursive: false });
  const artifactHashes = {};
  for (const [file, value] of Object.entries(artifacts)) {
    const bytes = typeof value === "string" ? value : jsonBytes(value);
    await writeFile(path.join(staging, file), bytes, { flag: "wx" });
    artifactHashes[file] = sha256(bytes);
  }
  const body = { ...releaseBody, artifact_hashes: artifactHashes };
  const release = { ...body, release_sha256: sha256(JSON.stringify(body)) };
  assertGovernanceObject("designRelease", release);
  await writeFile(path.join(staging, "release.json"), jsonBytes(release), { flag: "wx" });
  await rename(staging, releasePath);
  await writeIndex(root);
  return release;
}

export async function loadAndValidateRelease(storeDirectory, releaseId) {
  const directory = path.join(storeDirectory, "releases", releaseId);
  const release = await readJson(path.join(directory, "release.json"));
  assertGovernanceObject("designRelease", release);
  const { release_sha256: declared, ...body } = release;
  if (declared !== sha256(JSON.stringify(body))) throw new Error("Design Release hash indicates tampering");
  for (const [file, expected] of Object.entries(release.artifact_hashes)) if (sha256(await readFile(path.join(directory, file))) !== expected) throw new Error(`Immutable Design Release artifact hash mismatch: ${file}`);
  const designSource = await readFile(path.join(directory, "design.md"), "utf8");
  const previewHtml = await readFile(path.join(directory, "preview.html"), "utf8");
  if (sha256(designSource) !== release.release_design_sha256) throw new Error("Design Release design.md hash mismatch");
  const document = parseDesignMd(designSource);
  if (document.frontMatter.release_id !== release.release_id || document.frontMatter.version !== release.version || document.frontMatter.status !== "accepted" || document.frontMatter.agent_usable !== true) throw new Error("Design Release public Front Matter invariant failed");
  if (semanticIrSha(designSource) !== release.semantic_ir_sha256) throw new Error("Design Release semantic IR hash mismatch");
  const preview = validatePreviewIntegrity({ designSource, html: previewHtml });
  if (preview.metadata.preview_artifact_sha256 !== release.preview_artifact_sha256) throw new Error("Design Release Preview binding failed");
  return release;
}

export async function createDesignRelease({ storeDirectory, releaseId, version, parentReleaseId, candidate, designSource, gateAReport, gateBReport, decisionReceipt }) {
  await initializeStore(storeDirectory);
  assertGovernanceObject("candidate", candidate);
  assertGateReport("gateA", gateAReport); assertGateReport("gateB", gateBReport);
  validateOwnerDecisionReceipt({ receipt: decisionReceipt, candidate, gateAReport, gateBReport });
  if (!reportHashValid(gateAReport) || !reportHashValid(gateBReport) || gateAReport.verdict !== "PASS" || gateBReport.verdict !== "PASS") throw new Error("Design Release requires valid PASS Gate reports");
  if (sha256(designSource) !== candidate.design_sha256) throw new Error("Candidate design.md hash binding failed");
  const candidateIr = compileDesignIr(parseDesignMd(designSource));
  if (sha256(JSON.stringify(candidateIr)) !== candidate.design_ir_sha256) throw new Error("Candidate Design IR hash binding failed");
  const releasePath = await reserveIdentity(storeDirectory, releaseId, version, parentReleaseId);
  const versionPath = path.join(storeDirectory, "versions", version);
  try {
  const releaseDesign = acceptedDesignSource(designSource, { releaseId, version, parentReleaseId, decisionRevision: decisionReceipt.decision_id });
  const preview = renderDesignPreview({ designSource: releaseDesign, generatedAt: decisionReceipt.imported_at });
  validatePreviewIntegrity({ designSource: releaseDesign, html: preview.html });
  const artifacts = {
    "design.md": releaseDesign, "preview.html": preview.html, "candidate.json": candidate,
    "gate-a.json": gateAReport, "gate-b.json": gateBReport, "owner-decision-receipt.json": decisionReceipt
  };
  const releaseBody = {
    schema: "recrafts.design-release/v2", release_id: releaseId, version, release_kind: "promotion", status: "accepted", agent_usable: true,
    parent_release: parentReleaseId, candidate_revision: candidate.id, evidence_revision: candidate.evidence_revision, decision_revision: decisionReceipt.decision_id,
    candidate_design_sha256: candidate.design_sha256, release_design_sha256: sha256(releaseDesign), semantic_ir_sha256: semanticIrSha(releaseDesign),
    preview_artifact_sha256: preview.integrity.preview_artifact_sha256, gate_a_report_sha256: gateAReport.report_sha256, gate_b_report_sha256: gateBReport.report_sha256,
    decision_receipt_sha256: decisionReceipt.receipt_sha256, created_at: decisionReceipt.imported_at, immutable: true
  };
  const release = await persistRelease({ root: storeDirectory, releasePath, releaseBody, artifacts }).catch(async (e) => { await cleanupVersionReservation(storeDirectory, releasePath, versionPath); throw e; });
  await writeExclusiveJson(path.join(storeDirectory, "candidates", `${candidate.id}.json`), candidate);
  await writeExclusiveJson(path.join(storeDirectory, "decisions", `${decisionReceipt.decision_id}.json`), decisionReceipt);
  await writeExclusiveJson(path.join(storeDirectory, "gates", `${gateAReport.report_sha256}.json`), gateAReport);
  await writeExclusiveJson(path.join(storeDirectory, "gates", `${gateBReport.report_sha256}.json`), gateBReport);
  await writeExclusiveJson(path.join(storeDirectory, "evidence", `${candidate.evidence_revision}.json`), { schema: "recrafts.release-evidence-binding/v1", evidence_revision: candidate.evidence_revision, gate_a_artifact_hashes: gateAReport.artifact_hashes });
  return release;
  } catch (e) { await cleanupVersionReservation(storeDirectory, releasePath, versionPath); throw e; }
}

export async function rollbackDesignRelease({ storeDirectory, currentReleaseId, targetReleaseId, newReleaseId, newVersion, rollbackDecision }) {
  await initializeStore(storeDirectory);
  assertGovernanceObject("rollbackDecision", rollbackDecision);
  if (rollbackDecision.current_release !== currentReleaseId || rollbackDecision.target_release !== targetReleaseId || rollbackDecision.new_release_id !== newReleaseId || rollbackDecision.new_version !== newVersion) throw new Error("Rollback Decision exact Release binding failed");
  const current = await loadAndValidateRelease(storeDirectory, currentReleaseId);
  const target = await loadAndValidateRelease(storeDirectory, targetReleaseId);
  if (compareVersions(current.version, newVersion) !== 1) throw new Error("Rollback must create a higher new version");
  const rPath = await reserveIdentity(storeDirectory, newReleaseId, newVersion, currentReleaseId);
  const vPath = path.join(storeDirectory, "versions", newVersion);
  try {
  const targetDirectory = path.join(storeDirectory, "releases", targetReleaseId);
  const targetDesign = await readFile(path.join(targetDirectory, "design.md"), "utf8");
  const rollbackDesign = acceptedDesignSource(targetDesign, { releaseId: newReleaseId, version: newVersion, parentReleaseId: currentReleaseId, decisionRevision: rollbackDecision.decision_id });
  if (semanticIrSha(rollbackDesign) !== target.semantic_ir_sha256) throw new Error("Rollback semantic content differs from target; historical Gate PASS cannot be inherited");
  const gateA = await readJson(path.join(targetDirectory, "gate-a.json"));
  const gateB = await readJson(path.join(targetDirectory, "gate-b.json"));
  assertGateReport("gateA", gateA); assertGateReport("gateB", gateB);
  if (!reportHashValid(gateA) || !reportHashValid(gateB) || gateA.report_sha256 !== target.gate_a_report_sha256 || gateB.report_sha256 !== target.gate_b_report_sha256) throw new Error("Rollback target Gate Artifact binding failed");
  const preview = renderDesignPreview({ designSource: rollbackDesign, generatedAt: rollbackDecision.decided_at });
  const decisionHash = sha256(jsonBytes(rollbackDecision));
  const artifacts = { "design.md": rollbackDesign, "preview.html": preview.html, "gate-a.json": gateA, "gate-b.json": gateB, "rollback-decision.json": rollbackDecision };
  const releaseBody = {
    schema: "recrafts.design-release/v2", release_id: newReleaseId, version: newVersion, release_kind: "rollback", status: "accepted", agent_usable: true,
    parent_release: currentReleaseId, candidate_revision: target.candidate_revision, evidence_revision: target.evidence_revision, decision_revision: rollbackDecision.decision_id,
    candidate_design_sha256: target.candidate_design_sha256, release_design_sha256: sha256(rollbackDesign), semantic_ir_sha256: target.semantic_ir_sha256,
    preview_artifact_sha256: preview.integrity.preview_artifact_sha256, gate_a_report_sha256: target.gate_a_report_sha256, gate_b_report_sha256: target.gate_b_report_sha256,
    decision_receipt_sha256: decisionHash, reused_gate_artifacts_from: targetReleaseId,
    rollback: { decision_id: rollbackDecision.decision_id, source_release: currentReleaseId, target_release: targetReleaseId },
    created_at: rollbackDecision.decided_at, immutable: true
  };
  const release = await persistRelease({ root: storeDirectory, releasePath: rPath, releaseBody, artifacts });
  await writeExclusiveJson(path.join(storeDirectory, "rollbacks", `${rollbackDecision.decision_id}.json`), rollbackDecision);
  return release;
  } catch (e) { await cleanupVersionReservation(storeDirectory, rPath, vPath); throw e; }
}
