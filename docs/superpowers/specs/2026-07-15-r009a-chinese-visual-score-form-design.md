# R-009A 中文可视化评分表设计

## 目标

将 R-009A Human Score 审阅入口完整中文化，并提供一个独立、可交互的评分页面。页面帮助 Project Owner 逐项完成八个评分模块，生成符合 `validate-human-score.mjs` 输入约束的 JSON，并通过浏览器剪贴板复制。页面不得代填评分、自动写入仓库、执行 correction 或改变 Candidate Package。

## 文件边界

- 保留 `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.md`，改为中文静态审计表。
- 新增 `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html`，作为独立交互页面。
- 更新 `scripts/benchmarks/generate-r009a-review-workspace.mjs`，确保新生成的工作区包含中文 Markdown、交互页面及统一导航入口。
- 更新现有四个审阅 HTML 的导航与首页行动入口，不改变 Source、Evidence、Claim 或 Candidate Artifact 内容。

## 界面结构

页面沿用现有 R-009A 审阅工作区的视觉语言，包含：

1. 固定审阅身份：Nick / Project Owner。
2. 审阅元数据：日期、Corpus、Source Pack、candidate run、审阅环境。
3. 两个确认项：Source Pack Hash 已验证、Correction Proposal 已审阅。
4. 八个评分卡：中文模块名称、英文稳定 ID、1–5 单选评分、评分理由、Artifact refs、Evidence refs。
5. Medium Conflict 决定：确认、修订或拒绝，以及决定理由。
6. 完整性状态：显示已完成模块数与缺失字段。
7. JSON 预览和“一键复制 JSON”按钮。

评分含义统一为：

- 1：严重不足
- 2：明显不足
- 3：基本可用
- 4：良好
- 5：优秀

## 数据结构与交互

浏览器只在内存中维护表单状态。点击“生成并复制 JSON”时：

1. 验证八个模块均选择 1–5 整数分。
2. 验证每项存在非空理由、至少一个 Artifact ref 和至少一个 Evidence ref。
3. 将逗号或换行分隔的引用规范化为字符串数组并去重。
4. 验证 Artifact ref 是相对文件引用，Evidence ref 以 `ev-` 开头。
5. 验证审阅日期和两个确认项已完成。
6. 生成 `status: complete`、Reviewer/Corpus/Source Pack/candidate run 元数据及八项 `scores` 的 JSON。
7. 将 JSON 显示在页面中，并调用 Clipboard API 复制；若剪贴板不可用，保留可手动复制的预览和明确提示。

页面不使用网络请求、Local Storage、文件下载或自动文件写入。Correction 决定只进入生成结果的 review context，不触发任何 Runtime Operation。

## 错误处理

- 未完成时，按钮保持可点击以便执行校验，但不得生成 `complete` JSON；页面将聚焦第一个错误并列出缺失项。
- 无效引用显示在所属评分卡内，不静默删除。
- Clipboard API 失败时显示“请从预览区手动复制”，不丢失已输入内容。
- 页面刷新会清空未复制内容，并在页首明确提示该行为。

## 验证

- 单元测试确认生成器包含中文标题、八个稳定模块 ID、五档评分、必要输入字段和 JSON 生成逻辑。
- 单元测试确认生成结构可被 `validateHumanScore` 接受，并拒绝漏项、空理由和无效引用。
- Playwright 验证页面加载、导航、1–5 选择、漏填提示、完成度更新、JSON 预览和复制操作。
- 重新运行 R-009A 测试、Source Pack stability、Corpus、No-Oracle 和 Candidate preservation 门禁。

## 明确不做

- 不预填或推断 Nick 的评分与理由。
- 不自动提交 Human Score。
- 不执行 `submit-correction` 或 `accept-artifacts`。
- 不修改 frozen Build 2、Candidate Package、CraftsOS 或 Layoutcrafts。
