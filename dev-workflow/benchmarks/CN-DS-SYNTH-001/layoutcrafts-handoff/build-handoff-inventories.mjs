import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const handoff = import.meta.dirname;
const root = path.resolve(handoff, "..");
const design = await readFile(path.join(root, "canonical-candidate", "design.md"));
const ir = JSON.parse(await readFile(path.join(root, "canonical-qualification", "design-ir.json"), "utf8"));
const hash = createHash("sha256").update(design).digest("hex");
await writeFile(path.join(handoff, "design-md-sha256.txt"), `${hash}  canonical-candidate/design.md\n`);
await writeFile(path.join(handoff, "component-inventory.json"), `${JSON.stringify({
  schema: "cn-ds-synth.component-inventory/v1",
  candidate_id: "cn-ds-synth-001-canonical-candidate",
  components: ir.components.map(({ id, role, maturity, variants, states, unknowns }) => ({ id, role, maturity, variants, states, unknowns })),
}, null, 2)}\n`);
await writeFile(path.join(handoff, "state-inventory.json"), `${JSON.stringify({
  schema: "cn-ds-synth.state-inventory/v1",
  candidate_id: "cn-ds-synth-001-canonical-candidate",
  states: ir.states.map(({ id, trigger, certainty, accessibility_semantics }) => ({ id, trigger, certainty, accessibility_semantics })),
}, null, 2)}\n`);
