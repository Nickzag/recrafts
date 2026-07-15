#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { applyCorrection, createDomainCandidate, createSourceEvidence, writeArtifactSet } from "../runtime/task023_artifacts.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.manifest || !args.output) fail("Usage: node scripts/run-task023-artifact-set.mjs --manifest <file> --output <directory>");

const manifestPath = path.resolve(args.manifest);
const manifestRoot = path.dirname(manifestPath);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.schema_version !== "1.0.0" || !Array.isArray(manifest.sources) || !Array.isArray(manifest.candidates)) fail("Manifest must use schema 1.0.0 and contain sources and candidates arrays.");

const evidence = [];
for (const source of manifest.sources) {
  const localPath = source.local_ref ? path.resolve(manifestRoot, source.local_ref) : null;
  let hash = source.content_hash;
  if (localPath) {
    const sourceStat = await stat(localPath).catch(() => null);
    if (!sourceStat?.isFile()) fail(`Source file unavailable: ${source.local_ref}`);
    hash = createHash("sha256").update(await readFile(localPath)).digest("hex");
    if (source.content_hash && source.content_hash !== hash) fail(`Source hash mismatch: ${source.evidence_id}`);
  }
  evidence.push(createSourceEvidence({ ...source, content_hash: hash, local_ref: source.local_ref ?? null }));
}

const evidenceIds = new Set(evidence.map((item) => item.evidence_id));
const candidates = manifest.candidates.map((raw) => {
  if (raw.evidence_refs.some((ref) => !evidenceIds.has(ref))) fail(`Candidate ${raw.candidate_id} references unknown evidence.`);
  let candidate = createDomainCandidate(raw);
  for (const correction of raw.corrections ?? []) candidate = applyCorrection(candidate, correction);
  return candidate;
});

const result = await writeArtifactSet(args.output, {
  contract_id: manifest.contract_id,
  version: manifest.contract_version,
  title: manifest.title,
  intent: manifest.intent,
  evidence_scope: manifest.evidence_scope,
  evidence,
  candidates,
  conflicts: manifest.conflicts ?? [],
  unresolved: manifest.unresolved ?? [],
  accessibility: manifest.accessibility ?? [],
  exceptions: manifest.exceptions ?? [],
});
process.stdout.write(`${JSON.stringify({ status: result.validation.status, output: result.output, evidence_count: evidence.length, candidate_count: candidates.length }, null, 2)}\n`);
if (result.validation.status !== "valid") process.exitCode = 1;

function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) if (values[i].startsWith("--")) result[values[i].slice(2)] = values[i + 1], i += 1; return result; }
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
