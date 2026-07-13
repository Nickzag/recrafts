import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const hostSchema = loadSchema(new URL("../contracts/host-analysis.schema.json", import.meta.url));
const sha = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const id = (prefix, value) => `${prefix}-${sha(value).slice(0, 16)}`;
const allowedEvidence = new Set(["dom-node", "css-rule", "css-variable", "computed-style", "screenshot", "screenshot-region", "asset", "font", "capture-metadata", "network-response"]);
const mediaType = (file) => ({ ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" })[path.extname(file).toLowerCase()] ?? "application/octet-stream";
const evidence = ({ type, sourceId, captureId, location = {}, value, status = "current", capturedAt, confidence = 1, parentEvidenceId }) => {
  if (!allowedEvidence.has(type)) throw Object.assign(new Error(`Unsupported Evidence type: ${type}`), { code: "PACKAGE_INVALID" });
  const payload = { evidence_type: type, source_id: sourceId, capture_id: captureId, location, value, status, captured_at: capturedAt, confidence };
  return { evidence_id: id("ev", payload), ...payload, sha256: sha(value), ...(parentEvidenceId ? { parent_evidence_id: parentEvidenceId } : {}) };
};
const isUnsafeUrl = (url) => {
  let parsed;
  try { parsed = new URL(url); } catch { return "invalid-url"; }
  if (!["http:", "https:"].includes(parsed.protocol)) return "unsupported-protocol";
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])|\[?::1\]?)$/i.test(parsed.hostname)) return "private-network";
  if (/\.(zip|dmg|exe|pkg|msi|pdf)$/i.test(parsed.pathname) || /checkout|download|subscription/i.test(parsed.pathname)) return "download-or-checkout-boundary";
  return null;
};

function captureEvidence(fixture, sourceId, captureId) {
  const at = fixture.captured_at ?? new Date().toISOString();
  const status = fixture.status === "stale" ? "stale" : fixture.status === "partial" ? "partial" : "current";
  const records = [evidence({ type: "capture-metadata", sourceId, captureId, value: { fixture_kind: fixture.fixture_kind ?? null, lifecycle_status: fixture.status }, status, capturedAt: at })];
  if (fixture.network) records.push(evidence({ type: "network-response", sourceId, captureId, value: fixture.network, status, capturedAt: at }));
  for (const [index, value] of (fixture.dom ?? []).entries()) records.push(evidence({ type: "dom-node", sourceId, captureId, location: { route: "/", selector: value.selector }, value, status, capturedAt: at }));
  for (const value of fixture.css_rules ?? []) records.push(evidence({ type: "css-rule", sourceId, captureId, location: { route: "/", selector: value.selector }, value, status, capturedAt: at }));
  for (const value of fixture.css_variables ?? []) records.push(evidence({ type: "css-variable", sourceId, captureId, location: { route: "/" }, value, status, capturedAt: at }));
  for (const value of fixture.computed_styles ?? []) records.push(evidence({ type: "computed-style", sourceId, captureId, location: { route: "/", selector: value.selector }, value, status, capturedAt: at }));
  const screenshots = [];
  for (const value of fixture.screenshots ?? []) { const record = evidence({ type: "screenshot", sourceId, captureId, location: { route: "/", viewport: value.viewport }, value, status, capturedAt: at }); screenshots.push(record); records.push(record); }
  for (const value of fixture.screenshot_regions ?? []) records.push(evidence({ type: "screenshot-region", sourceId, captureId, location: { route: "/", selector: value.selector, viewport: screenshots[value.screenshot_index]?.location.viewport }, value, status, capturedAt: at, parentEvidenceId: screenshots[value.screenshot_index]?.evidence_id }));
  for (const value of fixture.assets ?? []) records.push(evidence({ type: "asset", sourceId, captureId, location: { route: "/" }, value, status, capturedAt: at }));
  for (const value of fixture.fonts ?? []) records.push(evidence({ type: "font", sourceId, captureId, location: { route: "/" }, value, status, capturedAt: at }));
  return records;
}

