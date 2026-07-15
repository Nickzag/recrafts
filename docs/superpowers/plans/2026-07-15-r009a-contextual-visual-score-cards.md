# R-009A 上下文可视化评分卡实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将每项评分对应的原始画面、候选提取摘要和中文观察重点直接嵌入评分卡，并允许技术引用留空。

**Architecture:** `generate-r009a-review-workspace.mjs` 继续负责读取真实 Source、Region、Evidence、Claim 和 Candidate Artifact，并构造一个显式的八模块审阅上下文；`r009a-human-score-form.mjs` 只负责将上下文渲染为中文 Markdown/HTML 和浏览器内表单。评分 Validator 同步放宽空引用，但继续拒绝已填写的无效或未知引用。

**Tech Stack:** Node.js ESM、原生 HTML/CSS/JavaScript、Node Test Runner、Playwright CLI。

---

## 文件结构

- Modify: `scripts/benchmarks/r009a-human-score-form.mjs` — 定义八项中文评分语义、上下文渲染和可选引用交互。
- Modify: `scripts/benchmarks/generate-r009a-review-workspace.mjs` — 从真实审阅数据生成每项的画面和候选结果上下文。
- Modify: `scripts/benchmarks/r009a-core.mjs` — Human Score Validator 接受空引用数组，保留非空引用校验。
- Modify: `tests/r009a-human-score-form.test.mjs` — 页面上下文、全中文界面和可选引用回归。
- Modify: `tests/r009a-golden-baseline.test.mjs` — Validator 的空引用与无效非空引用测试。
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html`
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.md`
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/review-index.html`
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/source-contact-sheet.html`
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/artifact-index.html`
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/side-by-side-map.html`

### Task 1：用失败测试锁定新评分体验

**Files:**
- Modify: `tests/r009a-human-score-form.test.mjs`
- Modify: `tests/r009a-golden-baseline.test.mjs`

- [ ] **Step 1: 增加上下文和中文界面测试**

```js
test("每个评分模块都在同卡展示对应画面、候选结果和中文观察重点", () => {
  const html = renderHumanScoreHtml(REVIEW_CONTEXT_FIXTURE);
  for (const module of HUMAN_SCORE_MODULES) {
    assert.match(html, new RegExp(`data-module="${module.module_id}"[\\s\\S]+你正在评价什么`));
    assert.match(html, new RegExp(`data-module="${module.module_id}"[\\s\\S]+对应画面`));
    assert.match(html, new RegExp(`data-module="${module.module_id}"[\\s\\S]+候选提取结果`));
    assert.match(html, new RegExp(`data-module="${module.module_id}"[\\s\\S]+如何评分`));
  }
});

test("技术引用留空仍可完成评分", () => {
  const html = renderHumanScoreHtml(REVIEW_CONTEXT_FIXTURE);
  assert.match(html, /可选：技术引用/);
  assert.doesNotMatch(html, /请填写 Artifact refs|请填写 Evidence refs/);
});
```

- [ ] **Step 2: 增加 Validator 空引用测试**

```js
test("human score accepts empty optional Artifact and Evidence refs", () => {
  const score = validHumanScore();
  for (const item of score.scores) {
    item.artifact_refs = [];
    item.evidence_refs = [];
  }
  assert.equal(validateHumanScoreFixture(score).status, "pass");
});
```

- [ ] **Step 3: 运行测试并确认 RED**

Run: `node --test tests/r009a-human-score-form.test.mjs tests/r009a-golden-baseline.test.mjs`

Expected: FAIL，原因分别为渲染器尚不接受上下文、评分卡缺少画面/候选结果，以及 Validator 仍要求引用非空。

### Task 2：实现显式模块上下文

**Files:**
- Modify: `scripts/benchmarks/r009a-human-score-form.mjs`
- Modify: `scripts/benchmarks/generate-r009a-review-workspace.mjs`

- [ ] **Step 1: 扩展模块定义**

每个模块增加 `subject_zh`、`focus_zh`、`source_ids`、`artifact_keys` 和三档评分锚点。示例：

```js
{
  module_id: "typography-system-interpretation",
  label_zh: "字体系统理解",
  subject_zh: "候选结果是否正确识别字体角色、层级、对比关系和使用边界。",
  focus_zh: ["标题与正文的角色差异", "编辑版式中的层级", "跨画面的字体一致性"],
  source_ids: ["source-1", "source-6", "source-10", "source-16"],
  artifact_keys: ["tokens", "claims"],
  anchors: { 1: "与画面明显冲突或没有可用结论", 3: "主要层级基本正确，但边界或细节不完整", 5: "角色、层级和边界均准确且可直接使用" },
}
```

