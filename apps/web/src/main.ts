import "./assets/main.css";
import { createApp } from "vue";

import App from "./App.vue";
import { Icon } from "@leafer-flow/ui/components";
import router from "./router";

const app = createApp(App);

app.component("Icon", Icon);
app.use(router);

app.mount("#app");
