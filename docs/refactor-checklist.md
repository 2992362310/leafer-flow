# Leafer Flow 重构清单

本文用于记录本轮插件化/解耦重构中哪些事项已经落地，哪些仍需继续推进。

## 1. 项目 skill 结论

当前仓库已有两个自定义 skill：

- `.agents/skills/leafer-ai/SKILL.md`
  - 面向 LeaferJS / Leafer AI / 无限画布 / 图形编辑器场景。
  - 偏通用 Leafer 技术知识和示例生成。
- `.agents/skills/leafer-flow-engineering/SKILL.md`
  - 面向本仓库 Vue + TypeScript + Leafer Flow 工程重构。
  - 记录了工具注册、action 边界、history/autosave、序列化、高风险模块和验证顺序等仓库约束。

仓库专属工程约束已开始沉淀，后续仍应随架构变化持续更新。

## 2. 重构目标

本轮重构聚焦 4 个问题：

1. 降低新增图形/工具时的修改面。
2. 降低 UI 组件直接操作编辑器内核的耦合度。
3. 给高风险编辑链路补上最小测试切口。
4. 统一历史记录、自动保存、序列化这些跨模块副作用。

当前进度：

- 第 1 项已基本完成：工具元数据、图形库、工具栏已由统一工具贡献派生。
- 第 2 项已完成主要交互入口：App、ContextMenu、EditorButton、LayerPanel 已走 command/registry 边界。
- 第 3 项尚未完成：当前仍没有自动化测试切口。
- 第 4 项尚未完成：高风险 mutation side effects 仍分散在各 action 中。

## 3. P0 清单

### 3.1 工具元数据单一化

原现状：工具名称、注册逻辑、图形库展示信息分散在多个位置。

- `src/editor/constants.ts`
- `src/editor/index.ts`
- `src/editor/shape-library.ts`

当前状态：已基本完成。

已落地：

- [x] 建立统一的 tool schema：`src/editor/tool-definitions.ts`。
- [x] 把 `label`、`icon`、`keywords`、默认尺寸、注册参数放到工具定义和工具贡献中。
- [x] `src/editor/builtin/tools/create-tool-contribution.ts` 负责从定义创建贡献。
- [x] `ShapeLibrary` 从 `ToolRegistry.getShapeLibraryGroups()` 派生。
- [x] `EditorToolbar` 从 `ToolRegistry.getToolbarGroups()` 派生。
- [x] 图形库搜索别名合并到 `keywords`，移除静态 `shapeSearchAliases`。
- [x] 图形库和工具栏分组标题由贡献中的 `groupTitle` 提供。

仍保留：

- `src/editor/constants.ts` 仍保留 `TOOL_NAME` 作为内置工具 id catalog。
- `tool-definitions.ts` 仍是内置工具集中定义源；这对内置插件是可接受的。

验收状态：新增内置图形节点主要修改 `tool-definitions.ts` 和所属内置插件清单，UI 展示不需要额外维护静态图形库或工具栏配置。

### 3.2 工具注册流程去重复

原现状：`src/editor/index.ts` 里有 `registerBasicTools`、`registerFlowTools`、`registerBpmnTools`、`registerArchitectureTools`，大量重复 `editor.register(...)`。

当前状态：已完成。

已落地：

- [x] 工具注册从 `src/editor/index.ts` 移到内置插件。
- [x] `src/editor/index.ts` 变成初始化入口，不再维护图形清单。
- [x] 内置插件通过 `ctx.editor.registerTool(createToolContribution(...))` 注册工具。
- [x] `DrawFlowNode` 的重复实例化参数通过 `createToolContribution` 和工具定义收敛。
- [x] 旧 `Editor.register(name, tool)` 已移除。
- [x] 旧 `ToolRegistry.registerLegacy(...)` 已移除。
- [x] 旧 `editor.tools` Map 已移除。

验收状态：`src/editor/index.ts` 已是初始化入口，而不是图形清单本体。

### 3.3 建立 action 执行边界

原现状：Vue 组件直接 import 并调用 `doCopy`、`doDelete`、`doGroup` 等 action。

当前状态：主要入口已完成，属性面板仍需后续处理。

已落地：

- [x] 引入 `CommandRegistry`。
- [x] 统一 `CommandResult`。
- [x] 支持同步/异步 command 的一致执行方式。
- [x] `App.vue` action 分发统一走 `editor.commands.execute(action)`。
- [x] `ContextMenu.vue` 不再直接 import `do-*`，只 emit command。
- [x] `EditorButton.vue` 默认 action button/dropdown 从 `ActionButtonRegistry` 派生，只 emit command。
- [x] `LayerPanel.vue` 锁定、显隐、层级移动、拖拽排序走 command。
- [x] 新增 `ACTION_NAME.MOVE_LAYER` 和 `src/editor/action/do-move-layer.ts`。
- [x] 右键菜单由 `MenuRegistry` 派生。
- [x] 默认 commands / menus / action buttons 包装进必需插件 `leafer-flow.builtin-core`。

仍保留：

- [ ] `EditorPanel.vue` 仍包含较多选择解析、属性读取和属性写入逻辑。
- [ ] `ViewControls.vue` 仍是静态宿主 UI，虽然已通过 command id 分发。
- [ ] `EditorButton.vue` 的“绘制设置”面板仍直接调用 drawing settings getter/setter。

验收状态：大部分通用编辑动作已建立 command 边界，但属性面板和 settings panel 还未 contribution 化。

### 3.4 补最小自动化测试切口

当前状态：未完成。

现状：仓库里没有检测到测试文件，当前属于纯手工回归。

重构项：

