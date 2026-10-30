# Monorepo 开发指南

## 目录与职责

| 目录                                            | 职责                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `apps/web/src/editor/index.ts`                  | 创建编辑器、装配插件和宿主面板                              |
| `apps/web/src/editor/builtin-plugins.ts`        | 内置插件实例与应用权限策略注入                              |
| `apps/web/src/editor/plugins/market/`           | 插件启用状态、购买权限和市场服务                            |
| `packages/core/src/`                            | 编辑器运行时、基础绘图实现、actions、registry、数据保存恢复 |
| `packages/ui/src/`                              | 通用组件、面板、composables、命令和可见性上下文             |
| `packages/builtin-plugins/src/builtin/plugins/` | 内置功能插件、命令和工具注册                                |
| `packages/builtin-plugins/src/templates/`       | 模板定义及插入逻辑                                          |

`core` 不允许导入 Vue 运行时或界面组件。现有面板协议仍使用 Vue `Component` 类型，后续有非 Vue 宿主需求时再抽离协议适配层。

## 日常开发

```sh
pnpm install
pnpm dev
pnpm build
pnpm check:boundaries
pnpm lint
pnpm typecheck
pnpm --filter @leafer-flow/ui typecheck
pnpm --filter @leafer-flow/builtin-plugins add some-library
```

内部依赖使用 `workspace:*`；本地源码由 Vite 直接消费，不需要逐包构建。当前包均为私有包，没有 npm 发布流程。生产产物为 `apps/web/dist`，根目录命令与迁移前保持一致。

`pnpm lint` 是只读检查，自动修复单独使用 `pnpm lint:fix`；不再用 lint 命令冒充格式化工具。部署流程在构建前运行包边界、lint 和完整类型检查。

## pnpm 配置约定

- Vue、Leafer 等跨包共享依赖在根目录 `pnpm-workspace.yaml` 的 `catalog` 中维护版本，各包通过 `catalog:` 引用。升级共享依赖时修改 catalog，再执行 `pnpm install`。
- `catalogMode: prefer` 让新增依赖优先使用匹配的 catalog 版本，未匹配的依赖仍可单独声明；`catalogPrune` 自动移除未使用的目录项。
- `verifyDepsBeforeRun: error` 禁止运行脚本时自动安装依赖。拉取清单或锁文件变更后，先执行 `pnpm install`。
- `disallowWorkspaceCycles` 在安装阶段拒绝 workspace 依赖环；`failIfNoMatch` 让拼错包名的 `--filter` 命令直接失败。
- `hoist: false` 保持严格依赖布局。第三方 Leafer 包在运行时入口和公开类型声明中遗漏的依赖由精确版本的 `packageExtensions` 补齐；升级相关包时应同时核对这两类入口。
- 依赖安装脚本使用 `allowBuilds` 逐包审批，目前仅允许 less；不要恢复已移除的 `onlyBuiltDependencies`。
- `minimumReleaseAgeExcludePrune` 自动清理不再出现在锁文件中的发布冷却例外，仍保留当前使用的精确版本例外。本次未额外启用严格 Node 或发布冷却策略。

## 依赖兼容性

2026-10-26 已将有新版的 Vue、Vue Router、Vite、Tailwind、DaisyUI、Marked、Less 和相关开发工具升级至查询时的最新稳定版。其余直接依赖已是最新稳定版，内部包继续使用 `workspace:*`。

TypeScript 暂留 6.x 最新版 6.0.3：最新 `vue-tsc 3.3.13` 仍依赖 TypeScript 旧编译器 API，与 TypeScript 7.0.2 不兼容；仓库包边界脚本也使用该 API。后续升级 TypeScript 7 时应同时验证 Vue 类型工具和 `pnpm check:boundaries`，不能只以生产构建成功作为兼容依据。

## 新增插件或工具

