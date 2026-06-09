# Leafer Flow

基于 Vue 3、Vite、TypeScript 和 LeaferJS 的流程图 / 图形编辑器练手项目。当前架构以 **核心画布运行时 + 插件宿主 + 注册表驱动 UI + 插件市场** 为主，目标是提供一个可直接使用的轻量绘图工作台。

## 功能概览

- 画布编辑：选择、拖拽、缩放、适配视图、居中、视图复位、撤销、重做。
- 基础图形：矩形、圆形 / 椭圆、菱形、三角形、多边形、文本、自由绘制、箭头连接线。
- 流程图节点：开始/结束、处理、判断、输入/输出、文档、数据库、子流程、连接点、泳道等。
- BPMN 节点：开始事件、中间事件、结束事件、网关、任务、数据对象、数据存储。
- 架构图节点：Actor、Use Case、Component、Package、Node、Queue、Cache、Cloud、Service、Device。
- 连接线增强：直线、折线、贝塞尔路径，支持连接线标签和标签位置同步。
- 选择能力：单选、多选、框选、全选、删除、键盘微移。
- 排版能力：对齐、分布、层级前移 / 后移 / 置顶 / 置底。
- 元素管理：复制、粘贴、编组、取消编组、锁定、解锁、显示 / 隐藏。
- 文件能力：保存、加载、自动恢复、导出 PNG/SVG。
- 模板能力：业务流程、BPMN、系统架构、泳道协作等图形模板。
- 绘制体验：画布标尺、智能吸附、点阵背景、自由绘制平滑度、事件日志、右键菜单和状态栏。
- 插件市场：支持内置插件列表、启用 / 禁用非必需插件、查看插件贡献摘要。

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
- `P`：自由绘制
- `1` 到 `9`：常用流程图节点
- `Ctrl+Z`：撤销
- `Ctrl+Shift+Z`：重做
- `Ctrl+C` / `Ctrl+V`：复制 / 粘贴
- `Ctrl+G` / `Ctrl+Shift+G`：编组 / 取消编组
- `Delete`：删除选中元素
- `Arrow`：微移选中元素
- `Shift+Arrow`：快速微移选中元素

## 使用建议

1. 先用流程图节点搭出主流程，再用箭头连接节点。
2. 需要说明连接关系时，选中连接线后可添加连接线标签。
3. 对多元素进行框选后，可使用对齐、分布和编组整理结构。
4. 复杂图建议定期保存，也可以依赖本地自动恢复作为补充。
5. 交付或分享时优先导出 SVG；用于截图或文档粘贴时使用 PNG。

## 架构概览

当前编辑器采用插件化结构：

- `Editor` 负责 Leafer 画布生命周期、history、autosave、序列化和连接线同步等核心能力。
- `PluginManager` 负责插件激活 / 停用。
- `ToolRegistry`、`CommandRegistry`、`MenuRegistry`、`ActionButtonRegistry`、`ViewControlRegistry` 负责收集插件贡献。
- 工具栏、图形库、右键菜单、顶部按钮和视图控件优先从 registry 派生。
- 插件市场当前管理内置插件源，可即时启用 / 禁用非必需插件。

更多架构细节见：

- `docs/plugin-architecture.md`
- `docs/plugin-market-plan.md`
- `docs/refactor-checklist.md`
- `docs/todo.md`

## 数据与保存

保存文件和自动恢复数据使用统一的 Leafer Flow 文档结构：

```json
{
  "schema": "leafer-flow.document",
  "schemaVersion": 1,
  "documentType": "file",
  "savedAt": "2026-06-09T00:00:00.000Z",
  "tree": {
    "children": []
  }
}
```

其中 `documentType` 用于区分手动保存文件和自动保存数据。

## 技术栈

- Vue 3
- Vite
- TypeScript
- LeaferJS
- Tailwind CSS / DaisyUI

## 后续重点

- 收敛 history / autosave / connector label sync 等 mutation side effects。
- 为 connector label / custom data / group 建立 round-trip 验收。
- 补充 action/core 层自动化测试，覆盖剪贴板、编组、文件保存和自动恢复链路。
- 深化插件化能力，例如属性面板 contribution、插件配置入口和插件源抽象。
- 扩展高级能力，例如导出 PDF、导入 Draw.io / Visio、自动布局和缩略图导航。
