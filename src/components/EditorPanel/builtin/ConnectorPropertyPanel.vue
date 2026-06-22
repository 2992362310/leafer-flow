<script setup lang="ts">
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import ConnectorPropertyPanel from "@/components/EditorPanel/ConnectorPropertyPanel.vue";

defineOptions({ inheritAttrs: false });

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <ConnectorPropertyPanel
    :route-type="panelState.routeType.value"
    :arrow-mode="panelState.arrowMode.value"
    :line-dashed="panelState.lineDashed.value"
    :line-corner-radius="panelState.lineCornerRadius.value"
    :from-side="panelState.fromSide.value"
    :to-side="panelState.toSide.value"
    :connector-description="panelState.connectorDescription.value"
    :show-description="!panelState.isMultiSelection.value"
    :has-connector-label="panelState.hasConnectorLabel.value"
    :connector-label-text="panelState.connectorLabelText.value"
    @update-route-type="panelState.updateRouteType"
    @update-arrow-mode="panelState.updateArrowMode"
    @update-line-dashed="panelState.updateLineDashed"
    @update-line-corner-radius="panelState.updateLineCornerRadius"
    @update-connector-side="panelState.updateConnectorSide"
    @update-connector-description="panelState.updateConnectorDescription"
    @update-connector-label-text="panelState.updateConnectorLabelText"
  />
</template>
