#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { stabilizeStaticSourcePack } from "./r009a-core.mjs";

const repositoryRoot = path.resolve(process.argv[2] ?? ".");
const originalCorpusRoot = path.join(repositoryRoot, "benchmarks/L2-brand/static-coffee");
const corpusRoot = path.join(repositoryRoot, "benchmarks/L2-brand/static-coffee-static");
const originalPackRoot = path.join(repositoryRoot, ".local-benchmark-sources/static-coffee-v1-isolated-v3");
const sourcePackRoot = path.join(repositoryRoot, ".local-benchmark-sources/static-coffee-static-v1");
const corpusId = "l2-brand-static-coffee-static-v1";
const sourcePackId = "static-coffee-static-source-pack-v1";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const copyJson = (from, to, transform = (value) => value) => writeJson(to, transform(readJson(from)));

if (existsSync(corpusRoot) && readdirSync(corpusRoot).length > 0) {
  throw new Error(`Derived Corpus output must be empty; refusing to overwrite ${corpusRoot}`);
}

const originalManifest = readJson(path.join(originalCorpusRoot, "source/source-manifest.json"));
const originalRegions = readJson(path.join(originalCorpusRoot, "source/region-manifest.json"));
const scopeDecision = {
  decision_id: "scope-static-coffee-static-v1-mode-b",
  mode: "static-only",
  owner_name: "Nick",
  owner_role: "Project Owner",
  approved_at: "2026-07-15T09:30:00+08:00",
  original_corpus_id: "l2-brand-static-coffee-v1",
  derived_corpus_id: corpusId,
  scope: "static brand identity and case-study presentation",
  excluded_capabilities: ["motion-presentation-grammar"],
  excluded_modules: [
    {
      module_id: "animated-project-module-01",
      source_url: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/74fc88251828539.6a4144034d78b.gif",
      reason: "Mode B intentionally excludes animated media from the static-only benchmark scope.",
      impact_assessment: "The transition itself cannot be scored; the twenty static modules still cover all fourteen declared static capability categories.",
      capability_impact: ["motion-presentation-grammar"],
      owner_approved: true,
    },
    {
      module_id: "animated-project-module-02",
      source_url: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/f08c50251828539.6a41d42ea97eb.gif",
      reason: "Mode B intentionally excludes animated media from the static-only benchmark scope.",
      impact_assessment: "Animated sequencing is unavailable for review but does not remove evidence for the declared static brand-system categories.",
      capability_impact: ["motion-presentation-grammar"],
      owner_approved: true,
    },
    {
      module_id: "animated-project-module-03",
      source_url: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/b88fe1251828539.6a413f0dcf040.gif",
      reason: "Mode B intentionally excludes animated media from the static-only benchmark scope.",
      impact_assessment: "Motion behavior remains untested; typography, color, packaging, editorial and cross-application evidence remain reviewable from static sources.",
      capability_impact: ["motion-presentation-grammar"],
      owner_approved: true,
    },
    {
      module_id: "animated-project-module-04",
      source_url: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/4b4b73251828539.6a41407950de8.gif",
      reason: "Mode B intentionally excludes animated media from the static-only benchmark scope.",
      impact_assessment: "The Corpus makes no claim about animation fidelity; all fourteen in-scope static categories retain traceable Region evidence.",
      capability_impact: ["motion-presentation-grammar"],
      owner_approved: true,
    },
  ],
};

writeJson(path.join(corpusRoot, "corpus.json"), {
  corpus_id: corpusId,
  version: "1.0.0",
  level: "L2-brand",
  domain: "brand-identity",
  status: "candidate",
  scope: scopeDecision.scope,
  source_pack_id: sourcePackId,
  source_pack_status: "stable-static",
  rubric_version: "1.0.0",
  baseline_run_id: null,
  latest_run_id: null,
});

writeJson(path.join(corpusRoot, "source/source-manifest.json"), {
  ...originalManifest,
  corpus_id: corpusId,
  source_pack_id: sourcePackId,
  source_pack_version: "1.0.0",
  parent_source_pack_id: originalManifest.source_pack_id,
  capture_status: "stable-static",
  capture_scope: "static brand identity and case-study presentation",
  missing_sources: [],
  intentional_exclusions: scopeDecision.excluded_modules.map((entry) => entry.module_id),
  scope_decision_id: scopeDecision.decision_id,
});
writeJson(path.join(corpusRoot, "source/region-manifest.json"), { ...originalRegions, corpus_id: corpusId });
writeJson(path.join(corpusRoot, "source/scope-decision.json"), scopeDecision);

