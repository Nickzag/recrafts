export const HUMAN_SCORE_MODULES = [
  {
    module_id: "brand-system-coherence", label_zh: "品牌系统一致性",
    description_zh: "候选结果是否把标志、字体、色彩、图形和应用组织成一个连贯系统。",
    focus_zh: ["核心标志与字标是否稳定", "粉色、咖啡色、奶油色等是否形成一致关系", "半色调花卉图形是否贯穿不同应用"],
    source_ids: ["source-1", "source-3", "source-8", "source-15", "source-17"],
    anchors: { 1: "候选系统与画面明显冲突，或关键视觉语言缺失", 3: "主要元素基本正确，但关系、边界或复用方式不完整", 5: "关键元素及其关系均准确、连贯并可直接复用" },
  },
  {
    module_id: "typography-system-interpretation", label_zh: "字体系统理解",
    description_zh: "候选结果是否正确识别字标、衬线展示字、等宽信息字和手写点缀的角色与层级。",
    focus_zh: ["标题、正文和辅助信息的角色差异", "编辑版式中的字号与层级", "字体角色在菜单、包装和展示中的一致性"],
    source_ids: ["source-1", "source-6", "source-10", "source-16"],
    anchors: { 1: "字体角色或层级判断与画面明显不符", 3: "主要字体角色基本正确，但使用边界不完整", 5: "字体角色、层级、组合和使用边界均准确" },
  },
  {
    module_id: "color-system-interpretation", label_zh: "色彩系统理解",
    description_zh: "候选结果是否正确识别主色、辅助色、对比关系及其适用范围。",
    focus_zh: ["咖啡红棕与粉色的主次关系", "奶油色与青色的辅助作用", "不同载体上的色彩组合是否一致"],
    source_ids: ["source-1", "source-4", "source-8", "source-12", "source-15"],
    anchors: { 1: "主要颜色、关系或范围判断明显错误", 3: "核心色彩基本正确，但角色或使用边界不完整", 5: "色彩、关系、作用范围和跨应用表现均准确" },
  },
  {
    module_id: "cross-application-consistency", label_zh: "跨应用一致性",
    description_zh: "候选结果是否准确解释同一品牌语言如何跨包装、服装、菜单和空间标牌延续。",
    focus_zh: ["字标在不同尺寸与材质上的变化", "包装、编辑和标牌是否共享同一视觉语法", "变化是否仍保持品牌识别"],
    source_ids: ["source-4", "source-5", "source-8", "source-15", "source-16", "source-17"],
    anchors: { 1: "把不同应用误判为互不相关或错误归纳", 3: "识别到主要一致性，但缺少变化规则或边界", 5: "准确解释跨载体的一致元素、变化方式和约束" },
  },
  {
    module_id: "visual-grammar-usefulness", label_zh: "视觉语法实用性",
    description_zh: "候选结果是否把色彩、字体、图形、裁切和留白之间的关系整理成可执行规则。",
    focus_zh: ["半色调图形的裁切与叠加方式", "大标题、信息文字和留白的关系", "图像、底色和品牌元素的组合规律"],
    source_ids: ["source-1", "source-3", "source-6", "source-10", "source-17"],
    anchors: { 1: "没有形成可执行关系，或规则与画面冲突", 3: "部分关系可用，但关键组合或限制仍缺失", 5: "规则完整、可追溯，并足以指导一致实现" },
  },
  {
    module_id: "presentation-grammar-usefulness", label_zh: "案例展示语法实用性",
    description_zh: "候选结果是否正确解释案例从系统介绍到应用展示的顺序、节奏和信息密度。",
    focus_zh: ["系统总览与应用细节的先后顺序", "全幅画面与信息密集画面的节奏", "收尾画面是否形成完整叙事"],
    source_ids: ["source-1", "source-6", "source-10", "source-19", "source-20"],
    anchors: { 1: "顺序和节奏判断与案例明显不符", 3: "识别到基本展示结构，但缺少节奏或转场规则", 5: "准确描述展示顺序、节奏、密度和叙事作用" },
  },
  {
    module_id: "possible-intent-discipline", label_zh: "可能设计意图的推断纪律",
    description_zh: "候选结果是否把推测保留为可审阅主张，并避免把摄影环境或样机背景误升为全局系统。",
    focus_zh: ["画面事实与可能意图是否分开", "咖啡馆环境是否被错误当作品牌规则", "不确定结论是否保留范围和替代解释"],
    source_ids: ["source-2", "source-5", "source-9", "source-18"],
    anchors: { 1: "大量把环境或推测当成确定系统结论", 3: "主要范围正确，但部分推断缺少不确定性说明", 5: "事实、推断、范围和不确定性均清晰且可审计" },
  },
  {
    module_id: "overall-usefulness", label_zh: "整体实用性",
    description_zh: "整个候选包是否足以支持后续理解、实现和回归比较，而不会误导使用者。",
    focus_zh: ["系统结论是否覆盖主要视觉领域", "结论能否从代表性画面得到核对", "缺失项和运行时限制是否清楚披露"],
    source_ids: ["source-1", "source-3", "source-10", "source-15", "source-18", "source-20"],
    anchors: { 1: "整体不可用，关键内容错误或缺失且会误导实现", 3: "可用于基本理解，但仍需大量人工补充或修正", 5: "整体准确、完整、透明，可直接支持实现和回归" },
  },
];

