# Leafer Flow 插件化重构上下文摘要

本文用于在对话上下文压缩后继续接力重构。

## 项目目标

项目：`leafer-flow`

当前目标是将项目从“功能集中在主工程”的流程图编辑器，重构为：

> 核心画布运行时 + 插件宿主 + 插件协议 + 插件市场

用户明确要求：

- 除了画布和基础绘制工具外，其他能力都应尽量插件化。
- 后续工具和能力会从插件市场安装。
- 项目是练手项目，可以大胆重构，不必过度顾虑历史包袱。

## 技术栈

来自 `package.json`：

- Vue 3.5
- Vite 8
- TypeScript 6
- Tailwind CSS 4
- DaisyUI 5
- Oxlint 1
- Leafer / `@leafer-*` 2.1
- `pinia` 已安装但未启用
- `vue-router` 已安装但未启用

## 高风险模块

重构时谨慎处理以下模块：

```txt
src/editor/tools/draw-arrow.ts
src/editor/core/flow-serialization.ts
src/editor/core/connector-labels.ts
src/editor/action/do-clipboard.ts
src/editor/action/do-group.ts
src/editor/action/do-ungroup.ts
src/editor/action/do-file.ts
```

这些涉及连接线、序列化、剪贴板、编组、文件、history/autosave 等高风险链路。

本轮重构基本没有深入修改这些 action/serialization 内部逻辑，主要做注册表、插件宿主、UI 分发边界。

## 当前已完成重构概览

当前已完成以下方向：

1. 建立插件协议。
2. 建立工具贡献协议。
3. 建立命令贡献协议。
4. 建立菜单贡献协议。
5. 建立 action button 贡献协议。
6. 新增 `PluginManager`。
7. 新增 `ToolRegistry`。
8. 新增 `CommandRegistry`。
9. 新增 `MenuRegistry`。
10. 新增 `ActionButtonRegistry`。
11. `Editor` 接入 `pluginManager`、`toolRegistry`、`commands`、`menus`、`actionButtons`。
12. 基础工具、流程图节点、BPMN 节点、架构图节点已拆为内置插件。
13. 标尺、吸附、点阵已拆为内置插件，且支持 `deactivate()` 即时停用。
14. 默认命令、右键菜单、顶部 action buttons 已包装为必需内置插件 `leafer-flow.builtin-core`。
15. `EditorToolbar` 和 `ShapeLibrary` 已完全从 `ToolRegistry` 派生 UI 数据，不再保留静态 fallback。
16. `ContextMenu` 已从 `MenuRegistry` 派生菜单项。
17. `EditorButton` 已从 `ActionButtonRegistry` 派生按钮/下拉 UI。
18. `App.vue` action 分发已迁移到 `CommandRegistry`。
19. `LayerPanel.vue` 图层操作和拖拽排序已迁移到 `CommandRegistry`。
20. 新增插件市场数据层和服务层。
21. 新增插件市场 Drawer，支持启用/禁用内置插件。
22. 插件市场展示工具、命令、菜单、按钮贡献数量和标签预览。
23. 必需插件会强制启用，且在插件市场中不可关闭。
24. 旧 `Editor.tools` Map、旧 `Editor.register(name, tool)`、`ToolRegistry.registerLegacy(...)` 已移除。
25. 工具栏、状态栏工具名称、工具快捷键、图形库搜索均改为运行时贡献驱动。
26. 新增插件架构文档：`docs/plugin-architecture.md`。
27. 新增插件市场规划文档：`docs/plugin-market-plan.md`。

## 插件协议

文件：

```txt
src/editor/api/plugin.ts
```

当前核心类型：

```ts
export interface EditorPluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  category?: "tool" | "shape" | "panel" | "export" | "layout" | "utility" | string;
  capabilities?: string[];
  enabledByDefault?: boolean;
  required?: boolean;
}

export interface PluginContext {
  pluginId: string;
  editor: Editor;
  logger: PluginLogger;
  storage: PluginStorage;
}

export interface PluginContributionPreview {
  tools?: string[];
  commands?: string[];
  menus?: string[];
  buttons?: string[];
}

export interface EditorPluginModule {
  manifest: EditorPluginManifest;
  contributes?: PluginContributionPreview;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(ctx: PluginContext): void | Promise<void>;
}
```

