# Recrafts Product UI Contract

Version: 0.1.0-r011-candidate  
Status: awaiting-owner-review  
Package: `package-08c28e7765f0cabf`  
Analysis: `product-analysis-374910b48951e9de`  
Input profile: `product-ui-mixed-evidence`  

## Boundary

This contract separates observed product application Evidence, official corroboration, CraftsOS product constraints and portable design decisions. It is a candidate for human review, not an accepted visual system and not an application implementation.

## Evidence hierarchy

- Tier A product application screenshots: 13 sources; authoritative for topology, panel ownership, density and visible states.
- Tier B/C official product, tutorial and help captures: 3 sources; corroborative for public feature language, transitions and brand continuity.
- User, template, marketing and platform regions remain explicitly scoped and blocked from application Core promotion.

## Application grammar

- **grammar-shell** — 应用轨道固定在工作区外层，内容表面不承担全局导航职责 [corroborated; application-chrome; confidence 0.93; recurrence 5]
- **grammar-nav-hierarchy** — 工作区、项目、文档三级层级通过缩进与分组表达，不用颜色单独承担层级 [observed; navigation; confidence 0.92; recurrence 4]
- **grammar-content-first** — 编辑内容优先于工具装饰，工具只围绕当前任务显示 [observed; canvas-or-document-content; confidence 0.98; recurrence 4]
- **grammar-panel-persistence** — 上下文面板由选择和任务触发，关闭后不遮挡画布 [observed; inspector; confidence 0.91; recurrence 3]
- **grammar-inspector-ownership** — 样式、信息和操作归属于当前文档或选区，不能漂移成全局面板 [corroborated; inspector; confidence 0.87; recurrence 3]
- **grammar-canvas-primacy** — 画布保持最大连续面积与最高文字对比，支持长内容扫描 [observed; canvas-or-document-content; confidence 0.96; recurrence 4]
- **grammar-command-recovery** — 搜索和命令入口支持键盘优先并允许从中断状态恢复 [inferred; overlay; confidence 0.73; recurrence 2]
- **grammar-selection** — 选择态用轻量表面和焦点边界表达，避免重色填充覆盖内容 [observed; editor-chrome; confidence 0.9; recurrence 3]
- **grammar-progressive-disclosure** — 高级选项通过折叠、抽屉或二级弹层渐进披露 [corroborated; inspector; confidence 0.84; recurrence 3]
- **grammar-recovery** — 冲突、失败和回滚都显示原因、影响与可逆动作 [candidate; system-feedback; confidence 0.68; recurrence 1]
- **grammar-review-evidence** — 证据与审阅状态独立成面，来源和决策不混入营销内容 [candidate; review-and-evidence; confidence 0.66; recurrence 1]

## Component system

- **app-rail** — 应用轨道 [core; Evidence ev-9c7a134b9f919592]
- **view-switcher** — 视图切换器 [core; Evidence ev-059a7ad47452be71]
- **document-preview** — 文档预览单元 [core; Evidence ev-78838e2043651085]
- **editor-context-panel** — 编辑器上下文面板 [core; Evidence ev-b548d4fd17843d57]
- **insert-palette** — 插入面板 [candidate; Evidence ev-b548d4fd17843d57]
- **style-gallery** — 样式画廊 [candidate; Evidence ev-997b1018771aef13]
- **preference-section** — 偏好设置分组 [candidate; Evidence ev-322a3b4ac9bfc84b]
- **empty-state** — 空状态引导 [core; Evidence ev-e09d6e18315a9e58]
- **action-list** — 审阅动作列表 [candidate; Evidence ev-8e2720fb78f32d0e]
- **command-search** — 命令搜索 [candidate; Evidence ev-997b1018771aef13]

## Semantic token boundary

- **surface.app** — 应用背景; value "#f4f6f5"; 将低饱和浅色背景转为不依赖品牌的 neutral surface
- **surface.panel** — 面板背景; value "#ffffff"; 保留高亮面板层级并替换原始品牌色
- **surface.subtle** — 弱化表面; value "#eef1f0"; 从分组和行间层级抽象为语义 surface
- **text.primary** — 主文字; value "#18212f"; 保持高对比文字比例，避免复制产品色板
- **text.secondary** — 次文字; value "#5e6875"; 将元信息层级转为可访问的 muted text
- **border.subtle** — 细边框; value "#d8dfdc"; 以低对比边界替代截图像素值
- **action.accent** — 主动作; value "#286b63"; 从强调色角色抽象为 CraftsOS-neutral teal，不复制品牌标记
- **action.focus** — 焦点环; value "#5b77d4"; 将选择边界转为独立 focus role
- **selection.surface** — 选择表面; value "#dfe9ff"; 降低原始选中态饱和度并保持文字可读
- **space.panel-gutter** — 面板间距; value "20px"; 以 recurring panel gutter 生成语义尺寸
- **radius.surface** — 表面圆角; value "12px"; 从多表面圆角趋势抽象，不复刻单一截图半径
- **type.body** — 正文; value "15px/1.55"; 保持正文密度与行高比例，使用系统无衬线栈

## Shell directions

- **quiet-frame / Quiet Frame** — 低对比背景、安静边界和画布优先的中性 Shell；适合长时间编辑与审阅。
- **signal-column / Signal Column** — 更清晰的列分割、可见状态信号和任务面板；适合操作密集的证据与冲突工作流。

## Source distance

Gate: **pass**. The two portable directions differ from the source in brand identity, icon set, exact dimensions, exact colors, component combinations and non-required screen topology.

## Owner gate

Project Owner must review application character, hierarchy, density, navigation clarity, canvas/editor primacy, panel relationships, component distinctiveness, cross-screen consistency, CraftsOS suitability and source distance. No downstream UI implementation may consume this Package before Owner PASS.
