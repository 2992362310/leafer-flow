# Leafer Flow 重构清单

## 1. 项目 skill 结论

当前仓库内的自定义 skill 只有一个：`.agents/skills/leafer-ai/SKILL.md`。

它的定位不是仓库专属工作流，而是一个通用的 LeaferJS 场景知识包，核心特点如下：

- 面向 LeaferJS / Leafer AI / 无限画布 / 图形编辑器场景。
- 优先使用官方 `ai-docs` 中的示例、指南和参考资料。
- 倾向输出最小可运行示例，避免过度抽象。
- 在具备 MCP 图形工具时，优先走工具调用而不是直接生成大段代码。

这意味着当前项目的“skill 能力”主要解决的是 Leafer 技术选型和画布代码生成问题，并没有沉淀出这个仓库自己的工程约束，例如：

- 工具定义如何组织
- action 如何统一提交历史记录
- UI 与 editor core 如何解耦
- 哪些链路必须优先回归验证

后续重构应优先把这些“仓库内知识”沉淀成结构，而不是继续堆功能点。

## 2. 重构目标

本轮重构建议先解决 4 个问题：

1. 降低新增图形/工具时的修改面。
2. 降低 UI 组件直接操作编辑器内核的耦合度。
3. 给高风险编辑链路补上最小测试切口。
4. 统一历史记录、自动保存、序列化这些跨模块副作用。

## 3. P0 清单

### 3.1 工具元数据单一化

现状：工具名称、注册逻辑、图形库展示信息分散在多个位置。

- `src/editor/constants.ts`
- `src/editor/index.ts`
- `src/editor/shape-library.ts`

问题：新增一个图形往往要同时修改常量、注册逻辑、面板展示配置，容易漏改。

重构项：

- [ ] 建立统一的 tool schema，例如 `tool-definitions.ts`。
- [ ] 把 `label`、`icon`、`keywords`、`默认尺寸`、`注册参数` 放在同一份定义中。
- [ ] `index.ts` 只负责按 schema 批量注册。
- [ ] `shape-library.ts` 改为从 schema 派生，避免重复维护。

验收标准：新增一个流程图节点时，只需要改一处主配置。

### 3.2 工具注册流程去重复

现状：`src/editor/index.ts` 里有 `registerBasicTools`、`registerFlowTools`、`registerBpmnTools`、`registerArchitectureTools`，大量重复 `editor.register(...)`。

问题：代码可读性还可以，但扩展性差，注册规则和工具分类绑定过死。

重构项：

- [ ] 改为“分类配置 + 通用注册器”模式。
- [ ] 把 `DrawFlowNode` 的重复实例化参数收敛到工厂函数。
- [ ] 明确哪些工具是 `DrawFlowNode`，哪些工具是独立 tool class。

验收标准：`src/editor/index.ts` 变成初始化入口，而不是图形清单本体。

### 3.3 建立 action 执行边界

现状：Vue 组件直接 import 并调用 `doCopy`、`doDelete`、`doGroup` 等 action，典型位置：

- `src/components/ContextMenu.vue`
- `src/components/EditorPanel.vue`

问题：UI 层知道太多 editor 细节，后续要改 action 返回值、埋点、权限或异步行为时，影响面会扩散到组件层。

重构项：

- [ ] 引入 command dispatcher，例如 `executeEditorAction(editor, actionName, payload)`。
- [ ] UI 层只发动作名和参数，不直接拼业务逻辑。
- [ ] 统一 action 结果结构和错误处理。
- [ ] 为异步 action 和同步 action 建立一致调用方式。

验收标准：组件层不再直接依赖一组分散的 `do-*.ts` 实现细节。

### 3.4 补最小自动化测试切口

现状：仓库里没有检测到测试文件，当前属于纯手工回归。

问题：连接线、编组、剪贴板、保存加载等链路一旦调整，几乎没有低成本防回归手段。

重构项：

- [ ] 先不追求完整 UI 测试，先补 action/core 层测试。
- [ ] 优先覆盖 `do-group`、`do-ungroup`、`do-clipboard`、`do-file`、`connector-labels`。
- [ ] 为 editor app 创建最小 mock 或测试适配层。
- [ ] 在文档中明确“哪些链路必须自动测，哪些链路维持手测”。

验收标准：至少有一组可在 CI 跑通的核心编辑链路测试。

## 4. P1 清单

### 4.1 收敛 Editor 核心副作用

现状：`src/editor/editor.ts` 同时负责 app 初始化、plugin 挂载、tool 管理、history 监听、autosave 启动、连接线标签同步。