export const SCORE_LABELS = [
  [1, "严重不足"],
  [2, "明显不足"],
  [3, "基本可用"],
  [4, "良好"],
  [5, "优秀"],
].map(([score, label]) => ({ score, label }));

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export function renderChineseHumanScoreMarkdown() {
  const rows = HUMAN_SCORE_MODULES
    .map(({ module_id, label_zh }) => `| ${label_zh} | \`${module_id}\` | | | | |`)
    .join("\n");
  return `# R-009A 人工评分表 — Static Coffee 静态版

状态：待评分

## 审阅人

- 姓名：Nick
- 角色：项目所有者
- 审阅日期：
- 语料集：\`l2-brand-static-coffee-static-v1@1.0.0\`
- 来源包：\`static-coffee-static-source-pack-v1@1.0.0\`
- 候选运行：\`run-static-coffee-20260715-codex-gpt5-001\`
- 审阅环境：本地 R-009A 并排审阅工作区
- 来源包哈希已验证：是 / 否
- 修正提案已审阅：是 / 否

## 评分说明

- 1：严重不足
- 2：明显不足
- 3：基本可用
- 4：良好
- 5：优秀

每项必须填写具体理由。产物引用和证据引用为可选技术信息；填写时必须使用有效引用。

| 评分模块 | 稳定 ID | 分数（1–5） | 理由 | 产物引用（可选） | 证据引用（可选） |
|---|---|---:|---|---|---|
${rows}

## 中等影响冲突修正提案

- 提案：仅将 \`token.image.moody-warm-photo\` 保留为项目范围的摄影方向；咖啡馆室内、木框和类似界面控件的样机环境不进入全局或系统令牌。
- 决定：确认 / 修订 / 拒绝
- 决定理由：

## 人工审阅结论

- 状态：待评分 / 已完成
- 是否需要修正：
`;
}