每个插件拥有独立 localStorage 命名空间：

```txt
leafer-flow.plugin.${pluginId}.
```

`contributes` 是未启用插件的市场预览元数据，不需要激活插件即可展示贡献内容。

`manifest.required` 表示宿主必需插件：

- 始终纳入启用插件集合。
- `initEditor()` 激活内置插件时会无条件激活。
- 插件市场展示“必需”标记。
- 插件市场开关禁用，不允许关闭。

## PluginManager

文件：

```txt
src/editor/core/plugin-manager.ts
```

提供：

- `activate(plugin)`
- `deactivate(pluginId)`
- `isActive(pluginId)`
- `listActive()`

停用插件时会自动清理：

```ts
this.editor.unregisterToolsByPlugin(pluginId);
this.editor.commands.unregisterByPlugin(pluginId);
this.editor.menus.unregisterByPlugin(pluginId);
this.editor.actionButtons.unregisterByPlugin(pluginId);
```

## 工具协议与 ToolRegistry

协议文件：

```txt
src/editor/api/tool.ts
```

注册表文件：

```txt
src/editor/core/tool-registry.ts
```

核心类型：

```ts
export interface ToolLibraryContribution {
  groupId: ToolContributionGroup;
  groupTitle?: string;
  icon: IconName;
  keywords?: string[];
  width?: number;
  height?: number;
}

export interface ToolToolbarContribution {
  groupId: ToolContributionGroup;
  groupTitle?: string;
  icon: IconName;
  tip?: string;
  shortcut?: string;
  order?: number;
}

export interface ToolContribution {
  id: string;
  label: string;
  pluginId?: string;
  order?: number;
  createTool: () => IEditorTool;
  library?: ToolLibraryContribution;
  toolbar?: ToolToolbarContribution;
}
```

`ToolRegistry` 提供：

- `register(contribution)`
- `unregister(id)`
- `unregisterByPlugin(pluginId)`
- `get(id)`
- `getContribution(id)`
- `has(id)`
- `list()`
- `listByPlugin(pluginId)`
- `listLibraryTools()`
- `getShapeLibraryGroups()`
- `listToolbarTools()`
- `getToolbarGroups()`

重要状态：

- 旧 `editor.tools` Map 已移除。
- 旧 `Editor.register(name, tool)` 已移除。
- 旧 `ToolRegistry.registerLegacy(...)` 已移除。
- `Editor.execute()` 直接使用 `this.toolRegistry.get(...)`。
- `Editor.createElementFromTool()` 直接使用 `this.toolRegistry.get(...)`。
- `registerTool()` 只写入 `ToolRegistry`。
- 图形库和工具栏分组标题由贡献中的 `groupTitle` 提供，不再依赖宿主内置 group title map。

## 命令协议与 CommandRegistry

协议文件：

```txt
src/editor/api/command.ts
```

注册表文件：

```txt
src/editor/core/command-registry.ts
```

核心类型：

```ts
export interface CommandResult {
  success: boolean;
  message: string;
  warning?: boolean;
  refreshZoom?: boolean;
}

export interface CommandContribution<TPayload = unknown> {
  id: string;
  label: string;
  pluginId?: string;
  warning?: boolean;
  refreshZoom?: boolean;
  match?(id: string): TPayload | null;
  run(editor: Editor, payload?: TPayload): CommandResult | Promise<CommandResult>;
}
```

`match()` 用于动态命令，例如快捷键微移：

```txt
nudgeLeft:1
nudgeRight:10
```

`CommandRegistry` 提供：

- `register(command)`
- `unregister(id)`
- `unregisterByPlugin(pluginId)`
- `execute(id, payload?)`
- `has(id)`
- `get(id)`
- `list()`
- `listByPlugin(pluginId)`

默认命令注册文件：

```txt
src/editor/builtin/commands/default-commands.ts
```

内置命令当前归属必需插件：

```txt
leafer-flow.builtin-core
```

目前 `App.vue`、快捷键、右键菜单、图层面板都统一走：

```ts
editor.commands.execute(action, payload?)
```

