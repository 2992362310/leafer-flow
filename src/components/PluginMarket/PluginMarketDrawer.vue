<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Editor } from "@/editor";
import { useDraggable } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";
import {
  disablePlugin,
  enablePlugin,
  getPluginConfig,
  listInstalledPlugins,
  type PluginMarketViewItem,
} from "@/editor/plugins/market/plugin-market-service";
import PluginMarketCard from "./PluginMarketCard.vue";
import PluginMarketStats from "./PluginMarketStats.vue";
import PluginConfigDialog from "./PluginConfigDialog.vue";

const props = defineProps<{
  editor?: Editor;
  open: boolean;
}>();

const emits = defineEmits<{
  close: [];
  changed: [item: PluginMarketViewItem];
}>();

const query = ref("");
const selectedCategory = ref("all");
const selectedStatus = ref("all");
const selectedCapability = ref("all");
const expandedPluginIds = ref<Set<string>>(new Set());
const items = ref<PluginMarketViewItem[]>([]);
const pendingPluginId = ref<string | null>(null);
const configuringPluginId = ref<string | null>(null);
const configuringPluginConfig = ref<any>(null);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("plugin-market");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth - 420, 24),
  initialY: 72,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 400,
  panelHeight: 640,
  margin: 8,
});

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase();

  return items.value.filter((item) => {
    if (!matchesCategory(item)) return false;
    if (!matchesStatus(item)) return false;
    if (!matchesCapability(item)) return false;
    if (!keyword) return true;

    const manifest = item.manifest;
    const contributionText = item.contributions.groups.flatMap((group) => [
      group.label,
      ...group.items,
    ]);
    return [
      manifest.id,
      manifest.name,
      manifest.description,
      manifest.category,
      ...(manifest.capabilities ?? []),
      ...contributionText,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });
});

const categoryOptions = computed(() => {
  const categories = new Set(items.value.map((item) => item.manifest.category).filter(Boolean));
  return ["all", ...categories] as string[];
});

const capabilityOptions = computed(() => {
  const capabilities = new Set(items.value.flatMap((item) => item.manifest.capabilities ?? []));
  return ["all", ...capabilities] as string[];
});

const marketStats = computed(() => ({
  total: items.value.length,
  active: items.value.filter((item) => item.active).length,
  required: items.value.filter((item) => item.manifest.required).length,
  propertyPanel: items.value.filter((item) => hasPropertyPanelContribution(item)).length,
  filtered: filteredItems.value.length,
}));

watch(
  () => [props.editor, props.open] as const,
  () => refreshItems(),
  { immediate: true },
);

function refreshItems() {
  items.value = listInstalledPlugins(props.editor);
}

async function handleToggle(item: PluginMarketViewItem) {
  if (!props.editor || pendingPluginId.value) return;

  pendingPluginId.value = item.manifest.id;
  const ok = item.active
    ? await disablePlugin(props.editor, item.manifest.id)
    : await enablePlugin(props.editor, item.manifest.id);

  pendingPluginId.value = null;
  refreshItems();

  const nextItem = items.value.find((entry) => entry.manifest.id === item.manifest.id) ?? item;
  if (ok) emits("changed", nextItem);
}

function matchesCategory(item: PluginMarketViewItem) {
  return selectedCategory.value === "all" || item.manifest.category === selectedCategory.value;
}

function matchesStatus(item: PluginMarketViewItem) {
  switch (selectedStatus.value) {
    case "active":
      return item.active;
    case "inactive":
      return !item.active;
    case "required":
      return Boolean(item.manifest.required);
    case "property-panel":
      return hasPropertyPanelContribution(item);
    default:
      return true;
  }
}

function matchesCapability(item: PluginMarketViewItem) {
  return (
    selectedCapability.value === "all" ||
    item.manifest.capabilities?.includes(selectedCapability.value)
  );
}

function hasPropertyPanelContribution(item: PluginMarketViewItem) {
  return (
    item.contributions.groups.some((group) => group.kind === "property-panel") ||
    item.manifest.capabilities?.some((capability) =>
      ["property-panel", "property-field"].includes(capability),
    )
  );
}

function toggleExpanded(pluginId: string) {
  const next = new Set(expandedPluginIds.value);
  if (next.has(pluginId)) next.delete(pluginId);
  else next.add(pluginId);
  expandedPluginIds.value = next;
}

function isExpanded(pluginId: string) {
  return expandedPluginIds.value.has(pluginId);
}

function capabilityLabel(capability: string) {
  const labels: Record<string, string> = {
    tool: "工具",
    shape: "图形",
    command: "命令",
    menu: "菜单",
    "action-button": "按钮",
    "view-control": "视图控件",
    "property-panel": "属性面板",
    "property-field": "字段面板",
    "canvas-overlay": "画布辅助",
    settings: "设置",
    template: "模板",
    export: "导出",
    file: "文件",
    serialization: "序列化",
  };

  return labels[capability] ?? capability;
}

function categoryLabel(category?: string) {
  const labels: Record<string, string> = {
    tool: "工具",
    shape: "图形",
    panel: "面板",
    property: "属性",
    view: "视图",
    export: "导出",
    layout: "布局",
    settings: "设置",
    template: "模板",
    utility: "辅助",
    experimental: "实验性",
  };

  return category ? (labels[category] ?? category) : "插件";
}

