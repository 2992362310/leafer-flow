## Agent 工具查询系统 (Tool Introspection System)

### 概述

为了让 Agent 能够自我反省和查询自己的工具能力，实现了一套完整的工具查询系统。包括两个新工具和一个工具分类/元数据系统。

**新增工具数**: 2 个（总数从 45 → 47）

---

### 新增工具详解

#### 1. `list_tools` - 工具列表查询

**功能**: 列出所有可用的 Agent 工具及其简要描述，支持按分类筛选。

**参数**:

```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "description": "可选：按分类筛选工具。可选值: file, edit, shape, layout, template, text, view, canvas, system"
    }
  },
  "required": []
}
```

**使用示例**:

```
用户: 你能做什么？
→ Agent 调用: list_tools
→ 返回所有 47 个工具的分类列表

用户: 显示所有图形操作工具
→ Agent 调用: list_tools category=shape
→ 返回所有 shape 分类工具

用户: 我想看看可用的视图操作
→ Agent 调用: list_tools category=view
→ 返回所有 view 分类工具
```

**分类说明**:

- **file** (4) - 保存、加载、导出 PNG/SVG
- **edit** (6) - 撤销、重做、全选、删除、复制等
- **shape** (6) - 创建图形、批量创建、删除、移动、调整尺寸、修改样式
- **layout** (7) - 对齐、分布、自动布局
- **template** (1) - 插入预设模板
- **text** (2) - 编辑文字、修改文字样式
- **view** (4) - 缩放、适应画布
- **canvas** (5) - 清空画布、获取信息、列举、搜索、连接元素
- **system** (2) - list_tools、get_tool_details（新增）

#### 2. `get_tool_details` - 工具详情查询

**功能**: 获取指定工具的详细信息，包括参数说明、类型、是否必需等。

**参数**:

```json
{
  "type": "object",
  "properties": {
    "tool_name": {
      "type": "string",
      "description": "工具名称（如 'create_shape', 'insert_template'）"
    }
  },
  "required": ["tool_name"]
}
```

**使用示例**:

```
用户: create_shape 工具怎么用？
→ Agent 调用: get_tool_details tool_name=create_shape
→ 返回:
  📋 工具详情: create_shape
  分类: shape
  描述: 创建单个图形...
  参数:
    - shape_type (string) ✓ 必需
      图形类型（如 'rectangle', 'circle', 'diamond'...）
      可选值: rectangle, circle, diamond, ...
    - x (number) ○ 可选
      横坐标 (default: 100)
    - y (number) ○ 可选
      纵坐标 (default: 80)
    ...

用户: 我想了解 insert_template 的用法
→ Agent 调用: get_tool_details tool_name=insert_template
→ 返回:
  📋 工具详情: insert_template
  分类: template
  描述: 插入预设模板...
  参数:
    - template_kind (string) ✓ 必需
      模板类型
      可选值: approval, decision, workOrder, crm, ...
    - offset_x (number) ○ 可选
      水平偏移 (default: 100)
    - offset_y (number) ○ 可选
      垂直偏移 (default: 80)
    - scale (number) ○ 可选
      缩放因子 (default: 1, range: 0.5-2)
```

---

### 实现架构

#### 工具元数据系统

**文件**: [src/editor/builtin/plugins/agent/agent-tools.ts](src/editor/builtin/plugins/agent/agent-tools.ts)

**关键数据结构**:

```typescript
// 工具分类映射
const TOOL_CATEGORIES: Record<string, string> = {
  save_file: "file",
  create_shape: "shape",
  insert_template: "template",
  list_tools: "system",
  get_tool_details: "system",
  // ... 共 47 个工具
};

// 工具缓存（避免重复调用 getAgentTools）
let toolsCache: AgentTool[] | null = null;

// 工具摘要函数
function getToolsSummary(): Array<{ name; description; category }>;

// 工具详情函数
function getToolDetails(
  toolName,
): { name; description; parameters; category } | null;
```

#### 执行流程

```
Agent 调用 list_tools
  ↓
1. 检查 toolsCache，如果为空则调用 getAgentTools() 填充
2. 调用 getToolsSummary() 获取所有工具的摘要
3. 如果指定了 category，按分类筛选工具
4. 格式化输出：按分类分组显示
5. 返回格式化的工具列表

Agent 调用 get_tool_details tool_name=xxx
  ↓
1. 验证工具名是否有效
2. 调用 getToolDetails(toolName) 获取详情
3. 解析参数 JSON schema，生成可读的参数说明
4. 返回格式化的工具详情（名称、分类、描述、参数）
```

---

### 系统提示词更新

**文件**: [src/editor/builtin/plugins/agent/agent-service.ts](src/editor/builtin/plugins/agent/agent-service.ts)

SYSTEM_PROMPT 中添加了以下内容：

```
12. 查询自己的工具能力 — 使用 list_tools 或 get_tool_details 工具
...
- 当用户问"你能做什么"、"你有哪些能力"等时，使用 list_tools 查询并回复
```

这使得 Agent 能够主动识别和回应用户对其能力的查询。

---

### 使用场景

#### 场景 1: 用户询问能力边界

```
用户: 我想修改连接线的样式，你能做吗？

Agent 思考: 用户问是否能修改连接线样式 → 调用 list_tools category=canvas
↓ 返回画布操作工具列表
→ 查看是否有相关工具...
→ 回复: "我可以创建连接线（使用 connect_elements），但暂时不支持修改连接线的样式。我可以帮你调整节点位置来改变连接线走向。"
```

#### 场景 2: 用户学习工具用法

