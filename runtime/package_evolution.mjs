import { createHash } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";
import { validateAcceptanceFinalization } from "./acceptance_finalization.mjs";

const correctionSchema = loadSchema(new URL("../contracts/correction.schema.json", import.meta.url));
const decisionSchema = loadSchema(new URL("../contracts/artifact-decision.schema.json", import.meta.url));
const rollbackSchema = loadSchema(new URL("../contracts/rollback-decision.schema.json", import.meta.url));
const canonicalFiles = ["design.md", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json"];
const optionalR010Files = ["source-observations.json", "core-grammar.json", "themes.json", "templates.json", "accessibility.json", "source-distance-report.json", "preview-coverage.json", "delivery-readiness.json"];
const immutableFiles = ["source-manifest.json", "evidence-map.json", "claims.json"];
const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const identity = (prefix, value) => `${prefix}-${sha(value).slice(0, 16)}`;
const readJson = async (root, file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const writeJson = (root, file, value) => writeFile(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const fail = (message, code = "PACKAGE_INVALID") => { throw Object.assign(new Error(message), { code }); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function appendLifecycleMetadata(design, { title, status, packageId, parentPackageId }) {
  const base = design.trimEnd();
  return `${base}\n\n## ${title}\n\n- status: ${status}\n- package_id: ${packageId}\n- parent_package_id: ${parentPackageId}\n`;
}

export function composeAcceptedDesign(design, { packageId, parentPackageId, deliveryReadiness, ownerDecisionId, artifactSetId }) {
  const lines = design.split("\n");
  const title = lines.shift() || "# Recrafts Design Contract";
  while (lines[0]?.trim() === "") lines.shift();
  while (lines[0] && /^(Version|Status|Package|Delivery target|Delivery readiness|Parent Package|Owner Decision|Artifact Set):/i.test(lines[0].trim())) lines.shift();
  while (lines[0]?.trim() === "") lines.shift();
  let body = lines.join("\n").trim();
  for (const heading of ["Open Questions / Human Decisions", "Correction lineage", "Acceptance lineage", "Acceptance history"]) {
    body = body.replace(new RegExp(`(?:^|\\n)## ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n[\\s\\S]*?(?=\\n## |$)`, "gi"), "").trim();
  }
  return `${title}\n\nVersion: 0.1.0-r010-accepted  \nStatus: accepted  \nPackage: \`${packageId}\`  \nDelivery readiness: ${deliveryReadiness}  \nParent Package: \`${parentPackageId}\`  \nOwner Decision: \`${ownerDecisionId}\`  \nArtifact Set: \`${artifactSetId}\`\n\n${body}\n\n## Acceptance history\n\n- The review-stage authorization question was resolved by Owner Decision \`${ownerDecisionId}\`.\n- This immutable Package finalizes metadata and validation authority without changing portable design contracts.\n`;
}

async function copyPackage(source, output) {
  await mkdir(output, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) await cp(path.join(source, entry.name), path.join(output, entry.name), { recursive: true, force: false, errorOnExist: true });
}

async function appendJsonl(base, file, record) {
  const prior = await readFile(path.join(base, file), "utf8").catch(() => "");
  return `${prior}${JSON.stringify(record)}\n`;
}

export async function canonicalArtifactFiles(root) {
  const optional = [];
  for (const file of optionalR010Files) {
    try { await access(path.join(root, file)); optional.push(file); } catch {}
  }
  return [...canonicalFiles, ...optional];
}

export function deriveAcceptedDeliveryReadiness(delivery, decision) {
  if (delivery.status === "production-ready" && !delivery.production_validation) fail("production-ready requires production validation", "REALIZATION_NOT_AUTHORIZED");
  if (decision.actor_role !== "project-owner") fail("R-010 pilot-ready acceptance requires project-owner visual review", "REALIZATION_NOT_AUTHORIZED");
  const gates = ["identity_legal_gate", "source_distance_gate", "machine_contract_gate", "accessibility_gate", "responsive_gate"];
  if (gates.some((gate) => delivery[gate] !== "pass")) fail("R-010 pilot-ready acceptance requires all validation gates", "REALIZATION_NOT_AUTHORIZED");
  return { ...delivery, status: delivery.production_validation ? "production-ready" : "pilot-ready", owner_visual_review: true };
}

async function hashFiles(root, files = null) {
  files ??= await canonicalArtifactFiles(root);
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha(await readFile(path.join(root, file)))])));
}

