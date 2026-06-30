import { createRouter, createWebHashHistory } from "vue-router";

import EditorPage from "@/views/EditorPage.vue";
import PluginMarketPage from "@/views/PluginMarketPage.vue";
import TemplateMarketPage from "@/views/TemplateMarketPage.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "editor",
      component: EditorPage,
    },
    {
      path: "/plugin-market",
      name: "plugin-market",
      component: PluginMarketPage,
    },
    {
      path: "/template-market",
      name: "template-market",
      component: TemplateMarketPage,
    },
  ],
});

export default router;
