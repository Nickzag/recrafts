import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [packageDirectory, outputFile] = process.argv.slice(2);
if (!packageDirectory || !outputFile) throw new Error("Usage: node scripts/build-extraction-quality-summary.mjs <package-dir> <output-file>");
const readJson = async (file) => JSON.parse(await readFile(path.join(packageDirectory, file), "utf8"));
const manifest = await readJson("source-manifest.json");
const classification = await readJson("source-classification.json");
const evidence = await readJson("evidence-map.json");
const tokens = await readJson("tokens.json");
const components = await readJson("components.json");
const questions = await readFile(path.join(packageDirectory, "open-questions.md"), "utf8");
const design = await readFile(path.join(packageDirectory, "design.md"), "utf8");
const regions = classification.sources.flatMap((source) => source.regions);
const evidenceIds = new Set(evidence.evidence.map((item) => item.evidence_id));
const canonicalCandidates = tokens.tokens.filter((token) => token.status !== "suggested");
const candidateEvidence = canonicalCandidates.flatMap((token) => token.evidence_refs ?? []);
const componentEvidence = components.components.flatMap((component) => component.evidence_refs ?? []);
const statuses = [...evidence.evidence, ...tokens.tokens].reduce((result, item) => ({ ...result, [item.status]: (result[item.status] ?? 0) + 1 }), {});
const summary = {
  diagnostic_only: true,
  universal_quality_score: null,
  source_coverage: manifest.sources.length ? 1 : 0,
  classified_region_coverage: regions.length ? regions.filter((region) => region.class !== "unknown").length / regions.length : 0,
  provenance_coverage: candidateEvidence.length ? candidateEvidence.filter((id) => evidenceIds.has(id)).length / candidateEvidence.length : 1,
  canonical_candidate_count: canonicalCandidates.length,
  observed_count: statuses.observed ?? 0,
  inferred_count: statuses.inferred ?? 0,
  suggested_count: statuses.suggested ?? 0,
  confirmed_count: statuses.confirmed ?? 0,
  rejected_count: statuses.rejected ?? 0,
  not_testable_count: (design.match(/not-testable|unsupported/gi) ?? []).length,
  component_evidence_coverage: componentEvidence.length ? componentEvidence.filter((id) => evidenceIds.has(id)).length / componentEvidence.length : components.components.length ? 0 : 1,
  open_high_impact_question_count: questions.split("\n").filter((line) => /^- /.test(line) && /\?|\[P0\]|unresolved-high-impact/i.test(line)).length,
  contamination_findings: tokens.tokens.filter((token) => token.scope === "global" && ["user-generated-content","marketing-surface"].includes(token.source_class)).length,
};
await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
