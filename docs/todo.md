# Leafer Flow 项目状态（2026-06）

本文是当前实现的能力快照与后续待办。以代码现状为准，不再记录历史过程。

## 当前架构

> 核心画布运行时 + 插件宿主 + 注册表驱动 UI + 插件市场

核心入口与事实：

- `src/editor/index.ts` 负责初始化 `Editor` 与激活已启用内置插件。
- `src/editor/editor.ts` 负责 registry、history、autosave、工具执行与 mutation 提交。
- `src/editor/tool-definitions.ts` 是工具与图形元数据单一来源。
- `src/editor/builtin/plugins/index.ts` 维护内置插件清单。

## 当前能力清单

### 1. 编辑器核心

- 已完成：画布初始化与生命周期。
- 已完成：插件宿主与插件协议。
- 已完成：`ToolRegistry`、`CommandRegistry`、`MenuRegistry`、`ActionButtonRegistry`、`ViewControlRegistry`。
- 已完成：history 与 autosave 基础链路。
- 已完成：`commitMutation()` 统一提交（history/autosave/连接线标签同步）。
- 已完成：序列化 schema 与版本号（`leafer-flow.document` / `schemaVersion: 1`）。
- 已完成：通过 `documentType` 区分文件保存与自动恢复。

### 2. 内置插件（当前 19 个）

- 必需：`leafer-flow.builtin-core`。
- 默认启用：
  - `leafer-flow.canvas-ruler`
  - `leafer-flow.canvas-snap`
  - `leafer-flow.canvas-dot-matrix`
  - `leafer-flow.drawing-settings`
  - `leafer-flow.view-controls`
  - `leafer-flow.file-actions`
  - `leafer-flow.export-actions`
  - `leafer-flow.template-actions`
  - `leafer-flow.basic-tools`
  - `leafer-flow.flow-shapes`
  - `leafer-flow.bpmn-shapes`
  - `leafer-flow.architecture-shapes`
  - `leafer-flow.agent`
  - `leafer-flow.auto-layout`
  - `leafer-flow.diagram-lint`
  - `leafer-flow.minimap`
- 默认关闭：
  - `leafer-flow.multi-layer`
  - `leafer-flow.custom-data-panel`

### 3. 绘制工具与图形（当前 50 种）

- 基础图形（13）：矩形、圆形、菱形、三角形、五边形、六边形、平行四边形、星形、便签、圆柱、连接线、文本、自由绘制。
- 流程图节点（19）：开始/结束、处理、判断、输入/输出、文档、数据库、子流程、连接点、泳道、延迟、准备、手动输入、手动操作、存储数据、显示、离页连接、合并、注释。
- BPMN（9）：开始事件、中间事件、结束事件、排他网关、并行网关、包容网关、任务、数据对象、数据存储。
- 架构图（10）：Actor、Use Case、Component、Package、Node、Queue、Cache、Cloud、Service、Device。

### 4. 编辑与视图能力

- 已完成：多选/框选、复制/剪切/粘贴、删除、全选、撤销/重做。
- 已完成：对齐、分布、编组/取消编组、层级前后移动。
- 已完成：锁定/解锁、显隐切换、图层拖拽排序。
- 已完成：连接线标签、连接线路径与标签同步。
- 已完成：视图缩放、适配、居中、重置。
- 已完成：缩略图导航（minimap 插件）。
- 已完成：自动布局（选区/全图 + TB/LR/BT/RL）。
- 已完成：规范检查 Pro（检查、定位、按问题修复、流水线修复）。

### 5. 文件、导出与模板

- 已完成：保存、加载、自动恢复。
- 已完成：导出 PNG、导出 SVG。
- 已完成：模板插入（业务流程、BPMN、系统架构、泳道协作等）。
- 未完成：导出 PDF。
- 未完成：导入 Visio / Draw.io 等外部格式。

### 6. AI 助手

- 已完成：OpenAI 兼容 API 配置与连接测试。
- 已完成：流式响应、历史持久化、上下文压缩。
- 已完成：快捷键 `Ctrl+Shift+A` 打开/关闭。
- 已完成：当前工具调用能力为 33 项（文件、编辑、布局、图层、图形创建、模板、样式、文本修改、视图、检索、连接等）。

## 当前主要差距

### P0（高优先级）

- [ ] connector label / custom data / group 的 round-trip 验收用例固化。
- [ ] clipboard / group / ungroup / file 的最小自动化测试。
- [ ] 高风险链路改动后的回归清单固定化（连接线、序列化、剪贴板、编组）。

### P1（结构优化）

- [ ] 属性面板 contribution 化继续推进（当前仅 custom-data 示例插件）。
- [ ] `EditorPanel` 的 selection/property 逻辑进一步收敛。
- [ ] 插件配置入口统一化（当前已有 `configurable` 能力，但未形成统一 UI）。

### P2（能力扩展）

- [ ] 远程插件源与本地开发插件源。
- [ ] 插件权限、沙箱、签名与安全边界。
- [ ] 导出 PDF。
- [ ] 外部格式导入（Visio / Draw.io）。
- [ ] 多人协作、评论、版本控制。

## 文档维护约定

- 架构事实：`docs/plugin-architecture.md`
- 插件市场流程：`docs/plugin-market-plan.md`
- 重构与验收：`docs/refactor-checklist.md`
- 项目状态与待办：本文件
