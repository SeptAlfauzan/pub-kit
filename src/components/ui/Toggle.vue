<script setup lang="ts" generic="T extends string">
const props = defineProps<{
  modelValue: T
  options: { value: T; label: string; icon?: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

function onKeydown(e: KeyboardEvent) {
  const index = props.options.findIndex((o) => o.value === props.modelValue)
  if (index === -1) return
  const next =
    e.key === 'ArrowLeft' || e.key === 'ArrowUp'
      ? (index - 1 + props.options.length) % props.options.length
      : e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (index + 1) % props.options.length
        : -1
  if (next === -1) return
  e.preventDefault()
  emit('update:modelValue', props.options[next]!.value)
}
</script>

<template>
  <div class="toggle-group" role="radiogroup" @keydown="onKeydown">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="toggle-btn"
      :class="{ selected: modelValue === opt.value }"
      role="radio"
      :aria-checked="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      <i v-if="opt.icon" :class="opt.icon" aria-hidden="true"></i>
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.toggle-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.toggle-btn {
  cursor: pointer;
  font: inherit;
  background: var(--surface-2);
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 12px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.toggle-btn:hover {
  background: var(--fill-ghost-hover);
}
.toggle-btn:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.toggle-btn.selected {
  border: 2px solid var(--fill-primary);
  color: var(--text-accent);
}
</style>