- [ ] 先不追求完整 UI 测试，先补 action/core 层测试。
- [ ] 优先覆盖 `do-group`、`do-ungroup`、`do-clipboard`、`do-file`、`connector-labels`。
- [ ] 为 editor app 创建最小 mock 或测试适配层。
- [ ] 在文档中明确“哪些链路必须自动测，哪些链路维持手测”。

验收标准：至少有一组可在 CI 跑通的核心编辑链路测试。

## 4. P1 清单

### 4.1 收敛 Editor 核心副作用

当前状态：未完成。

现状：`src/editor/editor.ts` 仍同时负责 app 初始化、plugin 挂载、tool 执行、history 监听、autosave 启动、连接线标签同步等。

问题：生命周期和副作用耦合在一个类里，后续定位“谁在保存历史、谁在同步标签、谁在触发 autosave”不够直接。

重构项：

- [ ] 拆出 editor lifecycle 模块。
- [ ] 把 `history + autosave + connector label sync` 这类副作用整理成 mutation pipeline。
- [ ] 明确“用户交互结束后提交”和“程序性变更提交”的统一入口。

验收标准：所有持久化相关副作用都能从单一提交流程追踪。

### 4.2 属性面板状态收敛

当前状态：未完成。

现状：`src/components/EditorPanel.vue` 里维护了大量独立 ref 和事件同步逻辑。

问题：选择态、连接线态、文本态、组合图形态混在一个组件里，后续增加属性会继续膨胀。

重构项：

- [ ] 抽出 `useSelectionInspector` 或类似 composable。
- [ ] 拆分几类属性分组：几何、外观、文本、连接线。
- [ ] 统一选中元素解析逻辑，避免组件里散落 `instanceof` 和 group children 推导。
- [ ] 后续再考虑属性面板 contribution。

验收标准：属性读取、属性写入、视图渲染三层职责分开。

### 4.3 编组/选择判断逻辑复用

当前状态：未完成。

现状：是否选中 group、是否可取消编组、是否存在连接线等判断仍散落在 action 和组件里。

重构项：

- [ ] 抽出 selection predicates，例如 `canGroup`、`canUnGroup`、`hasConnectorSelection`。
- [ ] 组件层和 action 层共用这些谓词。
- [ ] 把 `smartGroupSelection()` 相关判定规则文档化。

验收标准：同一条可操作性规则只有一个实现来源。

### 4.4 文件与序列化链路分层

当前状态：未完成。

现状：保存、加载、自动恢复、连接线自定义数据、标签偏移等逻辑分散在 action 和 core 中。

重构项：

- [ ] 统一定义序列化 schema 和版本号。
- [ ] 把导出文件与本地自动恢复的结构区分清楚。
- [ ] 为 connector label、custom data、group 结构写最小 round-trip 校验。

验收标准：同一份数据结构有明确入口、版本和回归样例。

## 5. P2 清单

### 5.1 文档收敛

当前状态：进行中。

已落地：

- [x] `docs/plugin-architecture.md` 更新为当前插件架构事实。
- [x] `docs/plugin-market-plan.md` 更新为当前市场实现状态。
- [x] `docs/refactor-context-summary.md` 更新为当前接力上下文。
- [x] `docs/refactor-checklist.md` 标记已实现/未实现项。
- [x] `docs/todo.md` 更新项目功能完成状态。

仍可继续：

- [ ] 保留 1 份“当前架构事实文档”。
- [ ] 保留 1 份“高风险链路验收清单”。
- [ ] 将过时分析文档标记为 archived，避免误导。

验收标准：新同学进入项目时，不需要在多份历史文档里交叉比对事实。

### 5.2 命名和目录职责再整理

当前状态：未完成。

现状：`core`、`action`、`utils`、`tools` 的边界基本可用，但部分模块职责已经出现交叉。

重构项：

- [ ] `action` 只保留用户可触发命令。
- [ ] `core` 只保留编辑器内部机制和数据同步。
- [ ] `utils` 只保留纯函数。
- [ ] 对存在副作用的 `utils` 或跨层访问模块做回收。

验收标准：仅通过目录名即可大致判断模块是否允许副作用。

### 5.3 仓库专属 skill / 规范沉淀

当前状态：已完成首版。

已落地：

- [x] 新增仓库级 skill：`.agents/skills/leafer-flow-engineering/SKILL.md`。
- [x] 记录工具注册模式、action 设计原则、history/autosave 注意事项。
- [x] 记录高风险模块。
- [x] 记录验证顺序和低成本验证策略。

仍可继续：

- [ ] 随后续架构变化继续更新 skill。
- [ ] 如果建立自动化测试，再把测试命令和覆盖边界补进去。

验收状态：后续无论是人还是 AI 进入仓库，都能快速知道“应该按什么方式改”。

## 6. 当前建议执行顺序

当前前置插件化骨架已经基本完成，建议后续按下面顺序推进：

1. 属性面板状态收敛：先拆 `EditorPanel.vue` selection/property composables。
2. 收敛 settings panel：把 `EditorButton.vue` 的绘制设置迁出静态 UI。
3. 文件/导出/模板插件化：从 `builtin-core` 拆出可独立启停的功能域插件。
4. 高风险 action 副作用收敛：逐步建立 mutation pipeline。
5. 最小自动化测试切口：优先覆盖 serialization / connector / clipboard / group。
6. 文档归档：把 docs 收敛成事实文档 + 验收清单。

## 7. 首轮重构完成标准

当前状态：部分完成。

- [x] 新增一个图形节点不再需要维护静态图形库和静态工具栏配置。
- [x] UI 组件不再直接依赖大批通用编辑 `do-*.ts`。
- [ ] 至少 3 条核心编辑链路有自动化测试。
- [ ] 历史记录与自动保存提交路径可从单一 mutation pipeline 追踪。
- [x] 文档已更新以反映当前主要架构事实。
