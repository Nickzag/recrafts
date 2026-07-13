# R-005 Result — MVP Release Candidate Ready for Review

## Conclusion

R-005 已生成可安装 npm tarball、portable RC bundle、两阶段 Host-Agent JSON Envelope、operation-specific Schemas 与隔离 clean-install 证据。机械门禁全部通过；项目所有者 Release Verdict 保持 `PENDING`。

## RC Identity

```text
rc_id: recrafts-0.3.0-rc.1-build3
package_version: 0.3.0-rc.1
protocol_version: 1.0
source_commit: fa3e38c
r004_decision_set_id: owner-decision-r004-pass
tarball_sha256: ddce4dde31863aa8cf6801b221f35703c97f0ec0bfc9ab498bad072ab2952b47
```

Canonical output: `release-candidates/recrafts-0.3.0-rc.1-build3/`

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

在源仓库外的临时目录安装 tarball 后，help/version、capabilities、prepare-analysis、submit-analysis、validate-package、generate-realization、verify-fidelity 均通过。malformed JSON、路径穿越和输出碰撞均 fail closed。每次协议调用 stdout 只包含一个 JSON 值。

Host Analysis Fixture 明确标记为：`deterministic interoperability fixture; not a live model result; not proof of visual quality`。

## Security and Integrity

- 所有本地路径通过 realpath 与 containment 检查。
- 拒绝 traversal、symlink escape、Oracle/expected、特殊文件、输入输出嵌套、非空输出和远程 URL。
- Artifact path 相对 output root，不回传机器绝对路径。
- Tarball 排除 review、analysis、examples、dev-workflow、tests、历史输出、`.DS_Store` 和 Playwright 状态。
- Release Manifest 包含 R-004 independent ACCEPT、Owner PASS 与 `owner-decision-r004-pass`。

## Validation

- `npm run validate:r005`: PASS
- R-005 tests: PASS
- Full R-001–R-004 regression and repository tests: recorded after final verification

## Failed Historical Builds

`build1` 暴露 Node stdin fd 读取问题；`build2` 暴露 clean-install report 的非布尔字段。两者未被覆盖或纳入正式 RC。`build3` 修正后成为 canonical review target。

## Boundaries

- 未发布到公共 npm registry。
- 未验证多个外部 Host 产品；Codex/Claude Code 文件仅为协议示例。
- 未声明 embedded inference、universal Host compatibility、production service、full VIS、direct CraftsOS integration 或 production readiness。
- 未修改 CraftsOS/Layoutcrafts 业务代码。

> Recrafts can be installed as a local MVP release candidate, coordinate visual analysis with a capability-declaring Host Agent through a versioned JSON Envelope, validate Host-supplied analysis, generate standalone visual realizations, and run bounded fidelity verification in a clean environment.
