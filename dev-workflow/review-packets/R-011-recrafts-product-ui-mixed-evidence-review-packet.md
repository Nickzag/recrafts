# R-011 Recrafts Product UI Mixed Evidence Review Packet

## 评审对象

- Candidate Package：`examples/golden-candidates/craft-product-ui-r011/candidate`
- Package ID：`package-08c28e7765f0cabf`
- Artifact Set：`artifact-set-3d20de490db98156`
- Prepared Analysis：`prepared-2427cc9ce3142173`
- Owner Review Workspace：`examples/golden-candidates/craft-product-ui-r011/candidate/review/owner-review.html`
- Package 状态：`awaiting-owner-review` / `decision pending`

## 输入 Source Inventory 与层级

| Source | 数量 | 用途 | 规则 |
| --- | ---: | --- | --- |
| `product-app-screenshot` | 13 | Tier A application topology、panel ownership、density、visible states | 可用于 application contract；内容区域仍按 Region 分类 |
| `official-interface-tutorial` | 1 | Tier B 官方界面/交互 corroboration | 不替代 Tier A |
| `official-help-documentation` | 1 | Tier B navigation/feature language corroboration | 不定义像素系统 |
| `official-product-web` | 1 | Tier C public/marketing corroboration | `marketing-surface`，禁止进入 application Core |

真实 URL 捕获：`https://www.craft.do/`、`https://www.craft.do/learn`、`https://support.craft.do/`。所有 URL 捕获使用 Chromium 149.0.7827.55，并在 Prepared Bundle 中保留 capture metadata、network、DOM、CSS/computed style、screenshot 与 region Evidence。

## Host Analysis 审计身份

```json
{
  "host_agent": "Codex",
  "engine": "gpt-5",
  "vision_capability": true,
  "evidence_class": "codex-session-fixture",
  "prepared_analysis_id": "prepared-2427cc9ce3142173"
}
```

这是本次 Host Agent 视觉分析运行的可审计身份，不是 Recrafts 内置视觉服务声明。正式使用仍要求 Host 提供具备视觉能力的模型并提交符合 Schema 的 Host Analysis。

## Scope 与防污染边界

`source-scope-map.json` 将 application-chrome、workspace-shell、navigation、editor-chrome、canvas、inspector、review-and-evidence、overlay、system-feedback 与非 Core 的 marketing-brand、template-content、user-content、platform-chrome 分开。Marketing homepage、Style Gallery/template thumbnail、用户文档内容和系统工具栏 Region 均有 `canonical_promotion_blocked=true`；负向测试会拒绝其成为全局 token 或 application Core。

## Contract 与 Artifact Set

候选包包含 23 个 R-011 required artifacts：`design.md`、source manifest/scope/observations、application grammar、surface topology、screen inventory、navigation/panel/density、tokens、typography、iconography、components、state matrix、interaction/motion/responsive/accessibility、source distance、conflicts、preview coverage 与 artifact set。另含 claims、prepared/evidence audit files、delivery readiness 和 28 个 preview HTML/PNG。

Application grammar 记录 11 条跨界面规则；State Matrix 记录 12 个状态；Component Recurrence 记录 10 个组件在多屏 occurrence；Source Distance 固定 10 个 dimension 并通过 gate。用户内容与 marketing token 的 promotion、无 recurrence Core component、单屏 global rule、inferred Core state、复制 source icon 和未知顶层字段均有负向测试。

## Preview 评审入口

`review/owner-review.html` 以中文列出 14 个 Required Surface，并分别链接两个 Shell 的 PNG 与 HTML。两套方向均包含：Workspace Library desktop/mobile、Project Studio desktop/compact、Review & Evidence、Quick Create、Command/search overlay、Dialog、Navigation Sheet、Inspector Sheet、empty/loading/blocking conflict/rollback confirmation。

每个 Preview 记录：

- contract IDs
- component IDs
- state IDs
- `provenance_layers.source_derived`
- `provenance_layers.craftsos_required`
- source-neutral status 与 PNG SHA-256

## 自动验证证据

```text
npm run build:r011                         PASS
npm run validate:r011                      PASS
npm run test:r011                          8/8 PASS
validate-product-ui-source-scope           PASS
validate-component-recurrence              PASS
validate-state-matrix                      PASS
validate-application-grammar                PASS
validate-product-ui-source-distance        PASS
validate-product-preview-coverage           PASS (28 previews)
validate-no-oracle-product-ui              PASS
validateProductUIPackage                    PASS
```

R-001 公共 validator 曾将新增 Host fixture 的函数赋值识别为 secret-like string；已改为不含 credential 关键词，并重新执行完整回归，最终 `npm test` 为 202/202 PASS。

## Owner Review 请求

请只对视觉与契约候选做判断，不把本包视为已接受系统：

```text
Mixed-evidence integrity: PASS / REWORK
Product UI understanding: PASS / REWORK
Application contract quality: PASS / REWORK
Component/state traceability: PASS / REWORK
Source neutrality: PASS / REWORK
CraftsOS preview suitability: PASS / REWORK
R-011: ACCEPT / REVISE
Task 025R handoff: AUTHORIZED / BLOCKED
```

当前 Package 已被 Recovery Upgrade Pack 标记为 rejected visual authority，并作为不可变失败 fixture 冻结；建议保持 `R-011: REVISE/PENDING` 与 `Task-025R: BLOCKED`。任何 correction 必须生成新 Package ID，不得原地覆盖当前候选包。
