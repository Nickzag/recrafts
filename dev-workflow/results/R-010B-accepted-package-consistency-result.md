# R-010B 执行结果

## 结论

补丁已执行并通过验证。冻结的 `package-c2a9b64984ab6d02` 未被修改；新生成的最终 accepted Package 为 `package-bfe3df8bc92fd7ad`，其父 Package 明确保持为 `package-c2a9b64984ab6d02`。

## 产物

- 既有 corrected staging Package：`package-42e863141911c07b`。
- 新 accepted Package：`examples/golden-candidates/spade-source-neutral-v2/packages/package-bfe3df8bc92fd7ad0`。
- 新 Artifact Set：`artifact-set-717ad5437a1b919c`。
- 包内验证索引：`packages/package-bfe3df8bc92fd7ad0/validation/index.json`。
- 包内 metadata report：`packages/package-bfe3df8bc92fd7ad0/metadata-consistency-report.json`。
- 包内 validation authority report：`packages/package-bfe3df8bc92fd7ad0/validation-authority-report.json`。
- 回归报告：`validation/r010b-final-regression-integrity-report.json`。

## 行为改动

- `composeAcceptedDesign` 从 accepted lineage 生成 `Version: 0.1.0-r010-accepted`、`Status: accepted`、当前 Package、`pilot-ready`、冻结父 Package、Owner Decision 和 Artifact Set 元数据。
- metadata-only `accept-artifacts` 以第一条 bounded correction 的 `base_package_id` 作为最终父 Package，并把 staging candidate ID 纳入新 Package identity，避免候选包冒充最终父包。
- `validation/index.json` 唯一指定当前 identity-safety PASS 报告、SHA-256、validation run ID，并把旧 BLOCKED 报告标记为 superseded。
- `validateAcceptanceFinalization` 接入 accepted Package 校验，检查元数据、delivery readiness、Owner Decision lineage、未解决授权文案和验证权威索引。
- 新增 `scripts/finalize-r010b-accepted-package.mjs`，拒绝覆盖已有 Package 目录。

## 验证证据

测试工作树：`recrafts/r-010-source-neutral-design-contract`，基线 HEAD `0ef8cad73184e01a14c12de209d92405975902db`，验证包含本次未提交工作树改动；未创建 Git commit 或 push。

| 命令 | 结果 |
|---|---|
| `node --test tests/r010b-package-flow.test.mjs`（修复前） | 按 TDD 预期失败：父包为 staging candidate |
| `node --test tests/r010b-package-flow.test.mjs tests/r010-package-evolution.test.mjs` | 7/7 PASS |
| `npm run validate:r010` | 34/34 PASS |
| `npm test`（`npm_config_cache=/tmp/recrafts-npm-cache-r010b`） | 194/194 PASS |
| `node scripts/validate-source-neutral-contract.mjs packages/package-bfe3df8bc92fd7ad` | `pilot-ready`, errors 0 |
| `node scripts/validate-acceptance-finalization.mjs ...` | `pass` |
| `node scripts/validate-r007-acceptance.mjs ...` | `accepted`, Artifact Set 与 lineage 一致 |
| `node scripts/validate-identity-safety.mjs ...` | PASS，findings 0 |
| `git diff --check` | PASS |

## 回归结果

- 15 个 canonical contract 中只有允许变化的 `design.md` 改变；14 个非 metadata contract 的 SHA-256 全部保留。
- Source Distance SHA-256 保持 `b3778d63ac9206af063967a04e21d76b11a303e134e8711a49b17075eb2b6fd3`。
- Owner Decision `decision-r010-owner-pass-20260716` 保留，delivery readiness 仍为 `pilot-ready`。
- 预览清单包含 36 项，未生成新预览或修改预览内容。
- 原 R-010 Package 的不可变性记录保持：`package-91d1a8226792e35e`、`package-0ad1502a874d2e00`、`package-c2a9b64984ab6d02`。
- accepted `design.md` 不再包含 `project owner must confirm`、`realization is not authorized` 或 `pilot-ready after acceptance`。
- 默认用户 npm cache 的 `EPERM/root-owned` 问题通过隔离临时 cache 验证，未修改用户 cache 或执行权限修复。

## 边界与限制

本次只修复 accepted-package metadata/validation consistency；没有改变 Source Neutrality 能力、portable design contracts 或 36 项预览，也没有把交付状态升级为 `production-ready`。完整生产实现、真实设备交互、性能预算和生产级人工无障碍审计仍未证明。
