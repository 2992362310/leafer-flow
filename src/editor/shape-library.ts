import { TOOL_NAME, type ToolName } from "./constants";
import type { ShapeLibraryItem } from "./tool-definitions";

export type { ShapeLibraryGroup, ShapeLibraryItem } from "./tool-definitions";
export { shapeLibraryGroups } from "./tool-definitions";

export const SHAPE_DROP_MIME = "application/x-leafer-flow-shape";

const shapeSearchAliases: Partial<Record<ToolName, string[]>> = {
  [TOOL_NAME.DRAW_RECT]: ["矩形", "方形", "节点", "kuang", "juxing", "fangxing"],
  [TOOL_NAME.DRAW_CIRCLE]: ["圆形", "椭圆", "事件", "yuan", "tuoyuan"],
  [TOOL_NAME.DRAW_DIAMOND]: ["菱形", "判断", "网关", "lingxing", "panduan"],
  [TOOL_NAME.DRAW_TRIANGLE]: ["三角形", "sanjiao"],
  [TOOL_NAME.DRAW_PENTAGON]: ["五边形", "wubianxing"],
  [TOOL_NAME.DRAW_HEXAGON]: ["六边形", "liubianxing"],
  [TOOL_NAME.DRAW_TEXT]: ["文本", "文字", "标签", "wenben", "wenzi"],
  [TOOL_NAME.DRAW_FREEHAND]: ["自由绘制", "手绘", "画笔", "ziyou", "shouhui", "huabi"],
  [TOOL_NAME.FLOW_START_END]: ["开始", "结束", "起止", "kaishi", "jieshu"],
  [TOOL_NAME.FLOW_PROCESS]: ["处理", "流程", "步骤", "任务", "chuli", "liucheng", "buzhou"],
  [TOOL_NAME.FLOW_DECISION]: ["判断", "条件", "分支", "菱形", "panduan", "tiaojian", "fenzhi"],
  [TOOL_NAME.FLOW_IO]: ["输入", "输出", "输入输出", "shuru", "shuchu"],
  [TOOL_NAME.FLOW_DOCUMENT]: ["文档", "文件", "wendang", "wenjian"],
  [TOOL_NAME.FLOW_DATABASE]: ["数据库", "数据", "存储", "shujuku", "shuju", "cunchu"],
  [TOOL_NAME.FLOW_SWIMLANE]: ["泳道", "职责", "部门", "yongdao", "zhize", "bumen"],
  [TOOL_NAME.FLOW_DELAY]: ["延迟", "等待", "yan chi", "dengdai"],
  [TOOL_NAME.FLOW_PREPARATION]: ["准备", "预处理", "zhunbei"],
  [TOOL_NAME.FLOW_MANUAL_INPUT]: ["手动输入", "人工输入", "shoudong", "rengong"],
  [TOOL_NAME.FLOW_MANUAL_OPERATION]: ["手动操作", "人工操作", "shoudong", "rengong"],
  [TOOL_NAME.FLOW_STORED_DATA]: ["存储数据", "数据存储", "cunchu", "shuju"],
  [TOOL_NAME.FLOW_DISPLAY]: ["显示", "展示", "xianshi", "zhanshi"],
  [TOOL_NAME.FLOW_OFF_PAGE]: ["离页连接", "跨页", "liye", "kuaye"],
  [TOOL_NAME.FLOW_MERGE]: ["合并", "汇聚", "hebing", "huiju"],
  [TOOL_NAME.FLOW_ANNOTATION]: ["注释", "备注", "说明", "zhushi", "beizhu", "shuoming"],
  [TOOL_NAME.BPMN_START_EVENT]: ["开始事件", "启动", "bpmn", "kaishi", "qidong"],
  [TOOL_NAME.BPMN_INTERMEDIATE_EVENT]: ["中间事件", "bpmn", "zhongjian"],
  [TOOL_NAME.BPMN_END_EVENT]: ["结束事件", "终止", "bpmn", "jieshu", "zhongzhi"],
  [TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY]: ["排他网关", "互斥", "判断", "bpmn", "paita", "huchi"],
  [TOOL_NAME.BPMN_PARALLEL_GATEWAY]: ["并行网关", "并发", "bpmn", "bingxing", "bingfa"],
  [TOOL_NAME.BPMN_INCLUSIVE_GATEWAY]: ["包容网关", "包含", "bpmn", "baorong", "baohan"],
  [TOOL_NAME.BPMN_TASK]: ["任务", "活动", "bpmn", "renwu", "huodong"],
  [TOOL_NAME.BPMN_DATA_OBJECT]: ["数据对象", "对象", "bpmn", "shuju", "duixiang"],
  [TOOL_NAME.BPMN_DATA_STORE]: ["数据存储", "数据库", "bpmn", "shuju", "cunchu"],
  [TOOL_NAME.ARCH_ACTOR]: ["用户", "参与者", "角色", "yonghu", "juese"],
  [TOOL_NAME.ARCH_USE_CASE]: ["用例", "场景", "yongli", "changjing"],
  [TOOL_NAME.ARCH_COMPONENT]: ["组件", "模块", "zujian", "mokuai"],
  [TOOL_NAME.ARCH_PACKAGE]: ["包", "分组", "bao", "fenzu"],
  [TOOL_NAME.ARCH_NODE]: ["部署节点", "服务器", "主机", "fuwuqi", "zhuji"],
  [TOOL_NAME.ARCH_QUEUE]: ["队列", "消息队列", "mq", "duilie"],
  [TOOL_NAME.ARCH_CACHE]: ["缓存", "redis", "cache", "huancun"],
  [TOOL_NAME.ARCH_CLOUD]: ["云", "云服务", "cloud", "yun"],
  [TOOL_NAME.ARCH_SERVICE]: ["服务", "微服务", "接口", "fuwu", "weifuwu", "jiekou"],
  [TOOL_NAME.ARCH_DEVICE]: ["设备", "终端", "shebei", "zhongduan"],
};

export function getShapeLibrarySearchText(item: ShapeLibraryItem) {
  const aliases = shapeSearchAliases[item.tool as ToolName] ?? [];
  return [item.label, item.tool, ...item.keywords, ...aliases].join(" ").toLowerCase();
}
