# Leafer Flow

基于 Vue 3、Vite、TypeScript 和 LeaferJS 的流程图 / 图形编辑器练手项目。当前架构以 **核心画布运行时 + 插件宿主 + 注册表驱动 UI + 插件市场** 为主，目标是提供一个可直接使用的轻量绘图工作台。

## 功能概览

- 画布编辑：选择、拖拽、缩放、适配视图、居中、视图复位、撤销、重做。
- 基础图形：矩形、圆形 / 椭圆、菱形、三角形、五边形、六边形、平行四边形、星形、便签、圆柱、文本、自由绘制、箭头连接线。
- 流程图节点：开始/结束、处理、判断、输入/输出、文档、数据库、子流程、连接点、泳道等。
- BPMN 节点：开始事件、中间事件、结束事件、网关、任务、数据对象、数据存储。
- 架构图节点：Actor、Use Case、Component、Package、Node、Queue、Cache、Cloud、Service、Device。
- 连接线增强：直线、折线、贝塞尔路径，支持连接线标签和标签位置同步。
- 连线中心：独立面板集中管理连线工具、样式、动画与常用编辑操作。
- 连线动画：支持流动动画开关、速度、作用范围（全局/仅选中）、方向（正向/反向）。
- 选择能力：单选、多选、框选、全选、删除、键盘微移。
- 排版能力：对齐、分布、层级前移 / 后移 / 置顶 / 置底。
- 元素管理：剪切、复制、粘贴、原位复制、编组、取消编组、锁定、解锁、显示 / 隐藏。
- 文件能力：保存/加载包含资源的 `.leafer` 文件包、自动恢复、导出 PNG/SVG/PDF。
- 画布搜索：按文字内容搜索元素并定位选中。
- 媒体插入：图片保留原图并生成降采样预览，视频提取封面，独立音频支持播放、进度、音量、静音和循环。
- 模板能力：业务流程、BPMN、系统架构、泳道协作等图形模板。
- 模板策略：模板插入可自动应用连线策略（支持模板显式配置与 routeType 推断）。
- 绘制体验：画布标尺、智能吸附、点阵背景、自由绘制平滑度、事件日志、右键菜单和状态栏。
- 高级辅助：自动布局（选区/全图 + TB/LR/BT/RL）、规范检查 Pro、缩略图导航。
- 插件市场：支持内置插件列表、启用 / 禁用非必需插件、查看插件贡献摘要。
- **AI 助手**：通过自然语言编辑流程图，支持主流厂商预设、Claude 原生协议、工作流 skill 和交互式问题选择。

## 快速开始

```sh
pnpm install
pnpm run dev
```

生产构建：

```sh
pnpm run build
```

## 常用快捷键

- `V`：选择工具
- `A`：箭头 / 连接线工具
- `T`：文本工具
- `R`：矩形
- `C`：圆形
- `D`：菱形
- `U`：三角形
- `X`：六边形
- `G`：平行四边形
- `Y`：星形
- `N`：便签
- `O`：圆柱
- `P`：自由绘制
- `1` 到 `9`：常用流程图节点
- `Ctrl+Z`：撤销
- `Ctrl+Shift+Z`：重做
- `Ctrl+C` / `Ctrl+X` / `Ctrl+V`：复制 / 剪切 / 粘贴
- `Ctrl+D`：原位复制（复制并粘贴到偏移位置）
- `Ctrl+F`：画布搜索
- `Ctrl+G` / `Ctrl+Shift+G`：编组 / 取消编组
- `Delete`：删除选中元素
- `Arrow`：微移选中元素
- `Shift+Arrow`：快速微移选中元素
- `Ctrl+Shift+A`：打开 / 关闭 AI 助手

## 媒体与文件

通过顶部“媒体”菜单插入图片、视频或音频。图片最多 32M 像素，画布预览最大边 2048px；普通资源单文件上限 20 MiB，视频 80 MiB，文档资源合计 100 MiB。视频能否播放取决于浏览器支持的编解码器，不做在线转码。

