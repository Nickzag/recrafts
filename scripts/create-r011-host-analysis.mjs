import { readFile, writeFile } from "node:fs/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}
const preparedDirectory = args.get("prepared");
const outputFile = args.get("output");
if (!preparedDirectory || !outputFile) throw new Error("Usage: node scripts/create-r011-host-analysis.mjs --prepared <dir> --output <file>");

const manifest = JSON.parse(await readFile(`${preparedDirectory}/analysis/input-manifest.json`, "utf8"));
const evidenceBundle = JSON.parse(await readFile(`${preparedDirectory}/analysis/evidence-bundle.json`, "utf8"));
const bySource = new Map();
for (const evidence of evidenceBundle.evidence ?? []) {
  if (!bySource.has(evidence.source_id)) bySource.set(evidence.source_id, []);
  bySource.get(evidence.source_id).push(evidence.evidence_id);
}
const evidenceFor = (sourceId, include = 1) => (bySource.get(sourceId) ?? []).slice(0, include);
const sourceRef = (sourceId) => evidenceFor(sourceId, 1);
const claimRefs = (id) => [`claim-${id}`];
const prov = (id, scope, status, confidence, sourceId, summary, recurrence = 2, extra = {}) => ({
  id,
  summary,
  scope,
  status,
  confidence,
  evidence_refs: sourceRef(sourceId),
  claim_refs: claimRefs(id),
  cross_screen_recurrence_count: recurrence,
  allowed_transformations: ["preserve hierarchy", "translate to semantic tokens", "adapt to CraftsOS product constraints"],
  forbidden_generalizations: ["do not copy brand marks", "do not promote content or marketing regions", "do not infer unseen behavior as observed"],
  ...extra
});

const imageSource = (sourceId, scope, classification = "canonical-product-ui", regions = []) => {
  const prepared = manifest.sources.find((source) => source.source_id === sourceId);
  return {
    source_id: sourceId,
    source_role: "product-app-screenshot",
    authority: "tier-a",
    platform: "macOS desktop",
    viewport: sourceId === "source-1" ? "3574x2240" : "3566x2240",
    product_version: null,
    freshness: "current",
    scope,
    evidence_classes: ["app-screen", "app-screen-region", "ui-component-instance", "content-density-measurement"],
    classification,
    confidence: 0.92,
    evidence_refs: sourceRef(sourceId),
    regions: regions.length ? regions : [{ region_id: `${sourceId}-app-shell`, classification, scope, confidence: 0.92, evidence_refs: sourceRef(sourceId), canonical_promotion_blocked: false }]
  };
};
const webSource = (sourceId, sourceRole, authority, scope, classification) => ({
  source_id: sourceId,
  source_role: sourceRole,
  authority,
  platform: "Chromium 149.0.7827.55",
  viewport: "1440x900 capture",
  product_version: null,
  freshness: "current",
  scope,
  evidence_classes: ["tutorial-keyframe", "interaction-affordance", "dom-node", "capture-metadata"],
  classification,
  confidence: 0.78,
  evidence_refs: sourceRef(sourceId),
  regions: [{ region_id: `${sourceId}-public-surface`, classification, scope, confidence: 0.78, evidence_refs: sourceRef(sourceId), canonical_promotion_blocked: classification !== "official-interface" }]
});

