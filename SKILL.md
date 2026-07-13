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

```bash
node runtime/recraft-cli.mjs analyze-image --input <image> --output <empty-output-dir>
node runtime/recraft-cli.mjs analyze-images --input <input-dir> --output <empty-output-dir>
node runtime/recraft-cli.mjs analyze-website --url <public-url> --output <empty-output-dir>
npm run validate:r001
npm run validate:r002
```

Runtime 只能读取明确的 input path，拒绝 `oracle/` 和 `expected-*`。图片推理由 Host Agent 负责；脚本负责格式、hash、尺寸、region、provenance、Scope、阶段状态和 draft Artifact 的确定性组合。网站模式仅允许公开 HTTP(S) 页面，最多三个显式 route，不执行登录、验证码绕过、表单提交或破坏性 Action。

交互、分类、Design Contract、预览评审和修正流程分别由 `prompts/` 中的指南约束；模板位于 `templates/`。
