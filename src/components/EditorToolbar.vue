<script setup lang="ts">
import { computed } from "vue";
import type { IconName } from "@/assets/icons";
import { TOOL_NAME } from "@/editor/constants";
import type { ToolToolbarGroup, ToolToolbarItem } from "@/editor/api/tool";

const props = defineProps<{
  groups?: ToolToolbarGroup[];
  selectedTool?: string;
}>();

const emit = defineEmits<{
  tool: [evt: { command: string; pre: string }];
  "update:selectedTool": [tool: string];
}>();

const currentTool = computed(() => props.selectedTool ?? TOOL_NAME.SELECT);

interface ToolItem {
  tool: string;
  icon: IconName;
  tip: string;
  shortcut?: string;
}

const selectTool: ToolItem = {
  tool: TOOL_NAME.SELECT,
  icon: "select",
  tip: "选择 (V)",
  shortcut: "V",
};

const visibleGroups = computed(() =>
  (props.groups ?? []).map((group) => ({
    ...group,
    items: toToolItems(group.items),
  })),
);

function toToolItems(items: ToolToolbarItem[]): ToolItem[] {
  return items.map((item) => ({
    tool: item.tool,
    icon: item.icon,
    tip: item.tip,
    shortcut: item.shortcut,
  }));
}

function handleClick(tool: string) {
  emit("tool", {
    command: tool,
    pre: currentTool.value,
  });
  changeTool(tool);
}

function changeTool(tool: string) {
  emit("update:selectedTool", tool);
}

function shouldCollapseGroup(items: ToolItem[]) {
  return items.length > 4;
}

function getGroupIcon(items: ToolItem[]) {
  const activeItem = items.find((item) => item.tool === currentTool.value);
  return activeItem?.icon ?? items[0]?.icon;
}

function isGroupActive(items: ToolItem[]) {
  return items.some((item) => item.tool === currentTool.value);
}

function getGroupButtonClass(items: ToolItem[]) {
  return [
    "btn",
    "btn-sm",
    "join-item",
    "relative",
    "h-9",
    "w-9",
    "px-0",
    { "btn-active": isGroupActive(items) },
  ];
}

function getButtonClass(tool: string) {
  return [
    "btn",
    "btn-sm",
    "join-item",
    "relative",
    "h-9",
    "w-9",
    "px-0",
    { "btn-active": currentTool.value === tool },
  ];
}

defineExpose({
  selectedTool: currentTool,
  changeTool,
});
</script>

<template>
  <div class="join">
    <div class="tooltip tooltip-bottom" :data-tip="selectTool.tip">
      <button
        @click.prevent="handleClick(selectTool.tool)"
        :class="getButtonClass(selectTool.tool)"
      >
        <Icon :name="selectTool.icon" class="h-5 w-5" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">
          {{ selectTool.shortcut }}
        </span>
      </button>
    </div>

    <template v-for="group in visibleGroups" :key="group.id">
      <template v-if="group.items.length > 0">
        <span class="divider divider-horizontal mx-0 my-1"></span>

        <template v-if="!shouldCollapseGroup(group.items)">
          <div
            v-for="item in group.items"
            :key="item.tool"
            class="tooltip tooltip-bottom"
            :data-tip="item.tip"
          >
            <button @click.prevent="handleClick(item.tool)" :class="getButtonClass(item.tool)">
              <Icon :name="item.icon" class="h-5 w-5" />
              <span
                v-if="item.shortcut"
                class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono"
                >{{ item.shortcut }}</span
              >
            </button>
          </div>
        </template>

        <div v-else class="dropdown dropdown-bottom">
          <div class="tooltip tooltip-bottom" :data-tip="group.title">
            <button tabindex="0" role="button" :class="getGroupButtonClass(group.items)">
              <Icon
                v-if="getGroupIcon(group.items)"
                :name="getGroupIcon(group.items)!"
                class="h-5 w-5"
              />
            </button>
          </div>
          <ul
            tabindex="0"
            class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200 max-h-[70vh] overflow-y-auto"
          >
            <li v-for="item in group.items" :key="item.tool">
              <button @click.prevent="handleClick(item.tool)" class="text-xs">
                <Icon :name="item.icon" class="h-4 w-4" />
                {{ item.tip }}
              </button>
            </li>
          </ul>
        </div>
      </template>
    </template>
  </div>
</template>
