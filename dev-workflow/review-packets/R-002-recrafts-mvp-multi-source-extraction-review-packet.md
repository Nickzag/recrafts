# R-002 Review Packet

## Requested Verdict

请 ChatGPT 独立评审返回 `PASS`、`PASS WITH CHANGES` 或 `REWORK`。R-003 只能在本评审与项目所有者 extraction review 完成后授权。

## Review Inputs

- Task: `dev-workflow/tasks/R-002-recrafts-mvp-multi-source-extraction-runtime.md`
- Result: `dev-workflow/results/R-002-recrafts-mvp-multi-source-extraction-result.md`
- Runtime: `runtime/recraft-cli.mjs`, `runtime/extraction_runtime.mjs`, `runtime/local_adapter.mjs`
- Validators: `scripts/validate-r001-recrafts-contract-evidence-fixture.mjs`, `scripts/validate-r002-mvp-extraction.mjs`, `scripts/compare-r002-normalized-output.mjs`
- Tests: `tests/r001-validator.test.mjs`, `tests/r002-runtime.test.mjs`, `tests/r002-validator.test.mjs`
- R-001 evidence: `dev-workflow/evidence/r-001/`
- Runs: primary 13-image, single-image, captured Framer website and supplemental Craft.do website fixtures under `examples/golden-candidates/`.

## Reproduction

```bash
cd /Users/Nick/Documents/Recrafts
npm run validate:r001
npm run test:r001
npm run validate:r002
npm run test:r002
npm test
```

For repeatability, run the primary input twice into two empty directories and execute `node scripts/compare-r002-normalized-output.mjs <left> <right>`.

## Highest-Risk Review Questions

1. Runtime 是否真实读取 input，还是通过路径、文件名或 Fixture 常量硬编码答案？
2. Oracle、expected files 和生产 package 是否被可靠隔离？
3. Source/region classification、Scope 和 content isolation 是否能阻止用户内容或营销视觉污染全局系统？
4. 模糊图片是否仍被错误用于精确字体、间距、Icon 或 pixel claim？
5. 每个 Token/Component candidate 是否有有效 evidence refs，excluded region 是否完全不参与 inference？
6. 网站 adapter 是否会误入登录、私网、重定向、表单、下载、checkout 或无边界 route？
7. 同输入结构是否稳定，输入变化是否能改变 source/output evidence？
8. `captured.framer.website` 与 `craft.do` 是否仍被限定为 homepage smoke evidence，而没有暗示完整网站复刻？
9. 旧 mock 是否确实被统一到 extraction runtime，而不是形成平行实现？
10. 文档和 Artifact 是否提前暗示 Preview、Fidelity、CraftsOS integration 或 production readiness？

## Evidence Classification

- R-001 logs: clean-local-checkout runtime evidence.
- Multi/single/website outputs: development runtime evidence.
- Oracle: manually authored expected fixture, comparison-only.
- `review/extraction-review.md`: awaiting project-owner review; no human approval is claimed.

## Known Limitations

- Runtime 不做嵌入式模型调用；Host Agent 负责视觉解释。
- Website DOM/CSS summary 是浅层、单 route、desktop evidence。
- 当前模糊主 Fixture 不支持微观视觉测量。
- 没有 Preview、correction、fidelity 或 production packaging acceptance。