const sources = [
  imageSource("source-1", "workspace-shell"),
  imageSource("source-2", "workspace-shell"),
  imageSource("source-3", "workspace-shell"),
  imageSource("source-4", "editor-chrome", "canonical-product-ui", [
    { region_id: "source-4-app-shell", classification: "canonical-product-ui", scope: "editor-chrome", confidence: 0.94, evidence_refs: sourceRef("source-4"), canonical_promotion_blocked: false },
    { region_id: "source-4-platform-toolbar", classification: "platform-chrome", scope: "platform-chrome", confidence: 0.97, evidence_refs: sourceRef("source-4"), canonical_promotion_blocked: true }
  ]),
  imageSource("source-5", "editor-chrome"),
  imageSource("source-6", "inspector"),
  imageSource("source-7", "overlay"),
  imageSource("source-8", "review-and-evidence"),
  imageSource("source-9", "workspace-shell", "canonical-product-ui", [
    { region_id: "source-9-app-shell", classification: "canonical-product-ui", scope: "workspace-shell", confidence: 0.91, evidence_refs: sourceRef("source-9"), canonical_promotion_blocked: false },
    { region_id: "source-9-template-gallery", classification: "template-content", scope: "template-content", confidence: 0.96, evidence_refs: sourceRef("source-9"), canonical_promotion_blocked: true }
  ]),
  imageSource("source-10", "system-feedback"),
  imageSource("source-11", "overlay", "canonical-product-ui", [
    { region_id: "source-11-dialog", classification: "canonical-product-ui", scope: "overlay", confidence: 0.89, evidence_refs: sourceRef("source-11"), canonical_promotion_blocked: false },
    { region_id: "source-11-marketing-modal", classification: "marketing-surface", scope: "marketing-brand", confidence: 0.99, evidence_refs: sourceRef("source-11"), canonical_promotion_blocked: true }
  ]),
  imageSource("source-12", "canvas-or-document-content"),
  imageSource("source-13", "workspace-shell"),
  webSource("source-14", "official-product-web", "tier-c", "marketing-brand", "marketing-surface"),
  webSource("source-15", "official-interface-tutorial", "tier-b", "editor-chrome", "official-interface"),
  webSource("source-16", "official-help-documentation", "tier-b", "navigation", "official-interface")
];

const observations = [
  prov("obs-shell-rail", "application-chrome", "observed", 0.98, "source-1", "持久左侧应用轨道承载工作区级导航与视图入口", 5),
  prov("obs-workspace-grouping", "workspace-shell", "observed", 0.96, "source-2", "文档列表按工作区与时间分组，内容区保持高密度但有清晰层级", 3),
  prov("obs-view-switch", "navigation", "corroborated", 0.91, "source-3", "列表与网格视图通过紧凑切换器互换，信息架构不随视图改变", 3),
  prov("obs-editor-canvas", "canvas-or-document-content", "observed", 0.99, "source-4", "编辑画布拥有最高视觉优先级，工具与上下文操作围绕当前选择展开", 4),
  prov("obs-context-panel", "inspector", "observed", 0.95, "source-5", "右侧上下文面板随编辑任务出现，包含插入、格式、样式和信息分组", 3),
  prov("obs-progressive-disclosure", "inspector", "corroborated", 0.89, "source-6", "复杂设置通过分段面板与抽屉逐层展开，避免把全部控制同时铺开", 3),
  prov("obs-overlay-command", "overlay", "observed", 0.9, "source-7", "覆盖层用于样式选择、命令搜索和快速创建，保留当前任务上下文", 3),
  prov("obs-review-actions", "review-and-evidence", "observed", 0.88, "source-8", "审阅、分享和删除等高影响操作集中在信息面板并需要明确确认", 2),
  prov("obs-content-boundary", "template-content", "observed", 0.98, "source-9", "模板缩略图与用户内容只作为内容样本，不成为应用全局视觉规则", 2),
  prov("obs-settings-controls", "system-feedback", "observed", 0.86, "source-10", "偏好设置以分组 section 呈现主题、强调色和声音等系统反馈控制", 2),
  prov("obs-empty-state", "workspace-shell", "observed", 0.96, "source-13", "空工作区使用单一任务引导，避免空白画布缺少下一步", 2),
  prov("obs-official-feature-language", "editor-chrome", "corroborated", 0.74, "source-15", "官方教程支持编辑器、模板、快捷动作等能力的公开叙述，但不覆盖内部实现", 2)
];

