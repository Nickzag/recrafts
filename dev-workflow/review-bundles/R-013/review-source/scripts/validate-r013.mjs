#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { evaluateDesignIntelligence } from "../runtime/design_intelligence.mjs";
import { DESIGN_OPERATIONS } from "../runtime/design_system_runtime.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/r013/holdout-kanban/design-intelligence.json", import.meta.url), "utf8"));
const result = evaluateDesignIntelligence(fixture);
if (result.verdict !== "PASS") throw new Error(`Novel holdout failed: ${result.failures.join(", ")}`);
if (DESIGN_OPERATIONS.length !== 11) throw new Error(`Protocol surface drifted to ${DESIGN_OPERATIONS.length} Design Operations`);
const required = [
  "full_source_comprehension", "product_understanding_layer", "evidence_tier_authority", "visual_measurement",
  "component_maturity", "preview_intelligence", "downstream_utility"
];
for (const gate of required) if (result.gates[gate] !== "PASS") throw new Error(`${gate} is not PASS`);
process.stdout.write(`${JSON.stringify({ status: "PASS", operation_count: DESIGN_OPERATIONS.length, holdout: result, protocol_delta: "none" }, null, 2)}\n`);
