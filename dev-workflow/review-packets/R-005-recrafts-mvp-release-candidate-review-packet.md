# R-005 Build 5 Review Packet

## Requested Verdict

```text
Mechanical packaging and clean install: PASS / PASS WITH CHANGES / REWORK
Host-Agent interoperability usefulness: PASS / PASS WITH CHANGES / REWORK
R-005: ACCEPT / REVISE
```

## Review Inputs

- Result: `dev-workflow/results/R-005-recrafts-mvp-release-candidate-result.md`
- RC: `release-candidates/recrafts-0.3.0-rc.1-build5/`
- Release manifest: `bundle/release-manifest.json`
- Package inventory and RC readiness: `validation/`
- Host and Owner Decision contracts: `bundle/contracts/`
- Clean-install evidence: `validation/clean-install-report.json`
- Build 4 independent review: `review/independent-r005-build4-review.md`
- Owner review form: `review/r005-release-review.md`

## Reproduction

```bash
cd /Users/Nick/Documents/Recrafts
npm run validate:r001
npm run test:r001
npm run validate:r002
npm run test:r002
npm run validate:r003-preflight
npm run validate:r003-realization
npm run validate:r004
npm run validate:r005
node --test tests/r005-*.test.mjs
npm test
```

## Build 5 Blocking-defect Checks

1. Host 是否能仅通过 returned contract 打开 `prepared/sources/source-N.ext`，且同名来源不歧义？
2. Prepared source 是否在 `submit-analysis` 前重新绑定 ID 并验证 SHA-256？
3. `host-analysis.schema.json` 的结构、状态、confidence、unknown field 和 evidence refs 是否真实 fail closed？
4. 正常 `submit-analysis` 是否保持 `awaiting-owner-review`，不写入 PASS 或授权 realization？
5. Owner Decision 是否产生新的 package identity，且旧 Candidate 不被原地修改？
6. Fixture Decision 是否必须显式启用专用 option，并与 project-owner provenance 区分？
7. Decision ID/status/source 是否进入 approved package、compiled contract 和 realization？
8. 缺失或非 canonical classification 是否保持 blocked，不能默认升级为 `canonical-product-ui`？
9. npm inventory、Clean-install、路径安全、平台和分发声明是否仍保持 Build 4 已通过的边界？
10. 最终 Release Claim 是否仍为 protocol-level RC，而非生产就绪？

项目所有者 Release Verdict 当前为 `PENDING`。
