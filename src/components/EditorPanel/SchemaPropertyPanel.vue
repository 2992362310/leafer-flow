<script setup lang="ts">
import type Editor from "@/editor/editor";
import type {
  PropertyFieldContribution,
  PropertyPanelContext,
} from "@/editor/api/property-panel";

const props = defineProps<{
  editor: Editor;
  context: PropertyPanelContext;
  fields: PropertyFieldContribution[];
}>();

const sortedFields = () => [...props.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

function fieldValue(field: PropertyFieldContribution) {
  return field.getValue(props.context);
}

function updateField(field: PropertyFieldContribution, rawValue: unknown) {
  const value = normalizeValue(field, rawValue);
  field.setValue(props.context, value);
  props.editor.commitMutation();
}

function normalizeValue(field: PropertyFieldContribution, rawValue: unknown) {
  if (field.type === "number") return Number(rawValue);
  if (field.type === "checkbox") return Boolean(rawValue);
  return rawValue;
}
</script>

<template>
  <div class="space-y-2">
    <label v-for="field in sortedFields()" :key="field.key" class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">{{ field.label }}</span>
      </div>

      <textarea
        v-if="field.type === 'textarea'"
        :value="String(fieldValue(field) ?? '')"
        :placeholder="field.placeholder"
        class="textarea textarea-bordered textarea-xs min-h-16 w-full resize-y"
        @input="updateField(field, ($event.target as HTMLTextAreaElement).value)"
      ></textarea>

      <select
        v-else-if="field.type === 'select'"
        :value="String(fieldValue(field) ?? '')"
        class="select select-bordered select-xs w-full"
        @change="updateField(field, ($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="option in field.options ?? []"
          :key="String(option.value)"
          :value="String(option.value)"
        >
          {{ option.label }}
        </option>
      </select>

      <label v-else-if="field.type === 'checkbox'" class="label cursor-pointer justify-start gap-2 px-1">
        <input
          type="checkbox"
          class="toggle toggle-xs"
          :checked="Boolean(fieldValue(field))"
          @change="updateField(field, ($event.target as HTMLInputElement).checked)"
        />
        <span class="label-text text-xs">{{ Boolean(fieldValue(field)) ? "开启" : "关闭" }}</span>
      </label>

      <input
        v-else
        :type="field.type"
        :min="field.min"
        :max="field.max"
        :step="field.step"
        :value="fieldValue(field) as string | number | undefined"
        :placeholder="field.placeholder"
        :class="field.type === 'color' ? 'h-7 w-full cursor-pointer rounded border border-base-300' : 'input input-bordered input-xs w-full'"
        @input="updateField(field, ($event.target as HTMLInputElement).value)"
      />
    </label>
  </div>
</template>