图层拖拽排序已新增命令：

```txt
src/editor/action/do-move-layer.ts
ACTION_NAME.MOVE_LAYER
```

`LayerPanel.vue` 拖拽排序通过 `MOVE_LAYER` 命令提交，由 action 内部处理节点查找、循环移动防护、树移动、`history.save()` 和 `autoSave.save()`。

## 菜单协议与 MenuRegistry

协议文件：

```txt
src/editor/api/menu.ts
```

注册表文件：

```txt
src/editor/core/menu-registry.ts
```

核心类型：

```ts
export interface MenuContribution {
  id: string;
  label: string;
  command: string;
  pluginId?: string;
  group?: string;
  order?: number;
  shortcut?: string;
  danger?: boolean;
  when?: (editor: Editor) => boolean;
}
```

`MenuRegistry` 提供：

- `register(menu)`
- `unregister(id)`
- `unregisterByPlugin(pluginId)`
- `list()`
- `listByPlugin(pluginId)`
- `getContextMenuGroups()`

默认右键菜单注册文件：

```txt
src/editor/builtin/commands/default-menus.ts
```

内置菜单当前归属必需插件：

```txt
leafer-flow.builtin-core
```

默认右键菜单包含：

- 复制
- 粘贴
- 编组
- 取消编组
- 连接线置顶
- 删除

`ContextMenu.vue` 当前不再写死菜单项，也不再直接调用 action，而是：

```ts
groups.value = props.editor.menus.getContextMenuGroups();
```

点击菜单项只 emit command：

```ts
emit("action", item.command)
```

## Action Button 协议与 ActionButtonRegistry

协议文件：

```txt
src/editor/api/action-button.ts
```

注册表文件：

```txt
src/editor/core/action-button-registry.ts
```

核心类型：

```ts
export type ActionButtonKind = "button" | "dropdown" | "panel";

export interface ActionButtonItemContribution {
  id: string;
  label: string;
  command: string;
  icon?: IconName;
  order?: number;
  danger?: boolean;
}

export interface ActionButtonGroupContribution {
  id: string;
  label: string;
  icon: IconName;
  pluginId?: string;
  kind?: ActionButtonKind;
  order?: number;
  items: ActionButtonItemContribution[];
}
```

`ActionButtonRegistry` 提供：

- `register(group)`
- `unregister(id)`
- `unregisterByPlugin(pluginId)`
- `list()`
- `listByPlugin(pluginId)`

默认 action button 注册文件：

```txt
src/editor/builtin/commands/default-action-buttons.ts
```

内置 action button 当前归属必需插件：

```txt
leafer-flow.builtin-core
```

当前已注册的默认按钮组包括：

- 历史
- 对齐与分布
- 图层与状态
- 连接线标签
- 业务流程模板
- 专业图模板
- 文件
- 导出
- 危险操作

`EditorButton.vue` 当前不再静态定义这些 action button/dropdown，而是通过 prop 接收 registry 分组：

```ts
groups: ActionButtonGroupContribution[];
```

点击按钮仍只 emit command：

```ts
emits("action", action)
```

注意：`EditorButton.vue` 内的“绘制设置”面板仍是本地静态 UI，直接调用 drawing settings getter/setter，尚未纳入 action button contribution 或插件配置协议。

## Editor 当前状态

文件：

```txt
src/editor/editor.ts
```

当前核心注册表：

```ts
public pluginManager: PluginManager;
public toolRegistry: ToolRegistry;
public commands: CommandRegistry;
public menus: MenuRegistry;
public actionButtons: ActionButtonRegistry;
```

工具注册入口：

```ts
registerTool(contribution: ToolContribution) {
  return this.toolRegistry.register(contribution);
}
```

工具注销入口：

```ts
unregisterTool(id: string) {
  this.toolRegistry.unregister(id);
}

unregisterToolsByPlugin(pluginId: string) {
  this.toolRegistry.unregisterByPlugin(pluginId);
}
```

旧 `tools = new Map<string, IEditorTool>()` 已删除。

## 内置核心插件

文件：

```txt
src/editor/builtin/plugins/builtin-core/index.ts
```

插件 id：

