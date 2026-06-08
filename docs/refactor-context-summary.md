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

构建命令：

```sh
pnpm run build
```

当前没有自动化测试文件。

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

## Git 保存点

用户体验插件市场后已保存一版到仓库：

```txt
ba8b56a Add plugin marketplace
```

该提交包含插件协议、工具注册表、命令注册表、插件市场 Drawer、内置插件拆分等主要内容。

提交后继续做了以下未必已提交的后续工作：

- `ContextMenu.vue` command 化。
- 新增 `MenuRegistry`。
- 右键菜单从 registry 派生。
- 插件市场展示菜单贡献统计。
- 移除旧 `Editor.tools` Map，工具运行路径直接读 `ToolRegistry`。

如果接力时需要保存当前进度，先检查：

```sh
git status --short
```

## 当前已完成重构概览

当前已完成以下方向：

1. 建立插件协议。
2. 建立工具贡献协议。
3. 建立命令贡献协议。
4. 建立菜单贡献协议。
5. 新增 `PluginManager`。
6. 新增 `ToolRegistry`。
7. 新增 `CommandRegistry`。
8. 新增 `MenuRegistry`。
9. `Editor` 接入 `pluginManager`、`toolRegistry`、`commands`、`menus`。
10. 基础工具、流程图节点、BPMN 节点、架构图节点已拆为内置插件。
11. 标尺、吸附、点阵已拆为内置插件，且支持 `deactivate()` 即时停用。
12. `EditorToolbar` 和 `ShapeLibrary` 已从 `ToolRegistry` 派生 UI 数据。
13. `ContextMenu` 已从 `MenuRegistry` 派生菜单项。
14. `App.vue` action 分发已迁移到 `CommandRegistry`。
15. 新增插件市场数据层和服务层。
16. 新增插件市场 Drawer，支持启用/禁用内置插件。
17. 插件市场展示工具、命令、菜单贡献数量和标签预览。
18. 旧 `Editor.tools` Map 已移除，工具运行路径直接读 `ToolRegistry`。
19. 新增插件架构文档：`docs/plugin-architecture.md`。
20. 新增插件市场规划文档：`docs/plugin-market-plan.md`。

## 插件协议

文件：

```txt
src/editor/api/plugin.ts
```

当前核心类型：

```ts
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
- `registerLegacy(id, tool)`
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
- `Editor.execute()` 直接使用 `this.toolRegistry.get(...)`。
- `Editor.createElementFromTool()` 直接使用 `this.toolRegistry.get(...)`。
- `registerTool()` 只写入 `ToolRegistry`。

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

内置命令归属：

```txt
leafer-flow.builtin-commands
```

目前 `App.vue`、快捷键、右键菜单都统一走：

```ts
editor.commands.execute(action)
```

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

内置菜单归属：

```txt
leafer-flow.builtin-menus
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
```

工具注册入口：

```ts
register(name: string, tool: IEditorTool) {
  return this.toolRegistry.registerLegacy(name, tool);
}

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
- 启用/禁用插件。
- 展示启用状态。
- 展示工具、命令、菜单贡献数量。
- 展示工具、命令、菜单贡献标签预览。
- 未启用插件通过 `plugin.contributes` 展示预览。

用户已在浏览器体验，反馈效果很好。

## initEditor 当前状态

文件：

```txt
src/editor/index.ts
```

当前职责：

1. 创建 `Editor`。
2. 注册默认 commands。
3. 注册默认 menus。
4. 读取启用插件 id。
5. 激活对应内置插件。

核心流程：

```ts
const editor = new Editor(...);

registerDefaultCommands(editor);
registerDefaultMenus(editor);
activateEnabledPlugins(editor);

return editor;
```

## UI 注册表驱动状态

### ShapeLibrary

文件：

```txt
src/components/ShapeLibrary.vue
```

已支持 prop：

```ts
groups?: ShapeLibraryGroup[];
```

优先使用运行时注册表分组，fallback 到静态 `shapeLibraryGroups`。

最近使用工具已从 `ToolName[]` 放宽为 `string[]`。

### EditorToolbar

文件：

```txt
src/components/EditorToolbar.vue
```

已支持 prop：

```ts
groups?: ToolToolbarGroup[];
```

优先使用运行时注册表分组，fallback 到本地静态分组。

