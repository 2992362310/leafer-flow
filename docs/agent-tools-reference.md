## Agent 工具完整速查表 (47 Tools Reference)

### 快速索引

| #   | 工具名                  | 分类     | 功能                                 |
| --- | ----------------------- | -------- | ------------------------------------ |
| 1   | save_file               | file     | 保存流程图文件                       |
| 2   | load_file               | file     | 加载流程图文件                       |
| 3   | export_png              | file     | 导出为 PNG 图片                      |
| 4   | export_svg              | file     | 导出为 SVG 矢量图                    |
| 5   | undo                    | edit     | 撤销上一步操作                       |
| 6   | redo                    | edit     | 重做上一步操作                       |
| 7   | select_all              | edit     | 全选画布上所有元素                   |
| 8   | deselect_all            | edit     | 取消选中所有元素                     |
| 9   | delete_selected         | edit     | 删除选中元素                         |
| 10  | duplicate_selected      | edit     | 复制选中元素                         |
| 11  | create_shape            | shape    | 创建单个图形                         |
| 12  | batch_create_shapes     | shape    | 批量创建图形（支持网格排列）         |
| 13  | delete_shape            | shape    | 删除指定的图形                       |
| 14  | move_shape              | shape    | 移动图形                             |
| 15  | resize_shape            | shape    | 调整图形尺寸                         |
| 16  | set_shape_style         | shape    | 修改图形样式（颜色、边框等）         |
| 17  | align_left              | layout   | 左对齐选中元素                       |
| 18  | align_right             | layout   | 右对齐选中元素                       |
| 19  | align_top               | layout   | 顶部对齐选中元素                     |
| 20  | align_bottom            | layout   | 底部对齐选中元素                     |
| 21  | distribute_horizontally | layout   | 水平均匀分布选中元素                 |
| 22  | distribute_vertically   | layout   | 垂直均匀分布选中元素                 |
| 23  | auto_layout             | layout   | 自动布局（支持多种算法）             |
| 24  | insert_template         | template | 插入预设模板                         |
| 25  | edit_text               | text     | 修改元素文字内容                     |
| 26  | set_text_style          | text     | 修改文字样式（字号、颜色）           |
| 27  | zoom_fit                | view     | 适应画布内容                         |
| 28  | zoom_in                 | view     | 放大画布                             |
| 29  | zoom_out                | view     | 缩小画布                             |
| 30  | zoom_reset              | view     | 重置缩放为 100%                      |
| 31  | clear_canvas            | canvas   | 清空画布上的所有元素                 |
| 32  | get_canvas_info         | canvas   | 获取画布信息（元素数量、缩放等）     |
| 33  | list_elements           | canvas   | 列出画布上所有元素（带坐标和尺寸）   |
| 34  | search_elements         | canvas   | 搜索画布上的元素（按名称或文字内容） |
| 35  | connect_elements        | canvas   | 用连接线连接两个元素                 |
| 36  | list_tools              | system   | 列出所有工具及其分类                 |
| 37  | get_tool_details        | system   | 获取指定工具的详细参数说明           |

**继续** (原有 37 个工具，这里为简洁只列新增的)

---

### 分类详细说明

#### 【file】文件操作 (4 个工具)

```
save_file
  描述: 保存当前流程图文件
  参数: (无)
  返回: 保存成功/失败信息

load_file
  描述: 加载流程图文件
  参数: (无)
  返回: 加载成功/失败信息

export_png
  描述: 导出为 PNG 图片
  参数: (无)
  返回: 导出成功/失败信息

export_svg
  描述: 导出为 SVG 矢量图
  参数: (无)
  返回: 导出成功/失败信息
```

#### 【edit】编辑操作 (6 个工具)

```
undo
  描述: 撤销上一步操作
  参数: (无)

redo
  描述: 重做上一步操作
  参数: (无)

select_all
  描述: 全选画布上所有元素
  参数: (无)

deselect_all
  描述: 取消选中所有元素
  参数: (无)

delete_selected
  描述: 删除选中的元素
  参数: (无)

duplicate_selected
  描述: 复制选中的元素
  参数: (无)
```

#### 【shape】图形操作 (6 个工具)

