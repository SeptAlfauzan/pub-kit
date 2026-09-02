<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import Toggle from '@/components/ui/Toggle.vue'

const store = useProjectStore()

const frameOptions = [
  { value: 'phone' as const, label: 'Phone', icon: 'fa-solid fa-mobile-screen-button' },
  { value: 'tablet' as const, label: 'Tablet', icon: 'fa-solid fa-tablet-screen-button' },
  { value: 'none' as const, label: 'None', icon: 'fa-regular fa-square' },
]
</script>

<template>
  <Toggle
    :model-value="store.mockupSettings.frame"
    :options="frameOptions"
    @update:model-value="store.setMockupFrame"
  />
</template>
