#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  renderChineseHumanScoreMarkdown,
  renderHumanScoreHtml,
} from "./r009a-human-score-form.mjs";

const arguments_ = process.argv.slice(2);
const updateExisting = arguments_.includes("--update-existing");
const repositoryRoot = path.resolve(arguments_.find((value) => !value.startsWith("--")) ?? ".");
const corpusRoot = path.join(repositoryRoot, "benchmarks/L2-brand/static-coffee-static");
const candidateRunRoot = path.join(repositoryRoot, "benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-codex-gpt5-001");
const packageRoot = path.join(candidateRunRoot, "recrafts-package");
const reviewRoot = path.join(repositoryRoot, "benchmarks/L2-brand/static-coffee/reviews/r009a");
const imageRoot = "../../../../../.local-benchmark-sources/static-coffee-static-v1";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const pretty = (value) => escapeHtml(JSON.stringify(value, null, 2));
const writeNew = (file, value) => {
  if (existsSync(file) && !updateExisting) throw new Error(`Review workspace is immutable; refusing to overwrite ${file}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value);
};

const manifest = readJson(path.join(corpusRoot, "source/source-manifest.json"));
const regions = readJson(path.join(corpusRoot, "source/region-manifest.json"));
const reviewability = readJson(path.join(corpusRoot, "source/capability-reviewability.json"));
const scopeDecision = readJson(path.join(corpusRoot, "source/scope-decision.json"));
const evidenceMap = readJson(path.join(packageRoot, "evidence-map.json"));
const claims = readJson(path.join(packageRoot, "claims.json"));
const artifacts = [
  ["Tokens", "tokens.json", readJson(path.join(packageRoot, "tokens.json"))],
  ["Components", "components.json", readJson(path.join(packageRoot, "components.json"))],
  ["Grid Rules", "grid-rules.json", readJson(path.join(packageRoot, "grid-rules.json"))],
  ["Layout Rules", "layout-rules.json", readJson(path.join(packageRoot, "layout-rules.json"))],
  ["Visual Grammar", "visual-grammar.json", readJson(path.join(packageRoot, "visual-grammar.json"))],
  ["Conflicts", "conflicts.json", readJson(path.join(packageRoot, "conflicts.json"))],
  ["Presentation Grammar candidate", "../presentation-grammar.json", readJson(path.join(candidateRunRoot, "presentation-grammar.json"))],
];
const possibleIntent = readFileSync(path.join(candidateRunRoot, "design-rationale.md"), "utf8");

const artifactByRef = Object.fromEntries(artifacts.map(([, ref, value]) => [ref.replace("../", ""), value]));
const tokens = artifactByRef["tokens.json"]?.tokens ?? [];
const components = artifactByRef["components.json"]?.components ?? [];
const visualGrammar = artifactByRef["visual-grammar.json"]?.rules ?? artifactByRef["visual-grammar.json"]?.visual_grammar ?? [];
const presentationGrammar = artifactByRef["presentation-grammar.json"]?.rules ?? artifactByRef["presentation-grammar.json"]?.presentation_grammar ?? [];
const conflicts = artifactByRef["conflicts.json"]?.conflicts ?? [];
const valueTranslations = new Map([
  ["deep warm coffee red-brown", "深暖咖啡红棕色"], ["pale candy pink", "浅糖果粉色"], ["warm paper cream", "暖纸张奶油色"],
  ["light cyan secondary accent", "浅青色辅助强调色"], ["soft irregular lowercase display lettering", "柔和、不规则的小写展示字"],
  ["high-contrast editorial serif display", "高对比度编辑衬线展示字"], ["small uppercase monospaced utility text", "小号大写等宽功能文字"],
  ["loose handwritten annotation", "松散的手写批注"], ["coarse halftone organic floral silhouette", "粗颗粒半色调有机花卉轮廓"],
  ["warm low-key cafe photography with selective highlights", "暖色低调咖啡馆摄影，并使用选择性高光"],
]);
const tokenSummary = (token) => `${token.token_id}：${valueTranslations.get(token.value) ?? token.value}；范围为${token.scope === "project" ? "项目级" : token.scope}，置信度 ${token.confidence}`;
const componentSummary = (component) => `${component.component_id}：候选结果定义了 ${component.anatomy.length} 个结构部分、${component.variants.length} 个变体和 ${component.states.length} 个状态；范围为${component.scope === "project" ? "项目级" : component.scope}。`;
const emptyAware = (items, emptyText) => items.length ? items : [emptyText];
const candidateSummaries = {
  "brand-system-coherence": [...tokens.filter((token) => ["color", "typography", "image-treatment"].includes(token.category)).slice(0, 6).map(tokenSummary), ...components.slice(0, 2).map(componentSummary)],
  "typography-system-interpretation": tokens.filter((token) => token.category === "typography").map(tokenSummary),
  "color-system-interpretation": tokens.filter((token) => token.category === "color").map(tokenSummary),
  "cross-application-consistency": components.map(componentSummary),
  "visual-grammar-usefulness": emptyAware(visualGrammar.map((rule) => `视觉规则：${rule.rule_id ?? rule.id ?? JSON.stringify(rule)}`), "候选视觉语法文件没有可用规则；请判断这一缺失对后续实现的影响。"),
  "presentation-grammar-usefulness": emptyAware(presentationGrammar.map((rule) => `展示规则：${rule.rule_id ?? rule.id ?? JSON.stringify(rule)}`), "候选展示语法没有可用规则；请判断这一缺失对案例理解的影响。"),
  "possible-intent-discipline": [
    `候选主张共 ${claims.claims?.length ?? 0} 条；均应通过证据引用和状态区分观察事实与推断。`,
    `候选冲突共 ${conflicts.length} 条；样机环境范围冲突仍等待项目所有者决定。`,
    `设计意图说明已单独记录，共 ${possibleIntent.split("\n").filter(Boolean).length} 行，不能替代画面证据。`,
  ],
  "overall-usefulness": [
    `候选包包含 ${tokens.length} 个设计令牌、${components.length} 个组件和 ${claims.claims?.length ?? 0} 条主张。`,
    `视觉语法规则 ${visualGrammar.length} 条，展示语法规则 ${presentationGrammar.length} 条，冲突 ${conflicts.length} 条。`,
    "请结合代表性画面判断这些结果是否足以支持理解、实现和回归，而不是只按数量评分。",
  ],
};

const styles = `
:root{color-scheme:light;--ink:#181715;--muted:#6d6860;--paper:#f4f0e8;--panel:#fffdf8;--line:#d8d0c3;--accent:#5b452e;--ok:#2f6848;--pending:#8a5b12}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}header,main{max-width:1480px;margin:auto;padding:24px 32px}header{position:sticky;top:0;z-index:5;background:rgba(244,240,232,.96);border-bottom:1px solid var(--line)}h1{font:700 clamp(26px,4vw,48px)/1.08 Georgia,serif;margin:8px 0 12px}h2{font:700 27px/1.2 Georgia,serif;margin:32px 0 14px}h3{font:700 18px/1.3 Georgia,serif}.eyebrow,.meta{color:var(--muted);letter-spacing:.04em}.nav{display:flex;gap:14px;flex-wrap:wrap}.nav a,a{color:var(--accent)}.notice{border-left:5px solid var(--pending);padding:12px 16px;background:#fff5df}.ok{border-left-color:var(--ok);background:#edf7f0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;box-shadow:0 5px 18px rgba(47,39,28,.05)}img{display:block;width:100%;height:auto;border-radius:5px;background:#e7e1d6}.source-card img{aspect-ratio:14/8.4;object-fit:contain}.source-card.tall img{aspect-ratio:auto}.tag{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:2px 8px;margin:2px 3px 2px 0;color:var(--muted);font-size:12px}.split{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:20px}.mapping{margin:24px 0;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:10px}pre{overflow:auto;max-height:620px;padding:16px;background:#211f1c;color:#f7f1e7;border-radius:7px;white-space:pre-wrap;word-break:break-word}code{font-family:inherit}table{width:100%;border-collapse:collapse;background:var(--panel)}th,td{border:1px solid var(--line);padding:9px;text-align:left;vertical-align:top}th{background:#eae3d8}@media(max-width:850px){header,main{padding:18px}.split{grid-template-columns:1fr}header{position:static}}
`;

function shell(title, subtitle, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${styles}</style></head><body><header><div class="eyebrow">R-009A · MODE B · HUMAN REVIEW</div><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(subtitle)}</div><nav class="nav"><a href="review-index.html">Review index</a><a href="source-contact-sheet.html">Source contact sheet</a><a href="artifact-index.html">Artifact index</a><a href="side-by-side-map.html">Side-by-side map</a><a href="human-score-form.html">中文评分</a></nav></header><main>${body}</main></body></html>`;
}

const regionsBySource = new Map();
for (const region of regions.regions) regionsBySource.set(region.source_id, [...(regionsBySource.get(region.source_id) ?? []), region]);
const evidenceBySource = new Map();
for (const evidence of evidenceMap.evidence) evidenceBySource.set(evidence.source_id, [...(evidenceBySource.get(evidence.source_id) ?? []), evidence]);
const claimsByEvidence = new Map();
for (const claim of claims.claims) for (const evidenceId of claim.evidence_refs ?? []) claimsByEvidence.set(evidenceId, [...(claimsByEvidence.get(evidenceId) ?? []), claim]);

const indexBody = `
<div class="notice ok"><strong>Source scope stabilized.</strong> Mode B records 20 static Sources, 35 Regions and 14 reviewable static capability categories. Four GIF modules and motion grammar are explicit Project Owner-approved exclusions.</div>
<div class="notice"><strong>Human calibration is pending.</strong> Nick must enter eight 1–5 scores with reasons and Artifact/Evidence references, then confirm or revise the proposed medium-conflict resolution. No score or acceptance verdict is prefilled.</div>
<section class="grid">
  <article class="card"><h2>01 · Source review</h2><p>Inspect all local Source Pack images, Source/Region IDs and declared classifications.</p><a href="source-contact-sheet.html">Open contact sheet →</a></article>
  <article class="card"><h2>02 · Artifact review</h2><p>Inspect Evidence, Claims, canonical candidates, conflicts and benchmark-only inference candidates.</p><a href="artifact-index.html">Open Artifact index →</a></article>
  <article class="card"><h2>03 · Compare</h2><p>Trace each Source to its Regions, Evidence IDs and Claims without expected-answer content.</p><a href="side-by-side-map.html">Open side-by-side map →</a></article>
  <article class="card"><h2>04 · 中文评分</h2><p>使用可视化 1–5 评分卡填写理由和引用，生成并复制结构化 JSON。</p><a href="human-score-form.html">打开中文评分页 →</a><p class="meta">Reviewer: Nick · Role: Project Owner</p></article>
</section>
<h2>Scope decision</h2><div class="panel"><pre>${pretty(scopeDecision)}</pre></div>
<h2>Capability reviewability</h2><table><thead><tr><th>Capability</th><th>Reviewable</th><th>Region references</th></tr></thead><tbody>${reviewability.capabilities.map((item) => `<tr><td>${escapeHtml(item.capability_id)}</td><td>${item.reviewable ? "YES" : "NO"}</td><td>${item.region_refs.map((ref) => `<span class="tag">${escapeHtml(ref)}</span>`).join("")}</td></tr>`).join("")}</tbody></table>`;
writeNew(path.join(reviewRoot, "review-index.html"), shell("Static Coffee review workspace", "Candidate run · run-static-coffee-20260715-codex-gpt5-001", indexBody));

const sourceCards = manifest.sources.map((source) => {
  const sourceRegions = regionsBySource.get(source.source_id) ?? [];
  const sourceEvidence = evidenceBySource.get(source.source_id) ?? [];
  return `<article class="card source-card"><img src="${imageRoot}/${escapeHtml(source.local_path)}" alt="${escapeHtml(source.source_id)}"><h3>${escapeHtml(source.source_id)} · ${escapeHtml(source.section_ref)}</h3><div>${sourceRegions.map((region) => `<span class="tag">${escapeHtml(region.region_id)} · ${escapeHtml(region.classification)}</span>`).join("")}</div><p><strong>Evidence:</strong> ${sourceEvidence.map((item) => `<span class="tag">${escapeHtml(item.evidence_id)}</span>`).join("") || "none"}</p><p class="meta">${source.dimensions.width}×${source.dimensions.height} · ${escapeHtml(source.sha256)}</p></article>`;
}).join("");
writeNew(path.join(reviewRoot, "source-contact-sheet.html"), shell("Source contact sheet", `${manifest.sources.length} local-only static Sources · ${regions.regions.length} Regions`, `<div class="notice">Images are loaded from the Git-ignored local Source Pack. Broken images mean the local pack has not been restored or validated.</div><section class="grid">${sourceCards}</section><h2>Excluded Regions</h2><div class="panel"><pre>${pretty(regions.excluded_regions)}</pre></div>`));

const artifactSections = [
  ["Evidence map", "recrafts-package/evidence-map.json", evidenceMap],
  ["Claims", "recrafts-package/claims.json", claims],
  ...artifacts,
].map(([title, ref, value]) => `<details class="mapping" ${title === "Conflicts" ? "open" : ""}><summary><strong>${escapeHtml(title)}</strong> · <code>${escapeHtml(ref)}</code></summary><pre>${pretty(value)}</pre></details>`).join("");
writeNew(path.join(reviewRoot, "artifact-index.html"), shell("Artifact index", "Candidate Package · package-a5adf72a7eecac57 · awaiting-review", `<div class="notice">This page presents candidate output for human review. Empty Layout Rules or Visual Grammar are disclosed runtime limitations, not expected answers.</div>${artifactSections}<details class="mapping" open><summary><strong>Possible Design Intent candidates</strong> · <code>design-rationale.md</code></summary><pre>${escapeHtml(possibleIntent)}</pre></details>`));

const mappings = manifest.sources.map((source) => {
  const sourceRegions = regionsBySource.get(source.source_id) ?? [];
  const sourceEvidence = evidenceBySource.get(source.source_id) ?? [];
  const sourceClaims = [...new Map(sourceEvidence.flatMap((evidence) => claimsByEvidence.get(evidence.evidence_id) ?? []).map((claim) => [claim.claim_id, claim])).values()];
  return `<section class="mapping"><h2>${escapeHtml(source.source_id)} · ${escapeHtml(source.section_ref)}</h2><div class="split"><div><img src="${imageRoot}/${escapeHtml(source.local_path)}" alt="${escapeHtml(source.source_id)}"></div><div><h3>Regions</h3>${sourceRegions.map((region) => `<p><span class="tag">${escapeHtml(region.region_id)}</span> ${escapeHtml(region.classification)} · confidence ${region.confidence}</p>`).join("")}<h3>Evidence</h3>${sourceEvidence.map((item) => `<p><span class="tag">${escapeHtml(item.evidence_id)}</span> ${escapeHtml(item.evidence_type)} · ${escapeHtml(item.status)}</p>`).join("")}<h3>Claims using this Evidence</h3>${sourceClaims.map((claim) => `<p><span class="tag">${escapeHtml(claim.claim_id)}</span> ${escapeHtml(claim.claim_type)} · ${escapeHtml(claim.status)}</p>`).join("") || "<p>None</p>"}</div></div></section>`;
}).join("");
writeNew(path.join(reviewRoot, "side-by-side-map.html"), shell("Source → Evidence → Claim map", "Traceability aid · no expected visual answers", `<div class="notice">Region classifications and Claims are review candidates. The image remains the Source; Host output is never promoted to Evidence.</div>${mappings}`));

const scoreReviewContext = {
  sources: Object.fromEntries(manifest.sources.map((source) => [source.source_id, {
    source_id: source.source_id,
    image_src: `${imageRoot}/${source.local_path}`,
  }])),
  candidate_summaries: candidateSummaries,
};
writeNew(path.join(reviewRoot, "human-score-form.md"), renderChineseHumanScoreMarkdown());
writeNew(path.join(reviewRoot, "human-score-form.html"), renderHumanScoreHtml(scoreReviewContext));

const correctionProposal = {
  proposal_status: "pending-project-owner-confirmation",
  proposal_note: "This is not an executed correction. Confirm, revise or reject it after side-by-side review.",
  proposed_correction: {
    correction_id: "correction-r009a-static-coffee-owner-001",
    base_package_id: "package-a5adf72a7eecac57",
    actor: "Nick",
    actor_role: "project-owner",
    created_at: "2026-07-15T10:00:00+08:00",
    reason: "Resolve the candidate Package's medium mockup-context scope conflict without promoting mockup environment details into the brand system.",
    operations: [{
      operation_id: "resolve-mockup-context-scope-001",
      type: "resolve-conflict",
      target_id: "conflict-mockup-context-scope",
      before: { status: "open" },
      after: {
        status: "resolved",
        selected_candidate: "token.image.moody-warm-photo",
        rejected_candidates: [],
        accepted_scope: "project-scoped photography direction",
        excluded_context: ["cafe interiors", "wood frames", "platform-like controls"],
      },
      evidence_refs: ["ev-23046c00f866069e", "ev-2fd7c73c4313ae4b", "ev-e3ac1885f5d23653"],
      claim_refs: ["claim-token.image.moody-warm-photo"],
      reason: "The repeated warm low-key photography is useful at project scope, while the surrounding mockup environment is contextual and must not become a global visual token.",
    }],
    decision_context: {
      corpus_id: "l2-brand-static-coffee-static-v1",
      candidate_run_id: "run-static-coffee-20260715-codex-gpt5-001",
      review_workspace: "benchmarks/L2-brand/static-coffee/reviews/r009a",
      owner_confirmation_required: true,
    },
  },
};
writeNew(path.join(reviewRoot, "correction-proposals.json"), `${JSON.stringify(correctionProposal, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({ status: updateExisting ? "updated" : "created", review_root: path.relative(repositoryRoot, reviewRoot), sources: manifest.sources.length, regions: regions.regions.length, reviewer: "Nick", reviewer_role: "Project Owner", human_score_status: "pending", correction_proposal_status: "pending-project-owner-confirmation" }, null, 2)}\n`);
