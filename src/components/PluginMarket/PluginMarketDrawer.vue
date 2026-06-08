<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Editor } from "@/editor";
import {
  disablePlugin,
  enablePlugin,
  listInstalledPlugins,
  type PluginMarketViewItem,
} from "@/editor/plugins/market/plugin-market-service";
import PluginMarketCard from "./PluginMarketCard.vue";
import PluginMarketStats from "./PluginMarketStats.vue";

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
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 pointer-events-none">
      <button
        class="absolute inset-0 bg-neutral/20 backdrop-blur-[1px] pointer-events-auto"
        aria-label="关闭插件市场"
        @click="emits('close')"
      ></button>

      <aside
        class="absolute right-0 top-0 h-full w-lg max-w-[calc(100vw-1rem)] bg-base-100 shadow-2xl border-l border-base-200 pointer-events-auto flex flex-col"
      >
        <header class="px-4 py-3 border-b border-base-200 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">插件市场</h2>
            <p class="text-xs text-base-content/60 mt-1">
              管理内置插件，启停后会即时刷新工具和图形库。
            </p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="emits('close')">✕</button>
        </header>

        <div class="p-4 border-b border-base-200 space-y-3">
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
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2 text-[11px] text-base-content/50">
              <span>能力筛选</span>
              <button
                v-if="selectedCapability !== 'all'"
                class="btn btn-ghost btn-xs h-auto min-h-0 px-1 py-0"
                @click="selectedCapability = 'all'"
              >
                清除
              </button>
            </div>
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

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <PluginMarketCard
            v-for="item in filteredItems"
            :key="item.manifest.id"
            :item="item"
            :editor-ready="Boolean(editor)"
            :pending="pendingPluginId === item.manifest.id"
            :expanded="isExpanded(item.manifest.id)"
            @toggle="handleToggle"
            @toggle-expanded="toggleExpanded"
          />

          <div
            v-if="filteredItems.length === 0"
            class="text-center text-sm text-base-content/50 py-12"
          >
            没有找到匹配的插件
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