保存格式为 `.leafer` ZIP 文件包，包含文档清单和原始资源。旧版内嵌 Base64 的 JSON 文档不再支持。自动保存只记录清单，二进制留在当前浏览器的 OPFS/IndexedDB；清除站点数据会删除本地资源，跨设备请使用文件包。PNG/SVG/PDF 是静态导出，不携带音视频播放能力。

## AI 助手

AI 助手是一个内置插件，允许通过自然语言指令操作编辑器。

### 配置

1. 点击顶部工具栏的 AI 助手图标，或按 `Ctrl+Shift+A` 打开面板
2. 点击设置按钮，配置 API 信息：

- **模型厂商**：选择预设或自定义 OpenAI 兼容服务；切换厂商会清空旧密钥
- **API URL**：预设填入默认地址，可修改为对应区域或代理地址
- **API Key**：对应厂商的密钥；本地 Ollama 可留空
- **模型 ID**：填写账号实际可用、支持工具调用的模型；豆包可填写推理接入点 ID

3. 点击"测试工具调用"，验证端点能返回符合参数 Schema 的结构化调用（不会修改画布）
4. 保存设置后发送指令

预设包括 OpenAI、DeepSeek、通义千问、豆包、GLM、Kimi、Gemini、Claude、Ollama 和自定义服务。Claude 使用原生 Messages API，其余使用 Chat Completions 协议（Gemini 使用官方 OpenAI 兼容入口）。这些是配置预设与协议实现，不代表所有区域、模型和代理均已真实联调；Claude 使用服务端默认采样配置，不发送温度参数。

OpenAI 兼容不代表支持 Function Calling。模型和代理需支持并透传 `tools` / `tool_choice`；仅能聊天的端点无法操作画布。模型文字中的“执行成功”不是执行凭证，请以“编辑器执行结果”为准。未返回工具调用或调用失败时，面板会显式告警。配置结构已新增厂商字段，旧配置需重新选择厂商并保存。

请求从浏览器直接发出，端点须允许跨域访问；密钥保存在当前浏览器本地，勿在共享设备配置生产密钥。Claude 直接访问使用其浏览器访问标头；生产部署建议通过受控代理转发。

复杂流程优先使用模板；重复节点优先批量创建，工具会按节点尺寸保留间距。连线按节点相对位置选择端口，节点重叠时会拒绝连接并提示调整。工具调用探测通过不代表模型具备可靠的复杂参数和空间布局能力，也不保证连线能避开所有其他节点。

### Skill 与问题选择

- Agent 可用 `list_skills` / `get_skill` 读取流程创建、目标编辑、布局检查和安全修改工作流，用 `list_tools` / `get_tool_details` 查询真实工具及参数。
- 关键需求不明确时，`ask_user` 提供 2-6 个选项，支持单选、多选及补充文字；确认后将答案作为工具结果回传模型。
- 等待回答期间不会保持画布事务；取消任务会中止后续执行。提问和修改混在同一批时，整批拒绝执行。
- 不要通过聊天或问题选项填写 API Key、密码、令牌等秘密信息。

### 支持的指令

| 类别     | 示例指令                             |
| -------- | ------------------------------------ |
| 创建图形 | "画一个矩形"、"创建开始节点"         |
| 编辑操作 | "删除选中的"、"复制这些元素"、"撤销" |
| 布局调整 | "左对齐"、"水平分布"、"编组"         |
| 样式修改 | "改成红色"、"边框加粗"               |
| 模板插入 | "插入审批流程"、"创建 BPMN 图"       |
| 文件操作 | "保存"、"导出 PNG"                   |
| 视图控制 | "放大"、"适应画布"                   |

### 上下文管理

- 默认保留最近 20 条消息（可在设置中调整）
- 历史消息自动持久化，关闭重开面板不会丢失
- 当消息过多时，可点击"压缩历史"让 AI 生成对话摘要

## 本地 MCP

MCP 允许 VS Code 等外部 AI 客户端操作当前浏览器中的编辑器，不需要配置应用内聊天 API。第一版使用官方 MCP SDK 的 stdio 协议和本机 WebSocket 桥接。

