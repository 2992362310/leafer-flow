<script setup lang="ts">
import type { ActionButtonGroupContribution } from "@/editor/api/action-button";
import Icon from "./Icon.vue";

const props = defineProps<{
  groups: ActionButtonGroupContribution[];
}>();

const emits = defineEmits<{
  action: [action: string];
}>();

function handleClick(action: string) {
  emits("action", action);
}
</script>

<template>
  <div class="join">
    <template v-for="group in props.groups" :key="group.id">
      <template v-if="(group.kind ?? 'button') === 'button'">
        <div
          v-for="item in group.items"
          :key="item.id"
          class="tooltip tooltip-bottom"
          :data-tip="item.label"
        >
          <button
            @click="handleClick(item.command)"
            class="btn btn-sm join-item h-9 w-9 px-0"
            :class="
              item.danger
                ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
                : undefined
            "
          >
            <Icon :name="item.icon ?? group.icon" class="h-5 w-5" />
          </button>
        </div>
      </template>

      <div v-else-if="group.kind === 'dropdown'" class="dropdown dropdown-bottom">
        <div class="tooltip tooltip-bottom" :data-tip="group.label">
          <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
            <Icon :name="group.icon" class="h-5 w-5" />
          </button>
        </div>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-100 rounded-box z-20 w-44 p-2 shadow border border-base-200"
        >
          <li v-for="item in group.items" :key="item.id">
            <button @click="handleClick(item.command)" class="text-xs">
              <Icon :name="item.icon ?? group.icon" class="h-4 w-4" />
              {{ item.label }}
            </button>
          </li>
        </ul>
      </div>
      <div v-else-if="group.kind === 'panel'" class="dropdown dropdown-bottom dropdown-end">
        <div class="tooltip tooltip-bottom" :data-tip="group.label">
          <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
            <Icon :name="group.icon" class="h-5 w-5" />
          </button>
        </div>
        <div
          tabindex="0"
          class="dropdown-content bg-base-100 rounded-box z-20 w-56 p-3 shadow border border-base-200"
        >
          <div
            v-for="panelItem in group.panelItems ?? []"
            :key="panelItem.id"
            class="mb-3 last:mb-0"
          >
            <template v-if="panelItem.kind === 'select'">
              <div class="text-xs font-medium mb-2">{{ panelItem.label }}</div>
              <div class="join w-full">
                <button
                  v-for="option in panelItem.options"
                  :key="String(option.value)"
                  class="btn btn-xs join-item flex-1"
                  :class="{ 'btn-primary': panelItem.getValue() === option.value }"
                  @click="panelItem.setValue(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </template>

            <template v-else-if="panelItem.kind === 'range'">
              <div class="flex items-center justify-between text-xs font-medium mb-2">
                <span>{{ panelItem.label }}</span>
                <span class="tabular-nums">
                  {{ panelItem.formatValue?.(panelItem.getValue()) ?? panelItem.getValue() }}
                </span>
              </div>
              <input
                type="range"
                :min="panelItem.min"
                :max="panelItem.max"
                :step="panelItem.step"
                :value="panelItem.getValue()"
                @input="(e) => panelItem.setValue(Number((e.target as HTMLInputElement).value))"
                class="range range-xs"
              />
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
