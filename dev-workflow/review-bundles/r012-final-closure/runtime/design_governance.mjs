import { assertGovernanceObject } from "../packages/recrafts-design/src/schema_runtime.mjs";
export { evaluateSourceFidelity } from "./design_fidelity_gate.mjs";
export { evaluateDesignCoherence } from "./design_coherence_gate.mjs";

const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

export function createEvidenceRevision(input) {
  const value = { schema: "recrafts.evidence-revision/v2", ...structuredClone(input), immutable: true };
  assertGovernanceObject("evidenceRevision", value);
  return deepFreeze(value);
}

export function createCandidateRevision(input) {
  const value = { schema: "recrafts.candidate-revision/v2", ...structuredClone(input), status: "candidate", agent_usable: false, immutable: true };
  assertGovernanceObject("candidate", value);
  return deepFreeze(value);
}

export function promoteDesignRelease() {
  throw new Error("In-memory promotion is forbidden; use the persistent Design Release Store with an imported Owner Decision receipt");
}
