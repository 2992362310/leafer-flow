<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { buyTemplate, listTemplateMarketItems } from "@/editor/plugins/market/plugin-market-service";

const router = useRouter();
const refreshKey = ref(0);
const allItems = computed(() => {
  refreshKey.value;
  return listTemplateMarketItems();
});

const templateGroups = computed(() => [
  {
    title: "业务流程",
    items: allItems.value.filter((item) => item.category === "business"),
  },
  {
    title: "专业图",
    items: allItems.value.filter((item) => item.category === "professional"),
  },
]);

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
          <p class="text-sm text-base-content/70">选择模板后将自动进入编辑器并插入模板。</p>
        </div>
        <button class="btn btn-primary" @click="router.push('/')">进入编辑器</button>
      </header>

      <section v-for="group in templateGroups" :key="group.title" class="space-y-3">
        <h2 class="text-lg font-semibold">{{ group.title }}</h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="item in group.items" :key="item.action" class="card bg-base-100 shadow-sm border border-base-200">
            <div class="card-body p-4">
              <h3 class="card-title text-base">{{ item.title }}</h3>
              <p class="text-sm text-base-content/70 min-h-10">{{ item.description }}</p>
              <div class="flex gap-1">
                <span class="badge badge-warning" v-if="item.premium">Pro</span>
                <span class="badge badge-success" v-if="item.purchased">已购</span>
              </div>
              <div class="card-actions justify-end">
                <button
                  v-if="item.premium && !item.purchased"
                  class="btn btn-sm btn-warning"
                  @click="purchase(item.action)"
                >
                  购买
                </button>
                <button class="btn btn-sm btn-primary" @click="useTemplate(item.action)">使用模板</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>
