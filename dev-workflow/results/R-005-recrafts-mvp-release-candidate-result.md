# R-005 Result — Build 4 Ready for Owner Release Verdict

## Conclusion

R-005 已按独立评审意见生成不可变 build4。npm pack、隔离 clean install、六个 Operation、Schema mutation、路径安全及 R-001 → R-005 全量回归全部通过。build3 未被修改，继续作为已验证的历史 RC；项目所有者 Release Verdict 保持 `PENDING`。

## RC Identity

```text
rc_id: recrafts-0.3.0-rc.1-build4
package_version: 0.3.0-rc.1
protocol_version: 1.0
artifact_source_commit: 99fa18b2c6f9e565936507794c9336404ff3936c
verified_build3_evidence_commit: 14117898bf0c1042d2d782c0610f918db048092f
build4_evidence_commit: PENDING_POST_GENERATION_COMMIT
r004_decision_set_id: owner-decision-r004-pass
tarball_sha256: 933045af5383838db6317b669b3b2a6af5a4dbd71a53a9f833facd9f27e84599
```

Canonical review target: `release-candidates/recrafts-0.3.0-rc.1-build4/`

## Host-Agent Boundary

Recrafts 不内置视觉模型。最终 Operation 是：

```text
capabilities
prepare-analysis
submit-analysis
validate-package
generate-realization
verify-fidelity
```

`prepare-analysis` 只验证输入、建立 Evidence Bundle 和 Host 指令，并返回 `needs_host_action`。Host Agent 完成视觉理解后，`submit-analysis` 验证结构化 Host Analysis，再生成 Package。开发和 CraftsOS 可以接入 Codex/OpenAI Vision；独立 Skill 的能力取决于使用者接入的 Host。

## Release Artifacts

- `artifacts/recrafts-0.3.0-rc.1.tgz`
- `bundle/release-manifest.json`
- `bundle/checksums.sha256`
- `bundle/contracts/`
- `bundle/examples/`
- `bundle/fixtures/`
- `bundle/evidence/fidelity/`
- `validation/package-contents.json`
- `validation/interop-validation.json`
- `validation/clean-install-report.json`
- `validation/rc-readiness.json`

## Clean-install Result

在源仓库外的临时目录安装 tarball 后，package-local `npm test` 实际执行 1 个协议检查，不存在零测试假通过。help/version 与六个 Operation 均通过；malformed JSON、路径穿越和输出碰撞均 fail closed。每次协议调用 stdout 只包含一个 JSON 值。

Host Analysis Fixture 明确标记为：`deterministic interoperability fixture; not a live model result; not proof of visual quality`。

## Security and Integrity

- 所有本地路径通过 realpath 与 containment 检查。
- 拒绝 traversal、symlink escape、Oracle/expected、特殊文件、输入输出嵌套、非空输出和远程 URL。
- Artifact path 相对 output root，不回传机器绝对路径。
- Tarball 排除 review、analysis、examples、dev-workflow、tests、历史输出、`.DS_Store` 和 Playwright 状态。
- Release Manifest 包含 R-004 independent ACCEPT、Owner PASS 与 `owner-decision-r004-pass`。
- `artifact_source_commit` 与 release evidence identity 分离；build4 的证据提交在不可变生成后记录于本 Result。
- 平台声明区分 declared 与 verified：声明 `darwin/linux/win32`，本轮只验证 `darwin`。
- 分发条款为 `UNLICENSED`、`internal evaluation only`。

## Validation

- `npm pack`: PASS，由 build4 构建器在隔离 staging 目录执行
- Clean install + 六个 Operation: PASS，12/12 checks
- R-005 定向测试：PASS，10/10
- Schema mutation：PASS，六个 operation Schema、response status mutation 均 fail closed
- 路径安全：PASS，traversal、symlink escape、collision 均 fail closed
- `npm run validate:r001`、`test:r001`、`validate:r002`、`test:r002`、`validate:r003-preflight`、`validate:r003-realization`、`validate:r004`、`validate:r005`: PASS
- `npm test`: PASS，63/63

## Failed Historical Builds

`build1` 暴露 Node stdin fd 读取问题；`build2` 暴露 clean-install report 的非布尔字段。`build3` 的 tarball SHA-256 在 build4 前后均为 `ddce4dde31863aa8cf6801b221f35703c97f0ec0bfc9ab498bad072ab2952b47`，未被修改，保留为已验证历史 RC。独立评审要求的 hardening 仅进入 build4。

## Boundaries

- 未发布到公共 npm registry。
- 未验证多个外部 Host 产品；Codex/Claude Code 文件仅为协议示例。
- 未声明 embedded inference、universal Host compatibility、production service、full VIS、direct CraftsOS integration 或 production readiness。
- 未修改 CraftsOS/Layoutcrafts 业务代码。
- 未替项目所有者填写 Release Verdict；最终发布决定仍需项目所有者审阅 build4 后给出。

> Recrafts can be installed as a local MVP release candidate, coordinate visual analysis with a capability-declaring Host Agent through a versioned JSON Envelope, validate Host-supplied analysis, generate standalone visual realizations, and run bounded fidelity verification in a clean environment.
