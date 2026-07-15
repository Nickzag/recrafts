import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONFIDENCE_STATES = Object.freeze(["high", "medium", "low", "not-testable", "conflicted"]);
export const RELIABILITY_CLASSES = Object.freeze(["direct-source", "rendered-observation", "inferred", "user-confirmed", "unavailable"]);
export const EXTRACTION_DOMAINS = Object.freeze(["color", "typography", "spacing", "grid", "layout-patterns", "components", "radii", "borders", "shadows", "gradients", "image-treatment", "iconography", "motion"]);
export const HIGH_IMPACT_DOMAINS = Object.freeze(["color", "typography", "grid", "components", "image-treatment", "motion"]);

export function createSourceEvidence(input) {
  if (!input?.evidence_id || !input.source_type || !input.content_hash || !input.capture_timestamp || !input.extraction_method) throw new Error("Source evidence requires identity, source, hash, capture timestamp, and extraction method.");
  if (!RELIABILITY_CLASSES.includes(input.reliability_class)) throw new Error(`Unsupported reliability class '${input.reliability_class}'.`);
  if (input.reliability_class === "direct-source" && ["screenshot", "model-output"].includes(input.source_type)) throw new Error("Rendered or model output cannot be direct-source evidence.");
  return { schema_version: "1.0.0", evidence_id: input.evidence_id, source_type: input.source_type, source_uri: input.source_uri ?? null, local_ref: input.local_ref ?? null, content_hash: input.content_hash, capture_timestamp: input.capture_timestamp, dimensions: input.dimensions ?? null, media_type: input.media_type ?? null, extraction_method: input.extraction_method, source_scope: input.source_scope ?? "project", reliability_class: input.reliability_class, conflict_state: input.conflict_state ?? "none", derived_artifact_refs: [...(input.derived_artifact_refs ?? [])], notes: input.notes ?? "" };
}

export function createDomainCandidate(input) {
  if (!EXTRACTION_DOMAINS.includes(input?.domain) || !input.candidate_id || !input.rule || !input.confidence?.state || !input.confidence?.reason) throw new Error("Domain candidate requires a valid domain, identity, rule, and explained confidence.");
  if (!CONFIDENCE_STATES.includes(input.confidence.state)) throw new Error(`Unsupported confidence '${input.confidence.state}'.`);
  if (!Array.isArray(input.evidence_refs) || input.evidence_refs.length === 0) throw new Error("Every extracted rule requires evidence refs.");
  return { candidate_id: input.candidate_id, domain: input.domain, rule: structuredClone(input.rule), evidence_refs: [...input.evidence_refs], confidence: structuredClone(input.confidence), conflict_refs: [...(input.conflict_refs ?? [])], status: input.status ?? "extracted", high_impact: HIGH_IMPACT_DOMAINS.includes(input.domain), original_extraction: structuredClone(input.rule), corrections: [] };
}

export function applyCorrection(candidate, correction) {
  if (!candidate || !correction?.correction_id || !correction.author || !correction.timestamp || !["accept", "edit", "reject", "intentionally-open"].includes(correction.action)) throw new Error("Correction requires identity, author, timestamp, and supported action.");
  if (candidate.high_impact && candidate.confidence.state === "conflicted" && correction.approval !== true) throw new Error("High-impact conflicted correction requires explicit approval.");
  const next = structuredClone(candidate);
  next.corrections.push(structuredClone(correction));
  next.status = ({ accept: "accepted", edit: "accepted-correction", reject: "rejected", "intentionally-open": "unresolved" })[correction.action];
  if (correction.action === "edit") {
    if (correction.value === undefined) throw new Error("Edit correction requires a value.");
    next.rule = structuredClone(correction.value);
  }
  next.confidence = { ...next.confidence, original_state: next.confidence.original_state ?? next.confidence.state };
  return next;
}

export function rollbackCorrection(candidate, correctionId, rollback) {
  if (!rollback?.author || !rollback.timestamp) throw new Error("Correction rollback requires author and timestamp.");
  const target = candidate.corrections.find((item) => item.correction_id === correctionId);
  if (!target) throw new Error(`Correction '${correctionId}' not found.`);
  const next = structuredClone(candidate);
  next.corrections.push({ correction_id: rollback.correction_id, action: "rollback", target_correction_id: correctionId, author: rollback.author, timestamp: rollback.timestamp });
  next.rule = structuredClone(next.original_extraction);
  next.status = "extracted";
  return next;
}