1. 安装依赖并构建服务：

```sh
pnpm install
pnpm mcp:build
```

2. 在 VS Code 的 MCP 服务管理中启动仓库提供的 `.vscode/mcp.json` 中的 `leafer-flow` 服务，并确认工作区信任。其他客户端可用 `node` 启动 `packages/mcp/dist/index.js` 的绝对路径；不要通过会向标准输出打印日志的包装脚本启动 stdio 服务。
3. 打开编辑器的 AI 助手，点击标题栏的“MCP 连接”锁形按钮。填写本机端口（默认 `4318`）和用户目录 `.leafer-flow/mcp-token` 文件中的令牌，点击“授权并连接”。令牌由服务首次启动时生成，不会打印到日志，不要发到聊天中。
4. 默认仅开放查询。需要创建或修改时，在连接前勾选“允许修改当前文档”；改变授权范围需要断开后重新连接。客户端先调用 `list_sessions`，再用返回的 `session_id` 调用工具。

工具目录从浏览器真实工具定义派生，只开放画布/选区查询、搜索、创建/批量创建、文字和样式修改、连接节点。文字和样式修改必须显式指定文档 `ids`。每次修改沿用编辑器历史，可在编辑器撤销。资源目录提供已授权会话的当前文档和选区 JSON，不传输媒体二进制。

连接只绑定当前文档，切换文档、插件卸载或手动断开都会撤销。断线、超时和取消不保证回滚已完成操作；遇到“结果未知”先查询文档，不要盲目重试修改。连接后返回聊天不会断开授权。

服务只监听 `127.0.0.1`，校验 Host、浏览器 Origin 和令牌。浏览器不持久化令牌。默认只允许 `http://127.0.0.1:5175`、`http://localhost:5175` 及同主机的 `5173` 端口；其他部署需在 MCP 服务环境配置中设置精确 Origin。不要将桥接端口暴露到公网。

| 环境变量                     | 用途                                                    |
| ---------------------------- | ------------------------------------------------------- |
| `LEAFER_FLOW_MCP_PORT`       | 桥接端口，默认 `4318`                                   |
| `LEAFER_FLOW_MCP_ORIGINS`    | 逗号分隔的精确 HTTP(S) Origin，不含路径和通配符         |
| `LEAFER_FLOW_MCP_TOKEN_FILE` | 本机令牌文件路径，默认用户目录 `.leafer-flow/mcp-token` |

同一端口只能运行一个桥接实例。使用自定义端口时须同步修改浏览器连接端口；HTTPS 页面连接本机 WebSocket 是否允许还取决于浏览器策略。本版不开放删除、清空、文件读写、任意脚本、MCP 用户提问或工作流提示。

## 使用建议

1. 先用流程图节点搭出主流程，再用箭头连接节点。
2. 需要说明连接关系时，选中连接线后可添加连接线标签。
3. 对多元素进行框选后，可使用对齐、分布和编组整理结构。
4. 复杂图建议定期保存，也可以依赖本地自动恢复作为补充。
5. 交付或分享时优先导出 SVG；用于截图或文档粘贴时使用 PNG。

## 架构概览

仓库采用 pnpm workspace，代码包直接导出 TypeScript / Vue 源码，由 Web 应用统一构建，当前均为私有包，无需发布或执行 `npm link`。

```text
apps/web/                       # 应用入口、路由、页面、市场策略、Vite 配置
packages/core/                  # Editor、actions、注册表、历史、序列化、绘图基础能力
packages/ui/                    # 通用组件、属性面板、composables、宿主上下文
packages/builtin-plugins/        # 内置插件、工具贡献、模板、插件专属界面
packages/mcp/                    # 本机 MCP stdio 服务、桥接协议与专项测试
scripts/check-boundaries.mjs     # 包边界与依赖检查
```

依赖方向为 `web -> builtin-plugins -> ui -> core`；应用和插件也可直接依赖引擎。引擎没有 Vue 运行时导入，但面板插件协议暂时保留 Vue `Component` 类型，尚不是完全与框架无关的 SDK。

