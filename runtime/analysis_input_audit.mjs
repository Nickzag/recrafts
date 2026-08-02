import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function treeFiles(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...await treeFiles(target)); else output.push(target);
  }
  return output;
}

export async function buildNoOracleReport({ root, input_files = [], prior_artifact_roots = [] }) {
  const resolvedRoot = path.resolve(root);
  const priorHashes = new Map();
  for (const priorRoot of prior_artifact_roots) {
    for (const file of await treeFiles(priorRoot)) priorHashes.set(sha(await readFile(file)), file);
  }
  const inputs = [];
  const findings = [];
  for (const relative of input_files) {
    const file = path.resolve(resolvedRoot, relative);
    if (file !== resolvedRoot && !file.startsWith(`${resolvedRoot}${path.sep}`)) {
      findings.push({ kind: "unsafe-input-path", file: relative });
      continue;
    }
    const digest = sha(await readFile(file));
    inputs.push({ file: path.relative(resolvedRoot, file), sha256: digest });
    if (/^(?:design\.md|DESIGN\.md)$/i.test(path.basename(file)) || /(?:^|[-_])(old|previous|oracle)(?:[-_.]|$)/i.test(path.basename(file))) findings.push({ kind: "forbidden-answer-artifact", file: relative });
    if (priorHashes.has(digest)) findings.push({ kind: "prior-artifact-hash-match", file: relative, prior_file: priorHashes.get(digest), sha256: digest });
  }
  return {
    report_id: `no-oracle-${sha(JSON.stringify(inputs)).slice(0, 16)}`,
    status: findings.length ? "fail" : "pass",
    inputs,
    prior_artifact_roots: prior_artifact_roots.map((item) => path.resolve(item)),
    findings,
    excluded_classes: ["prior design.md", "prior preview pixels", "prior Package artifacts", "prior review expected answers"],
    assertion: "Host inputs contain only fresh Evidence, capture policy, generic schemas, generic source-neutral instructions and declared target media."
  };
}
