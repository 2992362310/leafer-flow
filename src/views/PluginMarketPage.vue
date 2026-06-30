<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { buyPlugin, listInstalledPlugins } from "@/editor/plugins/market/plugin-market-service";

const router = useRouter();
const refreshKey = ref(0);
const items = computed(() => {
  refreshKey.value;
  return listInstalledPlugins();
});

const activeCount = computed(() => items.value.filter((item) => item.enabled).length);
const requiredCount = computed(() => items.value.filter((item) => item.manifest.required).length);

function handleBuy(pluginId: string) {
  buyPlugin(pluginId);
  refreshKey.value += 1;
}
</script>

<template>
  <main class="h-full overflow-y-auto bg-base-200/50">
    <div class="mx-auto max-w-6xl p-6 space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">插件市场</h1>
          <p class="text-sm text-base-content/70">浏览插件能力与默认启用状态，进入编辑器后可实时启停。</p>
        </div>
        <button class="btn btn-primary" @click="router.push('/')">进入编辑器</button>
      </header>

      <section class="stats w-full shadow bg-base-100">
        <div class="stat">
          <div class="stat-title">插件总数</div>
          <div class="stat-value text-primary">{{ items.length }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">默认启用</div>
          <div class="stat-value">{{ activeCount }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">必需插件</div>
          <div class="stat-value">{{ requiredCount }}</div>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="item in items" :key="item.manifest.id" class="card bg-base-100 shadow-sm border border-base-200">
          <div class="card-body p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <h2 class="card-title text-base">{{ item.manifest.name }}</h2>
              <span class="badge" :class="item.enabled ? 'badge-success' : 'badge-ghost'">
                {{ item.enabled ? '默认启用' : '默认关闭' }}
              </span>
            </div>
            <p class="text-sm text-base-content/70">{{ item.manifest.description }}</p>
            <div class="text-xs text-base-content/60">{{ item.manifest.id }}</div>
            <div class="flex flex-wrap gap-1 pt-1">
              <span class="badge badge-outline" v-if="item.manifest.required">required</span>
              <span class="badge badge-warning" v-if="item.premium">Pro</span>
              <span class="badge badge-success" v-if="item.purchased">已购</span>
              <span class="badge badge-outline" v-for="cap in item.manifest.capabilities ?? []" :key="cap">{{ cap }}</span>
            </div>
            <div class="card-actions justify-end" v-if="item.premium && !item.purchased">
              <button class="btn btn-xs btn-warning" @click="handleBuy(item.manifest.id)">购买</button>
            </div>
          </div>
        </article>
      </section>
    </div>
  </main>
</template>
