<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import ShotRow from '@/components/ui/ShotRow.vue'

const store = useProjectStore()
</script>

<template>
  <div>
    <ShotRow
      v-for="shot in store.shots"
      :key="shot.id"
      :name="shot.name"
      :width="shot.width"
      :height="shot.height"
      :status="shot.status"
      :status-message="shot.statusMessage"
      @remove="store.removeShot(shot.id)"
    />
    <p v-if="store.shots.length === 0" class="empty-text">No screenshots uploaded yet.</p>
  </div>
</template>

<style scoped>
.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  padding: 12px;
  text-align: center;
}
</style>
