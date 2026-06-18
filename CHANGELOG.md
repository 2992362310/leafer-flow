# Changelog

## Unreleased

### Added
- **剪切** (Ctrl+X)：复制选中元素并删除原元素
- **原位复制** (Ctrl+D)：复制并粘贴到偏移位置，一步完成
- **右键菜单增强**：新增剪切、原位复制、上移一层、下移一层、锁定/解锁
- **画布搜索** (Ctrl+F)：按文字内容搜索元素并定位选中
- **图片插入**：从本地选择图片插入画布
- **Agent 新增工具**：search_elements（搜索元素）、connect_elements（连接元素）

### Fixed
- Agent set_style 工具现在正确处理 Group 元素（样式应用到形状子元素）
- Agent set_style 支持更多属性：位置、尺寸、旋转、圆角
- Agent 新增 modify_text 工具用于修改文字内容和样式
- Agent get_selection_info 显示 Group 子元素结构
- 拖动/缩放/旋转元素时隐藏编辑框矩形（紫色边框）

## Previous

### Added
- AI 助手插件，支持自然语言指令编辑流程图
- Agent 折叠状态支持拖动
- Markdown 渲染支持
