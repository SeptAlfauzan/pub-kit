<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import Swatch from '@/components/ui/Swatch.vue'

const store = useProjectStore()

const swatches = [
  { color: '#B5D4F4', text: '#042C53', label: 'Blue' },
  { color: '#9FE1CB', text: '#04342C', label: 'Teal' },
  { color: '#F5C4B3', text: '#4A1B0C', label: 'Coral' },
  { color: '#D3D1C7', text: '#2C2C2A', label: 'Gray' },
]
</script>

<template>
  <div class="swatch-row">
    <Swatch
      v-for="s in swatches"
      :key="s.color"
      :color="s.color"
      :label="s.label"
      :selected="store.mockupSettings.bg === s.color"
      @select="store.setMockupBg(s.color, s.text)"
    />
  </div>
</template>

<style scoped>
.swatch-row {
  display: flex;
  gap: 10px;
  margin: 12px 0 18px;
}
</style>
