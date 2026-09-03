<script setup lang="ts">
defineProps<{
  name: string
  width: number
  height: number
  status: 'pass' | 'warn' | 'error'
  statusMessage: string
}>()

const emit = defineEmits<{
  remove: []
}>()
</script>

<template>
  <div class="shot-row">
    <i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>
    <span class="shot-name">{{ name }}</span>
    <span class="shot-status" :class="status" role="status">
      {{ statusMessage }}
    </span>
    <button
      class="shot-remove"
      type="button"
      title="Remove"
      aria-label="Remove screenshot"
      @click="emit('remove')"
    >
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
.shot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: var(--radius);
  margin-bottom: 6px;
  font-size: 13px;
}
.shot-row i {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.shot-name {
  flex: 1;
}
.shot-status {
  font-size: 11px;
  font-family: var(--font-mono);
}
.shot-remove {
  cursor: pointer;
  color: var(--text-muted);
  background: transparent;
  border: none;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  line-height: 1;
}
.shot-remove:hover {
  color: var(--text-primary);
}
.shot-remove:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
