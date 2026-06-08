<script setup lang="ts">
import type { PluginMarketViewItem } from "@/editor/plugins/market/plugin-market-service";
import PluginContributionGroups from "./PluginContributionGroups.vue";

const props = defineProps<{
  item: PluginMarketViewItem;
  editorReady: boolean;
  pending: boolean;
  expanded: boolean;
}>();

const emits = defineEmits<{
  toggle: [item: PluginMarketViewItem];
  toggleExpanded: [pluginId: string];
}>();

function contributionSummary(item: PluginMarketViewItem) {
  if (!item.contributions.groups.length) return "暂无贡献";
  return item.contributions.groups
    .map((group) => `${group.label.replace("贡献", "")} ${group.count}`)
    .join(" · ");
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
  <article class="card bg-base-100 border border-base-200 shadow-sm">
    <div class="card-body p-4 gap-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-semibold text-sm truncate">{{ item.manifest.name }}</h3>
            <span class="badge badge-xs" :class="item.active ? 'badge-success' : 'badge-ghost'">
              {{ item.active ? "已启用" : "未启用" }}
            </span>
            <span v-if="item.builtin" class="badge badge-xs badge-outline">内置</span>
            <span v-if="item.manifest.required" class="badge badge-xs badge-primary">必需</span>
          </div>
          <p class="text-[11px] text-base-content/50 mt-1 font-mono truncate">
            {{ item.manifest.id }} · v{{ item.manifest.version }}
          </p>
        </div>

        <input
          type="checkbox"
          class="toggle toggle-sm toggle-primary"
          :checked="item.active"
          :disabled="pending || !editorReady || item.manifest.required"
          @change="emits('toggle', item)"
        />
      </div>

      <p class="text-xs text-base-content/70 leading-relaxed">
        {{ item.manifest.description || "暂无描述" }}
      </p>

      <div class="flex items-center gap-2 flex-wrap text-[11px]">
        <span class="badge badge-sm badge-outline">{{
          categoryLabel(item.manifest.category)
        }}</span>
        <span
          v-for="capability in item.manifest.capabilities ?? []"
          :key="capability"
          class="badge badge-sm badge-ghost"
        >
          {{ capabilityLabel(capability) }}
        </span>
      </div>

      <PluginContributionGroups :groups="item.contributions.groups" />

      <div class="space-y-2 text-[11px] text-base-content/60">
        <div class="flex items-center justify-between">
          <span>{{ contributionSummary(item) }}</span>
          <span v-if="pending" class="loading loading-spinner loading-xs"></span>
        </div>
        <button
          class="btn btn-ghost btn-xs h-auto min-h-0 px-1 py-0"
          @click="emits('toggleExpanded', item.manifest.id)"
        >
          {{ expanded ? "收起详情" : "查看详情" }}
        </button>
      </div>

      <div v-if="expanded" class="rounded-lg bg-base-200/40 p-3 text-xs space-y-2">
        <div class="grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-base-content/70">
          <span class="text-base-content/50">ID</span>
          <span class="font-mono break-all">{{ item.manifest.id }}</span>
          <span class="text-base-content/50">版本</span>
          <span>{{ item.manifest.version }}</span>
          <span class="text-base-content/50">作者</span>
          <span>{{ item.manifest.author || "未注明" }}</span>
          <span class="text-base-content/50">来源</span>
          <span>{{ item.builtin ? "内置插件" : "外部插件" }}</span>
          <span class="text-base-content/50">分类</span>
          <span>{{ categoryLabel(item.manifest.category) }}</span>
          <span class="text-base-content/50">状态</span>
          <span>{{ item.manifest.required ? "必需" : item.active ? "已启用" : "未启用" }}</span>
          <span class="text-base-content/50">默认启用</span>
          <span>{{ item.manifest.enabledByDefault || item.manifest.required ? "是" : "否" }}</span>
        </div>

        <div
          v-if="item.manifest.capabilities?.length"
          class="border-t border-base-300 pt-2 space-y-1"
        >
          <div class="text-[11px] font-medium text-base-content/60">完整能力</div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="capability in item.manifest.capabilities"
              :key="`detail-capability-${capability}`"
              class="badge badge-xs badge-ghost"
            >
              {{ capabilityLabel(capability) }}
            </span>
          </div>
        </div>

        <PluginContributionGroups
          v-if="item.contributions.groups.length"
          class="border-t border-base-300 pt-2"
          :groups="item.contributions.groups"
          detailed
        />
      </div>
    </div>
  </article>
</template>
