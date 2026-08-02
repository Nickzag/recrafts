# R-011R-A Visual Evidence Compiler Review Packet

## Review target

- Package：`examples/golden-candidates/craft-product-ui-r011r/evidence-package`
- Package ID：`package-r011r-a-7aa94582b7de20ed`
- Artifact Set：`artifact-set-f9596af55d60cd6c`
- Baseline：`88c1bc0`
- Branch：`recrafts/r-011r-a-visual-evidence-compiler`
- Protocol / Schema：`1.2 / 3.1.0`
- Source Pack：`craft-notes-v1`

## Review boundary

本包只证明“图片像素 → Region → Visual Measurement → State-aware Color → Source-observed visual Token / Component recurrence”的 Evidence Composition Runtime。它不包含 `design.md`、可移植主题、目标产品 Shell、CraftsOS 适配或视觉重建结果。旧 R-011 混合证据候选包及其失败预览只作为负向治理夹具，不是本包的分析输入。

## Evidence inventory

- 13 Tier A application screenshots，原始截图保存在 ignored local source pack，未提交。
- 55 Region records，所有 Region 有 pixel / normalized geometry、crop SHA-256、scope、state、measurement refs、classification method、review status。
- 105 Visual Measurement records。
- 15 State-aware color observations。
- 17 Source-observed visual Tokens。
- 6 validation reports + Artifact Set hash manifest。
- `review/owner-decision.json` 当前为 `PENDING`。
- `recrafts-0.5.0-rc.1.tgz` 已完成 `npm pack`，SHA-256：`764a31c1634069d7add9dd2aab0bccf5100360347e9ade5c500ea23a6da1a378`。
- Tarball 解包后的 version/capabilities smoke 通过；clean-install 因依赖下载环境未完成，不能作为通过项。

## Validators

| Validator | Result |
| --- | --- |
| Tier A Region coverage | PASS |
| Visual Measurement coverage | PASS |
| State-aware color | PASS |
| Source-observed Token coverage | PASS |
| Evidence weighting | PASS |
| No-oracle / no-downstream-output | PASS |
| Mutation tests | 2/2 test cases passed |

全仓回归为 206 项中 204 项通过；2 项失败在旧 R-011 worktree 同样出现，属于既有 package inventory / R-002 production-files 断言，未由 R-011R-A 新增逻辑引入。默认 npm cache 的 root-owned `EPERM` 通过临时 cache 绕过后仍只剩这两项既有断言。

## Owner decision

请只填写以下五项和总门禁，不要在本轮直接授权下游实现：

```text
Tier A Region depth: PASS / REWORK
Measurement integrity: PASS / REWORK
State distinction: PASS / REWORK
Observed Token coverage: PASS / REWORK
Evidence weighting: PASS / REWORK
R-011R-A: ACCEPT / REVISE
R-011R-B authorization: AUTHORIZED / BLOCKED
```

当前建议初始值为 `PENDING`。R-011R-B 只有在 `R-011R-A: ACCEPT` 后才可授权；在此之前不得生成 Faithful Reconstruction、Portable Product UI 或 CraftsOS Adaptation。
