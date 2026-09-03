<script setup lang="ts">
defineProps<{
  disabled?: boolean
  exporting?: boolean
}>()

const emit = defineEmits<{
  export: []
}>()
</script>

<template>
  <button class="btn-primary" :disabled="disabled || exporting" @click="emit('export')">
    <i class="fa-solid fa-download" aria-hidden="true"></i>
    {{ exporting ? 'Exporting…' : 'Export all' }}
  </button>
</template>

<style scoped>
.btn-primary {
  background: var(--fill-primary);
  color: var(--on-primary);
  border: none;
  height: var(--h-control);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