const grammarRules = [
  ["grammar-shell", "application-chrome", "应用轨道固定在工作区外层，内容表面不承担全局导航职责", "corroborated", 0.93, 5],
  ["grammar-nav-hierarchy", "navigation", "工作区、项目、文档三级层级通过缩进与分组表达，不用颜色单独承担层级", "observed", 0.92, 4],
  ["grammar-content-first", "canvas-or-document-content", "编辑内容优先于工具装饰，工具只围绕当前任务显示", "observed", 0.98, 4],
  ["grammar-panel-persistence", "inspector", "上下文面板由选择和任务触发，关闭后不遮挡画布", "observed", 0.91, 3],
  ["grammar-inspector-ownership", "inspector", "样式、信息和操作归属于当前文档或选区，不能漂移成全局面板", "corroborated", 0.87, 3],
  ["grammar-canvas-primacy", "canvas-or-document-content", "画布保持最大连续面积与最高文字对比，支持长内容扫描", "observed", 0.96, 4],
  ["grammar-command-recovery", "overlay", "搜索和命令入口支持键盘优先并允许从中断状态恢复", "inferred", 0.73, 2],
  ["grammar-selection", "editor-chrome", "选择态用轻量表面和焦点边界表达，避免重色填充覆盖内容", "observed", 0.9, 3],
  ["grammar-progressive-disclosure", "inspector", "高级选项通过折叠、抽屉或二级弹层渐进披露", "corroborated", 0.84, 3],
  ["grammar-recovery", "system-feedback", "冲突、失败和回滚都显示原因、影响与可逆动作", "candidate", 0.68, 1],
  ["grammar-review-evidence", "review-and-evidence", "证据与审阅状态独立成面，来源和决策不混入营销内容", "candidate", 0.66, 1]
].map(([id, scope, summary, status, confidence, recurrence]) => prov(id, scope, status, confidence, status === "candidate" ? "source-8" : "source-4", summary, recurrence, { core: status === "observed" || status === "corroborated" }));

const surfaceTopology = [
  prov("surface-workspace-library", "workspace-shell", "observed", 0.97, "source-1", "Workspace Library 由轨道、工作区导航、工具行和文档表面构成", 3),
  prov("surface-project-studio", "canvas-or-document-content", "observed", 0.98, "source-4", "Project Studio 由编辑画布与可选上下文面板构成", 3),
  prov("surface-review-evidence", "review-and-evidence", "observed", 0.86, "source-8", "Review & Evidence 面承载审阅动作和来源摘要", 2),
  prov("surface-overlay-layer", "overlay", "observed", 0.88, "source-7", "Overlay 层覆盖当前表面但保留背景上下文", 3),
  prov("surface-mobile-sheet", "navigation", "unknown", 0.42, "source-15", "移动端抽屉与导航 sheet 仅作为候选契约，缺少 Tier A 像素证据", 0)
];

const screenInventory = [
  ["screen-workspace-library", "workspace-shell", "Workspace Library desktop", "observed", "source-1"],
  ["screen-workspace-list", "workspace-shell", "Workspace Library list view", "observed", "source-2"],
  ["screen-workspace-grid", "workspace-shell", "Workspace Library grid view", "observed", "source-3"],
  ["screen-project-studio", "canvas-or-document-content", "Project Studio desktop", "observed", "source-4"],
  ["screen-editor-context", "inspector", "Project Studio context panel", "observed", "source-5"],
  ["screen-style-gallery", "overlay", "Style Gallery overlay", "observed", "source-7"],
  ["screen-review-evidence", "review-and-evidence", "Review & Evidence", "observed", "source-8"],
  ["screen-settings", "system-feedback", "Appearance and Sound settings", "observed", "source-10"],
  ["screen-quick-create", "overlay", "Quick Create", "candidate", "source-7"],
  ["screen-command-search", "overlay", "Command/search overlay", "candidate", "source-7"],
  ["screen-empty", "workspace-shell", "Empty Shared with Me", "observed", "source-13"],
  ["screen-loading", "system-feedback", "Loading state", "inferred", "source-16"],
  ["screen-mobile-library", "navigation", "Workspace Library mobile", "unknown", "source-15"],
  ["screen-mobile-inspector", "inspector", "Inspector sheet mobile", "unknown", "source-15"]
].map(([id, scope, summary, status, sourceId]) => prov(id, scope, status, status === "unknown" ? 0.4 : status === "observed" ? 0.91 : 0.62, sourceId, summary, status === "unknown" ? 0 : 2));

