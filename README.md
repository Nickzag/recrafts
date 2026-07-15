# Recrafts

## Task 023 portable Artifact Set

Generate a validated design-system artifact set without CraftsOS or Layoutcrafts:

```bash
npm install
npm run task023:run -- --manifest /absolute/path/to/source-manifest.json --output /absolute/path/to/output
npm run task023:validate -- --output /absolute/path/to/output
```

The manifest preserves source hashes, provenance, domain confidence, conflicts, and append-only corrections. Output includes `design.md`, Design Contract, tokens, components, evidence, conflicts, structured HTML preview, validation report, and hashes. Confidence is not an accuracy score, and generated output is not marked production-ready.

Recrafts 是独立的视觉重构 foundation Skill。R-002 提供 Host-Agent MVP Extraction Runtime：真实消费单图、多图或公开网站证据，生成区域分类、provenance、Scoped Token candidates、Layout Grammar、Component candidates 和 draft `design.md`。

```bash
node runtime/recraft-cli.mjs analyze-image --input <image> --output <empty-dir>
node runtime/recraft-cli.mjs analyze-images --input <input-dir> --output <empty-dir>
node runtime/recraft-cli.mjs analyze-website --url <public-url> --output <empty-dir>
npm test
npm run validate:r002
```

Runtime 拒绝 Oracle、expected 文件、重复图像、私网/非 HTTP 网站、登录墙、超过三条 route 和浏览器 Action。它不生成 Preview，不声明 fidelity、完整网站复刻、生产组件或生产就绪。

Primary Fixture 的 `input/` 是 runtime 输入，`oracle/` 只允许在运行后比较，`generated/` 是 runtime evidence。当前模糊 Fixture 仅支持宏观布局、表面层级、宽泛色彩家族和部分状态识别；精确字体、微间距、Icon geometry 与 pixel fidelity 均为 unsupported。