```
用户: 怎样使用 batch_create_shapes？

Agent: 调用 get_tool_details tool_name=batch_create_shapes
↓ 返回详细的参数说明
→ 回复: "batch_create_shapes 工具可以批量创建图形。你可以指定：
  - shape_type: 图形类型（必需）
  - count: 创建数量 1-20（必需）
  - texts: 每个图形的文本（可选）
  - start_x, start_y: 起始位置（可选）
  - width, height: 图形尺寸（可选）
  - spacing_x, spacing_y: 间距（可选）
  - columns: 网格列数（可选）"
```

#### 场景 3: 用户要求展示全部能力

```
用户: 列出你所有可用的操作

Agent: 调用 list_tools
↓ 返回按分类组织的 47 个工具
→ 回复分类工具列表，然后说明：
  "我目前支持 47 个操作工具，分为 9 个分类：
   【file】(4 个) - 文件操作
   【edit】(6 个) - 编辑操作
   【shape】(6 个) - 图形操作
   ... 等等

   如需了解某个工具的用法，可以问'怎样使用 xxx'。"
```

---

### 实现要点

#### 1. 缓存优化

**为什么缓存**: `getAgentTools()` 是一个较重的操作（创建 47 个工具对象），频繁调用会影响性能。

```typescript
let toolsCache: AgentTool[] | null = null;

function getToolsSummary() {
  if (!toolsCache) {
    toolsCache = getAgentTools();  // 仅在首次调用时执行
  }
  return toolsCache.map(...);
}
```

**缓存作用域**: 缓存在整个应用生命周期中保留。如果工具动态改变（unlikely），需要手动清空。

#### 2. 分类映射设计

**集中式管理**: 所有工具的分类定义在一个 `TOOL_CATEGORIES` 对象中，易于维护和更新。

```typescript
const TOOL_CATEGORIES: Record<string, string> = {
  // 按分类编组
  // file group
  save_file: "file",
  load_file: "file",
  // ...
};
```

**优点**:

- 无需修改每个工具的定义（保持向后兼容）
- 分类映射单独管理，便于集中维护
- 支持快速添加新工具和分类

#### 3. 参数说明生成

**自动解析 JSON Schema**:

```typescript
const props = details.parameters?.properties || {};
const required = details.parameters?.required || [];

Object.entries(props).forEach(([key, prop]) => {
  const isRequired = required.includes(key) ? "✓ 必需" : "○ 可选";
  const type = prop.type || "any";
  const desc = prop.description || "无描述";
  // 生成可读的参数说明
});
```

这样即使 schema 更新，参数说明也会自动同步。

#### 4. 错误处理

```typescript
// 验证工具名
if (!toolName) return "错误：请指定工具名称";

// 查找失败时的友好提示
if (!details) {
  return `未找到工具 "${toolName}"。使用 list_tools 查看所有可用工具。`;
}

// 分类不存在时的提示
if (filtered.length === 0) {
  const available = [...new Set(tools.map((t) => t.category || "other"))].join(
    ", ",
  );
  return `分类 "${filterCategory}" 中没有工具。\n可用分类: ${available}`;
}
```

---

### 编译结果

```
✓ 编译状态: 成功
✓ 工具数: 47 (从 45 增加 2)
✓ 模块数: 595 (无变化)
✓ AgentChatPanel 大小: 49.30 kB (gzip: 15.86 kB)
✓ 编译时间: 1.23s
```

**大小增长分析**:

- 添加 2 个工具 + 分类映射：约 3.5 kB
- SYSTEM_PROMPT 更新：约 0.2 kB
- 总增长: 约 3.7 kB (相对增长 < 9%)

---

### 后续扩展点

#### 1. 工具搜索功能

```typescript
function searchTools(keyword: string): AgentTool[] {
  return (
    toolsCache?.filter(
      (t) => t.name.includes(keyword) || t.description.includes(keyword),
    ) || []
  );
}
```

#### 2. 工具使用统计

```typescript
const TOOL_USAGE_STATS: Record<string, number> = {};

function recordToolUsage(toolName: string) {
  TOOL_USAGE_STATS[toolName] = (TOOL_USAGE_STATS[toolName] ?? 0) + 1;
}
```

#### 3. 工具能力等级

```typescript
interface AgentToolWithLevel extends AgentTool {
  level: "basic" | "advanced" | "pro";
  previewSize?: boolean; // 是否受 Pro 限制
}
```

---

### 版本信息

| 版本 | 日期       | 变化                                   |
| ---- | ---------- | -------------------------------------- |
| 1.0  | 2026-07-28 | 初始实现：list_tools, get_tool_details |
| -    | -          | 工具总数 47，分类 9                    |

---

## 快速参考

### Agent 能够执行的查询命令

| 用户输入                        | Agent 动作                                            |
| ------------------------------- | ----------------------------------------------------- |
| "你能做什么?"                   | 调用 `list_tools`                                     |
| "显示所有 shape 工具"           | 调用 `list_tools category=shape`                      |
| "我想了解 create_shape"         | 调用 `get_tool_details tool_name=create_shape`        |
| "怎么使用 batch_create_shapes?" | 调用 `get_tool_details tool_name=batch_create_shapes` |
| "列出所有可用操作"              | 调用 `list_tools` 并格式化输出                        |

### 工具分类速查表

```
file (4)      → 文件操作
edit (6)      → 编辑操作
shape (6)     → 图形创建和修改
layout (7)    → 布局调整
template (1)  → 模板插入
text (2)      → 文字编辑
view (4)      → 视图控制
canvas (5)    → 画布操作
system (2)    → 系统工具 (新)
─────────────────
总计 (47)
```
