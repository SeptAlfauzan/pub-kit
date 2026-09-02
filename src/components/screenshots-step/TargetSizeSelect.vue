<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import { TARGET_SIZES } from '@/config/store-screenshot-sizes'

const store = useProjectStore()

function onChange(e: Event) {
  store.setTargetSize(Number((e.target as HTMLSelectElement).value))
}
</script>

<template>
  <div class="size-row-header">
    <label for="target-size-select">Target size</label>
    <select id="target-size-select" :value="store.targetSizeIndex" @change="onChange">
      <option v-for="(t, i) in TARGET_SIZES" :key="t.label" :value="i">
        {{ t.label }} · {{ t.width }}×{{ t.height }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.size-row-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.size-row-header label {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.size-row-header select {
  flex: 1;
  height: var(--h-control);
  border: 0.5px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 0 10px;
  font-size: 13px;
  font-family: inherit;
  background: var(--surface-1);
  color: var(--text-primary);
  outline: none;
}
.size-row-header select:focus {
  border-color: var(--fill-primary);
}
</style>