function matchesBefore(target, before) {
  if (before === null || typeof before !== "object" || Array.isArray(before)) return same(target, before);
  return Object.entries(before).every(([key, value]) => same(target?.[key], value));
}

function mergeAfter(target, after) {
  if (after === null || typeof after !== "object" || Array.isArray(after)) return after;
  return { ...target, ...after };
}

function findDomain(collections, targetId) {
  for (const collection of collections) {
    const index = collection.items.findIndex((item) => [item.domain_id, item.token_id, item.component_id, item.grid_rule_id].includes(targetId));
    if (index >= 0) return { ...collection, index, target: collection.items[index] };
  }
  return null;
}

async function createExtractionSnapshot(base, output) {
  try { await access(path.join(output, "extraction-snapshot", "tokens.json")); return; } catch {}
  await mkdir(path.join(output, "extraction-snapshot"), { recursive: true });
  const canonical = await canonicalArtifactFiles(base);
  for (const file of [...immutableFiles, ...canonical.filter((file) => file !== "design.md")]) await cp(path.join(base, file), path.join(output, "extraction-snapshot", file));
}

async function artifactSet(output, { packageId, parentPackageId, status, correctionIds = [], decisionIds = [], createdAt, artifactSetId = null }) {
  const source = await readJson(output, "source-manifest.json");
  const files = await canonicalArtifactFiles(output);
  const hashes = await hashFiles(output, files);
  const artifacts = files.map((file) => ({ type: path.basename(file, path.extname(file)), path: file, media_type: file.endsWith(".md") ? "text/markdown" : "application/json", sha256: hashes[file], schema_version: "3.0.0", status }));
  artifactSetId ??= identity("artifact-set", { packageId, parentPackageId, hashes, correctionIds, decisionIds, status });
  const record = { artifact_set_id: artifactSetId, package_id: packageId, parent_package_id: parentPackageId, source_capture_ids: [...new Set((source.sources ?? []).map((item) => item.capture_id))], analysis_ids: source.analysis_id ? [source.analysis_id] : [], correction_ids: correctionIds, decision_ids: decisionIds, status, artifacts, artifact_hashes: hashes, created_at: createdAt };
  await writeJson(output, "artifact-set.json", record);
  return record;
}

async function loadState(root) {
  const manifest = await readJson(root, "recrafts-package.json");
  const evidence = await readJson(root, "evidence-map.json");
  const claims = await readJson(root, "claims.json");
  const tokens = await readJson(root, "tokens.json");
  const components = await readJson(root, "components.json");
  const grids = await readJson(root, "grid-rules.json");
  const layouts = await readJson(root, "layout-rules.json");
  const grammar = await readJson(root, "visual-grammar.json");
  const conflicts = await readJson(root, "conflicts.json");
  return { manifest, evidence, claims, tokens, components, grids, layouts, grammar, conflicts };
}

function assertProvenance(state) {
  const evidence = new Set(state.evidence.evidence.map((item) => item.evidence_id));
  const claims = new Set(state.claims.claims.map((item) => item.claim_id));
  const domains = [...state.tokens.tokens, ...state.components.components, ...state.grids.grid_rules];
  const conflicts = new Set(state.conflicts.conflicts.map((item) => item.conflict_id));
  const domainIds = new Set(domains.map((item) => item.domain_id));
  for (const item of domains) {
    if (!item.evidence_refs?.length || item.evidence_refs.some((ref) => !evidence.has(ref))) fail("Canonical domain object has invalid Evidence provenance");
    if (!item.claim_refs?.length || item.claim_refs.some((ref) => !claims.has(ref))) fail("Canonical domain object has invalid Claim provenance");
    if ((item.conflict_refs ?? []).some((ref) => !conflicts.has(ref))) fail("Canonical domain object references an unknown Conflict");
  }
  for (const conflict of state.conflicts.conflicts) if (conflict.evidence_refs.some((ref) => !evidence.has(ref)) || conflict.candidate_refs.some((ref) => !domainIds.has(ref))) fail("Conflict provenance is invalid");
  return { evidence, claims };
}