1. 在内置插件目录新增功能文件夹，使用引擎导出的插件、工具或命令协议。
2. 在 `activate(ctx)` 中向 registry 注册贡献。工具栏、图形库和面板继续从 registry 派生。
3. 在 `packages/builtin-plugins/src/builtin/plugins/index.ts` 的工厂清单中加入插件。
4. 插件专属 Vue 面板放在该插件目录；通用面板基础设施从 `ui` 复用。
5. 修改画布数据时沿用统一 mutation 提交机制，验证撤销、保存与恢复等受影响行为。

节点扩展的完整参考实现见 [task-node 插件](../packages/builtin-plugins/src/builtin/plugins/task-node/index.ts)：它展示节点校验与渲染、命令、属性字段、`DocumentCommands` 写入，以及通过 `ctx.onDispose` 释放注册。新增节点优先沿用该模式，不在插件中直接修改 Leafer 树或文档事务。

基础绘图实现目前保留在引擎的 `tools/`；具体工具贡献和启用策略归插件包。单个功能不需要单独创建 workspace 包，独立发布或复用时再拆。

### AI Agent

内置 Agent 位于 `packages/builtin-plugins/src/builtin/plugins/agent/`：`agent-tools.ts` 是工具名称、分类、Schema 与执行逻辑的唯一来源；`agent-client.ts` 负责 HTTP、SSE、超时和取消；`agent-service.ts` 编排对话及工具调用；`useAgentChat.ts` 管理界面状态和持久化。Vue 面板只负责布局与交互。

连接工具只接受文档 ID，查询不暴露内部渲染子元素。工具失败统一抛错，由服务转为结构化结果。协议历史是唯一存储来源，显示消息从它派生，不维护旧格式迁移。每个工具独立记录撤销，事务不得跨模型请求。修改后优先运行 `node --test --test-name-pattern="agent " scripts/runtime.test.mjs` 和插件包类型检查。

## 宿主策略与界面

应用通过 `createBuiltinPlugins({ canUseTemplateAction })` 注入模板使用权限；插件不导入市场服务。不传策略的宿主默认允许模板使用。Web 应用显式传入原有购买策略。

默认属性面板和宿主浮层由应用调用 `registerDefaultPropertyPanels`、`registerHostOverlayPanels` 注册。市场浮层组件作为参数传入，通用界面包不依赖应用页面。

字段面板注册只保存字段描述；`PropertyPanelHost` 在没有自定义组件时使用 `SchemaPropertyPanel` 渲染。

## 跨包接口

- 包内使用相对导入，跨包使用 `@leafer-flow/*` 名称。
- 禁止 `../../另一个包`、`@leafer-flow/某包/src/...` 和包反向导入应用。
- 使用稳定的语义入口，不依赖其他包的内部组件文件名或目录层级。
- 仅在确有跨包消费者时添加新模块导出，普通内部模块无需增加 `exports`。
- 引擎协议只传递图标名称，内置图标数据与渲染留在 `ui`。
- Tailwind 在 Web 样式入口显式扫描整个 `packages`，新增组件使用现有样式约定即可。

`pnpm check:boundaries` 会检查重复包名、导出目标、本地导入目标（包括 Web 的 `@/` 别名）、未声明依赖、相对导入越界、私有模块导入、包依赖环、引擎的 Vue 运行时导入，以及 core 外绕过 `DocumentCommands`、Editor 手势提交或 Leafer 适配器直接写入。迁移文件后删除无人使用的旧实现，不保留不完整的旧 workspace 或失效副本。

## Vue UI 公共入口

| 入口                          | 职责                                     |
| ----------------------------- | ---------------------------------------- |
| `@leafer-flow/ui`             | 常用 UI 组件、默认属性面板与宿主浮层装配 |
| `@leafer-flow/ui/components`  | 对外通用组件的命名导出                   |
| `@leafer-flow/ui/composables` | 对外交互与状态组合函数                   |
| `@leafer-flow/ui/context`     | 命令、面板可见性及注入上下文             |
| `@leafer-flow/ui/icons`       | 图标数据与内置名称类型                   |

