<script setup lang="ts">
import { computed, ref } from "vue";
import type { ActionButtonGroupContribution, ActionButtonSurface } from "@leafer-flow/core/api/action-button";
import EditorButton from "./EditorButton.vue";

interface ActionBarSection {
  id: ActionButtonSurface;
  label: string;
  groups: ActionButtonGroupContribution[];
}

const props = defineProps<{
  sections: ActionBarSection[];
  activePanelIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  action: [command: string];
  openPluginMarket: [];
  openTemplateMarket: [];
}>();

const activeSectionId = ref<ActionButtonSurface>("edit");
const activeSection = computed(
  () => props.sections.find((section) => section.id === activeSectionId.value) ?? props.sections[0],
);
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[11px] font-semibold text-base-content/55">市场</span>
      <div class="flex gap-2">
        <button type="button" class="btn btn-sm h-9" @click="emit('openPluginMarket')">
          <Icon name="plugin" class="h-4 w-4" />插件
        </button>
        <button type="button" class="btn btn-sm h-9" @click="emit('openTemplateMarket')">
          <Icon name="template" class="h-4 w-4" />模板
        </button>
      </div>
    </div>

    <div v-if="sections.length" class="tabs tabs-boxed w-full" role="tablist" aria-label="操作分类">
      <button v-for="section in sections" :key="section.id" type="button" role="tab"
        class="tab min-w-0 flex-1 px-2 text-xs" :class="activeSection?.id === section.id ? 'tab-active' : ''"
        :aria-selected="activeSection?.id === section.id" @click="activeSectionId = section.id">
        {{ section.label }}
      </button>
    </div>

    <EditorButton v-if="activeSection" :groups="activeSection.groups" :columns="5" :active-panel-ids="activePanelIds"
      @action="emit('action', $event)" />
  </div>
</template>
