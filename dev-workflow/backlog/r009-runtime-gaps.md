# R-009 Runtime Gap Backlog

R-009A 只记录以下 Build 2 能力缺口，不在 Benchmark 分支修改 frozen Runtime。

## RG-009-01 — Submit 阶段缺少 Layout Rules

- Benchmark Evidence：候选 `recrafts-package/layout-rules.json` 的 `layout_rules` 为空，原始自动评分因此扣除 Domain Coverage 分数。
- 影响：Host 已观察到编辑与展示布局，但稳定 Runtime 合约没有产出可回归的 Layout Rule 对象。
- Future Task：在新 Runtime 版本中定义 Layout Rule 提交、Schema、provenance 与 correction 语义。
- Golden-promotion impact：可作为如实披露的 Runtime limitation；不阻止当前静态 Corpus 被接受，但不能把空对象解释为 Source 缺失或完美覆盖。

## RG-009-02 — Submit 阶段缺少 Visual Grammar

- Benchmark Evidence：候选 `recrafts-package/visual-grammar.json` 的 `visual_grammar` 为空，原始自动评分保持 70/75。
- 影响：跨应用视觉关系只能由 Tokens、Components、Grid 和 Benchmark-layer Claims 间接表达。
- Future Task：在新 Runtime 版本中定义 Visual Grammar 对象、证据门槛和审阅操作。
- Golden-promotion impact：可披露后接受；Baseline 必须保留空值，后续 Runtime 增加能力时以新 Corpus/run 进行比较，不能回写当前 Baseline。

## RG-009-03 — Submit 阶段没有 Artifact Set

- Benchmark Evidence：`submit-analysis` 生成的候选 Package 没有 `artifact-set.json`；Artifact Set 仅在 R-007 correction/acceptance 演进阶段建立。
- 影响：原始分析输出在进入 correction 前缺少统一 Artifact Set 身份。
- Future Task：评估是否为 submit-stage candidate 引入独立 Artifact Set，保持与现有 R-007 lineage 兼容。
- Golden-promotion impact：不阻止本轮，前提是 correction 和 acceptance 通过正常操作生成新的 Artifact Set，并保留候选 Package Hash。

## RG-009-04 — Presentation Grammar 不在稳定 Runtime Contract

- Benchmark Evidence：`presentation-grammar.json` 由 Benchmark 层生成，明确标记 `benchmark-only-not-runtime-contract`。
- 影响：它可用于人工判断案例展示节奏，但不能作为已验证的 Recrafts Runtime Artifact。
- Future Task：单独评估 Presentation Grammar 是否进入后续协议；需要 Schema、Evidence provenance、correction 与 compatibility 设计。
- Golden-promotion impact：只能作为辅助 Claim 参与人工评分，不能当作 Golden Oracle 或稳定 Runtime 输出。

## RG-009-05 — Possible Design Intent 不在稳定 Runtime Contract

- Benchmark Evidence：`design-rationale.md` 将 Possible Design Intent 明确标为 Claims，并提供 alternative interpretation 与 candidate review status。
- 影响：设计意图推断可帮助人类审阅，但不能提升为 Source、Evidence 或事实答案。
- Future Task：如需产品化，建立专门的候选意图协议、置信度、反向解释和 Owner confirmation Gate。
- Golden-promotion impact：必须保持候选性质并由人类评分其纪律性；不得写入 Evidence 或期望答案。

## RG-009-06 — 多级输出父目录缺失时 Envelope 返回不透明错误

- Benchmark Evidence：冻结 Build 2 的 `submit-correction` 在 `output_directory` 的多级父目录尚不存在时返回 `INTERNAL_ERROR`，没有暴露安全路径解析失败原因；同一 Correction 直接调用核心函数成功，预建空父目录后同一 CLI Envelope 请求也成功。
- 影响：Host 无法区分路径准备问题、Schema 问题或 Runtime 内部异常，降低可恢复性和审计清晰度。
- Future Task：路径安全层应明确验证并创建允许范围内的输出父目录，或返回稳定的 `UNSAFE_OUTPUT_PATH` / `INPUT_NOT_FOUND` 类错误，不得把可操作错误折叠为 `INTERNAL_ERROR`。
- Golden-promotion impact：不影响本轮 Package 内容或 Acceptance；R-009A 只预建空父目录，不修改冻结 Build 2。