```txt
leafer-flow.builtin-core
```

该插件是必需插件：

```ts
required: true
```

激活时注册：

- 默认命令：`registerDefaultCommands(ctx.editor)`
- 默认右键菜单：`registerDefaultMenus(ctx.editor)`
- 默认顶部操作按钮：`registerDefaultActionButtons(ctx.editor)`

默认命令、菜单、按钮的 `pluginId` 已统一为 `leafer-flow.builtin-core`。

## 内置工具插件

文件：

```txt
src/editor/builtin/tools/create-tool-contribution.ts
src/editor/builtin/tools/tool-preview.ts
src/editor/builtin/plugins/basic-tools/index.ts
src/editor/builtin/plugins/flow-shapes/index.ts
src/editor/builtin/plugins/bpmn-shapes/index.ts
src/editor/builtin/plugins/architecture-shapes/index.ts
```

插件 id：

```txt
leafer-flow.basic-tools
leafer-flow.flow-shapes
leafer-flow.bpmn-shapes
leafer-flow.architecture-shapes
```

这些插件在 `activate(ctx)` 中调用：

```ts
ctx.editor.registerTool(createToolContribution(...))
```

并通过 `contributes.tools` 提供未启用状态的市场预览。

工具贡献同时携带：

- 图形库元数据：`library`
- 工具栏元数据：`toolbar`
- 分组标题：`groupTitle`
- 搜索关键词：`keywords`
- 快捷键：`toolbar.shortcut`

## Canvas 辅助插件

文件：

```txt
src/editor/builtin/plugins/canvas-ruler/index.ts
src/editor/builtin/plugins/canvas-snap/index.ts
src/editor/builtin/plugins/canvas-dot-matrix/index.ts
```

插件 id：

```txt
leafer-flow.canvas-ruler
leafer-flow.canvas-snap
leafer-flow.canvas-dot-matrix
```

分别包装旧的：

- `editorRuler`
- `editorSnap`
- `editorDotMatrix`

已支持即时停用：

- `Ruler.dispose()`
- `DotMatrix.destroy()`
- `Snap.destroy()`

新增 canvas overlay 插件时，必须确认第三方运行时有可靠释放 API，并实现 `deactivate(ctx)`。

## 内置插件注册表

文件：

```txt
src/editor/builtin/plugins/index.ts
```

当前导出：

```ts
export const builtinPlugins: EditorPluginModule[] = [
  builtinCorePlugin,
  canvasRulerPlugin,
  canvasSnapPlugin,
  canvasDotMatrixPlugin,
  basicToolsPlugin,
  flowShapesPlugin,
  bpmnShapesPlugin,
  architectureShapesPlugin,
];
```

## 插件市场

数据层文件：

```txt
src/editor/plugins/market/builtin-registry.ts
src/editor/plugins/market/plugin-market-service.ts
```

UI 文件：

```txt
src/components/PluginMarket/PluginMarketDrawer.vue
```

规划文档：

```txt
docs/plugin-market-plan.md
```

市场采用右侧 Drawer，不引入新路由。

`builtin-registry.ts` 提供：

- `getEnabledPluginIds()`
- `saveEnabledPluginIds(ids)`
- `listPluginMarketItems()`
- `getBuiltinPluginById(pluginId)`

存储 key：

```txt
leafer-flow.enabled-plugins
```

`plugin-market-service.ts` 提供：

- `listInstalledPlugins(editor?)`
- `enablePlugin(editor, pluginId)`
- `disablePlugin(editor, pluginId)`

插件市场 Drawer 支持：

- 展示内置插件列表。
- 搜索插件 id、名称、描述、分类、capabilities。
- 启用/禁用非必需插件。
- 必需插件展示“必需”标记，开关禁用。
- 展示启用状态。
- 展示工具、命令、菜单、按钮贡献数量。
- 展示工具、命令、菜单、按钮贡献标签预览。
- 未启用插件通过 `plugin.contributes` 展示预览。

用户已在浏览器体验，反馈效果很好。

## initEditor 当前状态

文件：

```txt
src/editor/index.ts
```

当前职责：

1. 创建 `Editor`。
2. 读取启用插件 id。
3. 激活启用的内置插件。
4. 无条件激活必需内置插件。