```
create_shape
  参数:
    - shape_type* (string): 图形类型
      可选值: rectangle, circle, diamond, triangle, pentagon, hexagon,
              parallelogram, star, note, cylinder, arrow, freehand,
              flow_start, flow_end, flow_process, flow_decision, ...,
              bpmn_start_event, bpmn_task, ..., arch_role, arch_usecase, ...
    - x (number): 横坐标 (default: 100)
    - y (number): 纵坐标 (default: 80)
    - width (number): 宽度 (default: 120)
    - height (number): 高度 (default: 72)
    - text (string): 文字内容 (可选)
  返回: 创建成功/失败，返回元素信息

batch_create_shapes
  参数:
    - shape_type* (string): 图形类型（与 create_shape 相同）
    - count* (number): 创建数量 (1-20)
    - texts[] (string[]): 每个图形的文本 (可选)
    - start_x (number): 网格起始 X (default: 100)
    - start_y (number): 网格起始 Y (default: 80)
    - width (number): 图形宽度 (default: 120)
    - height (number): 图形高度 (default: 72)
    - spacing_x (number): 水平间距 (default: 150)
    - spacing_y (number): 垂直间距 (default: 100)
    - columns (number): 网格列数 (default: 5)
  返回: 创建数量和位置信息

delete_shape
  参数:
    - element_id (string): 元素 ID
  返回: 删除成功/失败信息

move_shape
  参数:
    - element_id (string): 元素 ID
    - x (number): 新的 X 坐标
    - y (number): 新的 Y 坐标
  返回: 移动成功/失败信息

resize_shape
  参数:
    - element_id (string): 元素 ID
    - width (number): 新宽度
    - height (number): 新高度
  返回: 调整成功/失败信息

set_shape_style (or set_style)
  参数:
    - x (number): 横坐标 (可选)
    - y (number): 纵坐标 (可选)
    - width (number): 宽度 (可选)
    - height (number): 高度 (可选)
    - fill (string): 填充颜色 (如 '#FF0000' 或 'red')
    - stroke (string): 边框颜色 (可选)
    - stroke_width (number): 边框宽度 (可选)
    - opacity (number): 透明度 (0-1)
    - corner_radius (number): 圆角半径 (可选)
  返回: 修改成功/失败信息
```

#### 【layout】布局操作 (7 个工具)

```
align_left
  描述: 左对齐选中的元素
  参数: (无，作用于选中元素)

align_right
  描述: 右对齐选中的元素

align_top
  描述: 顶部对齐选中的元素

align_bottom
  描述: 底部对齐选中的元素

distribute_horizontally
  描述: 水平均匀分布选中的元素

distribute_vertically
  描述: 垂直均匀分布选中的元素

auto_layout
  参数:
    - algorithm* (string): 布局算法
      可选值: 'hierarchical' (分层布局), 'circular' (圆形布局)
    - direction (string): 布局方向
      可选值: 'TB' (从上到下), 'BT' (从下到上), 'LR' (从左到右), 'RL' (从右到左)
    - spacing (number): 元素间距 (default: 40)
```

#### 【template】模板操作 (1 个工具)

```
insert_template
  参数:
    - template_kind* (string): 模板类型
      可选值: approval (审批流程), decision (判断分支), workOrder (工单流转),
              crm (CRM跟进), login (登录注册流程), payment (支付流程),
              bpmnOrder (BPMN订单流程), systemArchitecture (系统架构图),
              swimlaneCollaboration (泳道协作流程)
    - offset_x (number): 水平偏移 (default: 100)
    - offset_y (number): 垂直偏移 (default: 80)
    - scale (number): 缩放因子 (default: 1, range: 0.5-2)
  返回: 插入成功/失败信息
```

#### 【text】文字操作 (2 个工具)

```
edit_text / modify_text
  参数:
    - text* (string): 新的文字内容
  返回: 修改成功/失败，修改的元素数量

set_text_style
  参数:
    - text (string): 新的文字内容 (可选)
    - font_size (number): 字号 (可选)
    - text_color (string): 文字颜色 (可选)
  返回: 修改成功/失败，修改的元素数量
```

#### 【view】视图操作 (4 个工具)

```
zoom_fit
  描述: 适应画布内容（自动缩放至最优视图）

zoom_in
  描述: 放大画布（缩放因子 +10%）

zoom_out
  描述: 缩小画布（缩放因子 -10%）

zoom_reset
  描述: 重置缩放为 100%
```