根目录常用命令：

```sh
pnpm dev
pnpm build
pnpm check:boundaries
pnpm lint
pnpm typecheck
```

产物位于 `apps/web/dist`。`pnpm lint` 只检查代码；需要自动修复时执行 `pnpm lint:fix`。部署前执行包边界、lint 和完整类型检查。

新增插件、工具和跨包接口的操作说明见 [monorepo 开发指南](docs/monorepo.md)。

当前编辑器采用插件化结构：

- `Editor` 负责 Leafer 运行时生命周期，并协调 history、autosave、资源和文档渲染。
- `DocumentStore` 保存版本化文档模型；Leafer 适配器负责文档投影与交互回读，`DocumentCommands` 提供统一的文档编辑入口。
- `PluginManager` 负责插件激活 / 停用。
- `ToolRegistry`、`NodeTypeRegistry`、`CommandRegistry`、`MenuRegistry`、`ActionButtonRegistry`、`ViewControlRegistry`、`OverlayPanelRegistry`、`PropertyPanelRegistry` 负责收集插件贡献。
- 工具栏、图形库、右键菜单、顶部按钮和视图控件优先从 registry 派生。
- 插件市场当前管理内置插件源，可即时启用 / 禁用非必需插件。

## 文档入口

- [开发指南](docs/monorepo.md)：包职责、依赖管理、插件开发、源码索引与验收要点。
- [更新记录](CHANGELOG.md)：功能变更历史。

## 内置插件

| 插件                  | 说明                                 |
| --------------------- | ------------------------------------ |
| `builtin-core`        | 核心命令、右键菜单、属性面板（必需） |
| `canvas-ruler`        | 画布标尺                             |
| `canvas-snap`         | 智能吸附                             |
| `canvas-dot-matrix`   | 点阵背景                             |
| `drawing-settings`    | 绘制设置面板                         |
| `view-controls`       | 视图控件                             |
| `file-actions`        | 文件操作                             |
| `export-actions`      | 导出操作                             |
| `templates`           | 模板注册与管理服务                   |
| `template-actions`    | 模板插入                             |
| `connector-animation` | 连线流动动画                         |
| `basic-tools`         | 基础绘制工具                         |
| `flow-shapes`         | 流程图节点                           |
| `bpmn-shapes`         | BPMN 节点                            |
| `architecture-shapes` | 架构图节点                           |
| `task-node`           | 任务节点与属性面板                   |
| `agent`               | AI 助手                              |
| `auto-layout`         | 自动布局（选区/全图）                |
| `diagram-lint`        | 规范检查与自动修复                   |
| `minimap`             | 缩略图导航                           |
| `multi-layer`         | 多层画布（默认关闭）                 |
| `custom-data-panel`   | 自定义数据属性面板（默认关闭）       |

## 数据与保存

手动保存的 JSON 文件和自动恢复数据使用相同的 Leafer Flow 文档快照结构。当前文档版本为 5，节点、连线、资源和设置分别保存在 `nodes`、`edges`、`assets` 和 `settings` 中：

```json
{
  "schema": "leafer-flow.document",
  "version": 5,
  "id": "document-id",
  "nodes": [],
  "edges": [],
  "assets": {},
  "settings": {
    "connectorRouteType": "orthogonal",
    "connectorFlowAnimation": {
      "enabled": false,
      "speed": 1,
      "scope": "all",
      "direction": "forward"
    }
  }
}
```

`settings` 保存连线策略等文档级配置。自动恢复会将快照写入 localStorage；数据较大时使用 IndexedDB。手动保存会下载同结构的 JSON 文件。

## 技术栈

- Vue 3
- Vite
- TypeScript
- LeaferJS
- Tailwind CSS / DaisyUI

## 后续重点

- 补充文档文件导入、导出与自动恢复的端到端验收，重点覆盖资源、连接线标签和自定义数据。
- 完善插件配置 UI，支持更多插件的配置入口。
- 扩展插件源：远程插件源与本地开发插件源。
- 扩展高级能力：导入 Draw.io / Visio、多人协作与评论能力。