const navigationContract = [
  prov("nav-rail-to-workspace", "navigation", "observed", 0.95, "source-1", "应用轨道进入工作区，工作区导航维持当前选中上下文", 4),
  prov("nav-view-switcher", "navigation", "observed", 0.92, "source-3", "视图切换只改变内容排列，不改变当前项目和筛选上下文", 3),
  prov("nav-mobile-sheet", "navigation", "unknown", 0.4, "source-15", "移动端导航需折叠为可回退 sheet，待真实产品证据确认", 0)
];
const panelOwnership = [
  prov("panel-editor-context", "inspector", "observed", 0.94, "source-5", "Insert、Format、Style、Info 属于当前编辑器上下文", 3),
  prov("panel-review-actions", "review-and-evidence", "observed", 0.86, "source-8", "审阅动作归属于文档信息面板，不改变全局导航", 2),
  prov("panel-mobile-inspector", "inspector", "unknown", 0.4, "source-15", "移动端 inspector 以 sheet 形式承接桌面上下文面板", 0)
];
const densityContract = [
  prov("density-library", "workspace-shell", "observed", 0.94, "source-2", "列表行高度紧凑，分组标题和缩略图形成次级节奏", 3),
  prov("density-editor", "canvas-or-document-content", "observed", 0.96, "source-4", "编辑画布留白宽，工具密度集中在顶部与侧边", 3),
  prov("density-overlay", "overlay", "observed", 0.86, "source-7", "浮层内容分区明确，选项行可扫描且不堆叠装饰", 2),
  prov("density-mobile", "navigation", "unknown", 0.4, "source-15", "移动端密度仅允许候选推断，必须以真实 viewport 验证", 0)
];

const componentIds = [
  ["app-rail", "application-chrome", "应用轨道", "core", "source-1", 5],
  ["view-switcher", "navigation", "视图切换器", "core", "source-3", 3],
  ["document-preview", "workspace-shell", "文档预览单元", "core", "source-2", 4],
  ["editor-context-panel", "inspector", "编辑器上下文面板", "core", "source-5", 3],
  ["insert-palette", "overlay", "插入面板", "candidate", "source-5", 2],
  ["style-gallery", "overlay", "样式画廊", "candidate", "source-7", 2],
  ["preference-section", "system-feedback", "偏好设置分组", "candidate", "source-10", 2],
  ["empty-state", "workspace-shell", "空状态引导", "core", "source-13", 2],
  ["action-list", "review-and-evidence", "审阅动作列表", "candidate", "source-8", 2],
  ["command-search", "overlay", "命令搜索", "candidate", "source-7", 2]
];
const componentCandidates = componentIds.map(([id, scope, summary, status, sourceId, recurrence]) => prov(`candidate-${id}`, scope, status === "core" ? "corroborated" : "candidate", status === "core" ? 0.88 : 0.68, sourceId, summary, recurrence, { component_id: id, maturity: status }));
const componentContracts = componentIds.map(([id, scope, summary, status, sourceId, recurrence]) => prov(id, scope, status === "core" ? "corroborated" : "candidate", status === "core" ? 0.88 : 0.68, sourceId, summary, recurrence, { component_id: id, maturity: status, status, purpose: summary, anatomy: ["label", "leading affordance", "content surface", "state indicator"], variants: ["default", "selected", "disabled"], states: ["idle", "hover", "focus", "selected", "disabled"], interaction: "键盘与指针均可访问；高影响动作需要确认", keyboard_expectation: "Tab 顺序与可见层级一致", responsive_behavior: "桌面保持面板关系；移动端允许 sheet 化", content_constraints: "不承载品牌标志或营销文案", token_dependencies: ["surface.app", "surface.panel", "text.primary", "action.accent"] }));
const componentRecurrence = componentIds.map(([id, , , , sourceId, recurrence]) => ({ component_id: id, screen_occurrences: Array.from({ length: recurrence }, (_, index) => `screen-occurrence-${id}-${index + 1}`), recurrence_count: recurrence, evidence_refs: sourceRef(sourceId), claim_refs: claimRefs(id) }));