function renderScoreCard(module, reviewContext) {
  const { module_id, label_zh, description_zh, focus_zh, source_ids, anchors } = module;
  const options = SCORE_LABELS.map(({ score, label }) => `
          <label class="score-option">
            <input type="radio" name="score-${module_id}" value="${score}">
            <span><strong>${score}</strong><small>${label}</small></span>
          </label>`).join("");
  const sources = source_ids.map((sourceId, index) => reviewContext.sources?.[sourceId]).filter(Boolean);
  const sourceCards = sources.length ? sources.map((source, index) => `
          <figure><img src="${escapeHtml(source.image_src)}" alt="${escapeHtml(label_zh)}对应画面 ${index + 1}"><figcaption><strong>画面 ${index + 1}</strong><span>${escapeHtml(focus_zh[index % focus_zh.length])}</span><small>${escapeHtml(source.source_id)}</small></figcaption></figure>`).join("") : `<p class="empty">当前没有可显示的对应画面。</p>`;
  const summaries = reviewContext.candidate_summaries?.[module_id] ?? [];
  const summaryItems = summaries.length ? `<ul>${summaries.map((summary) => `<li>${escapeHtml(summary)}</li>`).join("")}</ul>` : `<p class="empty">当前未提取到内容。这是候选运行的已披露限制，请结合画面判断影响。</p>`;
  return `
      <section class="score-card" data-module="${module_id}">
        <div class="card-heading">
          <div><p class="module-id">${module_id}</p><h2>${label_zh}</h2></div>
          <span class="card-state" id="state-${module_id}">待填写</span>
        </div>
        <div class="review-subject"><h3>你正在评价什么</h3><p>${escapeHtml(description_zh)}</p><div class="focus-list">${focus_zh.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>
        <div class="source-strip"><h3>对应画面</h3><p class="section-help">这些画面是本项评分的直接参考。请对照画面判断候选结论是否准确。</p><div class="source-grid">${sourceCards}</div></div>
        <div class="candidate-summary"><h3>候选提取结果</h3>${summaryItems}</div>
        <div class="score-guide"><h3>如何评分</h3><div class="anchor-grid"><p><strong>1 分</strong>${escapeHtml(anchors[1])}</p><p><strong>3 分</strong>${escapeHtml(anchors[3])}</p><p><strong>5 分</strong>${escapeHtml(anchors[5])}</p></div><p class="section-help">2 分和 4 分表示相邻标准之间的程度。</p></div>
        <fieldset class="score-options"><legend>评分（1–5）</legend>${options}
        </fieldset>
        <div class="field-grid">
          <label class="wide">评分理由（必填）<textarea name="reason-${module_id}" rows="3" placeholder="请说明哪些内容准确、哪些内容缺失或不受画面支持，以及这些问题对使用的影响。"></textarea></label>
        </div>
        <details class="technical-refs"><summary>可选：技术引用</summary><div class="field-grid"><label>产物引用（可选）<textarea name="artifacts-${module_id}" rows="2" placeholder="例如：tokens.json, components.json"></textarea></label><label>证据引用（可选）<textarea name="evidence-${module_id}" rows="2" placeholder="例如：ev-863027be96b90182"></textarea></label></div></details>
        <p class="field-error" id="error-${module_id}" aria-live="polite"></p>
      </section>`;
}

