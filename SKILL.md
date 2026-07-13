# Recrafts

Recrafts 是可独立安装和运行的视觉重构 Skill。它从获准使用的网站、图片和界面参考中建立可追溯证据，输出 lowercase `design.md`、结构化设计契约和验证报告。模型观察始终先作为运行证据，只有经过 Schema、来源、Scope 和人工决策校验后才能进入规范 Artifact。

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

Operation 为 `capabilities`、`prepare-analysis`、`submit-analysis`、`validate-package`、`generate-realization`、`verify-fidelity`。stdin 只能包含一个 Request JSON；stdout 只能包含一个 Response JSON；诊断写 stderr。Response 状态为 `completed`、`completed_with_warnings`、`needs_host_action`、`failed`。

Recrafts 不内置视觉模型。`prepare-analysis` 只生成 Evidence Bundle 和 Host 指令，并返回 `needs_host_action`；视觉 Host 完成语义分析后，通过 `submit-analysis` 提交满足 `contracts/host-analysis.schema.json` 的结构化结果。仅声明 vision capability 不能代替真实 Host Analysis。

Artifact path 必须相对 output root。Runtime 通过 realpath 拒绝 traversal、symlink escape、Oracle/expected、特殊文件、输入输出嵌套、非空输出和本地操作中的远程 URL。

### Legacy / Development Compatibility

`runtime/recraft-cli.mjs` 的 `analyze-image`、`analyze-images`、`analyze-website` 仅用于旧版仓库开发流程，不是 RC canonical entrypoint。图片语义仍由 Host Agent 提供；脚本不能把确定性 metadata composition 冒充为实时视觉分析。

交互、分类、Design Contract、预览评审和修正流程分别由 `prompts/` 中的指南约束；模板位于 `templates/`。
