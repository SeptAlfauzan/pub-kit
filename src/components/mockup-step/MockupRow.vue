<script setup lang="ts">
import { ref } from 'vue'
import type Konva from 'konva'
import { useProjectStore } from '@/stores/project'
import MockupCard from './MockupCard.vue'

const store = useProjectStore()
const cards = ref<InstanceType<typeof MockupCard>[]>([])

function getStage(shotId: string): Konva.Stage | null {
  const card = cards.value.find((c) => c.shotId === shotId)
  return card?.getStage() ?? null
}

defineExpose({ getStage })
</script>

<template>
  <div class="mockup-row">
    <MockupCard
      v-for="shot in store.shots"
      :key="shot.id"
      ref="cards"
      :shot-id="shot.id"
      :shot-url="shot.url"
      :shot-name="shot.name"
    />
    <p v-if="store.shots.length === 0" class="empty-text">
      Upload screenshots in Step 2 to preview mockups here.
    </p>
  </div>
</template>

<style scoped>
.mockup-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.empty-text {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
