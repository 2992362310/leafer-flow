<script setup lang="ts">
import { nextTick, ref } from "vue";
import { formatTime } from "@/editor/utils";
import type { IconName } from "@/assets/icons";

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
  <div class="card bg-base-100 shadow-lg w-96" :class="{ 'h-12': isCollapsed }">
    <div class="card-body p-3">
      <div class="flex justify-between items-center mb-2">
        <h3 class="card-title text-sm flex items-center">
          <Icon name="info" class="h-4 w-4 mr-1" />
          事件日志
        </h3>
        <div class="flex space-x-1">
          <button
            @click="toggleCollapse"
            class="btn btn-xs btn-ghost hover:text-primary transition-colors duration-200"
            :title="isCollapsed ? '展开日志' : '折叠日志'"
          >
            <Icon :name="isCollapsed ? 'arrow-up' : 'arrow-down'" class="h-3 w-3" />
          </button>
          <button
            @click="handleClear"
            class="btn btn-xs btn-ghost hover:text-primary transition-colors duration-200"
            title="清空日志"
          >
            <Icon name="clear" class="h-3 w-3" />
            <span class="ml-1">清空</span>
          </button>
        </div>
      </div>
      <div
        v-show="!isCollapsed"
        class="text-xs space-y-1 max-h-60 overflow-y-auto event-log-container"
      >
        <div
          v-for="log in eventLog"
          :key="log.id"
          class="flex items-start p-2 rounded transition-all duration-150 ease-in-out transform hover:-translate-y-0.5"
          :class="getLogClass(log)"
        >
          <Icon
            :name="getLogIcon(log)"
            class="h-4 w-4 mr-2 mt-0.5 shrink-0"
            :class="getLogClass(log)"
          />
          <span class="mr-2 whitespace-nowrap font-mono">{{ formatTime(log.timestamp) }}</span>
          <span class="flex-1 wrap-break-word">{{ log.message }}</span>
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-400 text-center py-2">
          <Icon name="select" class="h-6 w-6 mx-auto mb-1 opacity-50" />
          暂无事件...
        </div>
      </div>
    </div>
  </div>
</template>
