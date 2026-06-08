<script setup lang="ts">
import type Editor from "@/editor/editor";
import type { PropertyPanelContext, PropertyPanelContribution } from "@/editor/api/property-panel";
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import PropertySection from "@/components/EditorPanel/PropertySection.vue";

defineProps<{
  editor: Editor;
  context: PropertyPanelContext;
  panelState: EditorPanelState;
  panels: PropertyPanelContribution[];
}>();
</script>

<template>
  <PropertySection
    v-for="panel in panels"
    :key="panel.id"
    :title="panel.hideTitle ? undefined : panel.title"
  >
    <component
      :is="panel.component"
      :editor="editor"
      :context="context"
      :panel-state="panelState"
      :fields="panel.fields"
    />
  </PropertySection>
</template>
