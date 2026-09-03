<script setup lang="ts">
defineProps<{
  label: string
  multiple?: boolean
  accept?: string
  inline?: boolean
}>()

const emit = defineEmits<{
  files: [files: File[]]
}>()

function onDrop(e: DragEvent) {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length) emit('files', files)
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length) emit('files', files)
  input.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).querySelector('input')?.click()
  }
}
</script>

<template>
  <label
    class="dropzone"
    :class="{ inline }"
    tabindex="0"
    role="button"
    :aria-label="label"
    @drop="onDrop"
    @dragover.prevent
    @keydown="onKeydown"
  >
    <slot name="icon">
      <i class="fa-solid fa-upload" aria-hidden="true"></i>
    </slot>
    <span>{{ label }}</span>
    <input
      type="file"
      :accept
      :multiple
      @change="onChange"
      tabindex="-1"
      aria-hidden="true"
    />
  </label>
</template>

<style scoped>
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 22px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  transition: background 0.15s, border-color 0.15s;
}
.dropzone:hover,
.dropzone:focus-visible {
  border-color: var(--fill-primary);
  background: var(--fill-ghost-hover);
  outline: none;
}
.dropzone.inline {
  flex-direction: row;
  padding: 14px 16px;
}
input[type='file'] {
  display: none;
}
</style>