export function validateArtifactSet(artifacts) {
  const required = ["design.md", "design-contract.json", "tokens.json", "components.json", "evidence.json", "conflicts.json", "preview/index.html", "validation-report.json"];
  const missing = required.filter((name) => !(name in artifacts));
  const candidates = artifacts["design-contract.json"]?.domains?.flatMap((domain) => domain.candidates) ?? [];
  const evidenceIds = new Set((artifacts["evidence.json"]?.evidence ?? []).map((item) => item.evidence_id));
  const errors = [...missing.map((name) => `missing:${name}`)];
  for (const candidate of candidates) {
    if (!candidate.evidence_refs?.length || candidate.evidence_refs.some((ref) => !evidenceIds.has(ref))) errors.push(`invalid-evidence-ref:${candidate.candidate_id}`);
    if (!CONFIDENCE_STATES.includes(candidate.confidence?.state) || !candidate.confidence?.reason) errors.push(`invalid-confidence:${candidate.candidate_id}`);
    if (candidate.high_impact && candidate.confidence.state === "conflicted" && candidate.status.startsWith("accepted") && !candidate.corrections.some((item) => item.approval === true)) errors.push(`unapproved-high-impact-conflict:${candidate.candidate_id}`);
  }
  return { schema_version: "1.0.0", status: errors.length ? "invalid" : "valid", errors, aggregate_accuracy_score: null, production_ready: false };
}

export async function writeArtifactSet(output, input) {
  const target = path.resolve(output);
  await mkdir(path.join(target, "preview"), { recursive: true });
  const domains = EXTRACTION_DOMAINS.map((domain) => ({ domain, candidates: (input.candidates ?? []).filter((candidate) => candidate.domain === domain), unresolved: (input.unresolved ?? []).filter((item) => item.domain === domain) }));
  const artifacts = {
    "design.md": designMarkdown(input, domains),
    "design-contract.json": { schema_version: "1.0.0", contract_id: input.contract_id, version: input.version ?? "0.1.0", evidence_scope: input.evidence_scope, domains, accessibility: input.accessibility ?? [], exceptions: input.exceptions ?? [], unresolved_questions: input.unresolved ?? [], production_ready: false },
    "tokens.json": { schema_version: "1.0.0", tokens: input.candidates.filter((item) => !["components", "layout-patterns"].includes(item.domain)) },
    "components.json": { schema_version: "1.0.0", components: input.candidates.filter((item) => item.domain === "components") },
    "evidence.json": { schema_version: "1.0.0", evidence: input.evidence },
    "conflicts.json": { schema_version: "1.0.0", conflicts: input.conflicts ?? [] },
    "preview/index.html": previewHtml(input, domains),
  };
  artifacts["validation-report.json"] = validateArtifactSet({ ...artifacts, "validation-report.json": {} });
  for (const [name, value] of Object.entries(artifacts)) await writeFile(path.join(target, name), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  const hashes = {};
  for (const name of Object.keys(artifacts)) hashes[name] = createHash("sha256").update(await readFile(path.join(target, name))).digest("hex");
  await writeFile(path.join(target, "artifact-hashes.json"), `${JSON.stringify(hashes, null, 2)}\n`);
  return { output: target, validation: artifacts["validation-report.json"], hashes };
}

function designMarkdown(input, domains) { return `# ${input.title}\n\nStatus: corrected-candidate\nProduction ready: no\n\n## Design Intent\n${input.intent}\n\n## Evidence Scope\n${input.evidence_scope}\n\n${domains.map((entry) => `## ${entry.domain}\n${entry.candidates.length ? entry.candidates.map((candidate) => `- ${JSON.stringify(candidate.rule)} [${candidate.confidence.state}: ${candidate.confidence.reason}; evidence: ${candidate.evidence_refs.join(", ")}]`).join("\n") : "- Not observed or not-testable."}`).join("\n\n")}\n\n## Accessibility\n${(input.accessibility ?? []).map((item) => `- ${item}`).join("\n") || "- Requires product verification."}\n\n## Exceptions\n${(input.exceptions ?? []).map((item) => `- ${item}`).join("\n") || "- None recorded."}\n\n## Unresolved Questions\n${(input.unresolved ?? []).map((item) => `- ${item.question}`).join("\n") || "- None."}\n`;
}
function previewHtml(input, domains) { const rows = domains.map((entry) => `<section><h2>${escape(entry.domain)}</h2>${entry.candidates.map((candidate) => `<article><code>${escape(candidate.candidate_id)}</code><p>${escape(JSON.stringify(candidate.rule))}</p><small>${escape(candidate.confidence.state)} · ${escape(candidate.evidence_refs.join(", "))}</small></article>`).join("") || "<p>Not observed or not-testable.</p>"}</section>`).join(""); return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(input.title)}</title><style>*{box-sizing:border-box}body{font-family:system-ui;margin:0;background:#f4f4f1;color:#171714}main{max-width:1100px;margin:auto;padding:clamp(16px,4vw,32px)}section{border-top:1px solid #bbb;padding:20px 0}article{background:white;padding:12px;margin:8px 0;max-width:100%}article p,article code,article small{overflow-wrap:anywhere;word-break:break-word}code,small{color:#52685b}</style></head><body><main><h1>${escape(input.title)}</h1><p>${escape(input.evidence_scope)}</p>${rows}</main></body></html>`; }
function escape(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