async function writeCanonical(output, state) {
  await Promise.all([
    writeJson(output, "tokens.json", state.tokens), writeJson(output, "components.json", state.components), writeJson(output, "grid-rules.json", state.grids),
    writeJson(output, "layout-rules.json", state.layouts), writeJson(output, "visual-grammar.json", state.grammar), writeJson(output, "conflicts.json", state.conflicts)
  ]);
}

export async function submitCorrection({ basePackageDirectory, correctionFile, authoritativeValidationReport = null, outputDirectory }) {
  const state = await loadState(basePackageDirectory); const correction = JSON.parse(await readFile(correctionFile, "utf8"));
  assertSchema(correction, correctionSchema, "Correction");
  if (correction.base_package_id !== state.manifest.package_id) fail("Correction base package identity mismatch");
  const refs = assertProvenance(state);
  const metadataFinalization = correction.operations.some((operation) => operation.type === "finalize-accepted-metadata");
  if (metadataFinalization && (correction.operations.length !== 1 || state.manifest.status !== "accepted" || !authoritativeValidationReport)) fail("Accepted metadata finalization requires one bounded operation and an authoritative validation report");
  const collections = [{ key: "token", items: state.tokens.tokens }, { key: "component", items: state.components.components }, { key: "grid", items: state.grids.grid_rules }];
  const regionOverlays = [];
  for (const operation of correction.operations) {
    if (operation.evidence_refs.some((ref) => !refs.evidence.has(ref))) fail("Correction references unknown Evidence");
    if (operation.claim_refs.some((ref) => !refs.claims.has(ref))) fail("Correction references unknown Claim");
    if (operation.after && typeof operation.after === "object" && ["evidence_refs", "claim_refs", "domain_id", "token_id", "component_id", "grid_rule_id"].some((key) => Object.hasOwn(operation.after, key))) fail("Correction cannot rewrite identity or provenance fields");
    if (operation.type === "finalize-accepted-metadata") {
      if (operation.target_id !== "design.md" || operation.before?.status !== "accepted" || operation.after?.delivery_readiness !== "pilot-ready") fail("Metadata finalization must bind accepted design.md to pilot-ready delivery");
      continue;
    }
    if (operation.type === "resolve-conflict") {
      const target = state.conflicts.conflicts.find((item) => item.conflict_id === operation.target_id); if (!target) fail("Unknown correction target");
      if (!matchesBefore(target, operation.before)) fail("Correction before value does not match base package");
      Object.assign(target, mergeAfter(target, operation.after), { resolution: operation.after, resolver: correction.actor, decision_id: correction.correction_id });
      continue;
    }
    if (operation.type === "reclassify-region") {
      if (!refs.evidence.has(operation.target_id)) fail("Unknown correction target");
      regionOverlays.push({ region_id: operation.target_id, before: operation.before, after: operation.after, correction_id: correction.correction_id, evidence_refs: operation.evidence_refs, claim_refs: operation.claim_refs });
      for (const collection of collections) for (const item of collection.items) if (item.evidence_refs.includes(operation.target_id)) item.classification_overlay_refs = [...new Set([...(item.classification_overlay_refs ?? []), correction.correction_id])];
      continue;
    }
    const found = findDomain(collections, operation.target_id); if (!found) fail("Unknown correction target");
    if (!matchesBefore(found.target, operation.before)) fail("Correction before value does not match base package");
    if (operation.type.startsWith("reject-") || operation.type === "reject-candidate") found.items[found.index] = { ...found.target, status: "rejected", correction_id: correction.correction_id };
    else if (operation.type === "confirm-candidate") found.items[found.index] = { ...found.target, status: "confirmed", correction_id: correction.correction_id };
    else found.items[found.index] = { ...mergeAfter(found.target, operation.after), correction_id: correction.correction_id };
  }
  assertProvenance(state);
  const baseHashes = await hashFiles(basePackageDirectory); const correctionHash = sha(correction);
  const packageId = identity("package", { parent_package_id: state.manifest.package_id, base_artifact_set_hash: sha(baseHashes), correction_hash: correctionHash, schema_version: "3.0.0", protocol_version: "1.1" });
  const blocked = state.conflicts.conflicts.some((item) => item.severity === "high" && item.status === "open") || state.evidence.evidence.some((item) => item.status === "stale");
  const status = blocked ? "blocked" : metadataFinalization ? "awaiting-finalization" : "awaiting-review";
  await copyPackage(basePackageDirectory, outputDirectory); await createExtractionSnapshot(basePackageDirectory, outputDirectory);
  if (!metadataFinalization) await writeCanonical(outputDirectory, state);
  await writeFile(path.join(outputDirectory, "corrections.jsonl"), await appendJsonl(basePackageDirectory, "corrections.jsonl", correction));
  await writeJson(outputDirectory, "correction-diff.json", { correction_id: correction.correction_id, base_package_id: state.manifest.package_id, package_id: packageId, operations: correction.operations });
  const priorOverlays = await readJson(basePackageDirectory, "region-overlays.json").catch(() => ({ overlays: [] }));
  await writeJson(outputDirectory, "region-overlays.json", { overlays: [...priorOverlays.overlays, ...regionOverlays] });
  const baseDesign = await readFile(path.join(basePackageDirectory, "design.md"), "utf8");
  await writeFile(path.join(outputDirectory, "design.md"), appendLifecycleMetadata(baseDesign, { title: "Correction lineage", status, packageId, parentPackageId: state.manifest.package_id }));
  const baseSet = await readJson(basePackageDirectory, "artifact-set.json").catch(() => ({ correction_ids: [], decision_ids: [] }));
  const correctionIds = [...new Set([...(baseSet.correction_ids ?? []), correction.correction_id])]; const decisionIds = baseSet.decision_ids ?? [];
  const set = await artifactSet(outputDirectory, { packageId, parentPackageId: state.manifest.package_id, status, correctionIds, decisionIds, createdAt: correction.created_at });
  await writeJson(outputDirectory, "lineage.json", { event_id: identity("lineage", { packageId, type: "corrected" }), event_type: "corrected", package_id: packageId, parent_package_id: state.manifest.package_id, restored_from_package_id: null, correction_ids: correctionIds, decision_ids: decisionIds, created_at: correction.created_at, artifact_set_hash: sha(await readFile(path.join(outputDirectory, "artifact-set.json"))) });
  await writeJson(outputDirectory, "recrafts-package.json", { ...state.manifest, package_id: packageId, status, parent_package_id: state.manifest.package_id, artifact_set_id: set.artifact_set_id, artifacts: [...new Set([...state.manifest.artifacts, "corrections.jsonl", "correction-diff.json", "lineage.json", "artifact-set.json", "region-overlays.json"])] });
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true });
  if (metadataFinalization) {
    const authorityBytes = await readFile(authoritativeValidationReport);
    const authority = JSON.parse(authorityBytes);
    if (authority.status !== "pass") fail("Authoritative validation report must be PASS");
    await writeFile(path.join(outputDirectory, "validation/identity-safety-report.current.json"), authorityBytes);
    const reportHash = sha(authorityBytes);
    await writeJson(outputDirectory, "validation/index.json", { schema_version: "1.0.0", validation_run_id: identity("validation", { correction_id: correction.correction_id, report_hash: reportHash }), reports: [{ validation_id: "identity-safety", authoritative_report_path: "validation/identity-safety-report.current.json", report_status: "pass", report_sha256: reportHash, superseded_report_paths: ["validation/identity-safety-report.json"], superseded_reason: "The earlier package report used a scanner that treated technical IDs and provenance references as reusable brand content." }] });
  }
  await writeJson(outputDirectory, "validation/correction-integrity.json", { status: "pass", base_package_id: state.manifest.package_id, immutable_hashes: Object.fromEntries(await Promise.all(immutableFiles.map(async (file) => [file, sha(await readFile(path.join(basePackageDirectory, file)))]))), initial_extraction_preserved: true });
  return { package_id: packageId, package_status: status, artifact_set_id: set.artifact_set_id, correction_id: correction.correction_id };
}

