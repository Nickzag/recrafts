import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const scannedExtensions = new Set([".txt", ".html", ".svg", ".json", ".md", ".css", ".js", ".mjs"]);
const allowedSegments = new Set(["evidence", "provenance", "review", "source-reference", "source-observations", "captures", "analysis", "comparison", "input", "validation"]);
const allowedSourceFiles = new Set(["source-manifest.json", "source-observations.json", "source-observed.json", "evidence-map.json", "claims.json"]);
const legalSymbols = /[®™℠]/gu;
const provenanceKeys = new Set(["source_capture_ids", "analysis_ids", "correction_ids", "decision_ids", "capture_id", "source_id"]);

async function files(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...await files(target));
    else if (scannedExtensions.has(path.extname(entry.name).toLowerCase())) output.push(target);
  }
  return output;
}

const allowedSourcePath = (root, file) => allowedSourceFiles.has(path.basename(file)) || path.relative(root, file).split(path.sep).some((segment) => allowedSegments.has(segment));

function reusableJsonContent(file, content) {
  if (path.extname(file).toLowerCase() !== ".json") return content;
  try {
    const removeProvenance = (value, key = "") => {
      if (key.endsWith("_refs") || key.endsWith("_id") || key.endsWith("_ids") || key.endsWith("_file") || key.endsWith("_path") || provenanceKeys.has(key)) return undefined;
      if (Array.isArray(value)) return value.map((item) => removeProvenance(item)).filter((item) => item !== undefined);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, removeProvenance(child, childKey)]).filter(([, child]) => child !== undefined));
      return value;
    };
    return JSON.stringify(removeProvenance(JSON.parse(content)));
  } catch {
    return content;
  }
}

export async function scanIdentitySafety(root, options = {}) {
  const findings = [];
  const legalRecords = (options.legal_records ?? []).filter((record) => record.status === "authorized");
  for (const file of await files(root)) {
    const relative = path.relative(root, file);
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(legalSymbols)) {
      const context = content.slice(Math.max(0, match.index - 80), match.index + 81);
      const authorized = legalRecords.some((record) => record.symbol === match[0] && context.includes(record.text));
      if (!authorized && !allowedSourcePath(root, file)) findings.push({ kind: "unapproved-legal-symbol", file: relative, symbol: match[0], context });
    }
    if (!allowedSourcePath(root, file)) {
      const reusableContent = reusableJsonContent(file, content);
      for (const name of options.source_names ?? []) if (name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "iu").test(reusableContent)) findings.push({ kind: "source-name", file: relative, value: name });
      for (const slogan of options.source_slogans ?? []) if (slogan && reusableContent.toLowerCase().includes(slogan.toLowerCase())) findings.push({ kind: "source-slogan", file: relative, value: slogan });
    }
  }
  return { status: findings.length ? "blocked" : "pass", findings };
}