- [ ] **Step 2: 在生成器构造真实审阅上下文**

```js
const reviewContext = {
  image_root: imageRoot,
  sources: Object.fromEntries(manifest.sources.map((source) => [source.source_id, {
    source_id: source.source_id,
    image_src: `${imageRoot}/${source.local_path}`,
    section_ref: source.section_ref,
    regions: regionsBySource.get(source.source_id) ?? [],
  }])),
  candidate_summaries: buildChineseCandidateSummaries({ artifacts, claims, possibleIntent }),
};
```

`buildChineseCandidateSummaries` 只能摘要现有 Candidate 数据，不增加期望答案或新的视觉判断。空数组必须渲染为“当前未提取到内容”。

- [ ] **Step 3: 在评分卡中渲染同卡上下文**

```html
<section class="review-subject"><h3>你正在评价什么</h3>...</section>
<section class="source-strip"><h3>对应画面</h3>...</section>
<section class="candidate-summary"><h3>候选提取结果</h3>...</section>
<section class="score-guide"><h3>如何评分</h3>...</section>
```

图片使用真实相对路径和中文 `alt`；每张图显示中文观察重点，稳定 Source ID 只作为次要技术标识。

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run: `node --test tests/r009a-human-score-form.test.mjs`

Expected: 新增的上下文和中文界面测试全部 PASS。

### Task 3：放宽可选引用并保持安全校验

**Files:**
- Modify: `scripts/benchmarks/r009a-human-score-form.mjs`
- Modify: `scripts/benchmarks/r009a-core.mjs`
- Modify: `tests/r009a-golden-baseline.test.mjs`

- [ ] **Step 1: 修改浏览器校验**

```js
if (artifact_refs.some((ref) => !artifactRefValid(ref))) errors.push("已填写的产物引用必须是安全的相对路径");
if (evidence_refs.some((ref) => !evidenceRefValid(ref))) errors.push("已填写的证据引用格式无效");
```

将两个输入放入 `<details><summary>可选：技术引用</summary>...</details>`，显示中文字段名“产物引用（可选）”和“证据引用（可选）”。

- [ ] **Step 2: 修改 Validator**

只删除“数组必须非空”的条件；保留数组类型、Artifact 路径安全、Evidence ID 格式及存在性校验。空数组合法，非空无效值仍失败。

- [ ] **Step 3: 运行测试并确认 GREEN**

Run: `node --test tests/r009a-human-score-form.test.mjs tests/r009a-golden-baseline.test.mjs`

Expected: 空引用通过，无效非空引用仍被拒绝，全部测试 PASS。

### Task 4：重新生成、浏览器验证和边界回归

**Files:**
- Regenerate: `benchmarks/L2-brand/static-coffee/reviews/r009a/*`

- [ ] **Step 1: 重新生成审阅工作区**

Run: `node scripts/benchmarks/generate-r009a-review-workspace.mjs --update-existing .`

Expected: `status` 为 `updated`；原修正提案内容保持不变。

- [ ] **Step 2: 用 Playwright 验证真实页面**

验证八张卡均显示真实画面、候选摘要、中文观察重点和相邻评分控件；空技术引用可达到 8/8 并生成 JSON；所有需要理解或操作的可见文案为中文；页面不写文件、不保存、不提交正式评分。

- [ ] **Step 3: 运行完整相关回归**

```bash
node --test tests/r009a-human-score-form.test.mjs tests/r009a-golden-baseline.test.mjs
node scripts/benchmarks/validate-source-pack-stability.mjs
node scripts/benchmarks/validate-no-oracle.mjs benchmarks/L2-brand/static-coffee-static
node scripts/benchmarks/validate-corpus.mjs . benchmarks/L2-brand/static-coffee-static .local-benchmark-sources/static-coffee-static-v1
git diff --check
```

Expected: 全部 PASS。

- [ ] **Step 4: 确认不可变边界**

Run: `test -z "$(git diff 9c1667f9c60406ddb98214ff38b9c588d4c0ba6b -- benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-codex-gpt5-001)"`

Expected: Candidate Run diff 为空；未写入 Nick 的正式评分。
