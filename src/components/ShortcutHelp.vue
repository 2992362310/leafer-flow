<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { getShortcutConfig } from "@/editor/core/shortcut-config";
import { useDraggable } from "@/composables/useDraggable";
import { usePanelDock } from "@/composables/usePanelDock";

const EVENT_NAME = "leafer-flow:toggle-shortcut-help";

const config = getShortcutConfig();
const open = ref(false);
const editing = ref(false);
const editingAction = ref<string | null>(null);
const editingKey = ref("");
const conflictError = ref("");
const { isPanelDocked, togglePanelDock } = usePanelDock();

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
  open.value = false;
  editing.value = false;
  editingAction.value = null;
}

function handleToggle() {
  open.value = !open.value;
}

onMounted(() => {
  window.addEventListener(EVENT_NAME, handleToggle);
});

onBeforeUnmount(() => {
  window.removeEventListener(EVENT_NAME, handleToggle);
});
</script>

<template>
  <div v-if="open && !isPanelDocked('shortcut-help')" class="fixed inset-0 z-[100] bg-black/30" @click.self="closePanel"
    @keydown="handleCaptureKey" tabindex="0">
    <div class="bg-base-100 shadow-2xl border border-base-200 rounded-xl w-[520px] max-h-[80vh] overflow-hidden fixed"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }">
      <div class="flex items-center justify-between px-5 py-3 border-b border-base-200 cursor-move select-none"
        @mousedown="startDrag">
        <h3 class="text-sm font-semibold">快捷键</h3>
        <div class="flex items-center gap-2">
          <button class="btn btn-xs btn-ghost btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('shortcut-help')"
            @mousedown.stop>
            <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
          </button>
          <button class="btn btn-xs" :class="editing ? 'btn-primary' : 'btn-ghost'"
            @click="editing = !editing; editingAction = null" @mousedown.stop>
            {{ editing ? "完成" : "自定义" }}
          </button>
          <button v-if="editing" class="btn btn-xs btn-ghost" title="重置为默认" @click="handleReset" @mousedown.stop>
            重置
          </button>
          <button class="btn btn-xs btn-ghost" @click="closePanel" @mousedown.stop>✕</button>
        </div>
      </div>

      <!-- 编辑提示 -->
      <div v-if="editing" class="px-5 py-2 bg-primary/5 text-xs text-primary border-b border-base-200">
        {{ editingAction ? "请按下新的快捷键组合（Esc 取消）" : "点击快捷键进行修改" }}
      </div>

      <div class="overflow-y-auto max-h-[calc(80vh-96px)] p-4 space-y-4">
        <div v-for="group in groups" :key="group.title">
          <h4 class="text-xs font-medium opacity-60 mb-2">{{ group.title }}</h4>
          <div class="space-y-1">
            <div v-for="item in group.items" :key="item.action" class="flex items-center justify-between text-xs py-1">
              <span>{{ item.label }}</span>
              <div class="flex items-center gap-2">
                <!-- 正在编辑此项 -->
                <template v-if="editingAction === item.action">
                  <span class="text-xs text-primary animate-pulse">按下快捷键...</span>
                  <span v-if="conflictError" class="text-xs text-error">{{ conflictError }}</span>
                </template>
                <!-- 显示快捷键 -->
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
  </div>
</template>
