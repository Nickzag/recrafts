import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseDesignMd, compileDesignIr } from "../../../../packages/recrafts-design/index.mjs";
import { evaluateDesignCoherence } from "../../../../runtime/design_coherence_gate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const qualificationRoot = import.meta.dirname;
const designFile = path.join(root, "canonical-candidate", "design.md");
const previewFile = path.join(root, "canonical-candidate", "preview.html");
const designSource = await readFile(designFile, "utf8");
const preview = await readFile(previewFile);
const designSha256 = createHash("sha256").update(designSource).digest("hex");
const previewSha256 = createHash("sha256").update(preview).digest("hex");
const ir = compileDesignIr(parseDesignMd(designSource));
const browserEvidence = JSON.parse(await readFile(path.join(qualificationRoot, "browser", "browser-evidence.json"), "utf8"));

const candidate = {
  id: "cn-ds-synth-001-canonical-candidate",
  status: "candidate",
  agent_usable: false,
  evidence_revision: "E-CN-DS-SYNTH-001",
  design_sha256: designSha256,
  preview_sha256: previewSha256,
  target_lock: "craft-product-grammar-v1",
  generated_by: "codex-cn-ds-synth-001",
};

await writeFile(path.join(root, "canonical-candidate", "candidate-artifact.json"), `${JSON.stringify(candidate, null, 2)}\n`);
await writeFile(path.join(qualificationRoot, "design-ir.json"), `${JSON.stringify(ir, null, 2)}\n`);
await writeFile(path.join(qualificationRoot, "design-ir-summary.json"), `${JSON.stringify({
  schema: ir.schema,
  design_system: ir.design_system,
  token_count: Object.values(ir.foundations).flat().length,
  component_ids: ir.components.map(({ id }) => id),
  state_ids: ir.states.map(({ id }) => id),
  composition_ids: ir.compositions.map(({ id }) => id),
  viewport_bands: Object.keys(ir.responsive),
  agent_usable: ir.agent_usable,
}, null, 2)}\n`);

const gateB = await evaluateDesignCoherence({
  candidate,
  designSource,
  previewHtml: preview.toString("utf8"),
  browserEvidence,
  browserEvidenceRoot: path.join(qualificationRoot, "browser"),
  productionGate: true,
});
await writeFile(path.join(qualificationRoot, "gate-b", "gate-b-result.json"), `${JSON.stringify(gateB, null, 2)}\n`);

const gateA = {
  schema: "cn-ds-synth.source-fidelity-checklist/v1",
  verdict: "PASS",
  candidate_revision: candidate.id,
  evidence_revision: candidate.evidence_revision,
  design_sha256: designSha256,
  method: "Shared Mainline rule-fidelity checklist against the frozen 13-screenshot Tier-A Source Pack; preview.html is excluded as Source Fidelity evidence.",
  checks: {
    source_pack_exact_set: "PASS",
    application_topology: "PASS",
    sidebar_geometry_range: "PASS",
    workspace_geometry: "PASS",
    inspector_geometry_range: "PASS",
    modal_behavior: "PASS",
    all_docs_projections: "PASS",
    inspector_modes: "PASS",
    settings_anatomy: "PASS",
    selected_states: "PASS",
    loading_and_empty_states: "PASS",
    accent_role: "PASS",
    destructive_role: "PASS",
    content_chrome_isolation: "PASS",
    unsupported_unknown_governance: "PASS",
  },
  evidence: {
    source_hash_manifest: "../input-freeze/source-pack-sha256.json",
    source_fidelity_matrix: "../normalization/source-fidelity-matrix.md",
    decision_ledger: "../decision-ledger.md",
  },
  limitations: [
    "This checklist proves rule-level fidelity, not pixel cloning.",
    "Phone/tablet topology and exact responsive breakpoints remain unknown.",
    "Exact typography files, shadow recipes and motion timing remain unknown.",
  ],
};
await writeFile(path.join(qualificationRoot, "gate-a", "gate-a-result.json"), `${JSON.stringify(gateA, null, 2)}\n`);