问题：生命周期和副作用耦合在一个类里，后续定位“谁在保存历史、谁在同步标签、谁在触发 autosave”不够直接。

重构项：

- [ ] 拆出 editor lifecycle 模块。
- [ ] 把 `history + autosave + connector label sync` 这类副作用整理成 mutation pipeline。
- [ ] 明确“用户交互结束后提交”和“程序性变更提交”的统一入口。

验收标准：所有持久化相关副作用都能从单一提交流程追踪。

### 4.2 属性面板状态收敛

现状：`src/components/EditorPanel.vue` 里维护了大量独立 ref 和事件同步逻辑。

问题：选择态、连接线态、文本态、组合图形态混在一个组件里，后续增加属性会继续膨胀。

重构项：

- [ ] 抽出 `useSelectionInspector` 或类似 composable。
- [ ] 拆分几类属性分组：几何、外观、文本、连接线。
- [ ] 统一选中元素解析逻辑，避免组件里散落 `instanceof` 和 group children 推导。

验收标准：属性读取、属性写入、视图渲染三层职责分开。

### 4.3 编组/选择判断逻辑复用

现状：是否选中 group、是否可取消编组、是否存在连接线等判断散落在 action 和组件里。

问题：同一业务规则多处实现，容易出现 UI 可点但 action 不可执行，或者反过来。

重构项：

- [ ] 抽出 selection predicates，例如 `canGroup`、`canUnGroup`、`hasConnectorSelection`。
- [ ] 组件层和 action 层共用这些谓词。
- [ ] 把 `smartGroupSelection()` 相关判定规则文档化。

验收标准：同一条可操作性规则只有一个实现来源。

### 4.4 文件与序列化链路分层

现状：保存、加载、自动恢复、连接线自定义数据、标签偏移等逻辑分散在 action 和 core 中。

问题：数据结构演进时，容易出现“保存能写、加载没还原”或者“画布状态恢复不完整”。

重构项：

- [ ] 统一定义序列化 schema 和版本号。
- [ ] 把导出文件与本地自动恢复的结构区分清楚。
- [ ] 为 connector label、custom data、group 结构写最小 round-trip 校验。

验收标准：同一份数据结构有明确入口、版本和回归样例。

## 5. P2 清单

### 5.1 文档收敛

现状：仓库内 docs 数量较多，部分分析文档与当前代码状态已经偏离。

重构项：

- [ ] 保留 1 份“当前架构事实文档”。
- [ ] 保留 1 份“高风险链路验收清单”。
- [ ] 将过时分析文档标记为 archived，避免误导。

验收标准：新同学进入项目时，不需要在多份历史文档里交叉比对事实。

### 5.2 命名和目录职责再整理

现状：`core`、`action`、`utils`、`tools` 的边界基本可用，但部分模块职责已经出现交叉。

重构项：

- [ ] `action` 只保留用户可触发命令。
- [ ] `core` 只保留编辑器内部机制和数据同步。
- [ ] `utils` 只保留纯函数。
- [ ] 对存在副作用的 `utils` 或跨层访问模块做回收。

验收标准：仅通过目录名即可大致判断模块是否允许副作用。

### 5.3 仓库专属 skill / 规范沉淀

现状：现有 skill 偏 Leafer 通识，不包含本仓库工程约束。

重构项：

- [ ] 新增仓库级 skill 或维护文档，明确工具注册模式、action 设计原则、history 提交方式。
- [ ] 记录常见高风险模块与验证命令。
- [ ] 给后续 AI 协作提供仓库内约束，而不是只提供 Leafer 知识。

验收标准：后续无论是人还是 AI 进入仓库，都能快速知道“应该按什么方式改”。

## 6. 建议执行顺序

建议按下面顺序推进：

1. 工具元数据单一化
2. 工具注册流程去重复
3. action 执行边界
4. 最小自动化测试切口
5. Editor 核心副作用收敛
6. 属性面板状态收敛
7. 序列化与文档收敛

原因：前 4 项会先建立“可持续改”的骨架，后 3 项再逐步把高耦合和高风险模块拆开。

## 7. 首轮重构完成标准

如果要定义“第一轮重构已完成”，建议至少满足以下条件：

- [ ] 新增一个图形节点只改一处主配置。
- [ ] UI 组件不再直接依赖大批 `do-*.ts`。
- [ ] 至少 3 条核心编辑链路有自动化测试。
- [ ] 历史记录与自动保存提交路径可追踪。
- [ ] 文档能明确反映当前真实架构，而不是历史方案。
