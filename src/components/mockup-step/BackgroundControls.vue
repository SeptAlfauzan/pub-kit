<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Swatch from '@/components/ui/Swatch.vue'

const store = useProjectStore()

const swatches = [
  { color: '#B5D4F4', text: '#042C53', label: 'Blue' },
  { color: '#9FE1CB', text: '#04342C', label: 'Teal' },
  { color: '#F5C4B3', text: '#4A1B0C', label: 'Coral' },
  { color: '#D3D1C7', text: '#2C2C2A', label: 'Gray' },
]

const customColor = ref(store.mockupSettings.bg)
const isPreset = ref(swatches.some((s) => s.color === store.mockupSettings.bg))

function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function pickSwatch(s: { color: string; text: string }) {
  customColor.value = s.color
  isPreset.value = true
  store.setMockupBg(s.color, s.text)
}

function onCustomChange(e: Event) {
  const color = (e.target as HTMLInputElement).value
  customColor.value = color
  isPreset.value = false
  const text = luminance(color) > 0.45 ? '#042C53' : '#FFFFFF'
  store.setMockupBg(color, text)
}

watch(
  () => store.mockupSettings.bg,
  (bg) => {
    customColor.value = bg
  },
)
</script>

<template>
  <div class="bg-controls">
    <div class="swatch-row">
      <Swatch
        v-for="s in swatches"
        :key="s.color"
        :color="s.color"
        :label="s.label"
        :selected="isPreset && store.mockupSettings.bg === s.color"
        @select="pickSwatch(s)"
      />
      <label
        class="color-picker"
        :class="{ selected: !isPreset }"
        :aria-label="'Custom background color'"
      >
        <i class="fa-solid fa-palette" aria-hidden="true"></i>
        <input
          type="color"
          :value="customColor"
          aria-label="Pick custom background color"
          @input="onCustomChange"
        />
      </label>
    </div>
  </div>
</template>

<style scoped>
.bg-controls {
  margin: 12px 0 18px;
}
.swatch-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.color-picker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0.5px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
  overflow: hidden;
  position: relative;
}
.color-picker:hover {
  opacity: 0.9;
}
.color-picker:focus-within {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.color-picker.selected {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
input[type='color'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
</style>
