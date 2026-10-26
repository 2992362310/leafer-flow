# Leafer Flow 后续重构与验收清单

本文只记录当前实现之上的后续工作和验收标准。

## 当前已稳定的架构基线

- `src/editor/index.ts` 是初始化入口，不维护工具清单。
- 内置插件由 `src/editor/builtin/plugins/index.ts` 统一列出。
- 工具、命令、菜单、顶部按钮通过 registry 注册和注销。
- 图形库、工具栏、状态栏工具名称、快捷键、右键菜单、顶部按钮都从 registry 派生。
- 插件市场当前只管理内置插件源。
- `leafer-flow.builtin-core` 是必需插件，负责默认命令、右键菜单和顶部操作按钮。
- 标尺、点阵、吸附实例由各自插件持有并销毁，不再经过旧 `Editor.use()` 机制。
- 序列化文档结构已使用 `schema: "leafer-flow.document"` 与 `schemaVersion: 1`。
- 手动保存文件与自动保存数据通过 `documentType: "file" | "autosave"` 区分。

## Leafer 2.3.2 升级检查（2026-10-26）

- [x] 官方包统一到 2.3.2，锁文件不存在旧版 Leafer；社区插件自身版本不变。
- [x] 标尺插件的 editor / text-editor / interface 传递依赖定向对齐，无 peer 冲突。
- [x] Agent、Connector、模板注册表、初始化与画布辅助插件通过针对性 TypeScript 编译检查。
- [x] 模板注册表可读取全部 9 种模板，并拒绝未知名称与原型属性名称。
- [x] 最终依赖树下 `pnpm run build` 通过；新版 EditBox 仍提供现有补丁使用的入口。
- [ ] 浏览器实际交互和数据往返验证；本轮浏览器工具被跳过，下面的验收项保持未完成。

安装器对本次新发布的官方包自动记录了精确到 2.3.2 的 minimumReleaseAgeExclude；未关闭全局供应链策略。内部端点改名不改变文档的 fromPoint / toPoint 字段。

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

`commitMutation()` 已建立，但统一入口不等于所有副作用已经收敛。模板服务仍有事务结束后直接保存的路径，需要结合异步行为逐项核对，不能只按方法名称判断完成度。

剩余工作：

- [ ] 逐项核对 action、模板服务和 Agent 的提交与事务边界。
- [ ] 明确每类 mutation 是否需要 history、autosave、connector label sync。
- [ ] 验证移动、缩放、旋转和程序性移动的连接线标签同步规则一致。

验收标准：

- [ ] 每个编辑命令的 history/autosave 行为有明确归属。
- [ ] 保留的直接保存路径具有必要性，不出现重复历史记录或遗漏自动保存。

## P1：属性面板结构收敛

属性面板已通过 `PropertyPanelRegistry` 贡献化（5 个内置面板）。

已完成：

- [x] 选择解析逻辑抽到 `useSelectionInspector` composable（`src/composables/useSelectionInspector.ts`）。
- [x] `useEditorPanelState` 使用 `useSelectionInspector` 获取选择状态，属性读写逻辑与选择解析分离。

剩余工作：

- [ ] 新增属性字段通过 contribution 协议扩展，不修改宿主组件。

## P1：插件化深化

以下已完成：

- [x] 绘制设置迁出 `EditorButton.vue`，由 `drawing-settings` 插件通过 `panel` contribution 贡献。
- [x] 文件、导出、模板拆为独立插件（`file-actions`、`export-actions`、`template-actions`）。
- [x] 视图控件由 `view-controls` 插件通过 `ViewControlRegistry` 贡献。
- [x] 属性面板 contribution 协议已建立并接入。
- [x] 工具/动作分发已收敛到 page commands（`useEditorCommands` + `providePageCommands`），TopBar/图形库/ActionBar/快捷键共用同一入口。

剩余工作：

- [ ] 插件配置 UI 继续完善（`PluginConfigDialog` 已存在，需覆盖更多插件）。
- [ ] 评估是否有剩余宿主能力可插件化。

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

## 远期候选：插件市场扩展

当前市场只支持内置插件源。优先评估现有本地购买状态、插件配置和模板入口的复杂度；以下扩展不属于当前基础清理的交付范围。

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
