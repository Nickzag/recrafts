# R-010 执行结果

状态：完成。项目所有者 Nick 已确认八项审阅内容并给出 `R-010 PASS`。最终 accepted package 为 `pilot-ready`，未声明 `production-ready`。

## 主要结果

- 新增 Source Observation、Portable System、Source Distance、Preview Coverage 与 Delivery Readiness 严格 Schema。
- 新增来源距离、组合风险、拓扑风险、身份与法律符号、Agent Contract、预览覆盖与可访问性 Validator。
- `submit-correction` 与 `accept-artifacts` 现在保留完整 `design.md`，R-010 可选合同进入 canonical Artifact Set；R-007 原有七项 canonical contract 行为保持兼容。
- `generate-realization` 与 `verify-fidelity` 支持 accepted source-neutral package，Owner Decision ID 会进入 `realization.json` 和 `compiled-contract.json`。
- 身份扫描区分用户可见内容与 JSON ID、路径及 Evidence/Claim provenance；来源名或未授权法律符号出现在可复用内容时仍会 fail closed。

## Fresh Evidence 与 Host Run

- 来源：Together 案例页与 Spade 当前站点，desktop/mobile 共四次 fresh capture。
- capture IDs：
  - `capture-together-desktop-8ef41ffeb83f`
  - `capture-together-mobile-3afdd781d3bf`
  - `capture-spade-desktop-59140c400bdc`
  - `capture-spade-mobile-16071303190c`
- Host analysis：`analysis-r010-codex-gpt5-2348cc69-20260716`
- Host：Codex；执行引擎：Codex desktop；模型：GPT-5；能力：vision/browser/files/structured-output。
- `visual_pixel_inspection: true`
- Prompt SHA-256：`2348cc6994e5f78a721b3cbb66d3a99be29f6cf5928998c70fae6a5969a1b072`
- No-Oracle：`no-oracle-12fd8eb3131f81d1`，PASS；33 个输入文件均记录哈希，未包含旧 design、旧 preview、旧 Package 或旧评审答案。

## Source Observation 与 Portable System

- 七类 source observations：颜色、字体、布局、形状、动效、拓扑、motif。
- Core Grammar 与 Theme 分离；三个主题共享同一套机制：
  - `theme-derived`
  - `theme-alternative-a`（非绿色主色族）
  - `theme-alternative-b`（不使用 cut corner，采用不同 measured-boundary）
- Component maturity：5 个 Core、1 个 Candidate、2 个 Rejected。Core 均包含 anatomy、slots、variants、states、keyboard、responsive、accessibility、token dependencies 与 validation rules。
- Agent 双渲染 Contract：PASS，两个独立渲染请求均只依赖 JSON contract，不依赖隐藏 prose。

## Source Distance、身份与预览

- Source Distance：PASS；topology similarity 20%，topology risk `low`，motif combination risk `low`，matched signature traits 为 0。
- Identity/Legal：PASS，findings 0；`TRACEFIELD®` 无法律记录的负向测试会被阻断。
- Preview：36 张，包含 4 张 system preview、Web A/B 五档宽度、2 张 Poster、8 页 Carousel 与 contact sheet、8 页 Slide 与 contact sheet、2 张开放许可真实图片 preview。
- Accessibility：PASS；6 组 contrast pair、10 个内容/viewport stress case；语义 landmarks、native controls、focus、touch target、reduced motion 与 heading hierarchy 均纳入 Gate。
- Font：仅记录观察与替代矩阵，不分发来源字体文件。Windows/Open Web 栈在 macOS Chromium fallback 下测量；原生 Windows 验证保留为 production validation。

## 不可变 Package Lineage

```text
package-91d1a8226792e35e (reviewable)
→ correction-r010-owner-pass-20260716
→ package-0ad1502a874d2e00 (awaiting-review, conflict resolved)
→ decision-r010-owner-pass-20260716
→ package-c2a9b64984ab6d02 (accepted, pilot-ready)
→ artifact-set-312bc3a6bdc88e5c
→ realization-86494147bb58ae5e
```

`validate-package`：PASS；correction count 1、decision count 1、lineage event `accepted`。`verify-fidelity`：PASS；15 个 accepted contract 哈希与 36 个 preview 哈希一致，Fidelity 基准为 `accepted-portable-contract`。

## Old-vs-new 回归

已生成 contract diff、source-distance diff、可视化 contact sheet 与中文摘要。工作区内没有发现任务中引用的旧 Spade Package/评审 ZIP，因此没有伪造旧 Artifact 哈希级对比；本次对比采用“先前评审 Findings → 新 accepted evidence”的可审计回归方式。

## 验证记录

- `npm run validate:r010`：30/30 PASS。
- `npm test`：189/189 PASS。
- `validate-package`、`generate-realization`、`verify-fidelity`：标准 Protocol 1.1 Operation 全部完成。
- `validate-source-neutral-contract`：PASS，状态 `pilot-ready`。
- `validate-source-distance`：PASS。
- `validate-identity-safety`：PASS。
- `validate-agent-contract`：PASS。
- `validate-preview-accessibility`：PASS。
- `validate-preview-coverage`：PASS。
- Frozen RC 目录：无改动。
- CraftsOS/Layoutcrafts：未修改。

## 已知限制

- hover 与 scroll-bound motion 未穷举采样。
- Together full-page lazy media 存在未加载区域，已保留 DOM/CSS 和可见 region Evidence。
- 尚未进行 production 实现、性能预算、完整交互测试、原生 Windows 字体测试与完整无障碍人工审计，因此不得升级为 `production-ready`。
- 旧 Package 不在工作区，old-vs-new 不包含旧 Artifact 哈希。
- accepted package 内保留了生成时的旧版身份扫描报告以维持不可变性；最终权威扫描结果位于运行根目录 `validation/identity-safety-report.json`，状态为 PASS。旧报告的 findings 来自已修复的 provenance/技术 ID 误报，不影响 canonical Artifact Set 哈希。

后续流程按项目所有者要求不再新增独立所有者评审表；会话中明确的项目所有者授权可直接形成 Correction/Decision 记录。Runtime 的人类授权安全门禁本次未删除，因为删除门禁属于独立协议与架构变更。

> R-010 improves Recrafts’ ability to distinguish source observations from portable design rules, separate Core Grammar from theme expression, detect signature-level source proximity, export machine-readable Agent contracts and validate pilot-ready cross-media previews. The new Together/Spade run demonstrates these capabilities without treating the previous output or review as an expected visual answer.
