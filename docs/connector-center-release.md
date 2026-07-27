# 连线中心封版说明

## 版本目标

本次封版将连线相关能力从“分散工具项”升级为“集中工作台”，并打通模板、文件与自动恢复链路，确保连线行为可配置、可持久、可复现。

## 核心能力

- 新增独立面板 `connector-panel`，支持浮动与右侧收纳
- 连线样式切换：直角 / 曲线 / 直线
- 样式切换可对当前选中连线立即生效
- 连线动画控制：开关、速度、作用范围（全局 / 仅选中）、方向（正向 / 反向）
- 连线编辑快捷操作：标签、中间点、清中间点、置顶
- 连线批量选择入口：全选连线、选中同类型
- 工具联动：点击连线工具自动打开连线中心（open-only）

## 数据持久化

连线中心配置已纳入统一文档结构 `settings` 字段。

保存来源：

- 手动保存文件
- 自动保存（localStorage/IndexedDB）

恢复时机：

- 手动加载文件
- 自动恢复
- 模板插入后策略应用

配置字段：

- `connectorRouteType`: `orthogonal` | `bezier` | `straight`
- `connectorFlowAnimation.enabled`: boolean
- `connectorFlowAnimation.speed`: number
- `connectorFlowAnimation.scope`: `all` | `selected`
- `connectorFlowAnimation.direction`: `forward` | `reverse`

## 模板链路策略

模板定义支持可选 `settings`。插入模板时按以下优先级应用：

1. 模板显式 `settings`
2. 从模板边 `routeType` 推断主连线样式
3. 若无可用策略则不覆盖当前连线中心配置

已内置策略示例：

- BPMN 订单模板默认使用 `bezier`

## 关键文件

- `src/components/ConnectorPanel.vue`
- `src/editor/builtin/plugins/connector-animation/index.ts`
- `src/editor/core/connector-workbench-settings.ts`
- `src/editor/core/flow-serialization.ts`
- `src/editor/core/auto-save.ts`
- `src/editor/action/do-file.ts`
- `src/editor/action/do-template.ts`
- `src/editor/templates/defs.ts`

## 验收清单

1. 点击顶部连线工具，连线中心自动打开
2. 切换样式后新建连线生效；选中连线可即时套用
3. 动画开关/速度/范围/方向可实时生效
4. 保存后重载文件，连线中心配置保持一致
5. 刷新触发自动恢复后，连线中心配置保持一致
6. 插入 BPMN 模板后，默认连线样式为曲线

## 兼容性说明

- 旧文件（无 `settings`）可正常加载
- 未配置动画插件命令时，恢复逻辑会自动降级跳过对应字段
