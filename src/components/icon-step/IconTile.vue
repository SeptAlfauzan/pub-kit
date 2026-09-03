<script setup lang="ts">
defineProps<{
  label: string
  size: string
  url?: string | null
}>()
</script>

<template>
  <div class="icon-tile-wrap">
    <div class="icon-tile">
      <img v-if="url" :src="url" :alt="`${label} ${size}`" />
      <span v-else class="icon-tile-placeholder">—</span>
    </div>
    <span class="tile-label">{{ label }}</span>
    <span class="tile-size">{{ size }}</span>
  </div>
</template>

<style scoped>
.icon-tile-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.icon-tile {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: var(--bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-accent);
}
.icon-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.icon-tile-placeholder {
  color: var(--text-muted);
  font-size: 14px;
}
.tile-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
}
.tile-size {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
</style>
