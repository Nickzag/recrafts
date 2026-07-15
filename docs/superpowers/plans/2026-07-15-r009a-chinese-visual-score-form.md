# R-009A Chinese Visual Score Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 R-009A Human Score 表完整中文化，并增加一个可视化 1–5 评分页，在本地生成并复制符合现有 Validator 输入结构的 JSON。

**Architecture:** 新建一个专用渲染模块，集中维护八个稳定模块 ID、中文名称、评分含义、Markdown 和 HTML 输出。现有 review workspace generator 调用该模块，已生成的审阅文件同步更新；交互逻辑完全在浏览器内存中运行，不联网、不持久化、不触发 Runtime Operation。

**Tech Stack:** Node.js ESM、原生 HTML/CSS/JavaScript、Node Test Runner、Playwright CLI。

---

## File map

- Create: `scripts/benchmarks/r009a-human-score-form.mjs` — 唯一的评分模块定义及 Markdown/HTML 渲染器。
- Modify: `scripts/benchmarks/generate-r009a-review-workspace.mjs` — 调用渲染器并生成独立评分页。
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.md` — 中文静态审计表。
- Create: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html` — 实际可交互评分页。
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/review-index.html` — 中文评分入口。
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/source-contact-sheet.html` — 导航加入评分页。
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/artifact-index.html` — 导航加入评分页。
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/side-by-side-map.html` — 导航加入评分页。
- Create: `tests/r009a-human-score-form.test.mjs` — 渲染和数据合约回归测试。

### Task 1: Lock the Chinese form contract with tests

**Files:**
- Create: `tests/r009a-human-score-form.test.mjs`
- Create: `scripts/benchmarks/r009a-human-score-form.mjs`

- [ ] **Step 1: Write the failing renderer tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  HUMAN_SCORE_MODULES,
  renderChineseHumanScoreMarkdown,
  renderHumanScoreHtml,
} from "../scripts/benchmarks/r009a-human-score-form.mjs";

test("Chinese Markdown preserves all eight stable module IDs", () => {
  const markdown = renderChineseHumanScoreMarkdown();
  assert.equal(HUMAN_SCORE_MODULES.length, 8);
  assert.match(markdown, /R-009A 人工评分表/);
  for (const module of HUMAN_SCORE_MODULES) {
    assert.match(markdown, new RegExp(module.module_id));
    assert.match(markdown, new RegExp(module.label_zh));
  }
});

test("visual form exposes five scores for every module", () => {
  const html = renderHumanScoreHtml();
  for (const score of [1, 2, 3, 4, 5]) assert.match(html, new RegExp(`value="${score}"`));
  for (const module of HUMAN_SCORE_MODULES) assert.match(html, new RegExp(`score-${module.module_id}`));
});

