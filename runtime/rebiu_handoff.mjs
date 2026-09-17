import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const handoffSchema = loadSchema(new URL("../schemas/rebiu-recrafts-handoff.schema.json", import.meta.url));
const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

const CONTEXT_CERTAINTY = Object.freeze({ measured: "observed", observed: "observed", inferred: "inferred", unknown: "unknown" });
const SAFE_CLAIM_CERTAINTY = new Set(["observed", "inferred", "unknown"]);

export function normalizeHandoffCertainty(value) {
  const normalized = CONTEXT_CERTAINTY[String(value ?? "unknown").toLowerCase()] ?? "unknown";
  return SAFE_CLAIM_CERTAINTY.has(normalized) ? normalized : "unknown";
}

export function validateRebiuHandoff(value) {
  assertSchema(value, handoffSchema, "Rebiu→Recrafts handoff");
  if (value.target !== "recrafts" || value.sourceSkill !== "rebiu" || value.status !== "handoff-ready") {
    throw Object.assign(new Error("Rebiu handoff authority envelope is invalid"), { code: "HANDOFF_AUTHORITY_INVALID" });
  }
  return { valid: true, schema: value.schemaVersion };
}

export async function loadRebiuHandoff(file) {
  const value = JSON.parse(await readFile(file, "utf8"));
  validateRebiuHandoff(value);
  return value;
}

function normalizedDrivers(handoff) {
  return (handoff.fidelityDrivers ?? []).map((entry) => {
    if (typeof entry === "string") return { claim: entry, certainty: "unknown", authority: "context-only" };
    return {
      claim: String(entry?.claim ?? ""),
      certainty: normalizeHandoffCertainty(entry?.certainty),
      authority: "context-only"
    };
  }).filter(({ claim }) => claim.length > 0);
}

function mixedAssetDescriptors(handoff) {
  if (handoff.referenceType !== "mixed") return [];
  return (handoff.referenceSet?.items ?? []).filter((item) => item && typeof item === "object").filter((item) =>
    item.generated === true || item.releaseAsset === true || /asset|image|illustration|photo/i.test(String(item.role ?? item.kind ?? "")) || item.assetPath || item.assetUrl
  ).map((item) => ({
    id: String(item.id ?? `asset-${sha256(item).slice(0, 10)}`),
    role: String(item.role ?? item.kind ?? "isolated-media-asset"),
    path: item.assetPath ?? null,
    url: item.assetUrl ?? null,
    provenance: item.provenance ?? { producer: "rebiu", source_skill_version: handoff.sourceSkillVersion },
    authority: "asset-only",
    evidence_scope: ["asset-identity", "asset-provenance"],
    forbidden_claim_scope: ["layout", "typography", "tokens", "components", "composition"],
    final_composition_authority: "recrafts"
  }));
}

export function normalizeRebiuHandoff(handoff) {
  validateRebiuHandoff(handoff);
  return {
    schema: "recrafts.intake-context/v1",
    context_id: `rebiu-${sha256(handoff).slice(0, 16)}`,
    source_schema: handoff.schemaVersion,
    producer: { skill: handoff.sourceSkill, version: handoff.sourceSkillVersion },
    authority: "context-only",
    evidence_revision_authority: false,
    source_fidelity_authority: false,
    design_coherence_authority: false,
    release_authority: false,
    requires_actual_source_inspection: true,
    reference_type_hint: handoff.referenceType,
    intent: handoff.intent,
    fidelity_drivers: normalizedDrivers(handoff),
    source_bound: [...(handoff.sourceBound ?? [])],
    user_locks: [...(handoff.userLocks ?? [])],
    variables: [...(handoff.variables ?? [])],
    uncertain: [...(handoff.uncertain ?? [])],
    requested_outputs: [...(handoff.requestedOutputs ?? [])],
    preferences: structuredClone(handoff.preferences ?? {}),
    mixed_assets: mixedAssetDescriptors(handoff),
    rebiu_resume: structuredClone(handoff.rebiuResume ?? {}),
    authority_boundary: {
      canonical_design_source: "recrafts.design/v1 design.md",
      preview_authority: "recrafts",
      final_composition_authority: "recrafts",
      handoff_is_evidence: false
    }
  };
}

export function validateHandoffIntake({ handoff, sources }) {
  validateRebiuHandoff(handoff);
  if (!Array.isArray(sources) || sources.length === 0) {
    throw Object.assign(new Error("Rebiu handoff requires actual source references for Recrafts evidence recovery"), { code: "HANDOFF_SOURCE_REQUIRED" });
  }
  return { valid: true, source_count: sources.length, can_claim_source_fidelity: false };
}

function firstObservedSourceFont(evidence = []) {
  for (const record of evidence) {
    if (record?.evidence_type !== "font" || record?.status === "stale") continue;
    const value = record.value ?? {};
    const family = value.family ?? value.font_family ?? value.fontFamily ?? null;
    if (!family || typeof family !== "string") continue;
    if (value.status && value.status !== "loaded") continue;
    const weight = value.weight ?? value.font_weight ?? value.fontWeight ?? null;
    return { family, weight, evidence_ref: record.evidence_id, certainty: "observed" };
  }
  return null;
}

const roleDecision = (family, weights, certainty, authority, evidenceRefs = []) => ({ family: [family], weights: [...new Set(weights.filter(Number.isFinite))], certainty, authority, evidence_refs: evidenceRefs });

