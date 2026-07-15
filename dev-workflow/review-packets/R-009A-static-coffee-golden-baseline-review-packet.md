# R-009A 独立评审包

## 请求 ChatGPT 返回

```text
Mode B Source Pack stabilization：PASS / PASS WITH CHANGES / REWORK
Human calibration integrity：PASS / PASS WITH CHANGES / REWORK
Correction and Artifact Acceptance：PASS / PASS WITH CHANGES / REWORK
Immutable Baseline evidence：PASS / PASS WITH CHANGES / REWORK
Candidate-retention lifecycle：PASS / PASS WITH CHANGES / REWORK
R-009A：ACCEPT / REVISE
```

项目所有者最终 Verdict 已明确为 `REMAIN_CANDIDATE`。评审不得将机械 Gate 通过解释为 `GOLDEN`，也不得要求在没有新 Owner Verdict 的情况下更新 Corpus 或 Registry lifecycle。

## 评审入口

- Task：`dev-workflow/tasks/R-009A-static-coffee-golden-baseline.md`
- Result：`dev-workflow/results/R-009A-static-coffee-golden-baseline-result.md`
- Corpus：`benchmarks/L2-brand/static-coffee-static/corpus.json`
- Registry：`benchmarks/registry.json`
- Source/Region/Scope：`benchmarks/L2-brand/static-coffee-static/source/`
- Human Score：`benchmarks/L2-brand/static-coffee/reviews/r009a/human-score.json`
- Owner correction decision：`benchmarks/L2-brand/static-coffee/reviews/r009a/confirmed-correction.json`
- Artifact decision：`benchmarks/L2-brand/static-coffee/reviews/r009a/artifact-decision.json`
- Promotion decision：`benchmarks/L2-brand/static-coffee/reviews/r009a/golden-promotion-decision.json`
- Candidate Run：`benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-codex-gpt5-001/`
- Corrected Run：`benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-corrected-001/`
- Accepted Run：`benchmarks/L2-brand/static-coffee/runs/run-static-coffee-20260715-accepted-001/`
- Baseline：`benchmarks/L2-brand/static-coffee-static/snapshots/baseline.json`

本地视觉评审入口为 `benchmarks/L2-brand/static-coffee/reviews/r009a/human-score-form.html`。原始第三方图片位于 Git-ignored Source Pack，必须通过 manifest hash 验证，不应提交进仓库。

## 机械证据

| 项目 | 结果 |
|---|---|
| Mode B / Source Pack | PASS，20 Sources / 35 Regions / 4 intentional exclusions |
| No-Oracle | PASS |
| Human Score | PASS，Nick / Project Owner，25/25 |
| Automatic Score | 70/75 |
| Combined Score | 95/100，strong-pass |
| Correction | `correction-r009a-static-coffee-owner-001` |
| Corrected Package | `package-25f37a4ded85f7bd` |
| Accepted Package | `package-802e3e7ea40c3e99` |
| Artifact Set | `artifact-set-464ed6215fbd6867` |
| Acceptance Decision | `decision-r009a-static-coffee-owner-001` |
| Final Hard Gates | PASS |
| Baseline Validator | PASS |
| Owner Verdict | `REMAIN_CANDIDATE` |
| Candidate-retention Gate | PASS |
| Corpus / Registry lifecycle | candidate，baseline/latest 均为 null |
| Full repository tests | 159/159 PASS |
| R-009A directed tests | 26/26 PASS |
| Candidate Run preservation | PASS |

## 核心审计问题

1. 派生 Corpus 身份是否仅在 Scope Decision 和父 Source Pack lineage 同时匹配时被 Human Score Validator 接受？
2. 空 Artifact/Evidence refs 是否只是“可选”，而非跳过评分、理由和身份校验？非空无效引用是否仍 fail closed？
3. Correction 是否严格对应 Owner 确认的 mockup-context scope conflict，且没有扩大修改范围？
4. Corrected/Accepted Package 是否具有新 identity，原 Candidate Package hash 是否保持不变？
5. Artifact Set 中的 hashes、correction IDs 和 decision IDs 是否与 Baseline 一致？
6. Layout Rules、Visual Grammar、动画排除和 Benchmark-only artifacts 是否被如实披露？
7. `REMAIN_CANDIDATE` 是否保持 Corpus/Registry 指针为 null，没有借 Baseline evidence 偷渡 Golden lifecycle？
8. Result 与 Review Packet 是否足够让下一轮 ChatGPT 在不读取第三方原图的情况下完成机械审计，并明确哪些部分仍需本地视觉复核？

## 已知限制

- 静态 Corpus 不覆盖 motion grammar。
- Build 2 没有生成可用 Layout Rules 或 Visual Grammar。
- Build 2 Envelope 对缺失多级输出父目录返回不透明 `INTERNAL_ERROR`；R-009A 仅预建空父目录，没有修改 Runtime。
- `REMAIN_CANDIDATE` 是最终 Owner lifecycle 决定，不是待办状态。
