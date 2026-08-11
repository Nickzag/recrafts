# R-012 v2C-R1 — Packaging & Canonical Contract Closure 结果

## 状态

v2C-R1 完成。Runtime 修复 + Contract Schema 同步 + Bundle 增强。

## v2C-R1 修复（12 项）

1. **validate-design Schema** — 增加 `browser_evidence_file` 字段
2. **verify-source-fidelity Schema** — 重写为新 Gate A Contract（candidate + 7 artifacts + visual files + production_gate）
3. **compare-design-candidates Schema** — 增加 `canonical_allowed_input_manifest`、`target_lock`、`evidence_revision`
4. **Production Gate A** — `productionGate: true` 时强制要求 visual files
5. **Allowlist Fallback** — 无 Authority Manifest 时标记 `missing-authority-manifest` failure
6. **Owner Receipt 不可变** — 文件名 `${decision_id}.receipt.json`，写入前检查不存在
7. **Operation List 同步** — standalone test、Linux evidence、installed smoke 统一为 11 个 operations
8. **Consumer receipt 查找** — `loadDesignRelease` 按 `.receipt.json` 后缀查找而非硬编码文件名
9. **Release Store receipt artifact** — 使用 `${decision_id}.receipt.json` 作为 artifact key
10. **Golden Candidate** — 重新构建并验证通过
11. **Contract Schemas** — 三个 Operation Schema 全部 `additionalProperties: false`
12. **状态保持** — LINUX_PENDING / Owner MISSING / Release BLOCKED / agent_usable=false

## 测试

- Gate B: 6/6 PASS
- Gate A: 4/4 PASS
- Preview Compiler: 6/6 PASS
- Standalone: 5/5 PASS

## 修改文件

- contracts/operations/validate-design.request.schema.json
- contracts/operations/verify-source-fidelity.request.schema.json
- contracts/operations/compare-design-candidates.request.schema.json
- runtime/design_owner_decision.mjs
- runtime/design_fidelity_gate.mjs
- runtime/design_qualification.mjs
- runtime/design_system_runtime.mjs
- runtime/r012_linux_evidence.mjs
- runtime/design_release_store.mjs
- packages/recrafts-design/src/consumer.mjs
- tests/r012-standalone.test.mjs
- scripts/r012-installed-consumer-smoke.mjs
