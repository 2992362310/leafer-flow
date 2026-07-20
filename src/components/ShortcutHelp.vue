<script setup lang="ts">
import { ref, watch } from "vue";
import { getShortcutConfig } from "@/editor/core/shortcut-config";
import { useDraggable } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const config = getShortcutConfig();
const editing = ref(false);
const editingAction = ref<string | null>(null);
const editingKey = ref("");
const conflictError = ref("");
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("shortcut-help");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth / 2 - 260, 8),
  initialY: Math.max(window.innerHeight / 2 - 320, 8),
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 520,
  panelHeight: 640,
  margin: 8,
});

interface ShortcutGroup {
  title: string;
  items: { action: string; label: string }[];
}

const groups: ShortcutGroup[] = [
  {
    title: "通用",
    items: [
      { action: "undo", label: "撤销" },
      { action: "redo", label: "重做" },
      { action: "save", label: "保存文件" },
      { action: "find", label: "搜索元素" },
      { action: "toggleShortcutHelp", label: "快捷键帮助" },
      { action: "openAgent", label: "AI 助手" },
    ],
  },
  {
    title: "剪贴板",
    items: [
      { action: "copy", label: "复制" },
      { action: "cut", label: "剪切" },
      { action: "paste", label: "粘贴" },
      { action: "duplicate", label: "原位复制" },
      { action: "formatPainterCopy", label: "复制样式" },
      { action: "formatPainterApply", label: "应用样式" },
    ],
  },
  {
    title: "选择",
    items: [
      { action: "selectAll", label: "全选" },
      { action: "delete", label: "删除选中" },
      { action: "select", label: "切换到选择工具" },
    ],
  },
  {
    title: "布局与图层",
    items: [
      { action: "group", label: "编组" },
      { action: "ungroup", label: "取消编组" },
      { action: "bringForward", label: "上移一层" },
      { action: "sendBackward", label: "下移一层" },
      { action: "bringToFront", label: "置于顶层" },
      { action: "sendToBack", label: "置于底层" },
      { action: "lockSelected", label: "锁定选中" },
      { action: "unlockSelected", label: "解锁选中" },
      { action: "unlockAll", label: "解锁所有元素" },
      { action: "toggleVisible", label: "切换显示/隐藏" },
    ],
  },
  {
    title: "绘图工具",
    items: [
      { action: "draw_rect", label: "矩形" },
      { action: "draw_circle", label: "圆形" },
      { action: "draw_diamond", label: "菱形" },
      { action: "draw_triangle", label: "三角形" },
      { action: "draw_hexagon", label: "六边形" },
      { action: "draw_arrow", label: "连接线" },
      { action: "draw_text", label: "文本" },
      { action: "draw_freehand", label: "自由绘制" },
    ],
  },
  {
    title: "流程图节点",
    items: [
      { action: "flow_start_end", label: "开始/结束" },
      { action: "flow_process", label: "处理" },
      { action: "flow_decision", label: "判断" },
      { action: "flow_io", label: "输入/输出" },
      { action: "flow_document", label: "文档" },
      { action: "flow_database", label: "数据库" },
      { action: "flow_subprocess", label: "子流程" },
      { action: "flow_connector", label: "连接点" },
      { action: "flow_swimlane", label: "泳道" },
    ],
  },
];

function getKeyForAction(action: string): string {
  const key = config.getByAction(action);
  return key ? formatKey(key) : "—";
}

function formatKey(key: string): string {
  return key
    .split("+")
    .map((part) => {
      if (part === "ctrl") return "Ctrl";
      if (part === "shift") return "Shift";
      if (part === "alt") return "Alt";
      if (part === "escape") return "Esc";
      if (part === "delete") return "Del";
      if (part === "backspace") return "⌫";
      if (part === "arrowleft") return "←";
      if (part === "arrowright") return "→";
      if (part === "arrowup") return "↑";
      if (part === "arrowdown") return "↓";
      if (part === "f1") return "F1";
      return part.toUpperCase();
    })
    .join("+");
}

function startEdit(action: string) {
  if (!editing.value) return;
  editingAction.value = action;
  editingKey.value = "";
  conflictError.value = "";
}