export function deriveTypographyContext({ handoff, evidence = [] }) {
  validateRebiuHandoff(handoff);
  const sourceFont = firstObservedSourceFont(evidence);
  const chinese = handoff.preferences?.chineseTypography ?? null;
  if (sourceFont) {
    const weight = Number(sourceFont.weight);
    const weights = Number.isFinite(weight) ? [weight] : [];
    return {
      schema: "recrafts.typography-context/v1",
      authority: "source-evidence-backed-context",
      source_font_override: true,
      roles: {
        display: roleDecision(sourceFont.family, weights, "observed", "recrafts-source-evidence", [sourceFont.evidence_ref]),
        heading: roleDecision(sourceFont.family, weights, "observed", "recrafts-source-evidence", [sourceFont.evidence_ref]),
        body: roleDecision(sourceFont.family, weights, "observed", "recrafts-source-evidence", [sourceFont.evidence_ref])
      },
      renderer_fallback: chinese?.rendererFallback ? { family: chinese.rendererFallback, explicit: true, record_substitution: true, authority: "renderer-fallback-only" } : null
    };
  }
  if (!chinese?.preferredFamily) {
    return { schema: "recrafts.typography-context/v1", authority: "unknown", source_font_override: false, roles: {}, renderer_fallback: null };
  }
  const display = (chinese.displayWeights ?? [700, 900]).map(Number).filter((v) => [700, 900].includes(v));
  const heading = Number(chinese.headingWeight ?? 700);
  const subheading = Number(chinese.subheadingWeight ?? 500);
  const body = Number(chinese.bodyWeight ?? 400);
  const secondary = (chinese.secondaryWeights ?? [300, 400]).map(Number).filter((v) => [300, 400].includes(v));
  const all = [...display, heading, subheading, body, ...secondary];
  if (all.includes(600)) throw Object.assign(new Error("Source Han Sans SC 600 is not an allowed canonical default"), { code: "TYPOGRAPHY_DEFAULT_INVALID" });
  return {
    schema: "recrafts.typography-context/v1",
    authority: "inferred-default-context",
    source_font_override: false,
    roles: {
      display: roleDecision(chinese.preferredFamily, display.length ? display : [700, 900], "inferred", "handoff-preference"),
      heading: roleDecision(chinese.preferredFamily, [heading], "inferred", "handoff-preference"),
      subheading: roleDecision(chinese.preferredFamily, [subheading], "inferred", "handoff-preference"),
      body: roleDecision(chinese.preferredFamily, [body], "inferred", "handoff-preference"),
      secondary: roleDecision(chinese.preferredFamily, secondary.length ? secondary : [300, 400], "inferred", "handoff-preference")
    },
    renderer_fallback: {
      family: chinese.rendererFallback ?? "Noto Sans CJK SC",
      explicit: true,
      record_substitution: true,
      authority: "renderer-fallback-only"
    }
  };
}

export async function attachRebiuHandoffContext({ handoff, outputDirectory }) {
  const context = normalizeRebiuHandoff(handoff);
  const evidenceFile = path.join(outputDirectory, "analysis", "evidence-bundle.json");
  const manifestFile = path.join(outputDirectory, "analysis", "input-manifest.json");
  const instructionsFile = path.join(outputDirectory, "analysis", "host-instructions.md");
  const [evidenceBundle, manifest, instructions] = await Promise.all([
    readFile(evidenceFile, "utf8").then(JSON.parse),
    readFile(manifestFile, "utf8").then(JSON.parse),
    readFile(instructionsFile, "utf8")
  ]);
  const evidenceBefore = sha256(evidenceBundle);
  const typography = deriveTypographyContext({ handoff, evidence: evidenceBundle.evidence ?? [] });
  const contextFiles = ["analysis/rebiu-handoff-context.json", "analysis/typography-context.json"];
  if (context.mixed_assets.length) contextFiles.push("analysis/external-media-context.json");
  await writeJson(path.join(outputDirectory, contextFiles[0]), context);
  await writeJson(path.join(outputDirectory, contextFiles[1]), typography);
  if (context.mixed_assets.length) await writeJson(path.join(outputDirectory, contextFiles[2]), {
    schema: "recrafts.external-media-context/v1",
    authority: "context-only",
    final_composition_authority: "recrafts",
    assets: context.mixed_assets
  });
  await writeJson(manifestFile, {
    ...manifest,
    context_files: contextFiles,
    context_authority: "non-evidentiary",
    handoff_schema: handoff.schemaVersion
  });
  await writeFile(instructionsFile, `${instructions.trim()}\n\n## Non-authoritative intake context\n\nRead the listed context files only as intent, locks, preferences, and asset provenance. They are not Evidence and must not be cited as measured source facts. Recrafts source Evidence remains authoritative. Never promote handoff observed/inferred claims to measured without Recrafts Evidence.\n`);
  const evidenceAfter = sha256(JSON.parse(await readFile(evidenceFile, "utf8")));
  if (evidenceAfter !== evidenceBefore) throw Object.assign(new Error("Handoff attachment mutated the Evidence bundle"), { code: "HANDOFF_EVIDENCE_MUTATION" });
  return { context_files: contextFiles, evidence_bundle_sha256: evidenceBefore, context_id: context.context_id, typography };
}