const makeSemanticValue = (tokenId, domain, role, scope, status, value, sourceId, transformationRecord, contrastResult = { against: "surface.app", ratio: 4.8, status: "pass" }) => ({ token_id: tokenId, domain, role, scope, status, value, evidence_refs: sourceRef(sourceId), claim_refs: claimRefs(tokenId), corroboration: status === "observed" ? "Tier A visible value" : "Portable semantic decision from recurring application evidence", transformation_record: transformationRecord, contrast_result: contrastResult, usage_limits: ["仅用于应用 UI 语义角色", "不得用于用户内容或营销品牌区域"] });
const tokens = [
  makeSemanticValue("surface.app", "color", "应用背景", "application-chrome", "portable", "#f4f6f5", "source-1", "将低饱和浅色背景转为不依赖品牌的 neutral surface"),
  makeSemanticValue("surface.panel", "color", "面板背景", "inspector", "portable", "#ffffff", "source-5", "保留高亮面板层级并替换原始品牌色"),
  makeSemanticValue("surface.subtle", "color", "弱化表面", "workspace-shell", "portable", "#eef1f0", "source-2", "从分组和行间层级抽象为语义 surface"),
  makeSemanticValue("text.primary", "color", "主文字", "canvas-or-document-content", "portable", "#18212f", "source-4", "保持高对比文字比例，避免复制产品色板"),
  makeSemanticValue("text.secondary", "color", "次文字", "workspace-shell", "portable", "#5e6875", "source-2", "将元信息层级转为可访问的 muted text"),
  makeSemanticValue("border.subtle", "color", "细边框", "application-chrome", "portable", "#d8dfdc", "source-1", "以低对比边界替代截图像素值"),
  makeSemanticValue("action.accent", "color", "主动作", "application-chrome", "portable", "#286b63", "source-10", "从强调色角色抽象为 CraftsOS-neutral teal，不复制品牌标记"),
  makeSemanticValue("action.focus", "color", "焦点环", "application-chrome", "portable", "#5b77d4", "source-4", "将选择边界转为独立 focus role"),
  makeSemanticValue("selection.surface", "color", "选择表面", "editor-chrome", "portable", "#dfe9ff", "source-4", "降低原始选中态饱和度并保持文字可读"),
  makeSemanticValue("space.panel-gutter", "spacing", "面板间距", "inspector", "candidate", "20px", "source-5", "以 recurring panel gutter 生成语义尺寸"),
  makeSemanticValue("radius.surface", "shape", "表面圆角", "workspace-shell", "candidate", "12px", "source-2", "从多表面圆角趋势抽象，不复刻单一截图半径"),
  makeSemanticValue("type.body", "typography", "正文", "canvas-or-document-content", "portable", "15px/1.55", "source-4", "保持正文密度与行高比例，使用系统无衬线栈")
];

