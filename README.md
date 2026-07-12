# Recrafts

Recrafts 是独立的视觉重构 foundation Skill。当前 R-001 基础提供来源/区域分类、脱敏证据、provenance、Scoped Design Contract、组件 inventory 和确定性校验；它不证明视觉生成或还原质量。

```bash
npm run validate:r001
npm run test:r001
```

Golden Candidate 位于 `examples/golden-candidates/crafts-ui-multi-image/`。其中 13 张图片都是已模糊、去元数据的 fixture evidence，人工预填的 `expected-*` 数据会明确标注，不能当作模型提取证据。

`runtime/local_adapter.mjs` 仍是旧版 standalone mock，用于保留独立运行入口；它尚未消费 R-001 多来源契约，也不应被视为稳定运行时。
