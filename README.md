# Recrafts MVP RC

Recrafts 是可独立安装的 Host-Agent 视觉重构 Skill。它不内置视觉模型；视觉理解由接入方提供的 Host Agent 完成。

## JSON Envelope

`recraft-interop` 从 stdin 读取一个 JSON Request，只向 stdout 写一个 JSON Response。诊断信息只写 stderr。

```bash
printf '%s' '{"protocol_version":"1.0","request_id":"demo","operation":"capabilities","host":{"agent":"shell","engine":"unavailable","capabilities":[]},"working_root":".","input":{}}' | recraft-interop
```

MVP Operation：

```text
capabilities
prepare-analysis
submit-analysis
validate-package
generate-realization
verify-fidelity
```

## Host Analysis Handoff

```text
prepare-analysis
→ Evidence Bundle + Host instructions
→ status: needs_host_action
→ Host performs visual analysis
→ submit-analysis
→ validated design.md / Tokens / Components / Package
```

`needs_host_action` 不是错误，退出码为 0。Host Analysis 必须声明真实 Host/engine、vision capability、证据引用、Scope 和 confidence。声明 `host.capabilities: ["vision"]` 本身不能证明分析已经发生。

Artifact descriptor 只返回相对 output root 的路径、SHA-256、media type 和 Schema version。失败返回稳定 error code，退出码非 0。

## Capability Requirements

- `capabilities`: 无要求。
- `prepare-analysis`: `files`。
- `submit-analysis`: `files`, `structured-output`，并提交已执行的视觉 Host Analysis。
- 其余操作: `files`。

## Safety and Claim

Runtime 通过 realpath 拒绝 traversal、symlink escape、Oracle/expected、特殊文件、输入输出嵌套和非空输出。此 RC 仅证明本地安装与协议级互操作；不证明 embedded inference、多 Host 产品认证、公共发布、pixel-perfect reconstruction、full VIS、CraftsOS 私有集成或生产就绪。

## Legacy Development CLI

`runtime/recraft-cli.mjs` 中的 `analyze-image`、`analyze-images`、`analyze-website` 只保留为仓库开发兼容入口，不是 RC 的 canonical Host-Agent 协议。