function handleCaptureKey(e: KeyboardEvent) {
  if (!editingAction.value) return;
  e.preventDefault();
  e.stopPropagation();

  if (e.key === "Escape") {
    editingAction.value = null;
    return;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");

  let key = e.key.toLowerCase();
  if (key === " ") key = "space";

  if (parts.length > 0 && !parts.includes(key)) {
    parts.push(key);
  } else if (parts.length === 0) {
    parts.push(key);
  }

  const normalized = parts.join("+");

  // 检查冲突
  const existing = config.getByKey(normalized);
  if (existing && existing.action !== editingAction.value) {
    conflictError.value = `已被「${existing.action}」占用`;
    editingKey.value = normalized;
    return;
  }

  // 保存
  const success = config.setShortcut(editingAction.value, normalized);
  if (success) {
    editingAction.value = null;
    editingKey.value = "";
    conflictError.value = "";
  }
}

function handleReset() {
  config.resetToDefaults();
  editingAction.value = null;
}

function closePanel() {
  editing.value = false;
  editingAction.value = null;
  emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      editing.value = false;
      editingAction.value = null;
    }
  },
);
</script>

<template>
  <!-- 浮动面板：与 AI 助手一致，无全屏遮罩 -->
  <div
    v-if="props.open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-[32rem] max-h-[80vh] flex flex-col"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    tabindex="0"
    @keydown="handleCaptureKey"
    @click.stop
  >
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200 shrink-0"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2">
        <Icon name="info" class="h-4 w-4" />
        <span class="text-xs font-bold">快捷键</span>
      </div>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('shortcut-help')"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button
          class="btn btn-xs"
          :class="editing ? 'btn-primary' : 'btn-ghost'"
          @click.stop="editing = !editing; editingAction = null"
          @mousedown.stop
        >
          {{ editing ? "完成" : "自定义" }}
        </button>
        <button
          v-if="editing"
          class="btn btn-ghost btn-xs"
          title="重置为默认"
          @click.stop="handleReset"
          @mousedown.stop
        >
          重置
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="关闭" @click.stop="closePanel" @mousedown.stop>
          ✕
        </button>
      </div>
    </div>

    <div v-if="editing" class="px-4 py-2 bg-primary/5 text-xs text-primary border-b border-base-200 shrink-0">
      {{ editingAction ? "请按下新的快捷键组合（Esc 取消）" : "点击快捷键进行修改" }}
    </div>

    <div class="overflow-y-auto flex-1 p-4 space-y-4">
      <div v-for="group in groups" :key="group.title">
        <h4 class="text-xs font-medium opacity-60 mb-2">{{ group.title }}</h4>
        <div class="space-y-1">
          <div v-for="item in group.items" :key="item.action" class="flex items-center justify-between text-xs py-1">
            <span>{{ item.label }}</span>
            <div class="flex items-center gap-2">
              <template v-if="editingAction === item.action">
                <span class="text-xs text-primary animate-pulse">按下快捷键...</span>
                <span v-if="conflictError" class="text-xs text-error">{{ conflictError }}</span>
              </template>
              <kbd
                v-else
                class="kbd kbd-xs bg-base-200"
                :class="editing ? 'cursor-pointer hover:bg-primary/20' : ''"
                @click="startEdit(item.action)"
              >
                {{ getKeyForAction(item.action) }}
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <PanelFlyoutWrapper v-else-if="mode === 'flyout'" panel-id="shortcut-help" title="快捷键" icon="info" :width="480">
    <div class="p-1">
      <div class="flex items-center justify-between border-b border-base-200 px-4 py-2">
        <button class="btn btn-xs" :class="editing ? 'btn-primary' : 'btn-ghost'"
          @click="editing = !editing; editingAction = null">
          {{ editing ? "完成" : "自定义" }}
        </button>
        <button v-if="editing" class="btn btn-xs btn-ghost" @click="handleReset">重置</button>
      </div>
      <div v-if="editing" class="px-4 py-2 bg-primary/5 text-xs text-primary border-b border-base-200">
        {{ editingAction ? "请按下新的快捷键组合（Esc 取消）" : "点击快捷键进行修改" }}
      </div>
      <div class="overflow-y-auto p-4 space-y-4">
        <div v-for="group in groups" :key="group.title">
          <h4 class="text-xs font-medium opacity-60 mb-2">{{ group.title }}</h4>
          <div class="space-y-1">
            <div v-for="item in group.items" :key="item.action" class="flex items-center justify-between text-xs py-1">
              <span>{{ item.label }}</span>
              <div class="flex items-center gap-2">
                <template v-if="editingAction === item.action">
                  <span class="text-xs text-primary animate-pulse">按下快捷键...</span>
                  <span v-if="conflictError" class="text-xs text-error">{{ conflictError }}</span>
                </template>
                <kbd v-else class="kbd kbd-xs bg-base-200" :class="editing ? 'cursor-pointer hover:bg-primary/20' : ''"
                  @click="startEdit(item.action)">
                  {{ getKeyForAction(item.action) }}
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>
