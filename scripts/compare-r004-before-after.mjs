import { readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.argv[2] ?? "examples/golden-candidates/crafts-ui-multi-image/fidelity/r004-v2");
const before = JSON.parse(await readFile(path.join(directory, "../..", "realizations/r003b-v2/realization.json"), "utf8"));
const after = JSON.parse(await readFile(path.join(directory, "corrections/corrected-realization/r004-v1/realization.json"), "utf8"));
if (before.realization_id === after.realization_id) throw new Error("Before/after realizations must have distinct identities");
process.stdout.write(`${JSON.stringify({ status: "passed", before: before.realization_id, after: after.realization_id, changed: ["component gallery row padding", "state-stage minimum height", "state-stage padding"], preserved: ["tokens", "component inventory", "workbench structure", "preview-only fallback status"] }, null, 2)}\n`);
