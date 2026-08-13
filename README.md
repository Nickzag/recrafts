# Recrafts 0.6 evidence-grounded Design System candidate

Recrafts 是可独立安装的 Host-Agent 视觉重构 Skill。它不内置视觉模型；视觉理解由接入方提供的 Host Agent 完成。

本包使用 `playwright@1.61.1` 提供公开 URL 浏览器采集适配器。首次使用 URL 采集前安装 Chromium；浏览器二进制是明确的运行时前置条件，不随 Tarball 内嵌：

```bash
npx playwright install chromium
recraft-capture https://www.example.com browser-capture
```

`recraft-capture` 只接受公开 HTTPS URL，拒绝私网、下载及结算路径，并输出分离的 network、DOM、CSS、computed-style、viewport/full-page screenshot、region、asset 和 font 记录。采集结果只有在全部必需类别存在、PNG 尺寸与声明一致且记录无重复时才会标记为 `complete`。随后在 `prepare-analysis` 的 URL source 中通过 `browser_capture_record` 引用 `capture-record.json`。

包内 `fixtures/interop` 与 `fixtures/r006` 是脱敏、受控、明确标注的协议示例；它们不代表实时视觉模型或真实公开 URL 运行。

## JSON Envelope

`recraft-interop` 从 stdin 读取一个 JSON Request，只向 stdout 写一个 JSON Response。诊断信息只写 stderr。

```bash
printf '%s' '{"protocol_version":"1.1","request_id":"demo","operation":"capabilities","host":{"agent":"shell","engine":"unavailable","capabilities":[]},"working_root":".","input":{}}' | recraft-interop
```

MVP Operation：

```text
capabilities
prepare-analysis
submit-analysis
validate-package
generate-realization
verify-fidelity
submit-correction
accept-artifacts
rollback-package
```

## Human Correction and Rollback

```text
candidate/blocked package
→ submit-correction → new awaiting-review/blocked package
→ accept-artifacts + project-owner decision → new accepted package
→ later accepted package
→ rollback-package → new accepted package restoring prior canonical hashes
```

Corrections、decisions 和 rollback events 只追加，不是 Evidence。每次操作必须写入新空目录并生成新的 `package_id`、`artifact_set_id` 和 lineage event；原 Evidence、Claims、initial extraction snapshot 与历史 Package 保持不变。

## Host Analysis Handoff

```text
prepare-analysis（typed image / image-set / url）
→ source-derived Evidence Bundle + copied sources/capture lifecycle + Host instructions
→ status: needs_host_action
→ Host performs visual analysis
→ submit-analysis
→ Schema-validated Claims + provenance-bearing domain candidates
→ draft / partial / blocked / awaiting-review Package
→ explicit Owner Decision import
→ new approved package_id
→ generate-realization
```

`needs_host_action` 不是错误，退出码为 0。Host Analysis 必须声明真实 Host/engine、vision capability、证据引用、Scope、confidence 和来源/区域分类。声明 `host.capabilities: ["vision"]` 本身不能证明分析已经发生。`submit-analysis` 不产生 Owner PASS，也不授权 realization；`generate-realization` 只有在导入显式 Owner Decision 并生成新的批准 Package 后才能继续。确定性 fixture decision 只能在 `options.interoperability_fixture: true` 下使用，不能代表真实项目所有者审核。

Artifact descriptor 只返回相对 output root 的路径、SHA-256、media type 和 Schema version。失败返回稳定 error code，退出码非 0。

## Capability Requirements

- `capabilities`: 无要求。
- `prepare-analysis`: `files`。
- `submit-analysis`: `files`, `structured-output`，并提交已执行的视觉 Host Analysis。
- `submit-correction`、`accept-artifacts`、`rollback-package`: `files`, `structured-output`。
- 其余操作: `files`。

## Safety and Claim

Runtime 通过 realpath 拒绝 traversal、symlink escape、Oracle/expected、特殊文件、输入输出嵌套和非空输出。此 RC 仅证明本地安装与协议级互操作；不证明 embedded inference、多 Host 产品认证、公共发布、pixel-perfect reconstruction、full VIS、CraftsOS 私有集成或生产就绪。

许可证状态为 `UNLICENSED`；此内部 RC 不授权公开 npm 发布或再分发。

## Canonical Design System Governance (R-012 v2)

公开 Design System 固定为 `design.md`、`preview.html` 与可选 `assets/`。`design.md` 是唯一作者源；`preview.html` 只能由编译后的 Internal Design IR 单向生成，并绑定 source、IR 与 renderer hash。默认消费者只接受带真实项目所有者 Decision、Gate A 与 Gate B 均通过的 Accepted Release；Candidate 必须显式启用，且始终保持 `agent_usable: false`。

Protocol 1.2 新增 `parse-design-md`、`compile-design-ir`、`validate-design`、`render-design-preview`、`compare-design-candidates`、`create-design-release`、`validate-design-release`、`compare-design-releases`。Gate A 验证 Source Fidelity，Gate B 验证 Design Coherence；Preview 不能充当 Source Fidelity Evidence。确定性 fixture 只能证明 Gate runtime 和 blind harness 可运行，不能产生 Owner PASS、真实 Blind Agent PASS 或 Accepted Release。

当前本地资格固定为 `LINUX_PENDING`。只有 GitHub `ubuntu-latest` Workflow 生成并通过 `validate-r012-linux-evidence.mjs` 校验的证据，才能在后续 evidence-only 更新中改变 Linux readiness。

## Evidence-grounded Intelligence（R-013）

`recrafts.design-intelligence/v1` 将 Source Coverage、Product Understanding、Evidence Tier、Visual Measurement、Component Maturity、Preview Coverage 与 Downstream Utility 组成一个 Ajv 管理的 Canonical Artifact。既有 11 个 Design Operation 保持不变：

- `verify-source-fidelity` 可使用 `qualification_profile: r013-evidence-grounded` 和 `design_intelligence_file`，将前四项能力绑定进 Gate A，并实际校验声明的 Source、Reconstruction 与 Overlay 文件。
- `validate-design` 在相同 profile 下将 Component Maturity、Product Composition Preview Proof 与 Downstream Utility 绑定进 Gate B。
- `compare-design-candidates` 在既有隔离和冻结 Manifest 约束内输出逐域比较及未授权的 Decision Ledger Candidate；它不会投票、平均或选择赢家。

R-013 Candidate 版本为 `0.6.0-rc.1`，Protocol 仍为 1.2。此任务不发布 npm 包，也不授权 Accepted Design Release。

## Legacy Development CLI

`runtime/recraft-cli.mjs` 中的 `analyze-image`、`analyze-images`、`analyze-website` 只保留为仓库开发兼容入口，不是 RC 的 canonical Host-Agent 协议。
