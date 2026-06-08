# Leafer Flow 重构上下文摘要

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

## 已完成重构概览

当前已完成以下方向：

1. 建立插件协议。
2. 建立工具贡献协议。
3. 新增 `PluginManager`。
4. 新增 `ToolRegistry`。
5. `Editor` 接入 `pluginManager` 和 `toolRegistry`。
6. 基础工具、流程图节点、BPMN 节点、架构图节点已拆为内置插件。
7. 标尺、吸附、点阵已拆为内置插件。
8. `EditorToolbar` 和 `ShapeLibrary` 已开始从 `ToolRegistry` 派生 UI 数据。
9. 新增插件市场数据层，支持读取/保存启用插件 id。
10. 新增插件架构文档：`docs/plugin-architecture.md`。

## 新增插件协议

文件：

```txt
src/editor/api/plugin.ts
```

核心类型：

```ts
export interface EditorPluginModule {
  manifest: EditorPluginManifest;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(ctx: PluginContext): void | Promise<void>;
}
```

插件上下文：

```ts
export interface PluginContext {
  editor: Editor;
  logger: PluginLogger;
  storage: PluginStorage;
}
```

每个插件拥有独立 localStorage 命名空间：

```txt
leafer-flow.plugin.${pluginId}.
```

## 新增工具协议

文件：

```txt
src/editor/api/tool.ts
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

工具栏类型：

```ts
export interface ToolToolbarGroup {
  id: string;
  title: string;
  items: ToolToolbarItem[];
}
```

注意：图形库 item 的 `tool` 已放宽为 `string`，为插件市场动态工具 id 做准备。

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

## ToolRegistry

文件：

```txt
src/editor/core/tool-registry.ts
```

提供：

- `register(contribution)`
- `registerLegacy(id, tool)`
- `get(id)`
- `getContribution(id)`
- `has(id)`
- `list()`
- `listLibraryTools()`
- `getShapeLibraryGroups()`
- `listToolbarTools()`
- `getToolbarGroups()`

当前仍保留旧 `editor.tools` Map，但新工具来源应逐步迁移到 `toolRegistry`。

## Editor 当前状态

文件：

```txt
src/editor/editor.ts
```

新增：

```ts
public pluginManager: PluginManager;
public toolRegistry: ToolRegistry;
```

新增工具注册入口：

```ts
registerTool(contribution: ToolContribution) {
  const registered = this.toolRegistry.register(contribution);
  this.tools.set(contribution.id, registered.tool);
  return registered;
}
```

旧入口 `register(name, tool)` 仍保留兼容。

## 内置工具插件

新增：

```txt
src/editor/builtin/tools/create-tool-contribution.ts
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

## Canvas 辅助插件

新增：

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

## 插件市场数据层

文件：

```txt
src/editor/plugins/market/builtin-registry.ts
```

提供：

- `getEnabledPluginIds()`
- `saveEnabledPluginIds(ids)`
- `listPluginMarketItems()`
- `getBuiltinPluginById(pluginId)`

存储 key：

```txt
leafer-flow.enabled-plugins
```

默认启用所有 `enabledByDefault` 插件。

## initEditor 当前状态

文件：

```txt
src/editor/index.ts
```

当前不再直接注册工具，也不再直接 `editor.use(editorRuler/editorSnap/editorDotMatrix)`。

现在只负责：

1. 创建 `Editor`。
2. 读取启用插件 id。
3. 激活对应内置插件。

核心逻辑：

```ts
function activateEnabledPlugins(editor: Editor) {
  const enabledIds = new Set(getEnabledPluginIds());
  builtinPlugins.forEach((plugin) => {
    if (enabledIds.has(plugin.manifest.id)) {
      void editor.pluginManager.activate(plugin);
    }
  });
}
```

## UI 注册表驱动状态

### ShapeLibrary

文件：

```txt
src/components/ShapeLibrary.vue
```

已新增 prop：

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

已新增 prop：

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

### App.vue

文件：

```txt
src/App.vue
```

新增运行时 UI 数据：

```ts
const runtimeShapeLibraryGroups = ref<ShapeLibraryGroup[]>(shapeLibraryGroups);
const runtimeToolbarGroups = ref<ToolToolbarGroup[]>([]);
```

初始化后读取注册表：

```ts
function refreshRuntimeToolContributions(currentEditor: Editor) {
  refreshShapeLibraryGroups(currentEditor);
  refreshToolbarGroups(currentEditor);
}
```

模板传入：

```vue
<ShapeLibrary
  :active-tool="activeTool"
  :groups="runtimeShapeLibraryGroups"
  @tool="handleLibraryTool"
/>

<EditorToolbar
  :groups="runtimeToolbarGroups"
  @tool="handleTool"
  ref="toolbarRef"
/>
```

## 已验证

多次运行：

```sh
pnpm run build
```

最后一次构建通过：

```txt
✓ built in 1.17s
```

## 当前仍然存在的历史包袱

### App.vue 仍然过重

`App.vue` 仍直接 import 大量 `do-*` action，并维护：

- `baseActionRunners`
- `alignActions`
- `layerActionMap`
- `templateActionMap`
- `viewActionMap`
- `dispatchAction`
- `runAction`

下一步应建立 `CommandRegistry`，将 action 分发从 `App.vue` 移到 editor/插件层。

### ContextMenu.vue 仍直接调用 action

文件：

```txt
src/components/ContextMenu.vue
```

仍直接 import：

```ts
doCopy, doDelete, doGroup, doPaste, doUnGroup, doConnectorToFront
```

后续应改成只 emit command，或由 menu registry 派生菜单项。

### 旧 tools Map 仍保留

当前 `Editor.execute()` 和 `createElementFromTool()` 仍使用 `this.tools` Map。

新工具注册会同步写入：

- `toolRegistry`
- `tools`

后续可改为直接读 `toolRegistry`，然后删除旧 Map。

## 下一步推荐：CommandRegistry

建议新增：

```txt
src/editor/api/command.ts
src/editor/core/command-registry.ts
```

建议类型：

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
  run(editor: Editor, payload?: TPayload): CommandResult | Promise<CommandResult>;
}
```

`Editor` 增加：

```ts
public commands: CommandRegistry;
```

构造函数初始化：

```ts
this.commands = new CommandRegistry(this);
```

`CommandRegistry` 提供：

- `register(command)`
- `execute(id, payload?)`
- `has(id)`
- `list()`

## CommandRegistry 推荐迁移方式

### 步骤 A

先建立 registry，并把 `App.vue` 内的 `dispatchAction()` 逻辑迁移到 command 注册模块或内置插件。

不要一次性改菜单、快捷键。

### 步骤 B

`App.vue` 简化成：

```ts
const result = await editor.value.commands.execute(action, payload);
```

### 步骤 C

将 `ContextMenu.vue` 改为只 emit command。

### 步骤 D

将快捷键改为执行 command。

## 注意事项

- `doLoad()` 是异步行为，CommandRegistry 必须支持 Promise。
- 命令 id 可先复用 `ACTION_NAME` 的值，减少 UI 改动面。
- 不要在下一步直接动 `flow-serialization.ts`、`do-clipboard.ts`、`do-group.ts` 等高风险模块。
