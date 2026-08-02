# R-011 Recrafts Product UI Mixed Evidence 执行结果

状态：`REVIEWABLE / AWAITING OWNER VISUAL REVIEW`  
分支：`recrafts/r-011-mixed-evidence-product-ui-contract`  
基线：R-010B accepted commit `8866eba4fd521ba8dc0b70eb770f35cb881cf5ab`  
Candidate Package：`package-08c28e7765f0cabf`  
Candidate Artifact Set：`artifact-set-3d20de490db98156`  
Prepared Analysis：`prepared-2427cc9ce3142173`  

## 完成内容

- 建立 `product-ui-mixed-evidence` 输入 Profile 与严格 `product-ui-host-analysis.schema.json`。
- 使用 13 张 `craftdo.zip` 产品截图作为 Tier A application Evidence。
- 使用 `https://www.craft.do/`、`https://www.craft.do/learn`、`https://support.craft.do/` 的真实 Chromium 捕获作为 Tier B/C 官方 corroboration；每个 URL 保留 capture metadata、network、DOM、CSS、computed style 与 screenshot Evidence。
- 记录真实 Host 运行：`host_agent=Codex`、`engine=gpt-5`、`vision_capability=true`、`evidence_class=codex-session-fixture`。该字段记录本次可审计 Codex 视觉分析执行，不声称 Recrafts 内置视觉模型。
- 输出 16 个 Source 记录、2,197 条 Prepared Evidence 引用、12 条视觉观察、11 条 application grammar、14 个 screen family、12 个状态、10 个组件契约与 recurrence、12 个语义 token、10 个 Source Distance dimension。
- 明确分离 application chrome、workspace、editor、inspector、review/evidence、marketing、template/user-content 与 platform chrome；营销、模板、用户内容和平台区域均设置 `canonical_promotion_blocked=true`。
- 输出 typography、iconography、interaction、motion、responsive、accessibility、conflicts 和两套 Shell：`quiet-frame`、`signal-column`。
- 生成 14 个 required preview surfaces × 2 个 Shell = 28 个 HTML/PNG source-neutral previews。每个预览标注 contract IDs、component IDs、state IDs 以及 `source_derived` / `craftsos_required` 两层来源。
- 生成 `review/owner-review.html`，用于逐项打开两套方向的预览与 Owner 视觉评审。

## 验证结果

| 验证项 | 结果 |
| --- | --- |
| Host Analysis Schema 与语义校验 | PASS |
| Source Scope / marketing、template、user-content boundary | PASS |
| Application Grammar | PASS |
| State Matrix | PASS |
| Component Recurrence | PASS |
| Source Distance（10 dimensions） | PASS |
| Preview Coverage（28 previews） | PASS |
| No-Oracle Product UI rerun | PASS |
| Artifact Set / required artifact hashes | PASS |
| R-011 negative tests | 8/8 PASS |
| R-001 至 R-011 全仓回归 | 202/202 PASS |

## Owner Gate

当前未写入 Owner PASS，也未创建 accepted Package、Decision Set 或 production implementation。`recrafts-package.json` 保持 `status=awaiting-owner-review`、`decision_status=pending`、`owner_decision_set_id=null`。Owner 需要在两个 Shell 方向和 10 个评审维度上作出 `PASS`、`PASS WITH CHANGES` 或 `REWORK`。

## 已知未知与边界

- 移动端没有 Tier A 产品截图，移动导航与 inspector sheet 保持 `unknown/candidate`，没有伪造 observed 结论。
- 官方首页是 marketing surface，只提供公开产品语言 corroboration，不定义 application shell；支持站点和教程同样不替代 Tier A 像素证据。
- 本次只生成设计契约和静态审查预览，没有修改 CraftsOS/Layoutcrafts，也没有实现 UI、交互运行时、shadcn 组件或生产代码。
- 本候选作为 rejected visual-recovery fixture 冻结提交，未推送；历史 R-010B RC 未修改。

## Task-025R Handoff

`BLOCKED`。只有在本候选 Package 完成独立评审并获得 Project Owner `PASS` 后，才能建立新的 corrected Package/Artifact Set 并授权 Task-025R；当前不允许下游 UI 实施读取此候选包。

## Requested Independent Verdict

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
