import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseDesignMd, compileDesignIr, validateDesignIr } from "../packages/recrafts-design/index.mjs";
import { validatePreviewIntegrity } from "../runtime/design_preview_renderer.mjs";

const repository = process.cwd();
const taskRoot = path.join(repository, "dev-workflow", "benchmarks", "CN-DS-SYNTH-001");
const bundleRoot = path.join(repository, "dev-workflow", "review-bundles", "CN-DS-SYNTH-001-owner-review");
const errors = [];
const json = async (file) => JSON.parse(await readFile(file, "utf8"));

const designSource = await readFile(path.join(taskRoot, "canonical-candidate", "design.md"), "utf8");
const preview = await readFile(path.join(taskRoot, "canonical-candidate", "preview.html"), "utf8");
const ir = compileDesignIr(parseDesignMd(designSource));
try { validateDesignIr(ir); validatePreviewIntegrity({ designSource, html: preview }); } catch (error) { errors.push(error.message); }
if (ir.agent_usable !== false) errors.push("agent_usable must remain false");
if (ir.components.length < 13) errors.push("component contract coverage is incomplete");
if ((await json(path.join(taskRoot, "canonical-qualification", "gate-a", "gate-a-result.json"))).verdict !== "PASS") errors.push("Gate A is not PASS");
if ((await json(path.join(taskRoot, "canonical-qualification", "gate-b", "gate-b-result.json"))).verdict !== "PASS") errors.push("Gate B is not PASS");
if ((await json(path.join(taskRoot, "canonical-qualification", "layoutcrafts-utility.json"))).LAYOUTCRAFTS_UTILITY !== "DEGRADED") errors.push("Layoutcrafts utility boundary changed");

const walk = async (directory, prefix = "") => {
  const output = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path.join(directory, entry.name), relative));
    else if (relative !== "manifest.json") output.push(relative);
  }
  return output;
};
const manifest = await json(path.join(bundleRoot, "manifest.json"));
const actual = await walk(bundleRoot);
if (JSON.stringify(actual) !== JSON.stringify(manifest.required_files)) errors.push("Owner Bundle exact file set mismatch");
for (const file of actual) {
  const actualHash = createHash("sha256").update(await readFile(path.join(bundleRoot, file))).digest("hex");
  if (manifest.file_hashes[file] !== actualHash) errors.push(`Owner Bundle hash mismatch: ${file}`);
}
if (manifest.agent_usable !== false || manifest.status !== "OWNER_REVIEW_READY") errors.push("Owner Bundle authority boundary invalid");

if (errors.length) {
  process.stderr.write(`${JSON.stringify({ status: "FAIL", errors }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ status: "PASS", tokens: Object.values(ir.foundations).flat().length, components: ir.components.length, states: ir.states.length, compositions: ir.compositions.length, bundle_files: actual.length }, null, 2)}\n`);
}