核心流程：

```ts
const editor = new Editor(...);
activateEnabledPlugins(editor);
return editor;
```

`activateEnabledPlugins(editor)` 当前逻辑：

```ts
const enabledIds = new Set(getEnabledPluginIds());
builtinPlugins.forEach((plugin) => {
  if (plugin.manifest.required || enabledIds.has(plugin.manifest.id)) {
    void editor.pluginManager.activate(plugin);
  }
});
```

`initEditor()` 不再直接调用：

- `registerDefaultCommands(editor)`
- `registerDefaultMenus(editor)`
- `registerDefaultActionButtons(editor)`

这些默认贡献由 `builtin-core` 插件激活。

`src/editor/index.ts` 当前只保留较小 public surface：

```ts
export { Editor, getZoomPercent };
```

## UI 注册表驱动状态

### ShapeLibrary

文件：

```txt
src/components/ShapeLibrary.vue
```

接收 prop：

```ts
groups: ShapeLibraryGroup[];
```

当前状态：

- 图形库分组来自 `currentEditor.toolRegistry.getShapeLibraryGroups()`。
- 已移除静态 `shapeLibraryGroups` fallback。
- 最近使用工具使用 `string[]`。
- 折叠快捷入口不再使用静态默认工具表，而是优先使用最近工具，再回退到运行时分组中的首批工具。
- 搜索只使用 `item.label`、`item.tool`、`item.keywords`。
- 旧静态 `shapeSearchAliases` 已移除，别名已合并到工具贡献的 `keywords`。

### EditorToolbar

文件：

```txt
src/components/EditorToolbar.vue
```

接收 prop：

```ts
groups: ToolToolbarGroup[];
```

当前状态：

- 工具栏分组来自 `currentEditor.toolRegistry.getToolbarGroups()`。
- 已移除本地静态 fallback。
- 不再硬编码 `flow`、`bpmn`、`architecture`、`shapes` 等分组布局。
- 选择工具仍是宿主固定入口。
- 小分组直接显示按钮。
- 工具数大于 4 的分组显示为 dropdown。
- 新插件贡献的 toolbar group 可直接显示，无需改组件。

### EditorButton

文件：

```txt
src/components/EditorButton.vue
```

接收 prop：

```ts
groups: ActionButtonGroupContribution[];
```

当前按钮/下拉分组来自：

```ts
currentEditor.actionButtons.list()
```

`EditorButton.vue` 已不再静态定义历史、对齐、图层、模板、文件、导出、清空等 action UI；这些默认项迁移到：

```txt
src/editor/builtin/commands/default-action-buttons.ts
```

残留：绘制设置面板仍在 `EditorButton.vue` 内部静态维护，直接调用：

```ts
getConnectorRouteType()
getFreehandSmoothness()
getSnapEnabled()
setConnectorRouteType(...)
setFreehandSmoothness(...)
setSnapEnabled(...)
```

后续更适合通过“插件配置能力”或 settings panel contribution 处理。

### LayerPanel

文件：

```txt
src/components/LayerTree/LayerPanel.vue
```

图层面板的锁定、显隐、上下移动、置顶/置底、拖拽排序操作已经从直接 import action 改为：

```ts
await props.editor.commands.execute(action, payload?)
```

拖拽排序当前调用：

```ts
await props.editor.commands.execute(ACTION_NAME.MOVE_LAYER, {
  dragId,
  dropId,
  dropPosition,
})
```

`LayerPanel.vue` 不再直接移动 Leafer tree，也不再手动保存 history/autosave。

### ContextMenu

文件：

```txt
src/components/ContextMenu.vue
```

当前从 `MenuRegistry` 派生菜单项：

```ts
groups.value = props.editor.menus.getContextMenuGroups();
```

不再直接 import `do-*` action。

### StatusBar

文件：

```txt
src/components/StatusBar.vue
```

当前工具名称不再使用组件内硬编码表，而是由 `App.vue` 从运行时工具贡献生成：

```ts
runtimeToolLabels.value = {
  [TOOL_NAME.SELECT]: "选择",
  ...Object.fromEntries(
    currentEditor.toolRegistry.list().map((contribution) => [contribution.id, contribution.label]),
  ),
};
```

