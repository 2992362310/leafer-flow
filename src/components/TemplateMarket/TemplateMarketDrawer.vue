<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Editor } from "@/editor";
import { useDraggable } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";
import {
  buyTemplate,
  canUseTemplateAction,
  listTemplateMarketItems,
  type TemplateMarketItem,
} from "@/editor/plugins/market/plugin-market-service";
import TemplateMarketCard from "./TemplateMarketCard.vue";
import TemplateMarketStats from "./TemplateMarketStats.vue";

const props = defineProps<{
  editor?: Editor;
  open: boolean;
}>();

const emits = defineEmits<{
  close: [];
}>();

const query = ref("");
const selectedCategory = ref<"all" | "business" | "professional">("all");
const selectedStatus = ref<"all" | "free" | "premium" | "purchased">("all");
const refreshKey = ref(0);
const applyingAction = ref<string | null>(null);
const notice = ref("");

const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("template-market");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth - 420, 24),
  initialY: 72,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 400,
  panelHeight: 640,
  margin: 8,
});

const allItems = computed(() => {
  refreshKey.value;
  return listTemplateMarketItems();
});

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return allItems.value.filter((item) => {
    if (selectedCategory.value !== "all" && item.category !== selectedCategory.value) return false;
    if (selectedStatus.value === "free" && item.premium) return false;
    if (selectedStatus.value === "premium" && !item.premium) return false;
    if (selectedStatus.value === "purchased" && !item.purchased) return false;
    if (!keyword) return true;
    return [item.title, item.description, item.action].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
});

const marketStats = computed(() => ({
  total: allItems.value.length,
  free: allItems.value.filter((item) => !item.premium).length,
  premium: allItems.value.filter((item) => item.premium).length,
  purchased: allItems.value.filter((item) => item.purchased).length,
  filtered: filteredItems.value.length,
}));

const businessItems = computed(() =>
  filteredItems.value.filter((item) => item.category === "business"),
);
const professionalItems = computed(() =>
  filteredItems.value.filter((item) => item.category === "professional"),
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      refreshKey.value += 1;
      notice.value = "";
    }
  },
);

function purchase(action: string) {
  buyTemplate(action);
  refreshKey.value += 1;
  notice.value = "购买成功，可以插入该模板了";
}

async function useTemplate(action: string) {
  if (!canUseTemplateAction(action)) {
    notice.value = "该模板尚未购买";
    return;
  }

  const editor = props.editor;
  if (!editor) {
    notice.value = "编辑器未就绪";
    return;
  }

  applyingAction.value = action;
  try {
    const result = await editor.commands.execute(action);
    notice.value = result?.message || "模板已插入";
  } catch (error) {
    console.warn("插入模板失败", error);
    notice.value = "插入模板失败";
  } finally {
    applyingAction.value = null;
  }
}

function sectionVisible(items: TemplateMarketItem[]) {
  return selectedCategory.value === "all" ? items.length > 0 : items.length > 0;
}
</script>

<template>
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
        <Icon name="template" class="h-4 w-4 shrink-0" />
        <div class="min-w-0">
          <div class="text-xs font-bold leading-4">模板市场</div>
          <div class="text-[10px] text-base-content/55 truncate">业务流程与专业图模板</div>
        </div>
      </div>
      <div class="flex gap-1 shrink-0">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('template-market')"
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
      <TemplateMarketStats
        :total="marketStats.total"
        :free="marketStats.free"
        :premium="marketStats.premium"
        :purchased="marketStats.purchased"
        :filtered="marketStats.filtered"
      />
      <input v-model="query" class="input input-sm input-bordered w-full" placeholder="搜索模板..." />
      <div class="grid grid-cols-2 gap-2">
        <select v-model="selectedCategory" class="select select-bordered select-xs w-full">
          <option value="all">全部分类</option>
          <option value="business">业务流程</option>
          <option value="professional">专业图</option>
        </select>
        <select v-model="selectedStatus" class="select select-bordered select-xs w-full">
          <option value="all">全部状态</option>
          <option value="free">免费</option>
          <option value="premium">Pro</option>
          <option value="purchased">已购</option>
        </select>
      </div>
      <div v-if="notice" class="text-[11px] text-primary">{{ notice }}</div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-4">
      <section v-if="sectionVisible(businessItems)" class="space-y-2">
        <h3 class="text-xs font-semibold text-base-content/60">业务流程</h3>
        <TemplateMarketCard
          v-for="item in businessItems"
          :key="item.action"
          :item="item"
          :applying="applyingAction === item.action"
          @purchase="purchase"
          @use="useTemplate"
        />
      </section>

      <section v-if="sectionVisible(professionalItems)" class="space-y-2">
        <h3 class="text-xs font-semibold text-base-content/60">专业图</h3>
        <TemplateMarketCard
          v-for="item in professionalItems"
          :key="item.action"
          :item="item"
          :applying="applyingAction === item.action"
          @purchase="purchase"
          @use="useTemplate"
        />
      </section>

      <div v-if="filteredItems.length === 0" class="text-center text-sm text-base-content/50 py-8">
        没有找到匹配的模板
      </div>
    </div>
  </div>

  <PanelFlyoutWrapper v-if="mode === 'flyout'" panel-id="template-market" title="模板市场" icon="template" :width="400">
    <div class="flex flex-col">
      <div class="p-3 border-b border-base-200 space-y-2">
        <TemplateMarketStats
          :total="marketStats.total"
          :free="marketStats.free"
          :premium="marketStats.premium"
          :purchased="marketStats.purchased"
          :filtered="marketStats.filtered"
        />
        <input v-model="query" class="input input-sm input-bordered w-full" placeholder="搜索模板..." />
        <div class="grid grid-cols-2 gap-2">
          <select v-model="selectedCategory" class="select select-bordered select-xs w-full">
            <option value="all">全部分类</option>
            <option value="business">业务流程</option>
            <option value="professional">专业图</option>
          </select>
          <select v-model="selectedStatus" class="select select-bordered select-xs w-full">
            <option value="all">全部状态</option>
            <option value="free">免费</option>
            <option value="premium">Pro</option>
            <option value="purchased">已购</option>
          </select>
        </div>
        <div v-if="notice" class="text-[11px] text-primary">{{ notice }}</div>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-4" style="max-height: calc(100vh - 16rem)">
        <section v-if="sectionVisible(businessItems)" class="space-y-2">
          <h3 class="text-xs font-semibold text-base-content/60">业务流程</h3>
          <TemplateMarketCard
            v-for="item in businessItems"
            :key="item.action"
            :item="item"
            :applying="applyingAction === item.action"
            @purchase="purchase"
            @use="useTemplate"
          />
        </section>
        <section v-if="sectionVisible(professionalItems)" class="space-y-2">
          <h3 class="text-xs font-semibold text-base-content/60">专业图</h3>
          <TemplateMarketCard
            v-for="item in professionalItems"
            :key="item.action"
            :item="item"
            :applying="applyingAction === item.action"
            @purchase="purchase"
            @use="useTemplate"
          />
        </section>
        <div v-if="filteredItems.length === 0" class="text-center text-sm text-base-content/50 py-8">
          没有找到匹配的模板
        </div>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>
