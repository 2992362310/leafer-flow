const AGENT_SKILLS = [
    {
        name: "create_flowchart",
        description: "创建流程图、审批流程、BPMN 或架构图",
        tools: ["get_canvas_info", "ask_user", "insert_template", "batch_create_shapes", "connect_elements", "zoom_fit"],
        steps: [
            "先查询画布并理解用户的业务步骤、分支和绘制范围；关键内容缺失时单独调用 ask_user 确认，等待回答，不要立即绘制通用模板。",
            "明确需求后简短说明节点、关系和布局思路并继续执行；不要为非关键细节反复询问。",
            "默认按用户的实际内容定制流程；仅在用户明确要求模板，或已确认预设节点和关系符合需求时使用 insert_template，不要凭主题相近套用模板或编造模板名。",
            "同类节点优先 batch_create_shapes；按宽高留出间距，竖排设置 columns=1。",
            "只用创建结果中的文档 ID 调用 connect_elements，不要用名称、序号或普通箭头替代连接。",
            "查询画布核对节点与连线，最后 zoom_fit；只报告工具实际完成的内容。",
        ],
    },
    {
        name: "edit_elements",
        description: "定位并修改文字、样式或选中的元素",
        tools: ["get_selection_info", "search_elements", "ask_user", "set_style", "modify_text"],
        steps: [
            "“选中的”先 get_selection_info，具名目标先 search_elements。",
            "目标不唯一时 ask_user 确认，不要猜测；用稳定文档 ID 作为后续 ids。",
            "文字用 modify_text，样式和位置用 set_style，不要修改渲染子元素。",
            "Schema 校验失败时修正键和值，不要忽略未知参数或原样重复失败调用。",
        ],
    },
    {
        name: "layout_diagram",
        description: "检查重叠、整理布局和连接节点",
        tools: ["get_canvas_info", "search_elements", "ask_user", "set_style", "align", "distribute", "connect_elements"],
        steps: [
            "先查询位置和尺寸；布局方向不明确时 ask_user 提供横向、纵向等选项。",
            "使用宽高加间隔计算位置，不要将多个节点设置到同一坐标。",
            "align/distribute 操作当前选区，无法准确确定选区时不要调用。",
            "先移动节点再连接；connect_elements 自动选端口，重叠报错时先修复位置。",
            "连接不保证避开其他所有节点；复杂分支需预留分支通道、调整位置并在结束前复查，不要为简化布局改用不符合需求的模板。",
        ],
    },
    {
        name: "safe_changes",
        description: "清空、删除、加载等高影响操作前的确认",
        tools: ["get_canvas_info", "get_selection_info", "ask_user", "delete", "clear_canvas", "load_file", "undo"],
        steps: [
            "先明确操作范围；需求含糊或可能覆盖现有内容时，用 ask_user 提供继续和取消选项。",
            "ask_user 必须单独调用，不要与编辑工具放在同一批请求。",
            "用户取消或没有回答时，不得继续执行修改；确认只针对当前明确的操作范围。",
            "删除只操作实际选区；不确定目标时询问而非扩展到整个画布。",
            "中断后先查询画布，已完成的修改不会自动回滚，不要盲目重复操作。",
        ],
    },
] as const;

export function getAgentSkills() {
    return AGENT_SKILLS;
}
