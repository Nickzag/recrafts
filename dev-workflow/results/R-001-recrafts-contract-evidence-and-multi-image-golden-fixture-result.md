# R-001 Result

## Conclusion

R-001 已建立独立 Recrafts 的契约、provenance、Scoped Design Contract 和 13 图脱敏 Golden Candidate 基础。证据仅为 deterministic fixture evidence；人工预填 expected data 已显式标注，未冒充模型提取或真实用户证据。

## Git Evidence

- Repository: `/Users/Nick/Documents/Recrafts`
- Branch: `recrafts/r-001-contract-evidence-fixture`
- Initial state: `master` 是 unborn branch，现有 README、SKILL、runtime、manifest 和历史输出均未被 Git 跟踪。
- Historical `recrafts-output/` 已加入 `.gitignore`，未纳入本任务提交。
- CraftsOS 在执行前后仅保留既有未跟踪 `bak/`；`apps/layoutcrafts` 无 diff。

## Repository Audit And Contract Consolidation

- 旧契约只有简短 SKILL、0.1 manifest 和 standalone mock，没有输入/输出、来源、证据、Scope 或验证 Schema。
- 新增规范 `manifest.json`、7 个 Schema、5 个 prompt guide、5 个模板；lowercase `design.md` 是唯一规范文件名，uppercase 仅允许显式 compatibility mirror。
- 保留 standalone 边界，不依赖 CraftsOS 私有路径，不导入 Layoutcrafts 实现。
- 旧 standalone mock 尚未升级为多来源运行时，已在 README 和限制中标明。

## Safety Findings

- 原图：13 张，仅位于 `/Users/Nick/Downloads/craftdo`，从未复制进 Git raw 目录。
- 写仓库前扫描：Apple Vision OCR + private key/AWS/GitHub/OpenAI/JWT/credential/email patterns，13/13，0 findings。
- Fixture 副本：`ffmpeg boxblur=6:2` 全图模糊并移除 metadata；复扫 13/13，0 findings。
- `sanitization-manifest.json` 逐图记录处理；validator 拒绝 raw 文件、未脱敏记录和文本 secret pattern。

## Fixture Inventory And Classification

- 13/13 source IDs 已登记；每项含 file、sha256、dimensions、capture/platform/viewport、sanitization ref、priority 和 notes。
- 每张图都有多个 region entries，分类覆盖 product UI、feature UI、marketing、user content、state evidence 和 excluded sensitive content。
- 29 个组件只作为 inventory 和 evidence refs 存在，没有组件实现声明。

## Provenance And Scoped Design Contract

- evidence map 支持 `observed`、`inferred`、`suggested`、`confirmed`、`rejected` 约束。
- `confirmed` 需要 human decision ref；`suggested` 不能成为 canonical token。
- 八个 Scope 已建立；负向规则阻止用户作品绿色或营销蓝进入 global token。
- `output/design-draft.md` 包含任务要求的 18 个章节，状态固定为 `draft` / `partial`。

## Validator And Negative Tests

- `npm run validate:r001`: 通过，覆盖契约文件、Schema、13 sources、hash/dimensions、区域分类、raw/secret gate、provenance、Scope、content isolation、draft claim、Layoutcrafts import 和 CraftsOS symlink boundary。
- `npm run test:r001`: 13/13 通过；1 个 Golden Candidate 正向场景和 12 个 critical fail-closed 场景。
- TDD evidence: validator 缺失时首次运行 13/13 失败；实现后 13/13 通过。

## Boundary Confirmation

- 未修改 CraftsOS 根项目业务代码。
- 未修改 Layoutcrafts 业务代码。
- 未复制 Recrafts 源码到 CraftsOS 根目录。
- 未生成最终 CraftsOS UI、网站克隆、视觉 diff 或 fidelity 结论。
- 未删除任何文件，未 push、merge 或发布。

## Known Limitations

- Fixture 预期分类、证据和组件清单是人工编制的测试预期，不是模型运行输出。
- 全图模糊保护隐私并保留宏观布局/色彩/状态，但不适合精确文字、微小控件或像素级测量。
- Recrafts 仓库此前没有 commit，无法提供相对于历史 commit 的业务代码 diff；本任务只能记录文件级初始审计。
- 旧 standalone mock 尚未消费新 Schema；URL 输入、视觉 realization、correction、fidelity 和 clean-install acceptance 留待后续任务。
- 依项目禁止 Subagent 的要求，本轮未执行 code-review skill 要求的双 Subagent 独立评审；Review Packet 等待人类或后续独立会话裁决。

## Next Recommendation

提交独立评审并取得 `PASS` 或完成 `PASS WITH CHANGES` 后，再授权 R-002；在此之前不进入视觉实现。

## PASS WITH CHANGES Remediation Addendum

- Initial baseline commit: `6e32c10b17944199e5397e8834484d6f9685cd1d`
- Baseline tag: `recrafts-r001-baseline`
- Clean-checkout evidence: `dev-workflow/evidence/r-001/`
- Oracle moved under `oracle/`; runtime input is restricted to `input/`; generated runtime evidence is written to `generated/`.
- Fixture capability and fine-detail route are explicit in `input/fixture-capability.json`.
- Sanitization evidence now records raw/sanitized hashes, command/version, metadata result, scan refs, reviewer status, irreversibility and intended capability.
- Region validation covers bounds, unique IDs, area ratios, oversized warnings and excluded-region inference blocking.

> R-001 establishes the Recrafts evidence, provenance, scoped Design Contract and sanitized multi-image Golden Candidate foundation. It does not prove visual realization quality, component implementation, website cloning, fidelity verification, CraftsOS integration or production readiness.