export async function acceptArtifacts({ candidatePackageDirectory, decisionFile, outputDirectory }) {
  const state = await loadState(candidatePackageDirectory); const decision = JSON.parse(await readFile(decisionFile, "utf8"));
  assertSchema(decision, decisionSchema, "Artifact decision"); assertProvenance(state);
  if (decision.candidate_package_id !== state.manifest.package_id) fail("Acceptance decision does not match candidate package");
  if (decision.verdict !== "PASS" && !(decision.verdict === "PASS_WITH_CHANGES" && decision.changes_completed === true)) fail("Decision verdict cannot accept artifacts", "REALIZATION_NOT_AUTHORIZED");
  const correctionEvents = (await readFile(path.join(candidatePackageDirectory, "corrections.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(JSON.parse);
  for (const event of correctionEvents) { assertSchema(event, correctionSchema, "Correction history"); if (!Object.keys(event.decision_context ?? {}).length) fail("Correction history lacks decision context"); }
  const metadataFinalization = correctionEvents.at(-1)?.operations?.length === 1 && correctionEvents.at(-1).operations[0].type === "finalize-accepted-metadata";
  const finalizationBasePackageId = metadataFinalization ? correctionEvents.find((event) => event.operations?.some((operation) => operation.type === "finalize-accepted-metadata"))?.base_package_id ?? state.manifest.parent_package_id : state.manifest.package_id;
  const acceptanceParentPackageId = metadataFinalization ? finalizationBasePackageId : state.manifest.package_id;
  const priorDecisions = (await readFile(path.join(candidatePackageDirectory, "decisions.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(JSON.parse);
  const ownerDecision = [...priorDecisions].reverse().find((item) => item.actor_role === "project-owner" && ["PASS", "PASS_WITH_CHANGES"].includes(item.verdict));
  if (metadataFinalization && (!ownerDecision || decision.actor_role !== "authorized-reviewer")) fail("Metadata finalization requires inherited Owner PASS and an authorized independent reviewer");
  const stale = state.evidence.evidence.some((item) => item.status === "stale");
  const source = await readJson(candidatePackageDirectory, "source-manifest.json"); const incompleteSource = (source.sources ?? []).some((item) => ["partial", "blocked", "stale"].includes(item.status));
  if (stale || incompleteSource) fail("Partial, stale or blocked mandatory source cannot be accepted", "REALIZATION_NOT_AUTHORIZED");
  const riskByConflict = new Map(decision.accepted_risks.map((item) => [item.conflict_id, item]));
  for (const conflict of state.conflicts.conflicts.filter((item) => item.severity === "high" && item.status === "open")) {
    const risk = riskByConflict.get(conflict.conflict_id);
    if (!risk || decision.actor_role !== "project-owner") fail("Open high-impact conflict blocks acceptance", "REALIZATION_NOT_AUTHORIZED");
    Object.assign(conflict, { status: "accepted-risk", resolution: { risk_statement: risk.risk_statement, accepted_scope: risk.accepted_scope }, resolver: decision.actor, decision_id: decision.decision_id });
  }
  const candidateSet = await readJson(candidatePackageDirectory, "artifact-set.json").catch(() => ({ correction_ids: [], decision_ids: [] }));
  const packageId = identity("package", { parent_package_id: acceptanceParentPackageId, candidate_package_id: state.manifest.package_id, base_artifact_set_hash: sha(candidateSet), decision_hash: sha(decision), schema_version: "3.0.0", protocol_version: "1.1" });
  await copyPackage(candidatePackageDirectory, outputDirectory); await createExtractionSnapshot(candidatePackageDirectory, outputDirectory); if (!metadataFinalization) await writeJson(outputDirectory, "conflicts.json", state.conflicts);
  const candidateDelivery = await readJson(candidatePackageDirectory, "delivery-readiness.json").catch(() => null);
  const acceptedDelivery = candidateDelivery ? metadataFinalization ? candidateDelivery : deriveAcceptedDeliveryReadiness(candidateDelivery, decision) : null;
  if (acceptedDelivery && !metadataFinalization) await writeJson(outputDirectory, "delivery-readiness.json", acceptedDelivery);
  await writeFile(path.join(outputDirectory, "decisions.jsonl"), await appendJsonl(candidatePackageDirectory, "decisions.jsonl", decision));
  const decisionIds = [...new Set([...(candidateSet.decision_ids ?? []), decision.decision_id])];
  const selfDescribingSetId = metadataFinalization ? identity("artifact-set", { packageId, parentPackageId: acceptanceParentPackageId, correctionIds: candidateSet.correction_ids ?? [], decisionIds, status: "accepted", identity_version: "self-describing-v1" }) : null;
  const candidateDesign = await readFile(path.join(candidatePackageDirectory, "design.md"), "utf8");
  await writeFile(path.join(outputDirectory, "design.md"), metadataFinalization ? composeAcceptedDesign(candidateDesign, { packageId, parentPackageId: acceptanceParentPackageId, deliveryReadiness: acceptedDelivery.status, ownerDecisionId: ownerDecision.decision_id, artifactSetId: selfDescribingSetId }) : appendLifecycleMetadata(candidateDesign, { title: "Acceptance lineage", status: "accepted", packageId, parentPackageId: state.manifest.package_id }));
  const set = await artifactSet(outputDirectory, { packageId, parentPackageId: acceptanceParentPackageId, status: "accepted", correctionIds: candidateSet.correction_ids ?? [], decisionIds, createdAt: decision.created_at, artifactSetId: selfDescribingSetId });
  await writeJson(outputDirectory, "lineage.json", { event_id: identity("lineage", { packageId, type: "accepted" }), event_type: "accepted", package_id: packageId, parent_package_id: acceptanceParentPackageId, restored_from_package_id: null, correction_ids: set.correction_ids, decision_ids: decisionIds, created_at: decision.created_at, artifact_set_hash: sha(await readFile(path.join(outputDirectory, "artifact-set.json"))) });
  await writeJson(outputDirectory, "recrafts-package.json", { ...state.manifest, package_id: packageId, status: "accepted", parent_package_id: acceptanceParentPackageId, artifact_set_id: set.artifact_set_id, artifacts: [...new Set([...state.manifest.artifacts, "artifact-set.json", "decisions.jsonl", "lineage.json", ...(metadataFinalization ? ["validation/index.json", "validation/identity-safety-report.current.json", "metadata-consistency-report.json", "validation-authority-report.json"] : [])])] });
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true });
  await writeJson(outputDirectory, "validation/acceptance-readiness.json", { status: "pass", package_id: packageId, decision_id: decision.decision_id, open_high_conflicts: 0, stale_evidence: false, blocked_sources: false });
  await writeJson(outputDirectory, "validation/artifact-integrity.json", { status: "pass", artifact_set_id: set.artifact_set_id, artifact_hashes: set.artifact_hashes });
  if (metadataFinalization) {
    const finalization = await validateAcceptanceFinalization(outputDirectory);
    if (finalization.status !== "pass") fail(`Acceptance finalization failed: ${finalization.errors.join("; ")}`);
    await writeJson(outputDirectory, "metadata-consistency-report.json", finalization.metadata_consistency);
    await writeJson(outputDirectory, "validation-authority-report.json", finalization.validation_authority);
  }
  return { package_id: packageId, package_status: "accepted", artifact_set_id: set.artifact_set_id, decision_id: decision.decision_id, ...(metadataFinalization ? { owner_decision_id: ownerDecision.decision_id, metadata_finalization: "pass" } : {}) };
}

export async function rollbackPackage({ currentPackageDirectory, restoreTargetDirectory, decisionFile, outputDirectory }) {
  const current = await loadState(currentPackageDirectory); const target = await loadState(restoreTargetDirectory); const decision = JSON.parse(await readFile(decisionFile, "utf8"));
  assertSchema(decision, rollbackSchema, "Rollback decision");
  if (current.manifest.status !== "accepted" || target.manifest.status !== "accepted") fail("Rollback current and target packages must be accepted");
  if (decision.current_package_id !== current.manifest.package_id || decision.restore_target_package_id !== target.manifest.package_id) fail("Rollback decision package identity mismatch");
  assertProvenance(target);
  const targetSet = await readJson(restoreTargetDirectory, "artifact-set.json");
  const packageId = identity("package", { parent_package_id: current.manifest.package_id, restore_target_package_id: target.manifest.package_id, base_artifact_set_hash: sha(targetSet), rollback_decision_hash: sha(decision), schema_version: "3.0.0", protocol_version: "1.1" });
  if ([current.manifest.package_id, target.manifest.package_id].includes(packageId)) fail("Rollback must create a new package identity");
  await copyPackage(currentPackageDirectory, outputDirectory);
  const restoreFiles = await canonicalArtifactFiles(restoreTargetDirectory);
  for (const file of [...restoreFiles, ...immutableFiles, "extraction-snapshot"]) await cp(path.join(restoreTargetDirectory, file), path.join(outputDirectory, file), { recursive: true, force: true });
  await writeFile(path.join(outputDirectory, "rollback-events.jsonl"), await appendJsonl(currentPackageDirectory, "rollback-events.jsonl", decision));
  const currentSet = await readJson(currentPackageDirectory, "artifact-set.json");
  const decisionIds = [...new Set([...(currentSet.decision_ids ?? []), decision.decision_id])];
  const set = await artifactSet(outputDirectory, { packageId, parentPackageId: current.manifest.package_id, status: "accepted", correctionIds: currentSet.correction_ids ?? [], decisionIds, createdAt: decision.created_at });
  for (const file of restoreFiles) if (set.artifact_hashes[file] !== targetSet.artifact_hashes[file]) fail(`Rollback canonical hash mismatch: ${file}`);
  await writeJson(outputDirectory, "lineage.json", { event_id: identity("lineage", { packageId, type: "rollback-created" }), event_type: "rollback-created", package_id: packageId, parent_package_id: current.manifest.package_id, restored_from_package_id: target.manifest.package_id, correction_ids: set.correction_ids, decision_ids: decisionIds, created_at: decision.created_at, artifact_set_hash: sha(await readFile(path.join(outputDirectory, "artifact-set.json"))) });
  await writeJson(outputDirectory, "recrafts-package.json", { ...current.manifest, package_id: packageId, status: "accepted", parent_package_id: current.manifest.package_id, restored_from_package_id: target.manifest.package_id, artifact_set_id: set.artifact_set_id, artifacts: [...new Set([...current.manifest.artifacts, "rollback-events.jsonl", "artifact-set.json", "lineage.json"])] });
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true });
  await writeJson(outputDirectory, "validation/rollback-integrity.json", { status: "pass", current_package_id: current.manifest.package_id, restored_from_package_id: target.manifest.package_id, canonical_hashes_restored: true, artifact_hashes: set.artifact_hashes });
  return { package_id: packageId, package_status: "accepted", artifact_set_id: set.artifact_set_id, restored_from_package_id: target.manifest.package_id };
}
