<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Editor } from "../../editor";
import {
  disablePlugin,
  enablePlugin,
  listInstalledPlugins,
  type PluginMarketViewItem,
} from "../../editor/plugins/market/plugin-market-service";

const props = defineProps<{
  editor?: Editor;
  open: boolean;
}>();

const emits = defineEmits<{
  close: [];
  changed: [item: PluginMarketViewItem];
}>();

const query = ref("");
const items = ref<PluginMarketViewItem[]>([]);
const pendingPluginId = ref<string | null>(null);

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return items.value;

  return items.value.filter((item) => {
    const manifest = item.manifest;
    return [
      manifest.id,
      manifest.name,
      manifest.description,
      manifest.category,
      ...(manifest.capabilities ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });
});

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

function previewLabels(labels: string[], limit = 6) {
  return labels.slice(0, limit);
}

function hiddenLabelCount(labels: string[], limit = 6) {
  return Math.max(labels.length - limit, 0);
}

function categoryLabel(category?: string) {
  const labels: Record<string, string> = {
    tool: "工具",
    shape: "图形",
    panel: "面板",
    export: "导出",
    layout: "布局",
    utility: "辅助",
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
        class="absolute right-0 top-0 h-full w-[24rem] max-w-[calc(100vw-1rem)] bg-base-100 shadow-2xl border-l border-base-200 pointer-events-auto flex flex-col"
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

        <div class="p-4 border-b border-base-200">
          <input
            v-model="query"
            class="input input-sm input-bordered w-full"
            placeholder="搜索插件、分类或能力..."
          />
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <article
            v-for="item in filteredItems"
            :key="item.manifest.id"
            class="card bg-base-100 border border-base-200 shadow-sm"
          >
            <div class="card-body p-4 gap-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-semibold text-sm truncate">{{ item.manifest.name }}</h3>
                    <span
                      class="badge badge-xs"
                      :class="item.active ? 'badge-success' : 'badge-ghost'"
                    >
                      {{ item.active ? "已启用" : "未启用" }}
                    </span>
                    <span v-if="item.builtin" class="badge badge-xs badge-outline">内置</span>
                  </div>
                  <p class="text-[11px] text-base-content/50 mt-1 font-mono truncate">
                    {{ item.manifest.id }} · v{{ item.manifest.version }}
                  </p>
                </div>

                <input
                  type="checkbox"
                  class="toggle toggle-sm toggle-primary"
                  :checked="item.active"
                  :disabled="pendingPluginId === item.manifest.id || !editor"
                  @change="handleToggle(item)"
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
                  {{ capability }}
                </span>
              </div>

              <div
                v-if="
                  item.contributions.toolLabels.length ||
                  item.contributions.commandLabels.length ||
                  item.contributions.menuLabels.length ||
                  item.contributions.buttonLabels.length
                "
                class="space-y-2"
              >
                <div v-if="item.contributions.toolLabels.length" class="space-y-1">
                  <div class="text-[11px] font-medium text-base-content/60">工具贡献</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="label in previewLabels(item.contributions.toolLabels)"
                      :key="`tool-${label}`"
                      class="badge badge-xs badge-outline"
                    >
                      {{ label }}
                    </span>
                    <span
                      v-if="hiddenLabelCount(item.contributions.toolLabels)"
                      class="badge badge-xs badge-ghost"
                    >
                      +{{ hiddenLabelCount(item.contributions.toolLabels) }}
                    </span>
                  </div>
                </div>

                <div v-if="item.contributions.commandLabels.length" class="space-y-1">
                  <div class="text-[11px] font-medium text-base-content/60">命令贡献</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="label in previewLabels(item.contributions.commandLabels)"
                      :key="`command-${label}`"
                      class="badge badge-xs badge-outline"
                    >
                      {{ label }}
                    </span>
                    <span
                      v-if="hiddenLabelCount(item.contributions.commandLabels)"
                      class="badge badge-xs badge-ghost"
                    >
                      +{{ hiddenLabelCount(item.contributions.commandLabels) }}
                    </span>
                  </div>
                </div>

                <div v-if="item.contributions.menuLabels.length" class="space-y-1">
                  <div class="text-[11px] font-medium text-base-content/60">菜单贡献</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="label in previewLabels(item.contributions.menuLabels)"
                      :key="`menu-${label}`"
                      class="badge badge-xs badge-outline"
                    >
                      {{ label }}
                    </span>
                    <span
                      v-if="hiddenLabelCount(item.contributions.menuLabels)"
                      class="badge badge-xs badge-ghost"
                    >
                      +{{ hiddenLabelCount(item.contributions.menuLabels) }}
                    </span>
                  </div>
                </div>

                <div v-if="item.contributions.buttonLabels.length" class="space-y-1">
                  <div class="text-[11px] font-medium text-base-content/60">按钮贡献</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="label in previewLabels(item.contributions.buttonLabels)"
                      :key="`button-${label}`"
                      class="badge badge-xs badge-outline"
                    >
                      {{ label }}
                    </span>
                    <span
                      v-if="hiddenLabelCount(item.contributions.buttonLabels)"
                      class="badge badge-xs badge-ghost"
                    >
                      +{{ hiddenLabelCount(item.contributions.buttonLabels) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between text-[11px] text-base-content/60">
                <span
                  >工具 {{ item.contributions.tools }} · 命令 {{ item.contributions.commands }} ·
                  菜单 {{ item.contributions.menus }} · 按钮 {{ item.contributions.buttons }}</span
                >
                <span
                  v-if="pendingPluginId === item.manifest.id"
                  class="loading loading-spinner loading-xs"
                ></span>
              </div>
            </div>
          </article>

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
