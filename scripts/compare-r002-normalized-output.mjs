import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [left, right] = process.argv.slice(2);
if (!left || !right) throw new Error("Usage: node scripts/compare-r002-normalized-output.mjs <left> <right>");
const files = ["source-manifest.json","source-classification.json","evidence-map.json","tokens.json","layout.json","components.json","design.md","open-questions.md"];
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["timestamp","generated_at"].includes(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  return value;
}
for (const file of files) {
  const a = await readFile(path.join(left, file), "utf8");
  const b = await readFile(path.join(right, file), "utf8");
  const normalizedA = file.endsWith(".json") ? JSON.stringify(normalize(JSON.parse(a))) : a.replace(/run-[a-f0-9]+/g, "run-normalized");
  const normalizedB = file.endsWith(".json") ? JSON.stringify(normalize(JSON.parse(b))) : b.replace(/run-[a-f0-9]+/g, "run-normalized");
  if (normalizedA !== normalizedB) throw new Error(`Normalized output differs: ${file}`);
}
console.log(`R-002 normalized outputs match (${files.length} artifacts)`);
