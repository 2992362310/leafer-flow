# 流程图设计工具项目进度报告

## 项目概述

这是一个基于 Vue 3 和 LeaferJS 的流程图编辑器项目。当前项目已经从早期“基础绘图工具”扩展为支持流程图、BPMN、架构图、插件市场、命令系统、右键菜单、图层面板、属性面板、保存加载、导出和自动保存的编辑器练手项目。

当前架构方向：

> 核心画布运行时 + 插件宿主 + 插件协议 + 插件市场

## 当前功能实现情况

### 核心功能

- ✅ 基础编辑器框架搭建
- ✅ Leafer 画布初始化与生命周期
- ✅ `Editor` 运行时
- ✅ history / autosave 基础服务
- ✅ 序列化 / 自动恢复基础链路
- ✅ 插件系统
  - ✅ `PluginManager`
  - ✅ `ToolRegistry`
  - ✅ `CommandRegistry`
  - ✅ `MenuRegistry`
  - ✅ `ActionButtonRegistry`
- ✅ 插件市场
  - ✅ 右侧 Drawer 市场入口
  - ✅ 内置插件列表
  - ✅ 启用/禁用非必需插件
  - ✅ 必需插件保护
  - ✅ 贡献数量与标签预览
- ✅ 工具栏界面
- ✅ 图形库 / shape library
- ✅ 图标系统

### 绘制工具与图形

- ✅ 基础图形
  - ✅ 矩形
  - ✅ 圆形 / 椭圆
  - ✅ 菱形
  - ✅ 三角形
  - ✅ 五边形
  - ✅ 六边形
  - ✅ 箭头 / 连接线
  - ✅ 文本
  - ✅ 自由绘制
- ✅ 流程图节点
  - ✅ 开始/结束
  - ✅ 处理
  - ✅ 判断
  - ✅ 输入/输出
  - ✅ 文档
  - ✅ 数据库
  - ✅ 子流程
  - ✅ 连接点
  - ✅ 泳道
  - ✅ 延迟
  - ✅ 准备
  - ✅ 手动输入
  - ✅ 手动操作
  - ✅ 存储数据
  - ✅ 显示
  - ✅ 页外连接
  - ✅ 合并
  - ✅ 注释
- ✅ BPMN 节点
  - ✅ 开始事件
  - ✅ 中间事件
  - ✅ 结束事件
  - ✅ 排他网关
  - ✅ 并行网关
  - ✅ 包容网关
  - ✅ 任务
  - ✅ 数据对象
  - ✅ 数据存储
- ✅ 架构图节点
  - ✅ Actor
  - ✅ Use Case
  - ✅ Component
  - ✅ Package
  - ✅ Node
  - ✅ Queue
  - ✅ Cache
  - ✅ Cloud
  - ✅ Service
  - ✅ Device

### 组件实现

- ✅ 主应用组件：`App.vue`
- ✅ 编辑器工具栏：`EditorToolbar.vue`
- ✅ 图形库：`ShapeLibrary.vue`
- ✅ 编辑器按钮：`EditorButton.vue`
- ✅ 编辑器日志：`EditorLog.vue`
- ✅ 状态栏：`StatusBar.vue`
- ✅ 右键菜单：`ContextMenu.vue`
- ✅ 图层面板：`LayerPanel.vue`
- ✅ 属性面板：`EditorPanel.vue`
- ✅ 视图控制：`ViewControls.vue`
- ✅ 插件市场 Drawer：`PluginMarketDrawer.vue`
- ✅ 图标组件：`Icon.vue`

### 编辑功能

- ✅ 工具切换
- ✅ 快捷键支持
- ✅ 多选 / 框选
- ✅ 复制 / 粘贴
- ✅ 删除
- ✅ 全选
- ✅ 撤销 / 重做
- ✅ 清空画布
- ✅ 元素对齐
- ✅ 元素分布
- ✅ 元素编组 / 取消编组
- ✅ 元素锁定 / 解锁
- ✅ 元素显隐切换
- ✅ 图层前移 / 后移 / 置顶 / 置底
- ✅ 图层拖拽排序
- ✅ 连接线置顶
- ✅ 连接线标签
- ✅ 属性面板基础编辑
- ✅ 日志系统
- ✅ 元素计数显示
- ✅ 缩放 / 适配视图 / 居中 / 重置缩放

### 文件与模板

- ✅ 保存
- ✅ 加载
- ✅ 自动保存恢复
- ✅ 导出 PNG
- ✅ 导出 SVG
- ✅ 业务流程模板
- ✅ 专业图模板
- ❌ 导出 PDF
- ❌ 导入 Visio / Draw.io 等外部格式

### 插件化实现