```ts
import { EditorPanel, LayerPanel, ViewControls } from "@leafer-flow/ui";
import { usePanelDock } from "@leafer-flow/ui/composables";
```

属性表单、图层条目和宿主浮层实现属于包内细节，不再逐文件暴露。宿主浮层继续从装配模块按需加载，不纳入公共组件聚合入口。

通用 UI 不依赖应用路由：`EditorActionBar` 发出 `openPluginMarket` / `openTemplateMarket` 事件，Web 页面决定执行面板命令还是跳转市场页面。页面组件只组合 UI、状态和应用策略；内部模块直接从 `lib` 导入，页面出口只导出页面视图，避免循环引用。

## 源码索引

协议、工具参数和模板结构以代码为准，不再维护重复的静态 API 清单。

| 内容                 | 入口                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| 插件协议             | [plugin.ts](../packages/core/src/api/plugin.ts)                                                                |
| 插件生命周期         | [plugin-manager.ts](../packages/core/src/core/plugin-manager.ts)                                               |
| 内置插件清单         | [plugins/index.ts](../packages/builtin-plugins/src/builtin/plugins/index.ts)                                   |
| 插件市场与启停       | [plugin-market-service.ts](../apps/web/src/editor/plugins/market/plugin-market-service.ts)                     |
| Agent 工具定义与自省 | [agent-tools.ts](../packages/builtin-plugins/src/builtin/plugins/agent/agent-tools.ts)                         |
| 模板查询             | [registry.ts](../packages/builtin-plugins/src/builtin/templates/registry.ts)                                   |
| 模板定义             | [defs.ts](../packages/builtin-plugins/src/templates/defs.ts)                                                   |
| 文档模型与校验       | [model.ts](../packages/core/src/document/model.ts)                                                             |
| 图标定义与渲染       | [icons/index.ts](../packages/ui/src/assets/icons/index.ts)、[Icon.vue](../packages/ui/src/components/Icon.vue) |

## 高风险改动验收

资源使用 v6 元数据契约：`DocumentAsset` 只保存内容 ID、MIME 和字节数，原始文件由 `BinaryAssetStore` 持久化，`ResourceService` 维护运行时 Blob URL。自动恢复先预热资源，再同步投影；关闭编辑器释放 URL，不删除已持久化文件。撤销栈和剪贴板保护资源，显式清理不得移除它们引用的字节。

`.leafer` 为 ZIP 容器，`document.json` 必须位于首项，资源存于 `assets/<content-id>`。导入校验清单大小、资源总量、重复项、文件大小及内容哈希，只接受本程序写出的无压缩资源条目。PNG/SVG/PDF 仍为静态导出。媒体使用 `MediaController` 管理进度、错误和生命周期，不向文档写回播放时间。

涉及连接线、序列化、剪贴板或历史时，按受影响范围验证以下流程，不以构建成功代替行为验证：

- 新建连接线并添加标签，移动节点及拖动标签后位置保持正确。
- 复制、粘贴带标签连接线，确认节点绑定、标签关联和元素标识未串到原对象。
- 编组、取消编组及撤销、重做后，元素位置和图层结构正确。
- 保存、重新加载与自动恢复后，连接线绑定、标签偏移、自定义数据和文档设置保持。
- 插入模板后，布局与连线策略生效，且能撤销、保存与恢复。

## 验证状态

迁移遗留的旧 workspace、重复面板和注册代码已清理。原有 21 个类型诊断已修复，包边界、lint 错误检查和完整类型检查纳入部署门禁。Lint 中的既有警告不阻止部署；涉及连接线、保存恢复或历史的改动仍需按上面的流程验证行为，不能仅依赖静态检查。

仓库文档分工：根目录 README 说明使用方式，本指南说明开发与维护，CHANGELOG 保存变更历史。阶段报告、重复的功能快照和过时 API 清单不再单独维护，历史内容可从 Git 查看。