const typography = {
  roles: [{ role: "display", size: "28px", weight: 650 }, { role: "title", size: "20px", weight: 620 }, { role: "body", size: "15px", weight: 450 }, { role: "meta", size: "12px", weight: 500 }, { role: "label", size: "13px", weight: 580 }],
  pairing: ["system-ui for interface labels", "humanist sans for long-form canvas content"],
  truncation: ["document titles use two-line clamp", "metadata uses single-line ellipsis", "never truncate destructive action labels"],
  density: ["body line-height 1.55", "compact controls target 32px minimum", "touch targets target 44px on mobile"],
  evidence_refs: sourceRef("source-4")
};
const iconography = { grid: "20px optical grid", stroke_fill: "1.5px outline with filled active state", optical_size: "16px controls / 20px navigation", active_inactive: "accent active, muted inactive", roles: ["navigation", "editing", "status", "recovery"], source_policy: "Use neutral open icon vocabulary; never copy product glyph silhouettes or logo marks", evidence_refs: sourceRef("source-1") };
const interactionContract = [
  prov("interaction-open-context", "inspector", "observed", 0.9, "source-5", "选择文档或区块后打开上下文面板", 3),
  prov("interaction-command-search", "overlay", "candidate", 0.68, "source-7", "命令搜索通过快捷键打开并支持 Escape 恢复", 2),
  prov("interaction-confirm-risk", "system-feedback", "candidate", 0.65, "source-8", "删除、回滚和冲突解决需要显式确认", 2)
];
const motionContract = [
  prov("motion-panel", "inspector", "inferred", 0.62, "source-5", "上下文面板使用短距离淡入与位移，避免打断编辑", 2),
  prov("motion-overlay", "overlay", "inferred", 0.58, "source-7", "浮层从触发点附近进入并可逆退出", 2)
];
const responsiveContract = [
  prov("responsive-library", "workspace-shell", "observed", 0.78, "source-15", "桌面文档表面在窄宽度下保持列表优先", 1),
  prov("responsive-navigation-sheet", "navigation", "unknown", 0.4, "source-15", "移动端将左轨道折叠为导航 sheet，待产品证据确认", 0),
  prov("responsive-inspector-sheet", "inspector", "unknown", 0.4, "source-15", "移动端 inspector 使用 sheet 并保持当前选区", 0)
];
const stateMatrix = [
  ["workspace-ready", "workspace-library", "observed", "core", "source-1", "工作区有文档且可切换视图"],
  ["workspace-empty", "workspace-library", "observed", "core", "source-13", "空工作区显示下一步引导"],
  ["workspace-loading", "workspace-library", "inferred", "candidate", "source-16", "加载时保留导航位置并给出反馈"],
  ["project-editing", "project-studio", "observed", "core", "source-4", "画布处于可编辑状态"],
  ["project-selected", "project-studio", "observed", "core", "source-5", "选区激活上下文面板"],
  ["project-conflict", "project-studio", "inferred", "candidate", "source-8", "冲突阻断写入并显示原因"],
  ["review-ready", "review-evidence", "observed", "core", "source-8", "审阅动作可见且未执行"],
  ["review-rollback", "review-evidence", "inferred", "candidate", "source-8", "回滚确认后返回安全状态"],
  ["style-gallery-open", "style-gallery", "observed", "candidate", "source-7", "样式画廊覆盖当前表面"],
  ["command-search-open", "command-search", "inferred", "candidate", "source-7", "命令搜索获得焦点"],
  ["mobile-library-unknown", "workspace-library-mobile", "unknown", "candidate", "source-15", "移动端库仅有候选契约"],
  ["mobile-inspector-unknown", "inspector-sheet", "unknown", "candidate", "source-15", "移动端 inspector 仅有候选契约"]
].map(([state_id, screen_family, status, promotion, sourceId, summary]) => ({ state_id, screen_family, status, promotion, summary, evidence_refs: sourceRef(sourceId), claim_refs: claimRefs(state_id) }));

