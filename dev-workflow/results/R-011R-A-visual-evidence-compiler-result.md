# R-011R-A Visual Evidence Compiler Result

## 结论

R-011R-A 已完成实现并生成候选 Evidence Package，当前状态为 `awaiting-r011r-a-review`。本轮没有生成 design system、portable tokens、主题、CraftsOS 预览或任何下游实现；R-011R-B 仍被 Owner Review Gate 阻塞。

## 基线与范围

- 独立分支：`recrafts/r-011r-a-visual-evidence-compiler`
- 实施基线：`88c1bc0`（冻结 R-011 混合证据失败状态）
- 目标版本：`recrafts 0.5.0-rc.1`
- 协议 / Schema：`1.2 / 3.1.0`
- Source Pack：`craft-notes-v1`
- Raw source policy：13 张源截图仅位于被忽略的 `.local-benchmark-sources/craft-notes-v1/`，未加入 Git。

## Candidate Evidence Package

- Package：`examples/golden-candidates/craft-product-ui-r011r/evidence-package`
- Package ID：`package-r011r-a-7aa94582b7de20ed`
- Artifact Set：`artifact-set-f9596af55d60cd6c`
- 状态：`awaiting-r011r-a-review`
- Owner Verdict：`PENDING`
- `downstream_generation_authorized`：`false`

## 证据覆盖

- Tier A Screens：13
- Regions：55，覆盖 Application Sidebar、Content Header，以及各屏幕的 Toolbar、List、Canvas、Inspector、Overlay、Dialog、Control、Empty State 等实际可见区域。
- Visual Measurements：105，均带 Region、method、certainty、sample location 与 Evidence refs。
- State-aware color observations：15，区分 selected / active / focus / available-option / template-content / marketing。
- Source-observed visual Tokens：17，仅记录源观察，不声明可移植设计 Token。
- Component instances：无 generic `Card`，均引用实际 Region。
- Unknowns：响应式断点、hover 全状态、精确字体文件等保持 `unknown`。

## 校验结果

以下验证均为实际执行结果，全部 `pass`：

- `validate-r011r-a`
- `validate-tier-a-region-coverage`
- `validate-visual-measurement-coverage`
- `validate-state-aware-color`
- `validate-source-observed-token-coverage`
- `validate-evidence-weighting`
- `validate-r011r-a-no-oracle`
- `test:r011r-a`：2/2

附加发布检查：`npm pack --json --pack-destination /private/tmp/recrafts-r011r-a-pack` 成功生成 `recrafts-0.5.0-rc.1.tgz`（130451 bytes，SHA-256 `764a31c1634069d7add9dd2aab0bccf5100360347e9ade5c500ea23a6da1a378`），包内包含 R-011R-A runtime 与六个 Operation Schema，未包含候选 Evidence Package 或 raw source。

Tar smoke 将该 tarball 解包后执行 `interop_cli --version` 与 protocol 1.2 `capabilities`，均通过。真实 `npm install` clean-install 未宣称通过：离线重试因临时 npm cache 缺少 `playwright` 返回 `ENOTCACHED`，联网安装尝试在无输出超过 120 秒后中断。

负向测试覆盖 whole-screen-only、empty Token、available-option 状态碰撞、营销色主导、缺少 crop hash、缺少 measurement method、unknown 被错误测量、generic Card、旧失败预览标记等情况；所有变异均被拒绝。

全仓 `NPM_CONFIG_CACHE=/private/tmp/recrafts-npm-cache npm test` 实际执行 206 项，204 项通过、2 项失败。两项失败均在 R-011R-A 基线之外，并已在未修改的旧 R-011 worktree 复现：R-002 validator 的既有 production `files` 正则会把原有 `validate-no-oracle-product-ui.mjs` 判为 oracle；R-005 npm dry-run 的既有 inventory 正则同样拒绝该原有路径。默认 npm cache 另有 root-owned `EPERM` 环境问题，使用临时 cache 后仍只剩上述既有断言失败。本轮新增的定向测试、协议测试和包验证均通过。

## 评审门禁

R-011R-A 需要项目所有者针对 Region 深度、测量完整性、状态区分、源观察 Token 覆盖和证据权重返回 `ACCEPT` 或 `REVISE`。在 `ACCEPT` 前不得执行 R-011R-B；Task 025R 继续保持 blocked。
