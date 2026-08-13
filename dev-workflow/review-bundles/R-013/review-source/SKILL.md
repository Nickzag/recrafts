# Recrafts

Recrafts 是可独立安装和运行的视觉重构 Skill。它从获准使用的网站、图片和界面参考中建立可追溯证据，输出 lowercase `design.md`、结构化设计契约和验证报告。来源派生内容是 Evidence；模型观察只进入 Claims。只有经过 Schema、来源、Scope、人工修正和项目所有者决策校验后，候选规则才能进入 accepted Artifact Set。

## 输入

输入必须符合 `schemas/input.schema.json`，并提供来源清单、目标意图、使用权/用途声明和输出目录。多图输入必须逐图登记，区域级分类不能退化成整图单标签。

## 安全门

原始来源只能位于 Git 忽略的本地证据目录。进入 Fixture 或 Package 的图像必须脱敏、去元数据并通过 secret scan；任何未关闭的凭据命中都会阻止运行。Recrafts 不推断来源权利，也不把私人内容、用户作品或营销插图提升为全局 UI 规则。

## 证据状态

- `observed` 必须引用来源和区域。
- `inferred` 必须引用来源并给出置信度。
- `suggested` 不能写入 canonical token。
- `confirmed` 必须引用人工决策。
- `rejected` 保留历史。

## 输出

输出符合 `schemas/output.schema.json`，规范文件名为 `design.md`。只有显式 compatibility 模式可额外输出 uppercase 镜像，镜像不是第二规范来源。默认输出包括 source manifest、evidence map、design contract、components、validation report、result 和 run log。

## Scope 与边界

规则必须声明 Scope；Project/Surface 证据不能自动晋升到 Workspace。Recrafts 不依赖 CraftsOS 私有路径，不导入 Layoutcrafts 实现，也不把自身源码复制到 CraftsOS 根目录。Preview 是可审阅投影，不证明视觉还原、组件实现或生产质量。

## 运行

Canonical RC entrypoint：

```bash
printf '%s' '<JSON Envelope>' | recraft-interop
```

Operation 为 `capabilities`、`prepare-analysis`、`submit-analysis`、`validate-package`、`generate-realization`、`verify-fidelity`、`submit-correction`、`accept-artifacts`、`rollback-package`。stdin 只能包含一个 Request JSON；stdout 只能包含一个 Response JSON；诊断写 stderr。Response 状态为 `completed`、`completed_with_warnings`、`needs_host_action`、`failed`。

Recrafts 不内置视觉模型。`prepare-analysis` 将脱敏来源复制到 Prepared Bundle，生成 Evidence Bundle 和 Host 指令，并返回 `needs_host_action`；视觉 Host 通过返回契约中的相对路径读取来源，完成语义分析后，通过 `submit-analysis` 提交满足 `contracts/host-analysis.schema.json` 的结构化结果。仅声明 vision capability 不能代替真实 Host Analysis。

`submit-analysis` 只生成 `awaiting-owner-review` Candidate Package，不得伪造项目所有者 PASS。`generate-realization` 对待审核 Package 要求显式 Owner Decision import，并先生成新的已批准 `package_id`。确定性 interoperability fixture 必须通过专用 option 显式隔离，不能复用真实项目所有者身份。

`submit-correction` 只能由项目所有者或授权评审者提交，并生成新候选 Package；Evidence、Claims 和 initial extraction snapshot 不可覆盖。`accept-artifacts` 通过显式 PASS 决策和 provenance/conflict/currentness Gate 生成新 accepted Package。`rollback-package` 只接受两个 accepted Package，并以新身份恢复目标 canonical hashes；任何历史目录均不可原地修改。

Artifact path 必须相对 output root。Runtime 通过 realpath 拒绝 traversal、symlink escape、Oracle/expected、特殊文件、输入输出嵌套、非空输出和本地操作中的远程 URL。

### Legacy / Development Compatibility

`runtime/recraft-cli.mjs` 的 `analyze-image`、`analyze-images`、`analyze-website` 仅用于旧版仓库开发流程，不是 RC canonical entrypoint。图片语义仍由 Host Agent 提供；脚本不能把确定性 metadata composition 冒充为实时视觉分析。

交互、分类、Design Contract、预览评审和修正流程分别由 `prompts/` 中的指南约束；模板位于 `templates/`。

## Canonical Design System

R-012 v2 的公开输出仅为 `design.md`、由其编译生成的 `preview.html` 与可选 `assets/`。内部 Evidence、Design IR、Gate Report、Candidate、Decision 和 Release metadata 不得作为下游作者源。

Host Agent 的每次输出只能创建新的 Candidate Revision。只有 Source Fidelity Gate、Design Coherence Gate 与真实 Project Owner Decision 同时 PASS，才允许创建 `status: accepted` 且 `agent_usable: true` 的 Design Release。确定性 qualification fixture 必须保持 `status: candidate`、`agent_usable: false`；它只能令 `blind_harness_status` 成为 `READY`，不能令 `blind_agent_status` 成为 `PASS`。

本地 macOS 诊断不替代 Linux Evidence。在真实 GitHub Linux 证据完成并经 validator 校验前，readiness 必须保持 `LINUX_PENDING`。

## Evidence-grounded Design System Intelligence（R-013）

生产 Design System 建立必须按以下单向流程执行：

1. 检查输入来源、用途与权威边界。
2. 完成全量 Source Coverage；所有来源逐一审阅后才能提取。
3. 建立 Product Understanding，区分产品对象、UI Region、系统组件、用户内容、营销内容与功能特定表达。
4. 将来源分类为 A/B/C 权威层；低权威来源不能覆盖高权威 UI 事实，除非存在显式人工 Decision。
5. Regionization 与测量必须记录来源、区域、方法、数值或范围、确定性、置信度和来源关系。
6. 视觉与语义提取必须区分 `OBSERVED_EXACT`、`OBSERVED_RANGE`、`DERIVED_ROLE`、`IMPLEMENTATION_CANDIDATE` 与 `UNKNOWN`。
7. 组件按 M0–M5 成熟度构建；只有完整具备 anatomy、states、constraints、responsive、accessibility 与 content semantics 才能成为 M5。
8. `design.md` 保持唯一公开作者源。
9. Internal Design IR 只能由 `design.md` 单向编译。
10. `preview.html` 必须证明 Foundations、Core Components、Product Composition、Stress/Density、Responsive/State 五类覆盖。
11. Gate A 验证 Source → Region → Measurement → Rule → Reconstruction → Comparison 链及真实视觉文件。
12. Gate B 验证 Design IR、组件/状态/组合完整性、Preview 投影和真实 Browser Evidence，且不得替代 Gate A。
13. Downstream Utility 对指定消费者给出 `PASS`、`DEGRADED` 或 `BLOCK`；需要下游自行发明设计语义时必须 `BLOCK`。
14. 多 Candidate 只做逐语义单元比较并生成 Decision Ledger Candidate；不得投票、平均、选胜者或自动授权，最终仍走 Candidate / Decision / Release 治理。

禁止在未审完来源时开始提取；禁止用通用 SaaS 先验替代来源；禁止让落地页/营销视觉覆盖应用 UI；禁止发明无证据的精确值或静默填充 UNKNOWN；禁止把漂亮 Preview 当作 Source Fidelity；禁止让下游用通用组件兜底缺失语义。

Recrafts 负责工作流、Schema、证据类别、测量语义、成熟度、Gate、比较和发布治理；视觉 Host 负责真实的来源理解、视觉推理、产品推理和证据绑定内容。Runtime 不编码任何模型专属策略或特定产品布局。
