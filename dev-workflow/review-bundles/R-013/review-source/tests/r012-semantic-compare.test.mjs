import assert from "node:assert/strict";
import test from "node:test";
import { compileDesignIr, parseDesignMd } from "../packages/recrafts-design/index.mjs";
import { canonical } from "./r012-design-parser.test.mjs";
import * as compare from "../runtime/design_compare.mjs";

const support = (ir) => Object.fromEntries(["foundations", "components", "states", "compositions", "responsive", "agent_rules", "constraints", "unknowns"].map((domain) => [domain, { "*": [`E-${domain}`] }]));
const entry = (id, ir) => ({ id, evidence_revision: "E1", design_ir: ir, evidence_support: support(ir) });

test("Semantic Compare reports per-domain agreement without voting or whole-Candidate recommendation", () => {
  const ir = compileDesignIr(parseDesignMd(canonical));
  const result = compare.compareDesignCandidates([entry("C1", ir), entry("C2", structuredClone(ir))]);
  assert.equal(result.schema, "recrafts.candidate-comparison/v2");
  assert.equal(result.voting_used, false);
  assert.equal(result.decision_ledger_candidate.schema, "recrafts.decision-ledger-candidate/v1");
  assert.equal(result.decision_ledger_candidate.numeric_averaging_used, false);
  assert.equal(result.decision_ledger_candidate.winner_selected, false);
  assert.ok(result.decision_ledger_candidate.records.every(({ classification }) => ["AGREEMENT", "COMPATIBLE_DIFFERENCE", "CONFLICT", "UNSUPPORTED", "UNKNOWN"].includes(classification)));
  assert.equal(Object.hasOwn(result, "recommended_candidate"), false);
  assert.deepEqual(Object.keys(result.domains), ["foundations", "components", "states", "compositions", "responsive", "agent_rules", "constraints", "unknowns"]);
  assert.ok(result.summary.agreement > 0);
  assert.equal(result.summary.conflict, 0);
});

test("Semantic Compare distinguishes compatible difference, conflict, unsupported, and unknown", () => {
  const base = compileDesignIr(parseDesignMd(canonical));
  const changed = structuredClone(base);
  changed.foundations.color[0].confidence = 0.91;
  changed.foundations.color[1].value = "#eeeeee";
  changed.foundations.color[2].certainty = "unknown";
  delete changed.foundations.color[2].value;
  const second = entry("C2", changed);
  second.evidence_support.components = {};
  const result = compare.compareDesignCandidates([entry("C1", base), second]);
  const classifications = new Set(Object.values(result.domains).flatMap((records) => records.map(({ classification }) => classification)));
  for (const classification of ["compatible-difference", "conflict", "unsupported", "unknown"]) assert.ok(classifications.has(classification), classification);
});
