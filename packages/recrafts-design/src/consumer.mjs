import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { assertGateReport, assertGovernanceObject } from "./schema_runtime.mjs";
import { compileDesignIr, semanticDesignIrHashInput } from "./compiler.mjs";
import { parseDesignMd } from "./parser.mjs";

const ZERO_HASH = "0".repeat(64);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (file) => {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { throw new Error(`Design Release JSON integrity failed for ${path.basename(file)}: ${error.message}`); }
};
const reportHashValid = (report) => { const { report_sha256: declared, ...body } = report; return declared === sha256(JSON.stringify(body)); };

function verifyPreviewArtifact(html, designSource, expectedArtifactHash) {
  const match = html.match(/<script id="recrafts-preview-integrity" type="application\/json">([^<]+)<\/script>/);
  if (!match) throw new Error("Design Release Preview integrity metadata is missing");
  const metadata = JSON.parse(match[1]);
  if (metadata.design_sha256 !== sha256(designSource) || metadata.preview_artifact_sha256 !== expectedArtifactHash) throw new Error("Design Release Preview binding failed");
  const canonical = html.replace(/"preview_artifact_sha256":"[a-f0-9]{64}"/, `"preview_artifact_sha256":"${ZERO_HASH}"`);
  if (sha256(canonical) !== expectedArtifactHash) throw new Error("Design Release Preview artifact hash mismatch");
}

export async function loadDesignRelease({ releaseDirectory, expectedReleaseId, expectedVersion }) {
  if (!releaseDirectory || !expectedReleaseId || !expectedVersion) throw new Error("Design Release consumer requires an exact release ID and version lock");
  const release = await readJson(path.join(releaseDirectory, "release.json"));
  assertGovernanceObject("designRelease", release);
  if (release.release_id !== expectedReleaseId || release.version !== expectedVersion) throw new Error("Design Release consumer lock mismatch");
  const { release_sha256: declaredReleaseHash, ...releaseBody } = release;
  if (declaredReleaseHash !== sha256(JSON.stringify(releaseBody))) throw new Error("Design Release metadata hash indicates tampering");
  for (const [file, expected] of Object.entries(release.artifact_hashes)) if (sha256(await readFile(path.join(releaseDirectory, file))) !== expected) throw new Error(`Design Release artifact hash mismatch: ${file}`);
  const designSource = await readFile(path.join(releaseDirectory, "design.md"), "utf8");
  const previewHtml = await readFile(path.join(releaseDirectory, "preview.html"), "utf8");
  if (sha256(designSource) !== release.release_design_sha256) throw new Error("Design Release design.md hash mismatch");
  const document = parseDesignMd(designSource);
  if (document.frontMatter.status !== "accepted" || document.frontMatter.agent_usable !== true || document.frontMatter.release_id !== release.release_id || document.frontMatter.version !== release.version || document.frontMatter.decision_revision !== release.decision_revision) throw new Error("Accepted Design Release invariant failed");
  const ir = compileDesignIr(document);
  if (sha256(JSON.stringify(semanticDesignIrHashInput(ir))) !== release.semantic_ir_sha256) throw new Error("Design Release semantic IR hash mismatch");
  verifyPreviewArtifact(previewHtml, designSource, release.preview_artifact_sha256);
  const gateA = await readJson(path.join(releaseDirectory, "gate-a.json"));
  const gateB = await readJson(path.join(releaseDirectory, "gate-b.json"));
  assertGateReport("gateA", gateA); assertGateReport("gateB", gateB);
  if (!reportHashValid(gateA) || !reportHashValid(gateB) || gateA.verdict !== "PASS" || gateB.verdict !== "PASS" || gateA.report_sha256 !== release.gate_a_report_sha256 || gateB.report_sha256 !== release.gate_b_report_sha256) throw new Error("Design Release Gate Artifact binding failed");
  if (release.release_kind === "promotion") {
    const receiptFile = (await readdir(releaseDirectory)).find((f) => f.endsWith(".receipt.json"));
  if (!receiptFile) throw new Error("Design Release Owner Decision receipt is missing");
  const receipt = await readJson(path.join(releaseDirectory, receiptFile));
    assertGovernanceObject("ownerDecisionReceipt", receipt);
    const { receipt_sha256: declared, ...body } = receipt;
    if (declared !== sha256(JSON.stringify(body)) || receipt.receipt_sha256 !== release.decision_receipt_sha256 || receipt.candidate_revision !== release.candidate_revision || receipt.gate_a_report_sha256 !== release.gate_a_report_sha256 || receipt.gate_b_report_sha256 !== release.gate_b_report_sha256) throw new Error("Design Release Owner Decision binding failed");
  } else {
    const rollback = await readFile(path.join(releaseDirectory, "rollback-decision.json"));
    if (sha256(rollback) !== release.decision_receipt_sha256) throw new Error("Rollback Decision binding failed");
  }
  return { release, document, ir, designSource, previewHtml };
}
