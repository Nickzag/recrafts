# Crafts UI Multi-Image Golden Candidate

此 Fixture 使用 13 张已脱敏桌面截图验证来源登记、区域分类、provenance、Scope 隔离和 draft Design Contract。`sources/` 是模糊处理且移除元数据的 fixture evidence；原图只允许位于 Git 忽略的 `local-raw-sources/` 或仓库外。

`expected-*` 文件是人工预填的预期结果，不能冒充模型提取或运行质量证据。运行 `npm run validate:r001` 校验，运行 `npm run test:r001` 验证 fail-closed 负向场景。
