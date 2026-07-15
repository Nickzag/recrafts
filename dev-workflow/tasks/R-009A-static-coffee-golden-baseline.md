# R-009A — Static Coffee Corpus Stabilization, Human Calibration and Golden Baseline

## Assignment

- Base branch: `recrafts/r-009-golden-corpus-static-coffee`
- Base commit: `9c1667f9c60406ddb98214ff38b9c588d4c0ba6b`
- Working branch: `recrafts/r-009a-static-coffee-golden-baseline`
- Original Corpus: `l2-brand-static-coffee-v1@1.0.0`
- Candidate run: `run-static-coffee-20260715-codex-gpt5-001`
- Runtime: frozen installed Build 2
- Recrafts Runtime、CraftsOS、Layoutcrafts modification: forbidden

## Goal

完成 Source Pack stabilization、Human visual review、normal correction、Artifact acceptance、final scoring、immutable baseline 和 Project-owner Golden promotion review。不得实现新的 Recrafts 产品能力。

## Owner-selected stabilization

Mode B：建立 `l2-brand-static-coffee-static-v1`，范围为 static brand identity and case-study presentation，显式排除 motion grammar。四个 animated modules 必须分别记录 identity、reason、impact、capability impact 和 owner approval；原 partial Corpus 不得被修改为 complete。

## Required controls

1. 保留原 candidate run、70/75 automatic score、Host Analysis、traceability/scope/conflict reports 和 `package-a5adf72a7eecac57`。
2. 在 `benchmarks/L2-brand/static-coffee/reviews/r009a/` 生成 Source、Region、Evidence、Claim、Token、Component、Grid、Layout、Visual Grammar、Conflict、Presentation Grammar 和 Possible Design Intent 审阅工作区，不展示 expected answers。
3. Nick（Project Owner）必须完成八个 1–5 Human Score，每项包含 reason、Artifact refs 和 Evidence refs。
4. 仅依据实际发现生成 correction；通过 frozen installed Build 2 的 `submit-correction` 创建新 immutable Package，不得手改 Package。
5. 通过 `accept-artifacts` 和匹配的 authorized decision 创建新的 accepted Package 与 Artifact Set。
6. 保留 candidate score，生成 final automatic/human/combined scores、hard gates、traceability、scope、conflict 和 candidate-vs-accepted comparison。
7. 仅在 acceptance、hash、human score 和 hard gates 全部验证后建立 immutable baseline。
8. 只有 Project Owner 明确给出 `GOLDEN` 才能更新 registry/Corpus lifecycle；否则保持 candidate。
9. Runtime gaps 只进入 backlog，不在 R-009A 修补 Build 2。

## Required validators

- `validate-source-pack-stability.mjs`
- `validate-human-score.mjs`
- `validate-accepted-baseline.mjs`
- `validate-golden-promotion.mjs`

验证 static/multimedia stability、intentional exclusions、reviewer identity、human reasons/refs、candidate immutability、new correction/acceptance identities、accepted hashes、baseline references、registry/Corpus consistency、hard gates 和 no-Oracle boundary。

## Completion evidence

最终必须写入 `dev-workflow/results/R-009A-static-coffee-golden-baseline-result.md` 和 `dev-workflow/review-packets/R-009A-static-coffee-golden-baseline-review-packet.md`，记录 stabilization mode、Source/Region counts、animation treatment、human reviewer/score、correction/decision IDs、accepted identities、final scores、hard gates、baseline、Runtime gaps、Owner verdict 和 lifecycle。

本任务记录来自 `/Users/Nick/Downloads/Recrafts Task Pack (1).zip`。详细原始任务包保持为外部只读输入。