#### 【canvas】画布操作 (5 个工具)

```
clear_canvas
  描述: 清空画布上的所有元素
  参数: (无)

get_canvas_info
  描述: 获取画布信息（元素数量、缩放比例、视图范围等）
  返回: { totalElements: number, zoomLevel: number, viewBox: {...} }

list_elements
  描述: 列出画布上所有元素及其坐标、尺寸、文字内容
  返回: 元素列表 (index, name, x, y, width, height, text)

search_elements
  参数:
    - query* (string): 搜索关键词（按元素名称或文字内容搜索）
  返回: 匹配的元素列表

connect_elements
  参数:
    - from* (string): 起始元素的名称或索引
    - to* (string): 目标元素的名称或索引
  返回: 连接成功/失败信息
```

#### 【system】系统工具 (2 个工具)

```
list_tools
  描述: 列出所有可用的 Agent 工具
  参数:
    - category (string): 可选，按分类筛选
      可选值: file, edit, shape, layout, template, text, view, canvas, system
  返回: 按分类组织的工具列表

get_tool_details
  描述: 获取指定工具的完整参数说明
  参数:
    - tool_name* (string): 工具名称
  返回: 工具详情（名称、分类、描述、参数说明）
```

---

### 常用操作速查

#### 创建图形

```
# 创建单个矩形
create_shape shape_type=rectangle x=100 y=100 text=开始

# 批量创建 10 个流程节点（3列排列）
batch_create_shapes shape_type=flow_process count=10
  texts=[节点1,节点2,...,节点10] columns=3

# 创建一个红色圆形
create_shape shape_type=circle fill=#FF0000 width=150 height=150
```

#### 编辑元素

```
# 修改文字
edit_text text=新的文字内容

# 修改样式
set_shape_style fill=#00FF00 stroke=#000000 stroke_width=2

# 改位置和尺寸
set_shape_style x=200 y=300 width=200 height=100

# 修改圆角
set_shape_style corner_radius=10
```

#### 布局调整

```
# 全选后左对齐
select_all
align_left

# 垂直均匀分布
select_all
distribute_vertically

# 自动分层布局
select_all
auto_layout algorithm=hierarchical direction=TB
```

#### 查询和搜索

```
# 查询所有工具
list_tools

# 查询 shape 分类工具
list_tools category=shape

# 查看 create_shape 用法
get_tool_details tool_name=create_shape

# 搜索包含"开始"的元素
search_elements query=开始
```

#### 连接操作

```
# 连接两个元素
connect_elements from=开始 to=处理

# 连接按索引
connect_elements from=1 to=2
```

---

### 工具参数类型说明

| 类型    | 说明             | 示例                   |
| ------- | ---------------- | ---------------------- |
| string  | 字符串           | "rectangle", "red"     |
| number  | 数字             | 100, 200.5             |
| boolean | 布尔值           | true, false            |
| array   | 数组             | [1, 2, 3], ["A", "B"]  |
| enum    | 枚举（固定选项） | 见工具参数中的"可选值" |

---

### 颜色参数格式

支持的颜色格式：

- **HEX**: `#FF0000` (红色)
- **RGB**: `rgb(255, 0, 0)`
- **颜色名**: `red`, `blue`, `green` 等
- **透明度**: `rgba(255, 0, 0, 0.5)`

---

### 元素索引和名称

**按索引引用**:

```
# 画布上的元素从 1 开始编号（从上到下）
connect_elements from=1 to=2  # 第1个和第2个元素
```

**按名称引用**:

```
# 元素的默认名称是其文字内容或标签
connect_elements from=开始 to=处理

# 模糊匹配：包含"开始"的元素都会被找到
search_elements query=开始
```

---

### 返回值说明

大多数工具返回成功/失败消息：

```
{
  success: boolean,
  message: string
}
```

查询类工具返回数据：

```
list_elements → 元素列表
get_canvas_info → 画布信息对象
get_tool_details → 工具详情对象
```

---

### 版本信息

| 版本 | 工具数 | 主要功能                   |
| ---- | ------ | -------------------------- |
| v1.0 | 45     | 基础编辑、图形、布局、模板 |
| v1.1 | 47     | + 工具查询系统             |

**最后更新**: 2026-07-28  
**总工具数**: 47