当前展示逻辑仍沿用原 UI：

- core：选择 + 连接线 + 文本
- flow 前 4 个直接展示
- flow 后续 dropdown
- bpmn dropdown
- architecture dropdown
- shapes dropdown

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
const runtimeShapeLibraryGroups = ref<ShapeLibraryGroup[]>(shapeLibraryGroups);
const runtimeToolbarGroups = ref<ToolToolbarGroup[]>([]);
const pluginMarketOpen = ref(false);
```

插件市场变更后会：

- 刷新工具栏分组。
- 刷新图形库分组。
- 重置当前工具为 `select`。
- 写日志。

## 已验证

最近多次运行：

```sh
pnpm run build
```

最近一次构建通过：

```txt
✓ built in 1.12s
```

用户也已手动体验插件市场，反馈可用且效果很好。

## 当前仍然存在的历史包袱

### App.vue 仍然偏重

虽然 action 分发已迁移到 `CommandRegistry`，但 `App.vue` 仍承担：

- editor 初始化
- autosave 恢复日志
- shape drop
- marquee selection
- toolbar/library runtime 刷新
- 插件市场打开与变更回调
- 日志展示协调

后续可考虑拆 composables：

```txt
src/composables/useEditorRuntimeTools.ts
src/composables/useShapeDrop.ts
src/composables/useSelectionMarquee.ts
src/composables/usePluginMarketRuntime.ts
```

### EditorButton.vue 仍是静态 action UI

文件：

```txt
src/components/EditorButton.vue
```

仍静态定义大量 action button/dropdown，例如：

- 对齐
- 图层
- 绘制设置
- 模板
- 保存/加载/导出
- 清空

下一步可以考虑建立 toolbar/action button contribution，或先把配置项抽到 editor 层。

### LayerPanel.vue 仍直接调用 action

文件：

```txt
src/components/LayerTree/LayerPanel.vue
```

仍直接 import：

```ts
doLayer, doToggleLock, doToggleVisible
```

后续应改为执行 `editor.commands.execute(...)`。

### 属性面板仍未插件化

`EditorPanel.vue` 仍然较重，包含选择解析、属性状态和属性更新逻辑。

后续若做插件属性面板，应先抽 selection/property composables。

### 高风险 action 尚未收口副作用

很多 mutating action 仍各自处理：

- `history.save()`
- `autoSave.save()`
- connector label sync
- selection refresh

暂未建立统一 mutation commit path。

## 下一步推荐

### 优先级 1：保存当前后续进度

因为 `ba8b56a` 之后又做了 MenuRegistry 和移除旧 tools Map，建议下一步先确认工作区并提交：

```sh
git status --short
pnpm run build
git add src docs
git commit -m "Add menu registry"
```

提交信息可根据实际 diff 调整。

### 优先级 2：LayerPanel command 化

将 `LayerPanel.vue` 从直接调用 action 改为走 `editor.commands.execute(...)`。

这是当前最明显的 UI/action 耦合残留之一，风险相对可控。

### 优先级 3：EditorButton contribution 化

`EditorButton.vue` 仍是静态 action hub。可以考虑新增：

```txt
src/editor/api/action-button.ts
src/editor/core/action-button-registry.ts
```

但也可以先不做，避免 UI 配置复杂化过快。

### 优先级 4：App.vue 拆 composables

把以下逻辑拆出去：

- shape drop
- marquee selection
- runtime registry refresh
- plugin market changed handling

### 优先级 5：插件配置能力

为插件协议增加配置入口，例如：

```ts
settings?: PluginSettingContribution[]
```

或：

```ts
configure?(ctx: PluginContext): PluginConfigSchema
```

优先适合：

- 点阵背景配置
- 标尺配置
- 吸附配置
- 默认连线样式

## 注意事项

- `doLoad()` 是异步行为，CommandRegistry 已支持 Promise。
- 命令 id 目前复用 `ACTION_NAME` 的值，减少 UI 改动面。
- 不要轻易动 `flow-serialization.ts`、`do-clipboard.ts`、`do-group.ts`、`do-ungroup.ts`、`do-file.ts`。
- 新插件如果贡献工具/命令/菜单，必须设置 `pluginId`，否则市场和停用清理无法正确归属。
- 新 canvas overlay 插件必须实现可靠 `deactivate(ctx)`。
