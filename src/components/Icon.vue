<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="icon.viewBox"
    fill="none"
    stroke="currentColor"
    :class="className"
    :title="icon.title"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      :d="icon.path"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { icons, type IconName } from '@/assets/icons'

defineOptions({
  name: 'FlowIcon'
})

const props = defineProps<{
  name: IconName
  className?: string
}>()

const icon = computed(() => icons[props.name])
</script>