export async function prepareEvidenceAnalysis({ sources, outputDirectory }) {
  if (!Array.isArray(sources) || !sources.length || sources.length > 20) throw Object.assign(new Error("prepare-analysis requires 1–20 typed sources"), { code: "SCHEMA_VALIDATION_FAILED" });
  await mkdir(path.join(outputDirectory, "analysis"), { recursive: true });
  await mkdir(path.join(outputDirectory, "sources"), { recursive: true });
  const manifests = []; const allEvidence = []; const lifecycle = [];
  let sequence = 0;
  for (const descriptor of sources) {
    if (!["image", "image-set", "url"].includes(descriptor.kind)) throw Object.assign(new Error("Input kind must be image, image-set or url"), { code: "SCHEMA_VALIDATION_FAILED" });
    if (descriptor.kind === "image" || descriptor.kind === "image-set") {
      const files = descriptor.kind === "image" ? [descriptor.file] : descriptor.files;
      if (!Array.isArray(files) || !files.length) throw Object.assign(new Error("Image source is empty"), { code: "SCHEMA_VALIDATION_FAILED" });
      for (const file of files) {
        sequence += 1; const bytes = await readFile(file); const sourceId = `source-${sequence}`; const captureId = id("capture", { sourceId, hash: sha(bytes) });
        const target = `sources/source-${sequence}${path.extname(file).toLowerCase()}`;
        await copyFile(file, path.join(outputDirectory, target));
        const record = evidence({ type: "screenshot", sourceId, captureId, location: { file: target }, value: { prepared_source_path: target, bytes: bytes.length, content_sha256: sha(bytes) }, capturedAt: new Date().toISOString(), confidence: 1 });
        manifests.push({ source_id: sourceId, kind: "image", capture_id: captureId, status: "ready", prepared_source_path: target, original_basename: path.basename(file), sha256: sha(bytes), bytes: bytes.length, media_type: mediaType(file) });
        allEvidence.push(record); lifecycle.push({ source_id: sourceId, status: "complete", missing_evidence: [] });
      }
      continue;
    }
    sequence += 1; const sourceId = `source-${sequence}`; const unsafe = isUnsafeUrl(descriptor.url); let captureId = id("capture", { url: descriptor.url, routes: descriptor.routes ?? [], viewports: descriptor.viewports ?? [] });
    let fixture = null; let status = "blocked"; let reason = unsafe;
    if (!unsafe && descriptor.fixture) {
      fixture = JSON.parse(await readFile(descriptor.fixture, "utf8"));
      if (fixture.fixture_kind !== "controlled-url-capture" || !["complete", "partial", "stale", "blocked"].includes(fixture.status)) throw Object.assign(new Error("Invalid controlled URL capture fixture"), { code: "SCHEMA_VALIDATION_FAILED" });
      const sourceArrays = ["dom", "css_rules", "css_variables", "computed_styles", "screenshots", "screenshot_regions", "assets", "fonts"];
      if (fixture.status === "blocked" && sourceArrays.some((key) => fixture[key]?.length)) throw Object.assign(new Error("Blocked URL fixture cannot emit fabricated source Evidence"), { code: "SCHEMA_VALIDATION_FAILED" });
      if (fixture.status === "complete" && ["dom", "css_rules", "computed_styles", "screenshots", "screenshot_regions", "fonts"].some((key) => !fixture[key]?.length)) throw Object.assign(new Error("Complete URL fixture is missing required Evidence classes"), { code: "SCHEMA_VALIDATION_FAILED" });
      if (fixture.status === "partial" && !fixture.missing_evidence?.length) throw Object.assign(new Error("Partial URL fixture must list missing Evidence"), { code: "SCHEMA_VALIDATION_FAILED" });
      if (fixture.status === "stale" && !fixture.stale_reasons?.length) throw Object.assign(new Error("Stale URL fixture must record a deterministic stale reason"), { code: "SCHEMA_VALIDATION_FAILED" });
      captureId = id("capture", { url: descriptor.url, routes: descriptor.routes ?? [], viewports: descriptor.viewports ?? [], fixture_sha256: sha(fixture) });
      status = fixture.status; reason = fixture.blocked_reason ?? null;
      allEvidence.push(...captureEvidence(fixture, sourceId, captureId));
    } else if (!unsafe) {
      status = "partial";
      try {
        const response = await fetch(descriptor.url, { redirect: "error", signal: AbortSignal.timeout(8000), headers: { "user-agent": "Recrafts-Evidence-Capture/0.4" } });
        if (!response.ok) { status = "blocked"; reason = `http-${response.status}`; }
        else {
          const html = await response.text(); const at = new Date().toISOString();
          if (/type=["']password|captcha|paywall/i.test(html)) { status = "blocked"; reason = "login-captcha-or-paywall"; }
          else allEvidence.push(evidence({ type: "network-response", sourceId, captureId, value: { status: response.status, content_type: response.headers.get("content-type"), etag: response.headers.get("etag"), html_sha256: sha(html) }, capturedAt: at }), evidence({ type: "dom-node", sourceId, captureId, location: { route: "/", selector: "html" }, value: { html_sha256: sha(html), title: html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "" }, capturedAt: at }));
        }
      } catch (error) { status = "blocked"; reason = `inaccessible-response:${error.name}`; }
    }
    manifests.push({ source_id: sourceId, kind: "url", capture_id: captureId, status, url: descriptor.url, routes: descriptor.routes ?? [], viewports: descriptor.viewports ?? [], controlled_fixture: Boolean(descriptor.fixture) });
    lifecycle.push({ source_id: sourceId, status, missing_evidence: fixture?.missing_evidence ?? (status === "partial" ? ["computed-style", "screenshot", "font"] : []), stale_reasons: fixture?.stale_reasons ?? [], reason });
  }
  const preparedId = id("prepared", { manifests, evidence: allEvidence.map((item) => item.evidence_id) });
  const aggregate = lifecycle.some((item) => ["blocked", "stale"].includes(item.status)) ? "blocked" : lifecycle.some((item) => item.status === "partial") ? "partial" : "complete";
  await Promise.all([
    writeJson(path.join(outputDirectory, "source-manifest.json"), { version: "3.0.0", prepared_analysis_id: preparedId, sources: manifests }),
    writeJson(path.join(outputDirectory, "capture-status.json"), { status: lifecycle.length === 1 ? lifecycle[0].status : aggregate, sources: lifecycle }),
    writeJson(path.join(outputDirectory, "run-log.json"), { prepared_analysis_id: preparedId, stages: ["intake", "capture", "evidence-export"], status: aggregate }),
    writeJson(path.join(outputDirectory, "analysis/input-manifest.json"), { version: "3.0.0", prepared_analysis_id: preparedId, sources: manifests, semantic_analysis_completed: false }),
    writeJson(path.join(outputDirectory, "analysis/evidence-bundle.json"), { version: "3.0.0", prepared_analysis_id: preparedId, evidence: allEvidence }),
    writeFile(path.join(outputDirectory, "analysis/host-instructions.md"), "# Host Analysis\n\nInterpret the copied images and source-derived Evidence. Return Claims and domain candidates matching `contracts/host-analysis.schema.json`. Evidence IDs may be cited but Host observations must never be emitted as Evidence.\n")
  ]);
  if (lifecycle.some((item) => item.status === "blocked")) await writeJson(path.join(outputDirectory, "blocked-reason.json"), { reasons: lifecycle.filter((item) => item.status === "blocked").map(({ source_id, reason }) => ({ source_id, reason: reason ?? "capture-blocked" })), reason: lifecycle.find((item) => item.status === "blocked")?.reason ?? "capture-blocked" });
  return { prepared_analysis_id: preparedId, aggregate_status: aggregate, capture_status: lifecycle.length === 1 ? lifecycle[0].status : aggregate, sources: manifests, artifacts: ["source-manifest.json", "capture-status.json", "run-log.json", "analysis/input-manifest.json", "analysis/host-instructions.md", "analysis/evidence-bundle.json"] };
}

const claimStatus = (status) => ({ observed: "observed-claim", inferred: "inferred-claim", suggested: "suggested-claim", confirmed: "suggested-claim" })[status] ?? "inferred-claim";

export async function submitEvidenceAnalysis({ preparedAnalysisDirectory, hostAnalysisFile, outputDirectory }) {
  const prepared = JSON.parse(await readFile(path.join(preparedAnalysisDirectory, "analysis/input-manifest.json"), "utf8"));
  const evidenceBundle = JSON.parse(await readFile(path.join(preparedAnalysisDirectory, "analysis/evidence-bundle.json"), "utf8"));
  const captureStatus = JSON.parse(await readFile(path.join(preparedAnalysisDirectory, "capture-status.json"), "utf8"));
  const analysis = JSON.parse(await readFile(hostAnalysisFile, "utf8"));
  assertSchema(analysis, hostSchema, "Host Analysis");
  if (analysis.prepared_analysis_id !== prepared.prepared_analysis_id) throw Object.assign(new Error("Host Analysis does not match Prepared Bundle"), { code: "HOST_ACTION_REQUIRED" });
  const validEvidence = new Set(evidenceBundle.evidence.map((item) => item.evidence_id));
  const classifications = (analysis.source_classifications ?? []).flatMap((source) => [{ ...source, id: `classification-${source.source_id}` }, ...(source.regions ?? []).map((region) => ({ ...region, id: `classification-${source.source_id}-${region.id}` }))]);
  const candidates = [...classifications, ...analysis.findings, ...analysis.tokens, ...analysis.components, ...(analysis.grid_rules ?? [])];
  for (const item of candidates) if (!item.evidence_refs?.length || item.evidence_refs.some((ref) => !validEvidence.has(ref))) throw Object.assign(new Error("Host candidate references invalid Evidence"), { code: "PACKAGE_INVALID" });
  const analysisId = id("analysis", analysis); const hostIdentity = { agent: analysis.execution.host_agent, engine: analysis.execution.engine, vision_capability: analysis.execution.vision_capability };
  const claimBases = candidates.map((item) => `claim-${item.id ?? item.name}`); const claimTotals = new Map(); const claimSeen = new Map();
  for (const base of claimBases) claimTotals.set(base, (claimTotals.get(base) ?? 0) + 1);
  const claims = candidates.map((item, index) => { const base = claimBases[index]; const occurrenceIndex = (claimSeen.get(base) ?? 0) + 1; claimSeen.set(base, occurrenceIndex); return { claim_id: claimTotals.get(base) > 1 ? `${base}-${occurrenceIndex}` : base, claim_type: classifications.includes(item) ? "source-classification" : analysis.findings.includes(item) ? "visual-finding" : analysis.tokens.includes(item) ? "token-candidate" : analysis.components.includes(item) ? "component-candidate" : "grid-rule-candidate", scope: item.scope, status: claimStatus(item.status), confidence: item.confidence, evidence_refs: item.evidence_refs, host_identity: hostIdentity, analysis_id: analysisId, value: classifications.includes(item) ? item.classification : analysis.findings.includes(item) ? item.observation : item.value ?? item.constraints ?? item.name }; });
  const claimBy = new Map(candidates.map((item, index) => [item, claims[index].claim_id]));
  const occurrence = (items, key) => { const totals = new Map(); for (const item of items) totals.set(key(item), (totals.get(key(item)) ?? 0) + 1); const seen = new Map(); return items.map((item) => { const base = key(item); const index = (seen.get(base) ?? 0) + 1; seen.set(base, index); return totals.get(base) > 1 ? `${base}#candidate-${index}` : base; }); };
  const tokenDomainIds = occurrence(analysis.tokens, (item) => item.id);
  const componentDomainIds = occurrence(analysis.components, (item) => `component.${item.name}`);
  const gridDomainIds = occurrence(analysis.grid_rules ?? [], (item) => item.id);
  const tokens = analysis.tokens.map((item, index) => ({ domain_id: tokenDomainIds[index], token_id: item.id, category: item.category ?? "unknown", scope: item.scope, value: item.value, status: item.status, confidence: item.confidence, evidence_refs: item.evidence_refs, claim_refs: [claimBy.get(item)], conflict_refs: [] }));
  const components = analysis.components.map((item, index) => ({ domain_id: componentDomainIds[index], component_id: `component.${item.name}`, scope: item.scope, purpose: item.purpose ?? `Host candidate ${item.name}`, anatomy: item.anatomy ?? [], variants: item.variants ?? [], states: item.states ?? [], status: "inferred", confidence: item.confidence, evidence_refs: item.evidence_refs, claim_refs: [claimBy.get(item)], conflict_refs: [] }));
  const gridRules = (analysis.grid_rules ?? []).map((item, index) => ({ domain_id: gridDomainIds[index], grid_rule_id: item.id, scope: item.scope, rule_type: item.rule_type, constraints: item.constraints, status: item.status, confidence: item.confidence, evidence_refs: item.evidence_refs, claim_refs: [claimBy.get(item)], conflict_refs: [] }));
  const allDomain = new Map([...tokens, ...components, ...gridRules].map((item) => [item.domain_id, item]));
  const conflicts = (analysis.conflicts ?? []).map((item) => ({ conflict_id: `conflict-${item.id}`, conflict_class: item.conflict_class, domain: item.domain, severity: item.severity, impact: item.impact, candidate_refs: item.candidate_refs, evidence_refs: item.evidence_refs, status: "open", resolution: null, resolver: null, decision_id: null }));
  const group = (items, key) => { const result = new Map(); for (const item of items) result.set(key(item), [...(result.get(key(item)) ?? []), item]); return [...result.values()].filter((items) => items.length > 1); };
  for (const candidates of group(tokens, (item) => item.token_id)) {
    const values = new Set(candidates.map((item) => JSON.stringify(item.value))); const scopes = new Set(candidates.map((item) => item.scope));
    if (values.size > 1 || scopes.size > 1) conflicts.push({ conflict_id: id("conflict", candidates.map((item) => item.domain_id)), conflict_class: values.size > 1 ? "multi-image-token-conflict" : "scope-conflict", domain: "token", severity: "high", impact: values.size > 1 ? "token-value" : "token-scope", candidate_refs: candidates.map((item) => item.domain_id), evidence_refs: [...new Set(candidates.flatMap((item) => item.evidence_refs))], status: "open", resolution: null, resolver: null, decision_id: null });
  }
  for (const candidates of group(components, (item) => item.component_id)) if (new Set(candidates.map((item) => JSON.stringify(item.states))).size > 1) conflicts.push({ conflict_id: id("conflict", candidates.map((item) => item.domain_id)), conflict_class: "component-state-conflict", domain: "component", severity: "high", impact: "component-states", candidate_refs: candidates.map((item) => item.domain_id), evidence_refs: [...new Set(candidates.flatMap((item) => item.evidence_refs))], status: "open", resolution: null, resolver: null, decision_id: null });
  for (const candidates of group(gridRules, (item) => item.grid_rule_id)) if (new Set(candidates.map((item) => JSON.stringify(item.constraints))).size > 1) conflicts.push({ conflict_id: id("conflict", candidates.map((item) => item.domain_id)), conflict_class: "grid-rule-conflict", domain: "grid-rule", severity: "high", impact: "layout-constraints", candidate_refs: candidates.map((item) => item.domain_id), evidence_refs: [...new Set(candidates.flatMap((item) => item.evidence_refs))], status: "open", resolution: null, resolver: null, decision_id: null });
  for (const conflict of conflicts) {
    if (conflict.evidence_refs.some((ref) => !validEvidence.has(ref)) || conflict.candidate_refs.some((ref) => !allDomain.has(ref))) throw Object.assign(new Error("Conflict references invalid candidate or Evidence"), { code: "PACKAGE_INVALID" });
    for (const ref of conflict.candidate_refs) allDomain.get(ref).conflict_refs.push(conflict.conflict_id);
  }
  for (const source of captureStatus.sources ?? []) if (source.status === "stale") conflicts.push({ conflict_id: `conflict-${source.source_id}-stale`, conflict_class: "stale-vs-current", domain: "evidence", severity: "high", impact: "mandatory-evidence-currentness", candidate_refs: [], evidence_refs: evidenceBundle.evidence.filter((item) => item.source_id === source.source_id).map((item) => item.evidence_id), status: "open", resolution: null, resolver: null, decision_id: null });
  const high = conflicts.some((item) => item.severity === "high" && item.status === "open");
  const lifecycleBlocked = captureStatus.status === "blocked" || captureStatus.status === "stale" || (captureStatus.sources ?? []).some((item) => ["blocked", "stale"].includes(item.status));
  const packageStatus = lifecycleBlocked || high ? "blocked" : captureStatus.status === "partial" || (captureStatus.sources ?? []).some((item) => item.status === "partial") ? "partial" : "awaiting-review";
  const packageId = id("package", { prepared: prepared.prepared_analysis_id, analysis: analysisId, conflicts: conflicts.map((item) => item.conflict_id) });
  await mkdir(path.join(outputDirectory, "validation"), { recursive: true }); await mkdir(path.join(outputDirectory, "review"), { recursive: true });
  const sourceManifest = { ...prepared, schema_version: "3.0.0", protocol_version: "1.1", analysis_id: analysisId, package_id: packageId, skill_version: "0.4.0-rc.1", host_agent: hostIdentity.agent, model: hostIdentity.engine, owner_decision_set_id: null };
  const artifacts = ["source-manifest.json", "evidence-map.json", "claims.json", "tokens.json", "components.json", "grid-rules.json", "layout-rules.json", "visual-grammar.json", "conflicts.json", "design.md"];
  await Promise.all([
    writeJson(path.join(outputDirectory, "source-manifest.json"), sourceManifest), writeJson(path.join(outputDirectory, "evidence-map.json"), evidenceBundle),
    writeJson(path.join(outputDirectory, "claims.json"), { version: "3.0.0", claims }), writeJson(path.join(outputDirectory, "tokens.json"), { version: "3.0.0", tokens }), writeJson(path.join(outputDirectory, "components.json"), { version: "3.0.0", components }), writeJson(path.join(outputDirectory, "grid-rules.json"), { version: "3.0.0", grid_rules: gridRules }),
    writeJson(path.join(outputDirectory, "layout-rules.json"), { version: "3.0.0", layout_rules: [] }), writeJson(path.join(outputDirectory, "visual-grammar.json"), { version: "3.0.0", visual_grammar: [] }), writeJson(path.join(outputDirectory, "conflicts.json"), { version: "3.0.0", conflicts }),
    writeFile(path.join(outputDirectory, "design.md"), `# Recrafts Candidate\n\nstatus: ${packageStatus}\npackage_id: ${packageId}\nanalysis_id: ${analysisId}\n\nHost output is stored as Claims; source-derived records remain Evidence.\n`),
    writeJson(path.join(outputDirectory, "recrafts-package.json"), { version: "3.0.0", protocol_version: "1.1", schema_version: "3.0.0", package_id: packageId, analysis_id: analysisId, status: packageStatus, artifacts }),
    writeJson(path.join(outputDirectory, "validation/realization-readiness.json"), { status: packageStatus, canonical_visual_generation_authorized: false, blockers: ["r007-human-acceptance-not-implemented", ...(high ? ["unresolved-high-impact-conflict"] : []), ...(lifecycleBlocked ? ["blocked-or-stale-evidence"] : [])] }),
    writeJson(path.join(outputDirectory, "review/owner-decision-set.json"), { decision_set_id: null, reviewed_package_id: packageId, verdict: "PENDING", decision_status: "pending" })
  ]);
  return { package_id: packageId, analysis_id: analysisId, package_status: packageStatus, canonical_visual_generation_authorized: false, conflict_count: conflicts.length };
}
