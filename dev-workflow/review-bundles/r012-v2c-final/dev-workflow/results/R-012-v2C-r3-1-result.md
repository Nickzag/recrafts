# R-012 v2C-R3.1 — Executability & Evidence Closure 结果

## 状态

R3.1 完成。语法修复、Production Gate 收紧、Smoke 真修复、Browser Evidence Schema。

## 修复

1. **dual-gates 语法** — governance.await → await governance.
2. **Production Gate 禁止 fixture** — createDesignRelease 只接受 production Gate A (qualification_fixture=false, real_source_source_fidelity=PASS, visual_file_verification=PASS)
3. **Installed Smoke** — await gateB、移除 +4 hack、candidates 不覆盖
4. **Browser Evidence 路径** — validate-design 传递 _evidence_dir 给 Gate B
5. **Browser Evidence Schema** — packages/recrafts-design/schemas/browser-evidence.schema.json
6. **Release Store 测试** — Gate A fixture 增加 visual_file_verification: PASS
7. **状态保持** — LINUX_PENDING / Owner MISSING / Release BLOCKED