test("visual form does not prefill owner scores or reasons", () => {
  const html = renderHumanScoreHtml();
  assert.doesNotMatch(html, /type="radio"[^>]+checked/);
  assert.doesNotMatch(html, /name="reason-[^"]+"[^>]+value="[^"]+"/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: FAIL because `scripts/benchmarks/r009a-human-score-form.mjs` does not exist.

- [ ] **Step 3: Implement the module definitions and renderers**

```js
export const HUMAN_SCORE_MODULES = [
  ["brand-system-coherence", "品牌系统一致性"],
  ["typography-system-interpretation", "字体系统理解"],
  ["color-system-interpretation", "色彩系统理解"],
  ["cross-application-consistency", "跨应用一致性"],
  ["visual-grammar-usefulness", "视觉语法实用性"],
  ["presentation-grammar-usefulness", "展示语法实用性"],
  ["possible-intent-discipline", "可能设计意图的推断纪律"],
  ["overall-usefulness", "整体实用性"],
].map(([module_id, label_zh]) => ({ module_id, label_zh }));

export const SCORE_LABELS = [
  [1, "严重不足"], [2, "明显不足"], [3, "基本可用"], [4, "良好"], [5, "优秀"],
].map(([score, label]) => ({ score, label }));

export function renderChineseHumanScoreMarkdown() {
  const rows = HUMAN_SCORE_MODULES.map(({ module_id, label_zh }) => `| ${label_zh} | \`${module_id}\` | | | | |`).join("\n");
  return `# R-009A 人工评分表 — Static Coffee 静态版\n\n状态：待评分\n\n## 审阅人\n\n- 姓名：Nick\n- 角色：Project Owner\n- 审阅日期：\n- Corpus：\`l2-brand-static-coffee-static-v1@1.0.0\`\n- Source Pack：\`static-coffee-static-source-pack-v1@1.0.0\`\n- Candidate Run：\`run-static-coffee-20260715-codex-gpt5-001\`\n- Source Pack Hash 已验证：是 / 否\n- Correction Proposal 已审阅：是 / 否\n\n## 评分说明\n\n1 严重不足；2 明显不足；3 基本可用；4 良好；5 优秀。每项必须填写理由、Artifact refs 和 Evidence refs。\n\n| 评分模块 | 稳定 ID | 分数（1–5） | 理由 | Artifact refs | Evidence refs |\n|---|---|---:|---|---|---|\n${rows}\n`;
}

export function renderHumanScoreHtml() {
  const styles = `body{margin:0;background:#f4f0e8;color:#181715;font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}main{max-width:1120px;margin:auto;padding:32px}h1,h2{font-family:Georgia,serif}.score-card{margin:18px 0;padding:20px;background:#fffdf8;border:1px solid #d8d0c3;border-radius:10px}fieldset{border:0;padding:10px 0;display:flex;gap:8px;flex-wrap:wrap}fieldset label span{display:flex;min-width:86px;flex-direction:column;align-items:center;padding:10px;border:1px solid #d8d0c3;border-radius:8px}fieldset input[type=radio]{position:absolute;opacity:0}fieldset input:checked+span{background:#5b452e;color:white}textarea,input[type=date]{display:block;width:100%;margin:6px 0 14px;padding:10px;border:1px solid #bdb4a6;border-radius:6px;background:white}button{padding:12px 18px;border:0;border-radius:7px;background:#5b452e;color:white;font:inherit}pre{white-space:pre-wrap;word-break:break-word;background:#211f1c;color:#f7f1e7;padding:16px;border-radius:8px}.field-error,#form-errors{color:#9b2f2f}`;
  const scoreCards = HUMAN_SCORE_MODULES.map(({ module_id, label_zh }) => `
    <section class="score-card" data-module="${module_id}">
      <h2>${label_zh}</h2><code>${module_id}</code>
      <fieldset><legend>评分</legend>${SCORE_LABELS.map(({ score, label }) => `
        <label><input type="radio" name="score-${module_id}" value="${score}"><span>${score}<small>${label}</small></span></label>`).join("")}</fieldset>
      <label>评分理由<textarea name="reason-${module_id}" required></textarea></label>
      <label>Artifact refs<textarea name="artifacts-${module_id}" required></textarea></label>
      <label>Evidence refs<textarea name="evidence-${module_id}" required></textarea></label>
      <p class="field-error" id="error-${module_id}"></p>
    </section>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R-009A 人工评分</title><style>${styles}</style></head><body><main><nav><a href="review-index.html">审阅首页</a> · <a href="source-contact-sheet.html">Source 对照表</a> · <a href="artifact-index.html">Artifact 索引</a> · <a href="side-by-side-map.html">并排映射</a></nav><h1>R-009A 人工评分</h1><p>页面刷新会清空尚未复制的输入。</p><label>审阅日期<input type="date" id="review-date"></label><label><input type="checkbox" id="hash-verified"> Source Pack Hash 已验证</label><label><input type="checkbox" id="proposal-reviewed"> Correction Proposal 已审阅</label><div id="score-cards">${scoreCards}</div><fieldset><legend>Medium Conflict 决定</legend>${["CONFIRM", "REVISE", "REJECT"].map((value) => `<label><input type="radio" name="conflict-decision" value="${value}">${value}</label>`).join("")}<label>决定理由<textarea id="conflict-reason"></textarea></label></fieldset><p id="completion">完成度：0 / 8</p><div id="form-errors" role="alert"></div><button id="generate" type="button">生成并复制 JSON</button><pre id="json-preview"></pre></main></body></html>`;
}
```

- [ ] **Step 4: Run renderer tests and verify GREEN**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: 3 tests PASS.

### Task 2: Implement client-side validation and JSON generation

**Files:**
- Modify: `scripts/benchmarks/r009a-human-score-form.mjs`
- Modify: `tests/r009a-human-score-form.test.mjs`

- [ ] **Step 1: Add tests for the generated JSON contract markers**

```js
test("visual form emits the validator-compatible Human Score fields", () => {
  const html = renderHumanScoreHtml();
  for (const field of [
    "status", "reviewer_name", "reviewer_role", "review_date", "corpus_id",
    "corpus_version", "source_pack_id", "candidate_run_id", "review_environment",
    "correction_proposals_reviewed", "scores", "artifact_refs", "evidence_refs",
  ]) assert.match(html, new RegExp(field));
});

test("visual form includes completeness and fallback-copy messages", () => {
  const html = renderHumanScoreHtml();
  assert.match(html, /完成度：0 \/ 8/);
  assert.match(html, /请从预览区手动复制/);
  assert.match(html, /ev-/);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: the new contract-marker tests FAIL until the inline form logic exists.

- [ ] **Step 3: Implement the inline data flow**

The complete client-side result shape must be:

```js
const result = {
  status: "complete",
  reviewer_name: "Nick",
  reviewer_role: "Project Owner",
  review_date: reviewDate.value,
  corpus_id: "l2-brand-static-coffee-static-v1",
  corpus_version: "1.0.0",
  source_pack_id: "static-coffee-static-source-pack-v1",
  source_pack_version: "1.0.0",
  candidate_run_id: "run-static-coffee-20260715-codex-gpt5-001",
  review_environment: "local R-009A side-by-side workspace",
  source_pack_hash_verified: hashVerified.checked,
  correction_proposals_reviewed: proposalReviewed.checked,
  correction_decision: {
    verdict: document.querySelector('input[name="conflict-decision"]:checked').value,
    reason: conflictReason.value.trim(),
  },
  scores: moduleIds.map((moduleId) => ({
    module_id: moduleId,
    score: Number(document.querySelector(`input[name="score-${moduleId}"]:checked`).value),
    reason: document.querySelector(`[name="reason-${moduleId}"]`).value.trim(),
    artifact_refs: splitRefs(document.querySelector(`[name="artifacts-${moduleId}"]`).value),
    evidence_refs: splitRefs(document.querySelector(`[name="evidence-${moduleId}"]`).value),
  })),
};
```

Validation must reject missing dates, unchecked confirmations, absent scores, empty reasons, empty refs, Artifact refs starting with `/` or containing `..`, Evidence refs not matching `^ev-[a-z0-9-]+$`, and a conflict decision without reason. On success, render `JSON.stringify(result, null, 2)` into a readonly preview and call `navigator.clipboard.writeText`.

Insert this complete client script before `</body>` in the Task 1 document:

```html
<script>
const moduleIds = ["brand-system-coherence","typography-system-interpretation","color-system-interpretation","cross-application-consistency","visual-grammar-usefulness","presentation-grammar-usefulness","possible-intent-discipline","overall-usefulness"];
const byName = (name) => document.querySelector(`[name="${name}"]`);
const splitRefs = (value) => [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
const artifactRefValid = (value) => !value.startsWith("/") && !value.split("/").includes("..");
const evidenceRefValid = (value) => /^ev-[a-z0-9-]+$/.test(value);

function moduleValue(moduleId) {
  const score = document.querySelector(`input[name="score-${moduleId}"]:checked`);
  const reason = byName(`reason-${moduleId}`).value.trim();
  const artifact_refs = splitRefs(byName(`artifacts-${moduleId}`).value);
  const evidence_refs = splitRefs(byName(`evidence-${moduleId}`).value);
  const errors = [];
  if (!score) errors.push("请选择 1–5 分");
  if (!reason) errors.push("请填写评分理由");
  if (!artifact_refs.length || artifact_refs.some((ref) => !artifactRefValid(ref))) errors.push("请填写有效的相对 Artifact refs");
  if (!evidence_refs.length || evidence_refs.some((ref) => !evidenceRefValid(ref))) errors.push("Evidence refs 必须以 ev- 开头");
  document.getElementById(`error-${moduleId}`).textContent = errors.join("；");
  return { errors, value: score ? { module_id: moduleId, score: Number(score.value), reason, artifact_refs, evidence_refs } : null };
}

function updateCompletion() {
  const complete = moduleIds.filter((moduleId) => moduleValue(moduleId).errors.length === 0).length;
  document.getElementById("completion").textContent = `完成度：${complete} / 8`;
  return complete;
}

document.getElementById("score-cards").addEventListener("input", updateCompletion);
document.getElementById("generate").addEventListener("click", async () => {
  const modules = moduleIds.map(moduleValue);
  const reviewDate = document.getElementById("review-date");
  const hashVerified = document.getElementById("hash-verified");
  const proposalReviewed = document.getElementById("proposal-reviewed");
  const conflict = document.querySelector('input[name="conflict-decision"]:checked');
  const conflictReason = document.getElementById("conflict-reason").value.trim();
  const errors = [];
  if (!reviewDate.value) errors.push("请选择审阅日期");
  if (!hashVerified.checked) errors.push("请确认 Source Pack Hash");
  if (!proposalReviewed.checked) errors.push("请确认已审阅 Correction Proposal");
  if (modules.some((entry) => entry.errors.length)) errors.push("请完成全部八项评分");
  if (!conflict || !conflictReason) errors.push("请完成 Medium Conflict 决定及理由");
  const errorBox = document.getElementById("form-errors");
  errorBox.textContent = errors.join("；");
  if (errors.length) return;
  const result = {
    status: "complete", reviewer_name: "Nick", reviewer_role: "Project Owner", review_date: reviewDate.value,
    corpus_id: "l2-brand-static-coffee-static-v1", corpus_version: "1.0.0", source_pack_id: "static-coffee-static-source-pack-v1", source_pack_version: "1.0.0",
    candidate_run_id: "run-static-coffee-20260715-codex-gpt5-001", review_environment: "local R-009A side-by-side workspace",
    source_pack_hash_verified: true, correction_proposals_reviewed: true,
    correction_decision: { verdict: conflict.value, reason: conflictReason }, scores: modules.map((entry) => entry.value),
  };
  const json = JSON.stringify(result, null, 2);
  document.getElementById("json-preview").textContent = json;
  try { await navigator.clipboard.writeText(json); errorBox.textContent = "JSON 已复制"; }
  catch { errorBox.textContent = "无法访问剪贴板，请从预览区手动复制"; }
});
</script>
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: all tests PASS.

### Task 3: Integrate the renderer into the review workspace

**Files:**
- Modify: `scripts/benchmarks/generate-r009a-review-workspace.mjs`
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.md`
- Create: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html`
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/review-index.html`
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/source-contact-sheet.html`
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/artifact-index.html`
- Modify: `benchmarks/L2-brand/static-coffee/reviews/r009a/side-by-side-map.html`

- [ ] **Step 1: Add integration assertions**

```js
test("review workspace generator links the Chinese visual score form", () => {
  const source = readFileSync("scripts/benchmarks/generate-r009a-review-workspace.mjs", "utf8");
  assert.match(source, /renderChineseHumanScoreMarkdown/);
  assert.match(source, /renderHumanScoreHtml/);
  assert.match(source, /human-score-form\.html/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: integration assertion FAILS because the generator has not imported the renderer.

- [ ] **Step 3: Wire the renderer and generated artifacts**

At the top of the generator:

```js
import {
  renderChineseHumanScoreMarkdown,
  renderHumanScoreHtml,
} from "./r009a-human-score-form.mjs";
```

Replace the inline English Markdown template with:

```js
writeNew(path.join(reviewRoot, "human-score-form.md"), renderChineseHumanScoreMarkdown());
writeNew(path.join(reviewRoot, "human-score-form.html"), renderHumanScoreHtml());
```

Add `<a href="human-score-form.html">中文评分</a>` to the shared navigation and change the review-index action to link directly to the visual form. Apply the same generated output to the current committed review workspace without changing Candidate Evidence or Artifacts.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: all tests PASS.

### Task 4: Browser and regression verification

**Files:**
- Verify: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html`
- Verify: all R-009A validators and candidate Package state

- [ ] **Step 1: Serve the workspace locally**

Run: `python3 -m http.server 4173 --bind 127.0.0.1`

Expected: local server starts at `http://127.0.0.1:4173`.

- [ ] **Step 2: Verify the visual form with Playwright CLI**

Open:

```text
http://127.0.0.1:4173/benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html
```

Verify: eight Chinese cards render; each card exposes 1–5; incomplete submission shows Chinese errors; selecting values updates completion; valid fixture input renders JSON; copy action reports success or the manual-copy fallback; navigation returns to all four review pages.

- [ ] **Step 3: Run focused and R-009A tests**

Run:

```bash
node --test tests/r009a-human-score-form.test.mjs tests/r009a-golden-baseline.test.mjs
node scripts/benchmarks/validate-source-pack-stability.mjs
node scripts/benchmarks/validate-no-oracle.mjs benchmarks/L2-brand/static-coffee-static
node scripts/benchmarks/validate-corpus.mjs . benchmarks/L2-brand/static-coffee-static .local-benchmark-sources/static-coffee-static-v1
```

Expected: all tests and validators PASS.

- [ ] **Step 4: Confirm immutable boundaries**

Run:

```bash
test -z "$(git diff 9c1667f9c60406ddb98214ff38b9c588d4c0ba6b -- benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-codex-gpt5-001)"
git diff --check
```

Expected: Candidate run diff is empty and repository diff check passes.

- [ ] **Step 5: Commit only the scoring-form implementation**

Stage the renderer, tests, generator, review workspace HTML/Markdown and this plan. Do not stage `.superpowers/`, `.playwright-cli/`, `output/`, `.local-benchmark-sources`, frozen Build 2, Candidate run, CraftsOS or Layoutcrafts.

Commit message:

```text
完善 R-009A 人工评分｜中文化评分表并增加可视化 JSON 复制流程
```