`StatusBar.vue` 通过 prop 接收：

```ts
toolLabels: Record<string, string>;
```

### Shortcuts

文件：

```txt
src/editor/shortcuts.ts
```

工具快捷键不再硬编码具体工具 id。

`useEditorShortcuts()` 支持：

```ts
resolveToolShortcut?: (key: string) => string | undefined;
```

`App.vue` 从 toolbar contribution 生成运行时映射：

```ts
runtimeToolShortcuts.value = Object.fromEntries(
  currentEditor.toolRegistry.listToolbarTools().flatMap((contribution) => {
    const shortcut = contribution.toolbar?.shortcut?.toLowerCase();
    return shortcut ? [[shortcut, contribution.id]] : [];
  }),
);
```

宿主级非工具快捷键仍保留在 `shortcuts.ts` 中，作为核心编辑器行为。

### App.vue

文件：

```txt
src/App.vue
```

当前仍是主编排层，但 action 分发已经简化为：

```ts
async function handleAction(action: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  logRef.value?.addLog({ message: `执行操作: ${action}` });
  const result = await currentEditor.commands.execute(action);
  logResult(result, result.warning);
  if (result.refreshZoom) refreshEditorStats(currentEditor);
}
```

运行时 UI 数据：

```ts
const runtimeShapeLibraryGroups = ref<ShapeLibraryGroup[]>([]);
const runtimeToolbarGroups = ref<ToolToolbarGroup[]>([]);
const runtimeActionButtonGroups = ref<ActionButtonGroupContribution[]>([]);
const runtimeToolLabels = ref<Record<string, string>>({ [TOOL_NAME.SELECT]: "选择" });
const runtimeToolShortcuts = ref<Record<string, string>>({});
const pluginMarketOpen = ref(false);
```

插件市场变更后会：

- 刷新工具栏分组。
- 刷新图形库分组。
- 刷新 action button 分组。
- 刷新状态栏工具名称。
- 刷新工具快捷键映射。
- 重置当前工具为 `select`。
- 写日志。

## 手动体验反馈

用户已在浏览器体验插件市场，反馈可用且效果很好。

## 当前仍然存在的历史包袱

### App.vue 仍然偏重

虽然 action 分发已迁移到 `CommandRegistry`，但 `App.vue` 仍承担：

- editor 初始化
- autosave 恢复日志
- shape drop
- marquee selection
- toolbar/library/action button/status/shortcut runtime 刷新
- 插件市场打开与变更回调
- 日志展示协调

后续可考虑拆 composables：

```txt
src/composables/useEditorRuntimeTools.ts
src/composables/useShapeDrop.ts
src/composables/useSelectionMarquee.ts
src/composables/usePluginMarketRuntime.ts
```

### EditorButton.vue 绘制设置仍是静态本地 UI

文件：

```txt
src/components/EditorButton.vue
```

历史、对齐、图层、模板、文件、导出、清空等 action button/dropdown 已迁移到 `ActionButtonRegistry`。

当前仍未 contribution 化的是“绘制设置”面板：

- 连线样式
- 自由绘制平滑度
- 吸附开关

这部分更像插件配置/编辑器设置能力，后续可结合插件 settings/schema 或 settings panel contribution 统一处理。

### 属性面板仍未插件化

`EditorPanel.vue` 仍然较重，包含选择解析、属性状态和属性更新逻辑。

后续若做插件属性面板，应先抽 selection/property composables。

### ViewControls.vue 仍是静态宿主 UI

`ViewControls.vue` 仍是静态缩放/视图控制组件。它已经 emit command id，不直接调用底层 action，但尚未 contribution 化。

### 高风险 action 尚未收口副作用

很多 mutating action 仍各自处理：

- `history.save()`
- `autoSave.save()`
- connector label sync
- selection refresh

暂未建立统一 mutation apply path。

### EditorPanel.vue 仍有既有类型诊断

`EditorPanel.vue` 目前仍存在 Leafer / Connector 类型兼容相关诊断。这是既有问题，和本轮注册表/插件市场重构不是同一条链路。
