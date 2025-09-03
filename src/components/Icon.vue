<template>
  <svg xmlns="http://www.w3.org/2000/svg" :viewBox="icon.viewBox || '0 0 24 24'" fill="none" stroke="currentColor"
    :class="className" :title="icon.title">
    <path v-if="icon.path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon.path" />
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

interface IconData {
  path?: string
  viewBox?: string
  title?: string
}

const icon = computed<IconData>(() => {
  const iconData = icons[props.name]
  return iconData || {
    path: '',
    viewBox: '0 0 24 24',
    title: ''
  }
})
</script>