function handleConfigure(pluginId: string) {
  if (!props.editor) return;

  const config = getPluginConfig(props.editor, pluginId);
  if (config) {
    configuringPluginId.value = pluginId;
    configuringPluginConfig.value = config;
  }
}

function handleConfigClose() {
  configuringPluginId.value = null;
  configuringPluginConfig.value = null;
}
</script>

<template>
  <!-- 浮动面板：与 AI 助手一致，无全屏遮罩/侧栏抽屉 -->
  <div
    v-if="open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-[25rem] max-h-[calc(100vh-5rem)] flex flex-col"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200 shrink-0"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Icon name="agent" class="h-4 w-4 shrink-0" />
        <div class="min-w-0">
          <div class="text-xs font-bold leading-4">插件市场</div>
          <div class="text-[10px] text-base-content/55 truncate">启停后即时刷新工具与图形库</div>
        </div>
      </div>
      <div class="flex gap-1 shrink-0">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('plugin-market')"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="关闭" @click.stop="emits('close')" @mousedown.stop>
          ✕
        </button>
      </div>
    </div>

    <div class="p-3 border-b border-base-200 space-y-2 shrink-0">
      <PluginMarketStats
        :total="marketStats.total"
        :active="marketStats.active"
        :required="marketStats.required"
        :property-panel="marketStats.propertyPanel"
        :filtered="marketStats.filtered"
      />
      <input
        v-model="query"
        class="input input-sm input-bordered w-full"
        placeholder="搜索插件、分类、能力或贡献项..."
      />
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="capability in capabilityOptions"
          :key="capability"
          class="btn btn-xs h-6 min-h-0 rounded-full"
          :class="selectedCapability === capability ? 'btn-primary' : 'btn-ghost'"
          @click="selectedCapability = capability"
        >
          {{ capability === "all" ? "全部能力" : capabilityLabel(capability) }}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <select v-model="selectedCategory" class="select select-bordered select-xs w-full">
          <option value="all">全部分类</option>
          <option
            v-for="category in categoryOptions.filter((item) => item !== 'all')"
            :key="category"
            :value="category"
          >
            {{ categoryLabel(category) }}
          </option>
        </select>
        <select v-model="selectedStatus" class="select select-bordered select-xs w-full">
          <option value="all">全部状态</option>
          <option value="active">已启用</option>
          <option value="inactive">未启用</option>
          <option value="required">必需</option>
          <option value="property-panel">属性面板</option>
        </select>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <PluginMarketCard
        v-for="item in filteredItems"
        :key="item.manifest.id"
        :item="item"
        :editor-ready="Boolean(editor)"
        :pending="pendingPluginId === item.manifest.id"
        :expanded="isExpanded(item.manifest.id)"
        @toggle="handleToggle"
        @toggle-expanded="toggleExpanded"
        @configure="handleConfigure"
      />
      <div v-if="filteredItems.length === 0" class="text-center text-sm text-base-content/50 py-8">
        没有找到匹配的插件
      </div>
    </div>

    <PluginConfigDialog
      v-if="configuringPluginId && configuringPluginConfig"
      :plugin-id="configuringPluginId"
      :config="configuringPluginConfig"
      :editor="editor"
      @close="handleConfigClose"
    />
  </div>

  <PanelFlyoutWrapper v-if="mode === 'flyout'" panel-id="plugin-market" title="插件市场" icon="agent" :width="400">
    <div class="flex flex-col">
      <div class="p-3 border-b border-base-200 space-y-2">
        <PluginMarketStats
          :total="marketStats.total"
          :active="marketStats.active"
          :required="marketStats.required"
          :property-panel="marketStats.propertyPanel"
          :filtered="marketStats.filtered"
        />
        <input
          v-model="query"
          class="input input-sm input-bordered w-full"
          placeholder="搜索插件、分类、能力或贡献项..."
        />
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="capability in capabilityOptions"
            :key="capability"
            class="btn btn-xs h-6 min-h-0 rounded-full"
            :class="selectedCapability === capability ? 'btn-primary' : 'btn-ghost'"
            @click="selectedCapability = capability"
          >
            {{ capability === "all" ? "全部能力" : capabilityLabel(capability) }}
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-2" style="max-height: calc(100vh - 16rem)">
        <PluginMarketCard
          v-for="item in filteredItems"
          :key="item.manifest.id"
          :item="item"
          :editor-ready="Boolean(editor)"
          :pending="pendingPluginId === item.manifest.id"
          :expanded="isExpanded(item.manifest.id)"
          @toggle="handleToggle"
          @toggle-expanded="toggleExpanded"
          @configure="handleConfigure"
        />
        <div v-if="filteredItems.length === 0" class="text-center text-sm text-base-content/50 py-8">
          没有找到匹配的插件
        </div>
      </div>
    </div>
    <PluginConfigDialog
      v-if="configuringPluginId && configuringPluginConfig"
      :plugin-id="configuringPluginId"
      :config="configuringPluginConfig"
      :editor="editor"
      @close="handleConfigClose"
    />
  </PanelFlyoutWrapper>
</template>
