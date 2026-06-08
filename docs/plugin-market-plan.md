# 插件市场模块规划

## 当前形态

插件市场当前采用编辑器内右侧 Drawer，不引入新路由。

原因：

- 保留画布编辑上下文，不打断当前工作流。
- 当前市场只有内置插件源，不需要完整页面级信息架构。
- 启停插件后需要立即刷新工具栏、图形库、操作按钮、状态栏工具名称和快捷键映射，Drawer 更适合即时反馈。
- 避免过早引入 `vue-router` 和跨页面编辑器生命周期管理。

## 当前模块

```txt
src/editor/plugins/market/
  builtin-registry.ts
  plugin-market-service.ts

src/components/PluginMarket/
  PluginMarketDrawer.vue
```

### `builtin-registry.ts`

负责内置插件市场数据：

- 读取启用插件 id。
- 保存启用插件 id。
- 强制合并必需插件 id。
- 列出内置插件 market item。
- 根据 id 获取内置插件模块。

当前存储 key：

```txt
leafer-flow.enabled-plugins
```

必需插件来自：

```ts
plugin.manifest.required
```

当前必需插件：

```txt
leafer-flow.builtin-core
```

### `plugin-market-service.ts`

负责市场业务边界，避免 Vue 组件直接操作 localStorage 或内置插件表：

- `listInstalledPlugins(editor?)`
- `enablePlugin(editor, pluginId)`
- `disablePlugin(editor, pluginId)`

服务会基于 editor 的 registry 统计插件贡献：

- 工具数量：`editor.toolRegistry.listByPlugin(pluginId)`
- 命令数量：`editor.commands.listByPlugin(pluginId)`
- 菜单数量：`editor.menus.listByPlugin(pluginId)`
- 按钮数量：`editor.actionButtons.listByPlugin(pluginId)`

未启用插件会回退到 `plugin.contributes` 展示贡献预览。

`disablePlugin()` 会拒绝禁用 `manifest.required` 插件。

### `PluginMarketDrawer.vue`

负责市场 UI：

- 展示插件列表。
- 搜索插件名称、id、描述、分类和 capabilities。
- 展示启用状态、内置标记、必需标记、版本、分类、能力、贡献摘要。
- 支持即时启用/禁用非必需插件。
- 必需插件开关禁用。
- 展示工具、命令、菜单、按钮贡献数量。
- 展示工具、命令、菜单、按钮标签预览。

## 当前启停策略

### 可即时启停

当前支持即时启停的插件：

- 工具插件
- 图形插件
- 命令插件
- 菜单插件
- action button 插件
- 画布辅助插件

原因：

- `ToolRegistry` 支持 `unregisterByPlugin(pluginId)`。
- `CommandRegistry` 支持 `unregisterByPlugin(pluginId)`。
- `MenuRegistry` 支持 `unregisterByPlugin(pluginId)`。
- `ActionButtonRegistry` 支持 `unregisterByPlugin(pluginId)`。
- `PluginManager.deactivate(pluginId)` 会自动清理工具、命令、菜单和按钮贡献。
- 标尺、点阵和吸附插件已接入第三方运行时的释放 API：
  - `Ruler.dispose()`
  - `DotMatrix.destroy()`
  - `Snap.destroy()`

### 不可禁用

必需插件不可禁用。当前 `leafer-flow.builtin-core` 属于必需插件，负责注册默认命令、右键菜单和顶部操作按钮。

### 后续注意

新增 canvas overlay 插件时必须实现可靠的 `deactivate(ctx)`。如果第三方运行时没有释放 API，应在市场 UI 中标记为“需刷新后生效”，避免出现显示状态和画布实际状态不一致。

## 已完成阶段

### 阶段 1：当前最小闭环

已完成目标：

- Drawer 市场入口。
- 内置插件列表。
- 工具/图形/画布辅助插件启停。
- 启停后刷新工具栏和图形库。
- 插件贡献归属 `pluginId`。
- 插件贡献详情预览。

### 阶段 2：插件贡献详情

已完成目标：

- `toolRegistry.listByPlugin(pluginId)`。
- `commands.listByPlugin(pluginId)`。
- `menus.listByPlugin(pluginId)`。
- `actionButtons.listByPlugin(pluginId)`。
- 市场中展示贡献的工具、命令、菜单、按钮数量。
- 市场中展示贡献标签预览。
- 未启用插件通过 `plugin.contributes` 展示预览。

### 阶段 3：必需插件保护

已完成目标：

- `EditorPluginManifest.required`。
- `getEnabledPluginIds()` 强制合并必需插件。
- `saveEnabledPluginIds()` 强制保留必需插件。
- `disablePlugin()` 拒绝禁用必需插件。
- 市场 UI 展示“必需”标记。
- 必需插件开关禁用。

## 推荐后续演进

### 阶段 4：插件配置

为插件协议增加配置入口，例如：

```ts
configure?(ctx: PluginContext): PluginConfigSchema | VueComponent
```

市场中提供：

- 插件配置按钮。
- 插件私有 storage 配置。
- 重置插件配置。

可优先用于承接当前仍在宿主 UI 中的“绘制设置”面板。

### 阶段 5：插件源抽象

拆分市场数据源：

```txt
src/editor/plugins/market/sources/
  builtin-source.ts
  remote-source.ts
  local-dev-source.ts
```

支持：

- 内置插件。
- 远程插件索引。
- 本地开发插件。

### 阶段 6：新路由市场

当出现以下需求时，再升级到新路由：

- 插件数量明显增多。
- 需要插件详情页。
- 需要远程安装、更新、卸载。
- 需要评分、版本历史、依赖关系。
- 需要开发者发布入口。

可能路由：

```txt
/editor
/plugins
/plugins/:pluginId
/settings/plugins
```

## 当前约束

- 市场启停插件后，应刷新所有由 registry 派生的 UI 数据。
- 禁用当前正在使用的工具插件时，应把 active tool 重置为 `select`。
- 不要让 Vue 组件直接依赖内置插件数组，统一经过 market service。
- 必需插件只能展示状态，不允许关闭。
- 远程插件启用前必须考虑权限、沙箱、签名和安全边界。
