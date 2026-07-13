# R-005 Result — Build 5 Ready for Independent Review

## Conclusion

R-005 已根据 Build 4 独立评审生成不可变 build5。Prepared source handoff、完整 Host Analysis Schema 校验、项目所有者 Gate、Decision trace 和分类默认值均已修正。npm pack、隔离 clean install、六个 Operation、负例测试及 R-001 → R-005 全量回归全部通过；项目所有者 Release Verdict 保持 `PENDING`。

## RC Identity

```text
rc_id: recrafts-0.3.0-rc.1-build5
package_version: 0.3.0-rc.1
protocol_version: 1.0
artifact_source_commit: 29368e5d64a9f4ca14c06a04368a5b33819a510a
build4_evidence_commit: 6eb23e07fe097f3c3479dc439d580a8c25530d88
post_review_evidence_commit: 15f38879a3688c6af492219a90225204070b3b91
build5_evidence_commit: PENDING_POST_GENERATION_COMMIT
r004_decision_set_id: owner-decision-r004-pass
tarball_sha256: 760377e2d2238c7169160f4d21e2fbc6782af6a5f157d09e0659e16448bec1c6
```

Canonical review target: `release-candidates/recrafts-0.3.0-rc.1-build5/`

## Build 4 Review Corrections

- `prepare-analysis` 将来源复制到 `prepared/sources/source-N.ext`，Manifest 与 `host_action.sources` 返回无绝对路径的确定性相对路径。不同目录下的同名来源保持独立，`submit-analysis` 前重新验证 Prepared ID 与文件 SHA-256。
- Runtime 在任何语义检查前加载并执行 `contracts/host-analysis.schema.json`。缺 finding ID/observation、未知字段、非法 token status、越界 confidence、空 evidence refs 和 `vision_capability: false` 均返回 `SCHEMA_VALIDATION_FAILED`；未知 evidence ref 和 ID 不一致分别 fail closed。
- 正常 `submit-analysis` 只生成 `awaiting-owner-review` Candidate，Owner Verdict 为 `PENDING`，realization authorization 为 false。未提供 Owner Decision 时 `generate-realization` 返回 `REALIZATION_NOT_AUTHORIZED`。
- `generate-realization` 通过受控 Decision import 生成新的 approved `package_id` 后再 realization。Fixture Decision 仅在 `options.interoperability_fixture: true` 下有效，不能代表项目所有者。
- `owner_decision_set_id`、`decision_status`、`decision_source` 传入 approved source manifest、package manifest、compiled contract 和 realization manifest。
- Host Analysis 支持 source/region classification。未分类来源保持 `unknown`、`canonical_promotion_blocked: true`，不能进入 canonical realization。

## Clean-install Result

在源仓库外安装 Tarball 后，17/17 checks 通过：package-local test、help/version、六个 Operation、Prepared source 实际打开与哈希核验、Host Analysis Schema 负例、Owner Gate、fixture 隔离、Decision trace、malformed request、unsafe path 和 output collision。

Fixture 标记为：`deterministic interoperability fixture; not a live model result; not proof of visual quality; not a project-owner decision`。

## Validation

- `npm pack`: PASS，71 个文件，inventory allowlist 通过
- `npm run validate:r005`: PASS，12 个 readiness checks
- R-005 定向测试：PASS，15/15
- Clean install：PASS，17/17
- `npm run validate:r001`、`test:r001`、`validate:r002`、`test:r002`、`validate:r003-preflight`、`validate:r003-realization`、`validate:r004`、`validate:r005`: PASS
- `npm test`: PASS，68/68
- Build 4 Tarball 复核：`933045af5383838db6317b669b3b2a6af5a4dbd71a53a9f833facd9f27e84599`，未变化

## Build History

Build 4 保持不可变并保留独立评审 `REVISE`。Build 5 首次生成被 clean-install 测试脚本的异步 SHA 比较误判阻止；该失败目录保留为 `recrafts-0.3.0-rc.1-build5-attempt1-failed-prepared-source-check`，未覆盖、未作为 RC。修正证据脚本后从 source commit `29368e5...` 重新生成正式 build5。

## Boundaries

- 未发布到公共 npm registry。
- 仅在本轮 macOS 环境验证；Linux 独立验证属于下一轮评审输入。
- 未声明 embedded inference、通用 Host 产品认证、production service、full VIS、直接 CraftsOS 集成或 production readiness。
- 未修改 CraftsOS/Layoutcrafts 业务代码，未纳入工作区既有无关改动。
- 项目所有者 Release Verdict 仍为 `PENDING`，不得由实现 Agent 自行填写 PASS。

> Recrafts can be installed as a local MVP release candidate, hand bounded prepared sources to a vision-capable Host, validate Host-supplied analysis, preserve project-owner approval as a mandatory gate, derive a new approved package identity, generate a standalone visual realization and run bounded fidelity verification in a clean environment.