export function renderHumanScoreHtml(reviewContext = { sources: {}, candidate_summaries: {} }) {
  const scoreCards = HUMAN_SCORE_MODULES.map((module) => renderScoreCard(module, reviewContext)).join("");
  const moduleIds = JSON.stringify(HUMAN_SCORE_MODULES.map(({ module_id }) => module_id));
  const styles = `
:root{color-scheme:light;--ink:#181715;--muted:#6d6860;--paper:#f4f0e8;--panel:#fffdf8;--line:#d8d0c3;--accent:#5b452e;--accent-soft:#eee5d8;--ok:#2f6848;--ok-soft:#edf7f0;--error:#9b2f2f;--error-soft:#fff0ee}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}header,main{max-width:1280px;margin:auto;padding:24px 32px}header{border-bottom:1px solid var(--line)}h1,h2{font-family:Georgia,serif}h1{font-size:clamp(30px,5vw,54px);line-height:1.04;margin:8px 0 12px}h2{font-size:25px;margin:2px 0}h3{margin:0 0 9px;font-size:16px}.eyebrow,.meta,.description,.module-id,.section-help{color:var(--muted)}.module-id{font-size:12px;margin:0 0 5px}.nav{display:flex;gap:14px;flex-wrap:wrap}.nav a,a{color:var(--accent)}.notice,.review-meta,.conflict,.output{margin:20px 0;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.notice{border-left:5px solid #8a5b12}.review-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.review-meta .fixed{padding:12px;background:var(--accent-soft);border-radius:7px}.score-card{margin:24px 0;padding:24px;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 5px 18px rgba(47,39,28,.05)}.score-card.complete{border-color:#7aa78c}.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.card-state{padding:4px 9px;border:1px solid var(--line);border-radius:99px;color:var(--muted);font-size:12px}.complete .card-state{background:var(--ok-soft);border-color:#b9d6c3;color:var(--ok)}.review-subject,.candidate-summary,.score-guide{margin:16px 0;padding:16px;border-radius:9px;background:var(--accent-soft)}.focus-list{display:flex;gap:8px;flex-wrap:wrap}.focus-list span{padding:5px 9px;border:1px solid #cfc3b4;border-radius:99px;background:#fffaf2}.source-strip{margin:18px 0}.source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.source-grid figure{margin:0;border:1px solid var(--line);border-radius:9px;overflow:hidden;background:white}.source-grid img{display:block;width:100%;aspect-ratio:14/8.4;object-fit:contain;background:#eee8dd}.source-grid figcaption{display:grid;gap:3px;padding:10px}.source-grid figcaption small{color:var(--muted)}.candidate-summary ul{margin:0;padding-left:20px}.candidate-summary li+li{margin-top:7px}.empty{color:var(--muted);font-style:italic}.anchor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.anchor-grid p{margin:0;padding:12px;background:white;border:1px solid var(--line);border-radius:7px}.anchor-grid strong{display:block;font-size:18px;color:var(--accent)}fieldset{border:0;padding:0;margin:16px 0}legend{font-weight:700;margin-bottom:8px}.score-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.score-option{position:relative}.score-option input{position:absolute;opacity:0;pointer-events:none}.score-option span{display:flex;min-height:66px;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:white;cursor:pointer;transition:.15s ease}.score-option span strong{font:700 24px/1 Georgia,serif}.score-option span small{margin-top:5px;color:var(--muted)}.score-option input:focus-visible+span{outline:3px solid #b79876;outline-offset:2px}.score-option input:checked+span{background:var(--accent);border-color:var(--accent);color:white}.score-option input:checked+span small{color:#eee5d8}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field-grid .wide{grid-column:1/-1}.technical-refs{margin-top:14px;padding:12px;border:1px dashed var(--line);border-radius:8px}.technical-refs summary{cursor:pointer;font-weight:700}textarea,input[type=date]{display:block;width:100%;margin-top:6px;padding:11px;border:1px solid #bdb4a6;border-radius:7px;background:white;color:var(--ink);font:inherit;resize:vertical}.check{display:flex;gap:9px;align-items:flex-start;padding:12px;background:white;border:1px solid var(--line);border-radius:7px}.field-error,#form-errors{color:var(--error)}.field-error{min-height:22px}.progress{position:sticky;bottom:16px;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:26px 0;padding:14px 18px;background:rgba(33,31,28,.96);color:white;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18)}button{padding:11px 17px;border:0;border-radius:7px;background:var(--accent);color:white;font:inherit;cursor:pointer}button:hover{filter:brightness(1.1)}pre{min-height:100px;max-height:560px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#211f1c;color:#f7f1e7;padding:16px;border-radius:8px}.success{color:var(--ok)}@media(max-width:760px){header,main{padding:18px}.review-meta,.field-grid,.source-grid,.anchor-grid{grid-template-columns:1fr}.score-options{grid-template-columns:repeat(5,1fr)}.score-option span small{display:none}.progress{position:static;align-items:stretch;flex-direction:column}}
.source-grid{display:flex;grid-template-columns:none;gap:12px;overflow-x:auto;padding:0 0 10px;scroll-snap-type:x proximity}.source-grid figure{flex:0 0 min(390px,82vw);scroll-snap-align:start}.progress{position:static}
`;
  const script = `
const moduleIds=${moduleIds};
const splitRefs=(value)=>[...new Set(value.split(/[\\n,]/).map((item)=>item.trim()).filter(Boolean))];
const artifactRefValid=(value)=>!value.startsWith("/")&&!value.split("/").includes("..");
const evidenceRefValid=(value)=>/^ev-[a-z0-9-]+$/.test(value);
const field=(name)=>document.querySelector('[name="'+name+'"]');

function readModule(moduleId,{showErrors=false}={}){
  const card=document.querySelector('[data-module="'+moduleId+'"]');
  const score=document.querySelector('input[name="score-'+moduleId+'"]:checked');
  const reason=field('reason-'+moduleId).value.trim();
  const artifact_refs=splitRefs(field('artifacts-'+moduleId).value);
  const evidence_refs=splitRefs(field('evidence-'+moduleId).value);
  const errors=[];
  if(!score)errors.push("请选择 1–5 分");
  if(!reason)errors.push("请填写评分理由");
  if(artifact_refs.some((ref)=>!artifactRefValid(ref)))errors.push("已填写的产物引用必须是安全的相对路径，不能以 / 开头或包含 ..");
  if(evidence_refs.some((ref)=>!evidenceRefValid(ref)))errors.push("已填写的证据引用必须以 ev- 开头且只包含小写字母、数字或连字符");
  const complete=errors.length===0;
  card.classList.toggle("complete",complete);
  document.getElementById("state-"+moduleId).textContent=complete?"已完成":"待填写";
  document.getElementById("error-"+moduleId).textContent=showErrors?errors.join("；"):"";
  return {card,errors,value:score?{module_id:moduleId,score:Number(score.value),reason,artifact_refs,evidence_refs}:null};
}

function updateCompletion(){
  const completed=moduleIds.map((id)=>readModule(id)).filter((entry)=>entry.errors.length===0).length;
  document.getElementById("completed-count").textContent=String(completed);
}

document.getElementById("score-form").addEventListener("input",updateCompletion);
document.getElementById("generate").addEventListener("click",async()=>{
  const modules=moduleIds.map((id)=>readModule(id,{showErrors:true}));
  const reviewDate=document.getElementById("review-date");
  const hashVerified=document.getElementById("source-pack-hash-verified");
  const proposalReviewed=document.getElementById("correction-proposal-reviewed");
  const conflict=document.querySelector('input[name="conflict-decision"]:checked');
  const conflictReason=document.getElementById("conflict-reason").value.trim();
  const errors=[];
  if(!reviewDate.value)errors.push("请选择审阅日期");
  if(!hashVerified.checked)errors.push("请确认 Source Pack Hash 已验证");
  if(!proposalReviewed.checked)errors.push("请确认 Correction Proposal 已审阅");
  if(modules.some((entry)=>entry.errors.length))errors.push("请完成全部八项评分");
  if(!conflict)errors.push("请选择 Medium Conflict 决定");
  if(!conflictReason)errors.push("请填写 Medium Conflict 决定理由");
  const errorBox=document.getElementById("form-errors");
  errorBox.className="";
  errorBox.textContent=errors.join("；");
  if(errors.length){
    const firstInvalid=modules.find((entry)=>entry.errors.length)?.card||reviewDate;
    firstInvalid.scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
  const result={
    status:"complete",reviewer_name:"Nick",reviewer_role:"Project Owner",review_date:reviewDate.value,
    corpus_id:"l2-brand-static-coffee-static-v1",corpus_version:"1.0.0",
    source_pack_id:"static-coffee-static-source-pack-v1",source_pack_version:"1.0.0",
    candidate_run_id:"run-static-coffee-20260715-codex-gpt5-001",
    review_environment:"local R-009A side-by-side workspace",
    source_pack_hash_verified:true,correction_proposals_reviewed:true,
    correction_decision:{verdict:conflict.value,reason:conflictReason},
    scores:modules.map((entry)=>entry.value)
  };
  const json=JSON.stringify(result,null,2);
  document.getElementById("json-preview").textContent=json;
  try{
    await navigator.clipboard.writeText(json);
    errorBox.className="success";
    errorBox.textContent="JSON 已生成并复制到剪贴板。请将其交回 Codex 继续验证。";
  }catch{
    errorBox.textContent="JSON 已生成，但无法访问剪贴板。请从下方预览区手动复制。";
  }
});
updateCompletion();
`;
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R-009A 人工评分</title><style>${styles}</style></head>
<body>
  <header>
    <div class="eyebrow">R-009A · 模式 B · 项目所有者审阅</div>
    <h1>Static Coffee 人工评分</h1>
    <p class="meta">独立评分页 · 不自动保存或提交</p>
    <nav class="nav"><a href="review-index.html">审阅首页</a><a href="source-contact-sheet.html">来源画面对照</a><a href="artifact-index.html">候选产物索引</a><a href="side-by-side-map.html">画面与结论对照</a></nav>
  </header>
  <main>
    <div class="notice"><strong>填写提醒：</strong>页面刷新会清空尚未复制的输入。页面只在浏览器内生成 JSON，不写入文件，也不会执行修正。</div>
    <form id="score-form" novalidate>
      <section class="review-meta">
        <div class="fixed"><strong>审阅人</strong><br>Nick · 项目所有者</div>
        <div class="fixed"><strong>候选运行</strong><br>run-static-coffee-20260715-codex-gpt5-001</div>
        <label>审阅日期<input type="date" id="review-date"></label>
        <div><label class="check"><input type="checkbox" id="source-pack-hash-verified">确认来源包哈希已验证</label><label class="check"><input type="checkbox" id="correction-proposal-reviewed">确认修正提案已审阅</label></div>
      </section>
      <p class="meta">评分含义：1 严重不足 · 2 明显不足 · 3 基本可用 · 4 良好 · 5 优秀</p>
${scoreCards}
      <section class="conflict">
        <p class="module-id">conflict-mockup-context-scope</p><h2>中等影响冲突修正提案</h2>
        <p>仅将 <code>token.image.moody-warm-photo</code> 保留为项目范围摄影方向；咖啡馆室内、木框和类似界面控件的样机环境不进入全局或系统令牌。</p>
        <fieldset class="score-options"><legend>项目所有者决定</legend>
          <label class="score-option"><input type="radio" name="conflict-decision" value="CONFIRM"><span><strong>确认</strong><small>CONFIRM</small></span></label>
          <label class="score-option"><input type="radio" name="conflict-decision" value="REVISE"><span><strong>修订</strong><small>REVISE</small></span></label>
          <label class="score-option"><input type="radio" name="conflict-decision" value="REJECT"><span><strong>拒绝</strong><small>REJECT</small></span></label>
        </fieldset>
        <label>决定理由<textarea id="conflict-reason" rows="3" placeholder="说明确认、修订或拒绝的依据。"></textarea></label>
      </section>
      <div class="progress"><strong>完成度：<span id="completed-count">0</span> / 8</strong><button id="generate" type="button">生成并复制 JSON</button></div>
      <p id="form-errors" role="alert" aria-live="assertive"></p>
      <section class="output"><h2>JSON 预览</h2><p class="meta">生成成功后，从这里核对或手动复制。</p><pre id="json-preview" tabindex="0"></pre></section>
    </form>
  </main>
  <script>${script}</script>
</body>
</html>`;
}