- ✅ 基础工具插件：`leafer-flow.basic-tools`
- ✅ 流程图节点插件：`leafer-flow.flow-shapes`
- ✅ BPMN 节点插件：`leafer-flow.bpmn-shapes`
- ✅ 架构图节点插件：`leafer-flow.architecture-shapes`
- ✅ 标尺插件：`leafer-flow.canvas-ruler`
- ✅ 吸附插件：`leafer-flow.canvas-snap`
- ✅ 点阵插件：`leafer-flow.canvas-dot-matrix`
- ✅ 核心命令插件：`leafer-flow.builtin-core`

## 已完成的重构项

- ✅ 工具元数据单一化
- ✅ 工具注册流程从 `src/editor/index.ts` 移到内置插件
- ✅ 移除旧 `editor.tools` Map
- ✅ 移除旧 `Editor.register(name, tool)`
- ✅ 移除旧 `ToolRegistry.registerLegacy(...)`
- ✅ 工具栏由 `ToolRegistry` 派生
- ✅ 图形库由 `ToolRegistry` 派生
- ✅ 右键菜单由 `MenuRegistry` 派生
- ✅ 顶部操作按钮由 `ActionButtonRegistry` 派生
- ✅ 状态栏工具名称由运行时工具贡献派生
- ✅ 工具快捷键由运行时 toolbar contribution 派生
- ✅ 图形库搜索由 `label` / `tool` / `keywords` 驱动
- ✅ 图层面板通用操作 command 化
- ✅ 图层拖拽排序 command 化
- ✅ 默认命令、菜单、按钮包装为必需内置插件
- ✅ 插件市场支持必需插件保护
- ✅ 仓库级工程 skill 已建立

## 当前仍未完成 / 可继续推进

### 插件化深化

- [ ] 属性面板 contribution 化
- [ ] 绘制设置面板 contribution 化或 settings schema 化
- [ ] 文件 / 导出 / 模板能力从 `builtin-core` 拆为独立插件
- [ ] 插件配置入口
- [ ] 插件源抽象：builtin / remote / local-dev
- [ ] 远程插件加载、权限、沙箱、签名和安全边界

### 高风险链路治理

- [ ] 收敛 history / autosave / connector label sync 等 mutation side effects
- [ ] 序列化 schema 与版本号
- [ ] 保存文件结构与自动恢复结构分层
- [ ] connector label / custom data / group round-trip 校验
- [ ] clipboard / group / ungroup / file 最小自动化测试

### 组件结构优化

- [ ] 拆分 `EditorPanel.vue` 中的 selection/property 逻辑
- [ ] 抽出 `useSelectionInspector` 或类似 composable
- [ ] 复用 selection predicates：`canGroup`、`canUnGroup`、`hasConnectorSelection`
- [ ] 拆分 `App.vue` 中的运行时刷新、shape drop、框选、插件市场协调逻辑

### 文件与高级能力

- [ ] 导出 PDF
- [ ] 导入其他格式，如 Visio、Draw.io
- [ ] 自动布局算法
- [ ] 缩略图导航
- [ ] 多层画布
- [ ] 多人协作编辑
- [ ] 评论功能
- [ ] 版本控制

### 质量与验证

- [ ] 完善 TypeScript 类型定义，尤其是 `EditorPanel.vue` 中 Leafer / Connector 类型兼容问题
- [ ] 添加 action/core 层自动化测试
- [ ] 建立高风险链路验收清单
- [ ] 优化大量图形时的性能表现
- [ ] 继续收敛 docs，避免历史文档误导

## 当前架构要点

### 核心类和模块

- `Editor`：核心编辑器运行时。
- `PluginManager`：插件激活 / 停用。
- `ToolRegistry`：工具贡献注册表。
- `CommandRegistry`：命令贡献注册表。
- `MenuRegistry`：菜单贡献注册表。
- `ActionButtonRegistry`：顶部操作按钮贡献注册表。
- `tool-definitions.ts`：内置工具元数据定义源。
- `builtin-core`：默认命令、菜单、按钮必需插件。

### 当前设计原则

- UI 优先从 registry 派生数据。
- Vue 组件优先 emit command id，不直接调用底层 action。
- 工具插件通过 `ctx.editor.registerTool(...)` 注册贡献。
- 可禁用插件必须在 `deactivate()` 后清理运行时副作用。
- 高风险链路包括连接线、序列化、剪贴板、编组、文件、history/autosave。

## 未来扩展方向

1. 插件配置与 settings panel。
2. 属性面板插件化。
3. 文件、导出、模板功能域插件化。
4. 高风险 action/core 自动化测试。
5. 远程插件市场。
6. 自动布局与更多专业图能力。
7. 协作编辑能力。
