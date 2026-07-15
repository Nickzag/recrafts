# R-009A Static Coffee 静态基线结果

## 结论

R-009A 已完成 Mode B 静态 Source Pack 稳定化、项目所有者人工评分、正常 Correction、Artifact Acceptance、最终评分和不可变 Baseline 验证。项目所有者 Nick 最终给出 `REMAIN_CANDIDATE`，因此派生 Corpus 与 Registry 保持 `candidate`，`baseline_run_id` 和 `latest_run_id` 继续为 `null`；没有执行 Golden lifecycle 更新。

## Source Pack

- Corpus：`l2-brand-static-coffee-static-v1@1.0.0`
- Source Pack：`static-coffee-static-source-pack-v1@1.0.0`
- 模式：`static-only`
- 来源画面：20
- Region：35
- 可审阅静态能力：14
- 动画排除：4 个，每个均记录原因、影响、能力影响和 Owner approval
- Source Pack SHA-256：`b6de73c402521f9ca7545562b8e4522a64c0c734ddc03866fa9f946c98a7aba7`
- No-Oracle：PASS

原 partial Corpus 没有被改写为 complete。第三方像素仍仅保存在 Git-ignored 本地 Source Pack，仓库只记录元数据与哈希。

## 人工审阅

- Reviewer：Nick
- Role：Project Owner
- 日期：2026-07-15
- 八项评分：全部 5/5
- Human Score：25/25
- Source Pack Hash verified：true
- Correction Proposal reviewed：true
- Correction decision：`CONFIRM`
- 理由：`结果如预期`

中文评分页将每项对应的原始画面、候选提取摘要、观察重点和评分控件放在同一张卡内。Artifact/Evidence refs 为可选技术引用；留空仍受结构校验，填写时继续执行路径和 Evidence ID 安全检查。

## Correction 与 Acceptance

- Frozen runtime：`recrafts@0.4.0-rc.1` Build 2
- Protocol / Schema：`1.1 / 3.0.0`
- 原 Candidate Package：`package-a5adf72a7eecac57`
- 原 Candidate Package SHA-256：`80ca754da37a87983183691e06a3e900a586080f1c3594406481ddd70e532dfb`
- Correction：`correction-r009a-static-coffee-owner-001`
- Corrected Package：`package-25f37a4ded85f7bd`
- Artifact Decision：`decision-r009a-static-coffee-owner-001`
- Accepted Package：`package-802e3e7ea40c3e99`
- Artifact Set：`artifact-set-464ed6215fbd6867`
- Accepted Package validation：PASS

Correction 仅关闭 `conflict-mockup-context-scope`：保留项目级暖色低调摄影方向，同时明确排除咖啡馆室内、木框和类似平台控件作为全局系统内容。操作通过冻结 Build 2 的 `submit-correction` 和 `accept-artifacts` 完成，未手改 Package。

## 最终评分与 Baseline

- Automatic Score：70/75
- Human Score：25/25
- Combined Score：95/100
- 状态：`strong-pass`
- Hard Gates：PASS
- Traceability：PASS，19 个 domain candidates，0 个失败
- Scope isolation：PASS
- Conflicts：1 个已解决，0 个 open high impact
- Baseline run：`run-static-coffee-20260715-accepted-001`
- Baseline validation：PASS

不可变 Baseline 证据保存在 `benchmarks/L2-brand/static-coffee-static/snapshots/baseline.json`。由于 Owner Verdict 为 `REMAIN_CANDIDATE`，该证据不写入 Corpus/Registry lifecycle 指针。

## Owner Verdict

- Verdict：`REMAIN_CANDIDATE`
- Lifecycle：`candidate`
- Corpus baseline/latest：`null / null`
- Registry baseline/latest：`null / null`
- Candidate-retention Gate：PASS

## 已披露限制

1. 四个动画模块仍在静态 Corpus 范围外，motion grammar 不参与本 Baseline。
2. Build 2 的 `layout-rules.json` 与 `visual-grammar.json` 仍为空；该限制保留在 Baseline，未在 R-009A 修改 Runtime。
3. Presentation Grammar 和 Possible Design Intent 仍为 Benchmark-only candidates，不属于稳定 Runtime Contract。
4. Build 2 Envelope 在多级输出父目录不存在时返回不透明 `INTERNAL_ERROR`；建立空父目录后同一请求成功。未修改 Build 2，此问题应进入后续 Runtime backlog。

## 边界确认

- 原 Candidate Run 未修改。
- Frozen Build 2 未修改。
- 原 partial Corpus 未改写。
- CraftsOS、Layoutcrafts 未修改。
- 没有生成或声明 Owner `GOLDEN`。
- 没有将评分测试占位内容写入正式 Human Score。

## 最终验证

- `npm test`：159/159 PASS
- R-009A 定向测试：26/26 PASS
- Source Pack stability：PASS
- No-Oracle：PASS
- Corpus Validator：PASS
- Human Score Validator：PASS，25/25
- Accepted Baseline Validator：PASS
- Candidate-retention Validator：PASS，lifecycle=`candidate`
- Candidate Run preservation：PASS
- `git diff --check`：PASS
