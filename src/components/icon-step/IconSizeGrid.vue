<script setup lang="ts">
import IconTile from './IconTile.vue'
import type { IconSizeEntry, IconResult } from '@/models/types'

defineProps<{
  title: string
  sizes: IconSizeEntry[]
  results: IconResult[]
}>()

function getUrl(key: string, results: IconResult[]): string | null {
  return results.find((r) => r.key === key)?.url ?? null
}
</script>

<template>
  <h3 class="sub-heading">{{ title }}</h3>
  <div class="icon-grid" role="list" :aria-label="`${title} grid`">
    <IconTile
      v-for="size in sizes"
      :key="size.key"
      :label="size.label"
      :size="`${size.width}×${size.height}`"
      :url="getUrl(size.key, results)"
      role="listitem"
      :aria-label="`${size.label} ${size.width} by ${size.height} pixels`"
    />
  </div>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 12px;
}
.sub-heading {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 20px 0 8px;
}
</style>
