<script setup lang="ts">
defineProps<{
  color: string
  selected?: boolean
  label: string
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    class="swatch"
    :class="{ selected }"
    :style="{ background: color }"
    :aria-label="label"
    :aria-pressed="selected"
    @click="emit('select')"
  ></button>
</template>

<style scoped>
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0.5px solid var(--border);
  cursor: pointer;
}
.swatch:hover {
  opacity: 0.9;
}
.swatch:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.swatch.selected {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
