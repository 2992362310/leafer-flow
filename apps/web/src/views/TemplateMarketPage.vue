<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { buyTemplate, listTemplateMarketItems } from "../editor/plugins/market/plugin-market-service";
import TemplateMarketCard from "../components/TemplateMarket/TemplateMarketCard.vue";
import TemplateMarketStats from "../components/TemplateMarket/TemplateMarketStats.vue";

const router = useRouter();
const refreshKey = ref(0);
const query = ref("");
const selectedCategory = ref<"all" | "business" | "professional">("all");
const selectedStatus = ref<"all" | "free" | "premium" | "purchased">("all");

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

function useTemplate(action: string) {
  router.push({ path: "/", query: { template: action } });
}

function purchase(action: string) {
  buyTemplate(action);
  refreshKey.value += 1;
}
</script>

<template>
  <main class="h-full overflow-y-auto bg-base-200/50">
    <div class="mx-auto max-w-6xl p-6 space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">模板市场</h1>
          <p class="text-sm text-base-content/70">
            浏览业务流程与专业图模板；编辑器内也可从操作工具打开同款面板。
          </p>
        </div>
        <button class="btn btn-primary" @click="router.push('/')">进入编辑器</button>
      </header>

      <section class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-4 space-y-3">
          <TemplateMarketStats
            :total="marketStats.total"
            :free="marketStats.free"
            :premium="marketStats.premium"
            :purchased="marketStats.purchased"
            :filtered="marketStats.filtered"
          />
          <div class="grid gap-2 md:grid-cols-3">
            <input v-model="query" class="input input-sm input-bordered w-full" placeholder="搜索模板..." />
            <select v-model="selectedCategory" class="select select-bordered select-sm w-full">
              <option value="all">全部分类</option>
              <option value="business">业务流程</option>
              <option value="professional">专业图</option>
            </select>
            <select v-model="selectedStatus" class="select select-bordered select-sm w-full">
              <option value="all">全部状态</option>
              <option value="free">免费</option>
              <option value="premium">Pro</option>
              <option value="purchased">已购</option>
            </select>
          </div>
        </div>
      </section>

      <section v-if="businessItems.length" class="space-y-3">
        <h2 class="text-lg font-semibold">业务流程</h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TemplateMarketCard
            v-for="item in businessItems"
            :key="item.action"
            :item="item"
            @purchase="purchase"
            @use="useTemplate"
          />
        </div>
      </section>

      <section v-if="professionalItems.length" class="space-y-3">
        <h2 class="text-lg font-semibold">专业图</h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TemplateMarketCard
            v-for="item in professionalItems"
            :key="item.action"
            :item="item"
            @purchase="purchase"
            @use="useTemplate"
          />
        </div>
      </section>

      <div v-if="filteredItems.length === 0" class="text-center text-sm text-base-content/50 py-12">
        没有找到匹配的模板
      </div>
    </div>
  </main>
</template>
