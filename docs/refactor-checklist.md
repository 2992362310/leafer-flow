# Leafer Flow 后续重构与验收清单

本文只记录当前实现之上的后续工作和验收标准。

## 当前已稳定的架构基线

- `src/editor/index.ts` 是初始化入口，不维护工具清单。
- 内置插件由 `src/editor/builtin/plugins/index.ts` 统一列出。
- 工具、命令、菜单、顶部按钮通过 registry 注册和注销。
- 图形库、工具栏、状态栏工具名称、快捷键、右键菜单、顶部按钮都从 registry 派生。
- 插件市场当前只管理内置插件源。
- `leafer-flow.builtin-core` 是必需插件，负责默认命令、右键菜单和顶部操作按钮。
- 序列化文档结构已使用 `schema: "leafer-flow.document"` 与 `schemaVersion: 1`。
- 手动保存文件与自动保存数据通过 `documentType: "file" | "autosave"` 区分。

## P0：高风险链路验收

这些链路影响用户数据和编辑器可恢复性，后续修改时优先补验证。

### 连接线与标签

涉及文件：

- `src/editor/tools/draw-arrow.ts`
- `src/editor/core/connector-labels.ts`
- `src/editor/core/flow-serialization.ts`

实现说明：

- 连接线标签位置由 `src/editor/core/connector-labels.ts` 同步。
- 标签中心点优先基于 `Connector.getRoutePoints()` 的实际路由中点计算；路由点不可用时再回退到连接线端点、`wire.path` 和 bounds 中心。

验收项：

- [ ] 新建连接线后可添加标签。
- [ ] 移动连接线两端节点后标签位置同步。
- [ ] 手动拖动标签后偏移量保持。
- [ ] 保存后重新加载，连接线绑定与标签偏移保持。
- [ ] 复制/粘贴带标签连接线后，标签关联到新连接线。

### 序列化契约

涉及文件：

- `src/editor/core/flow-serialization.ts`
- `src/editor/core/auto-save.ts`
- `src/editor/action/do-file.ts`

当前事实：

- [x] 建立 document schema：`leafer-flow.document`。
- [x] 建立 schema version：`schemaVersion: 1`。
- [x] 保存文件结构与自动恢复结构通过 `documentType` 区分。
- [ ] 为 connector label / custom data / group 建立 round-trip 验收。

### 剪贴板

涉及文件：

- `src/editor/action/do-clipboard.ts`
- `src/editor/core/flow-serialization.ts`

验收项：

- [ ] 复制单个普通图形。
- [ ] 复制组合图形。
- [ ] 复制连接线及其两端节点。
- [ ] 复制带标签连接线。
- [ ] 粘贴后 innerId / custom data / connector label target 不串到旧元素。

### 编组与取消编组

涉及文件：

- `src/editor/action/do-group.ts`
- `src/editor/action/do-ungroup.ts`

验收项：

- [ ] 多选普通节点可编组。
- [ ] 编组后图层树显示合理。
- [ ] 取消编组后节点位置不偏移。
- [ ] 编组/取消编组后 history 可撤销/重做。
- [ ] 连接线相关选择不会被错误编组。

### 文件、导出与自动恢复

涉及文件：

- `src/editor/action/do-file.ts`
- `src/editor/core/flow-serialization.ts`
- `src/editor/core/auto-save.ts`

验收项：

- [ ] 保存文件后重新加载结构一致。
- [ ] 自动恢复后结构一致。
- [ ] 导出 PNG 可生成图片。
- [ ] 导出 SVG 可生成矢量内容。
- [ ] 加载异常数据时有明确错误反馈，不破坏当前画布。

## P1：收敛 mutation side effects

当前 `history.save()`、`autoSave.save()`、`syncConnectorLabels()`、选择刷新等副作用仍分布在 `Editor` 和多个 action 中。

目标：

- [ ] 定义统一的 mutation commit 边界。
- [ ] 区分用户交互结束提交和程序性变更提交。
- [ ] 明确每类 mutation 是否需要 history、autosave、connector label sync。
- [ ] 减少 action 中重复手写副作用组合。

验收标准：

- [ ] 任意一个编辑命令执行后，可以从单一提交流程追踪 history/autosave 行为。
- [ ] 移动、缩放、旋转和程序性移动的连接线标签同步规则一致。

## P1：属性面板结构收敛

当前 `EditorPanel.vue` 仍包含较多选择解析、属性读取和属性写入逻辑。

目标：

- [ ] 抽出 `useSelectionInspector` 或类似 composable。
- [ ] 将选择态解析与 UI 渲染分离。
- [ ] 将几何、外观、文本、连接线属性分组。
- [ ] 复用 selection predicates，避免组件和 action 各自实现判断。

验收标准：

- [ ] 属性读取逻辑可以在组件外测试或复用。
- [ ] 新增一个属性字段不需要继续扩大 `EditorPanel.vue` 的选择解析分支。

## P1：插件化深化

当前仍集中在宿主或 `builtin-core` 的能力：

- 绘制设置面板。
- 文件保存/加载。
- 导出 PNG/SVG。
- 模板插入。
- 属性面板。
- 视图控制面板。

目标：

- [ ] 增加插件配置或 settings panel contribution 入口。
- [ ] 将绘制设置迁出 `EditorButton.vue` 静态实现。
- [ ] 将文件、导出、模板拆成独立功能域插件。
- [ ] 评估属性面板 contribution 协议。
- [ ] 评估 ViewControls 是否保持宿主 UI，或改为 panel contribution。

验收标准：

- [ ] 非必需功能可以独立启停。
- [ ] 禁用插件后不会留下菜单、按钮、快捷键或画布运行时残留。

## P2：自动化测试切口

当前仓库仍以手工回归为主，后续建议先补 action/core 层最小测试。

优先级：

1. `flow-serialization` round-trip。
2. `connector-labels` 标签偏移保存/恢复。
3. `do-clipboard` 复制粘贴 id remap。
4. `do-group` / `do-ungroup` 位置和层级保持。
5. `do-file` 保存/加载异常分支。

验收标准：

- [ ] 至少一组核心编辑链路可通过命令自动运行。
- [ ] 文档中记录测试命令和覆盖边界。

## P2：插件市场扩展

当前市场只支持内置插件源。

后续项：

- [ ] 抽象 builtin / remote / local-dev 插件源。
- [ ] 增加插件配置入口。
- [ ] 增加插件详情页或页面级市场。
- [ ] 设计远程插件权限、沙箱、签名和异常隔离。

## 文档维护规则

- 当前架构事实统一维护在 `docs/plugin-architecture.md`。
- 插件市场流程统一维护在 `docs/plugin-market-plan.md`。
- 项目功能状态统一维护在 `docs/todo.md`。
- 本文件只维护后续重构和验收清单。
- 不新增临时分析类文档；如需记录历史，放到 git commit 中。