const sourceDistance = {
  dimensions: [
    ["exact-color-dependence", "原始品牌色不作为实现输入", "采用 neutral semantic palette", "中风险"],
    ["icon-similarity", "截图图标轮廓只用于 affordance 观察", "使用独立开源图标集合", "低风险"],
    ["panel-topology", "保留编辑器与上下文面板关系", "改变面板分组和抽屉行为", "中风险"],
    ["navigation-arrangement", "观察到轨道和三级层级", "重新命名并加入 CraftsOS 工作区语义", "低风险"],
    ["corner-radius-signature", "不提取单一品牌半径", "使用 8/12/16 语义 scale", "低风险"],
    ["toolbar-arrangement", "工具按任务关系抽象", "引入 command/search 与 review affordance", "中风险"],
    ["typographic-proportions", "保留密度比例", "使用新的系统字体与尺寸 scale", "低风险"],
    ["brand-marks", "拒绝 logo、名称和营销标题", "仅使用 CraftsOS 中性命名", "低风险"],
    ["component-combinations", "抽取 recurring roles", "重组为可审计组件契约", "中风险"],
    ["application-silhouette", "保留内容优先轮廓", "加入证据、冲突和回滚系统面", "中风险"]
  ].map(([dimension_id, source_observation, portable_decision, risk], index) => ({ dimension_id, source_observation, portable_decision, difference: risk, risk, evidence_refs: sourceRef(index < 2 ? "source-1" : index < 5 ? "source-4" : "source-8"), claim_refs: claimRefs(dimension_id) })),
  topology_risk: "medium",
  motif_combination_risk: "low",
  differences: ["brand-neutral naming", "independent icon vocabulary", "semantic token palette", "new panel combinations", "CraftsOS evidence and rollback surfaces", "mobile behavior remains candidate until observed"],
  gate_status: "pass"
};
const conflicts = [
  { conflict_id: "conflict-marketing-region", conflict_class: "scope", domain: "source-scope", severity: "low", impact: "官方首页与价格营销区域不可作为应用 Core", candidate_refs: ["all-shell-directions"], evidence_refs: sourceRef("source-14"), status: "resolved" },
  { conflict_id: "conflict-mobile-evidence", conflict_class: "coverage", domain: "responsive", severity: "medium", impact: "移动端缺少 Tier A screenshot，相关契约保持 candidate/unknown", candidate_refs: ["screen-mobile-library", "screen-mobile-inspector"], evidence_refs: sourceRef("source-15"), status: "accepted-risk" }
];
const shellDirections = [
  { direction_id: "quiet-frame", name: "Quiet Frame", description: "低对比背景、安静边界和画布优先的中性 Shell；适合长时间编辑与审阅。", differences: ["neutral canvas", "muted rail", "thin borders", "single accent", "content-first whitespace", "CraftsOS review rail"], evidence_refs: sourceRef("source-4") },
  { direction_id: "signal-column", name: "Signal Column", description: "更清晰的列分割、可见状态信号和任务面板；适合操作密集的证据与冲突工作流。", differences: ["stronger column separation", "status signal stripe", "task-oriented inspector", "denser control rows", "separate evidence column", "reversible conflict actions"], evidence_refs: sourceRef("source-8") }
];

const host = {
  schema_version: "r011.1.0",
  input_profile: "product-ui-mixed-evidence",
  prepared_analysis_id: manifest.prepared_analysis_id,
  execution: { host_agent: "Codex", engine: "gpt-5", vision_capability: true, performed_at: new Date().toISOString(), evidence_class: "codex-session-fixture" },
  sources,
  observations,
  application_grammar: grammarRules,
  surface_topology: surfaceTopology,
  screen_inventory: screenInventory,
  navigation_contract: navigationContract,
  panel_ownership: panelOwnership,
  density_contract: densityContract,
  component_candidates: componentCandidates,
  component_contracts: componentContracts,
  component_recurrence: componentRecurrence,
  tokens,
  typography,
  iconography,
  interaction_contract: interactionContract,
  motion_contract: motionContract,
  responsive_contract: responsiveContract,
  accessibility: {
    pairs: [{ foreground: "text.primary", background: "surface.app", ratio: 13.2, status: "pass" }, { foreground: "action.accent", background: "surface.panel", ratio: 5.1, status: "pass" }],
    keyboard: ["all visible controls reachable by Tab", "Escape closes overlays and sheets", "destructive actions require confirmation"],
    focus: ["visible 2px focus ring", "focus remains within modal until dismissed", "restore focus to trigger"],
    reduced_motion: ["disable non-essential panel motion", "preserve state change indication with opacity/border"],
    evidence_refs: sourceRef("source-4")
  },
  state_matrix: stateMatrix,
  source_distance: sourceDistance,
  conflicts,
  shell_directions: shellDirections
};

await writeFile(outputFile, `${JSON.stringify(host, null, 2)}\n`);
console.log(JSON.stringify({ output: outputFile, prepared_analysis_id: host.prepared_analysis_id, source_count: host.sources.length, evidence_count: evidenceBundle.evidence.length }, null, 2));
