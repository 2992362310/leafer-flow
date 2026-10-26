<script setup lang="ts">
import type { TemplateMarketItem } from "../../editor/plugins/market/plugin-market-service";

defineProps<{
  item: TemplateMarketItem;
  applying?: boolean;
}>();

const emits = defineEmits<{
  purchase: [action: string];
  use: [action: string];
}>();

function categoryLabel(category: TemplateMarketItem["category"]) {
  return category === "business" ? "业务流程" : "专业图";
}
</script>

<template>
  <article class="card bg-base-100 border border-base-200 shadow-sm">
    <div class="card-body p-3 gap-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3 class="font-semibold text-sm truncate">{{ item.title }}</h3>
            <span class="badge badge-xs badge-outline">{{ categoryLabel(item.category) }}</span>
            <span v-if="item.premium" class="badge badge-xs badge-warning">Pro</span>
            <span v-if="item.purchased" class="badge badge-xs badge-success">已购</span>
          </div>
          <p class="text-[11px] text-base-content/60 mt-1 min-h-8">{{ item.description }}</p>
        </div>
      </div>

      <div class="card-actions justify-end mt-1">
        <button
          v-if="item.premium && !item.purchased"
          class="btn btn-xs btn-warning"
          @click="emits('purchase', item.action)"
        >
          购买
        </button>
        <button
          class="btn btn-xs btn-primary"
          :disabled="applying || (item.premium && !item.purchased)"
          @click="emits('use', item.action)"
        >
          {{ applying ? "插入中..." : "使用模板" }}
        </button>
      </div>
    </div>
  </article>
</template>