const capabilityRegions = {
  "brand-identity-narrative": ["region-01-system", "region-06-presentation", "region-19-presentation", "region-20-presentation"],
  "logo-wordmark-system": ["region-01-system", "region-04-application", "region-08-application", "region-16-application"],
  "typography-system": ["region-01-system", "region-06-editorial", "region-10-editorial", "region-16-editorial"],
  "editorial-hierarchy": ["region-06-editorial", "region-10-editorial", "region-16-editorial", "region-17-editorial"],
  "color-system": ["region-01-system", "region-04-application", "region-08-application", "region-15-application"],
  "halftone-image-treatment": ["region-01-system", "region-03-editorial", "region-06-editorial", "region-17-editorial"],
  "floral-texture-pattern": ["region-01-system", "region-03-packaging", "region-06-editorial", "region-17-editorial"],
  "packaging-system": ["region-02-packaging", "region-03-packaging", "region-09-packaging", "region-10-packaging", "region-11-packaging", "region-12-packaging", "region-13-packaging", "region-14-packaging"],
  "signage-spatial-system": ["region-15-signage", "region-17-signage", "region-18-signage"],
  "photography-direction": ["region-02-photography", "region-04-photography", "region-09-photography", "region-18-photography"],
  "editorial-composition": ["region-03-editorial", "region-06-editorial", "region-10-editorial", "region-16-editorial", "region-17-editorial"],
  "presentation-sequence": ["region-01-presentation", "region-06-presentation", "region-19-presentation", "region-20-presentation"],
  "brand-visual-grammar": ["region-01-system", "region-03-packaging", "region-06-editorial", "region-15-signage"],
  "cross-application-consistency": ["region-04-application", "region-05-application", "region-08-application", "region-15-application", "region-16-application"],
};
writeJson(path.join(corpusRoot, "source/capability-reviewability.json"), {
  corpus_id: corpusId,
  source_pack_id: sourcePackId,
  status: "reviewable",
  capabilities: Object.entries(capabilityRegions).map(([capability_id, region_refs]) => ({ capability_id, reviewable: true, region_refs })),
});

for (const relative of [
  "expectations/hard-gates.json",
  "expectations/required-capabilities.json",
  "expectations/scope-boundaries.json",
  "rubric/scorecard.json",
]) copyJson(path.join(originalCorpusRoot, relative), path.join(corpusRoot, relative));
mkdirSync(path.join(corpusRoot, "rubric"), { recursive: true });
writeFileSync(path.join(corpusRoot, "rubric/human-review-form.md"), readFileSync(path.join(originalCorpusRoot, "rubric/human-review-form.md")));

writeFileSync(path.join(corpusRoot, "README.md"), `# Static Coffee Static-only L2 Brand Corpus\n\nThis Mode B Corpus freezes the twenty public static project modules as a stable benchmark for static brand identity and case-study presentation. Motion grammar and four animated modules are intentional, Project Owner-approved exclusions. The original \`l2-brand-static-coffee-v1\` Corpus remains partial and unchanged.\n\nRaw third-party media stays under \`.local-benchmark-sources/static-coffee-static-v1/\` and is excluded from Git. This Corpus commits only source metadata, hashes, Region classifications, scope decisions and review contracts. It contains capability requirements, not expected visual answers.\n`);
writeFileSync(path.join(corpusRoot, "capture-policy.md"), `# Static Coffee Static-only Capture Policy\n\nSource: \`https://www.behance.net/gallery/251828539/Static-Coffee-Brand-Identity\`\n\nThe qualified local Source Pack is \`static-coffee-static-source-pack-v1\`. It contains twenty isolated static project modules copied byte-for-byte from the captured public project assets. Page screenshots are diagnostics and are not analysis sources. All hashes must validate before review.\n\nThe four documented GIF modules and \`motion-presentation-grammar\` are outside this version's declared scope. Their omission is intentional under the Project Owner-approved Mode B decision in \`source/scope-decision.json\`; the Corpus must not be used to claim motion fidelity. Raw third-party media is local-only and Git-ignored under the \`metadata-and-hashes-only\` redistribution policy.\n`);
mkdirSync(path.join(corpusRoot, "reviews"), { recursive: true });
writeFileSync(path.join(corpusRoot, "reviews/corpus-review.md"), `# Static Coffee Static-only Corpus Review\n\nStatus: PENDING\n\nMode B scope was approved by Nick (Project Owner). The derived Corpus remains a candidate until human scoring, normal correction, Artifact acceptance, baseline validation and an explicit Golden promotion verdict are complete.\n\n## Project-owner verdict\n\n- Verdict: PENDING\n- Reviewer identity: Nick\n- Reviewer role: Project Owner\n- Reviewed at: PENDING\n- Decision set: PENDING\n`);

const registryFile = path.join(repositoryRoot, "benchmarks/registry.json");
const registry = readJson(registryFile);
if (registry.corpora.some((entry) => entry.corpus_id === corpusId)) throw new Error(`Registry already contains ${corpusId}`);
registry.corpora.push({
  corpus_id: corpusId,
  level: "L2-brand",
  domain: "brand-identity",
  status: "candidate",
  scope: scopeDecision.scope,
  excluded_capabilities: ["motion-presentation-grammar"],
  source_type: "public-case-study",
  source_reference: originalManifest.source_url,
  source_pack_required: true,
  source_pack_status: "stable-static",
  redistribution_policy: "metadata-and-hashes-only",
  rubric_version: "1.0.0",
  baseline_run_id: null,
  latest_run_id: null,
});
writeJson(registryFile, registry);

stabilizeStaticSourcePack({
  originalPackRoot,
  outputRoot: sourcePackRoot,
  corpusId,
  sourcePackId,
  captureStatus: "stable-static",
  scopeDecisionFile: path.join(corpusRoot, "source/scope-decision.json"),
});

process.stdout.write(`${JSON.stringify({ status: "created", corpus_id: corpusId, source_pack_id: sourcePackId, source_count: originalManifest.sources.length, region_count: originalRegions.regions.length, excluded_module_count: scopeDecision.excluded_modules.length }, null, 2)}\n`);
