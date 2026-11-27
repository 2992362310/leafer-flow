<script setup lang="ts">
import { nextTick, ref } from "vue";
import { formatTime } from "@leafer-flow/core/utils";
import type { IconName } from "../assets/icons";
import { useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import FloatingPanelShell from "./FloatingPanelShell.vue";

const EVENT_LOG_POSITION_KEY = "leafer-flow-event-log-position";

interface LogOptions {
  message: string;
  level?: "info" | "success" | "warning" | "error";
  command?: string;
}

interface LogEntry extends LogOptions {
  id: string;
  timestamp: Date;
}

const eventLog = ref<LogEntry[]>([]);
const isCollapsed = ref(false);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("event-log");

const { position, startDrag } = useDraggable({
  initialX: window.innerWidth - 420,
  initialY: window.innerHeight - 220,
  onDragEnd: savePosition,
});

const levelIcon: Record<NonNullable<LogOptions["level"]>, IconName> = {
  info: "info",
  success: "select",
  warning: "clear",
  error: "clear",
};

const addLog = (options: LogOptions) => {
  const newLog: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    ...options,
  };

  eventLog.value.unshift(newLog);
  if (eventLog.value.length > 50) {
    eventLog.value.splice(50);
  }

  nextTick(() => {
    const container = document.querySelector(".event-log-container");
    if (container) {
      container.scrollTop = 0;
    }
  });
};

try {
  const raw = localStorage.getItem(EVENT_LOG_POSITION_KEY);
  if (raw) {
    const saved = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof saved.x === "number" && typeof saved.y === "number") {
      position.value = { x: saved.x, y: saved.y };
    }
  }
} catch (error) {
  console.warn("读取日志面板位置失败", error);
}

function savePosition(next: { x: number; y: number }) {
  try {
    localStorage.setItem(EVENT_LOG_POSITION_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("保存日志面板位置失败", error);
  }
}

function handleClear() {
  eventLog.value = [];
  addLog({ message: "日志已清空", level: "info" });
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

const getLogClass = (log: LogEntry) => {
  switch (log.level) {
    case "success":
      return "text-green-600 bg-green-50 hover:bg-green-100";
    case "warning":
      return "text-yellow-600 bg-yellow-50 hover:bg-yellow-100";
    case "error":
      return "text-red-600 bg-red-50 hover:bg-red-100";
    default:
      return "text-gray-600 hover:bg-gray-50";
  }
};

const getLogIcon = (log: LogEntry) => {
  return levelIcon[log.level ?? "info"];
};

defineExpose({
  addLog,
});
</script>

<template>
  <FloatingPanelShell v-if="mode === 'float'" title="事件日志" icon="activity" :position="position" :width="384"
    max-height="min(50vh, 24rem)" @drag-start="startDrag">
    <template #actions>
      <button type="button" @click.stop="togglePanelDock('event-log')" class="btn btn-xs btn-ghost btn-square"
        title="收纳到右侧槽" aria-label="收纳事件日志到右侧槽">
        <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
      </button>
      <button type="button" @click.stop="toggleCollapse" class="btn btn-xs btn-ghost btn-square"
        :title="isCollapsed ? '展开日志' : '折叠日志'" :aria-label="isCollapsed ? '展开日志' : '折叠日志'"
        :aria-expanded="!isCollapsed">
        <Icon :name="isCollapsed ? 'arrow-up' : 'arrow-down'" class="h-3 w-3" />
      </button>
      <button type="button" @click.stop="handleClear" class="btn btn-xs btn-ghost" title="清空日志" aria-label="清空日志">
        <Icon name="clear" class="h-3 w-3" />
        <span class="ml-1">清空</span>
      </button>
    </template>
    <div v-show="!isCollapsed" class="event-log-container max-h-60 overflow-y-auto p-3 pt-2 text-xs" @click.stop>
      <div class="space-y-1">
        <div v-for="log in eventLog" :key="log.id" class="flex items-start rounded p-2 transition-colors"
          :class="getLogClass(log)">
          <Icon :name="getLogIcon(log)" class="h-4 w-4 mr-2 mt-0.5 shrink-0" :class="getLogClass(log)" />
          <span class="mr-2 whitespace-nowrap font-mono">{{ formatTime(log.timestamp) }}</span>
          <span class="flex-1 wrap-break-word">{{ log.message }}</span>
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-400 text-center py-2">
          <Icon name="info" class="h-6 w-6 mx-auto mb-1 opacity-50" />
          暂无事件...
        </div>
      </div>
    </div>
  </FloatingPanelShell>

  <PanelFlyoutWrapper v-else-if="mode === 'flyout'" panel-id="event-log" title="事件日志" icon="activity" :width="384">
    <div class="p-3">
      <div class="flex justify-end mb-2">
        <button class="btn btn-xs btn-ghost" @click="handleClear">
          <Icon name="clear" class="h-3 w-3" /><span class="ml-1">清空</span>
        </button>
      </div>
      <div class="text-xs space-y-1 max-h-80 overflow-y-auto">
        <div v-for="log in eventLog" :key="log.id" class="flex items-start p-2 rounded transition-colors"
          :class="getLogClass(log)">
          <Icon :name="getLogIcon(log)" class="h-4 w-4 mr-2 mt-0.5 shrink-0" :class="getLogClass(log)" />
          <span class="mr-2 whitespace-nowrap font-mono">{{ formatTime(log.timestamp) }}</span>
          <span class="flex-1 break-all">{{ log.message }}</span>
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-400 text-center py-2">
          <Icon name="info" class="h-6 w-6 mx-auto mb-1 opacity-50" />
          暂无事件...
        </div>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>
