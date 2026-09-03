<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { FEATURE_GRAPHIC_SIZE } from '@/config/store-screenshot-sizes'
import Dropzone from '@/components/ui/Dropzone.vue'

const store = useProjectStore()

onUnmounted(() => {
  if (store.featureGraphic?.url) URL.revokeObjectURL(store.featureGraphic.url)
})

function onFiles(files: File[]) {
  const file = files[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    store.setFeatureGraphic({ file, url, width: img.naturalWidth, height: img.naturalHeight })
  }
  img.src = url
}
</script>

<template>
  <div>
    <h3 class="sub-heading">Play Store feature graphic</h3>
    <p class="feature-desc">
      A single {{ FEATURE_GRAPHIC_SIZE.width }}×{{ FEATURE_GRAPHIC_SIZE.height }} banner displayed
      at the top of your Play Store listing.
    </p>

    <Dropzone
      label="Drop banner or click to browse"
      accept="image/*"
      :inline="true"
      @files="onFiles"
    />

    <div class="feature-row">
      <i class="fa-solid fa-image" aria-hidden="true"></i>
      <span class="feature-name">
        {{ store.featureGraphic?.file.name ?? 'No banner uploaded' }}
      </span>
      <span
        v-if="store.featureGraphic"
        class="shot-status"
        :class="store.featureGraphic.status"
        role="status"
      >
        {{ store.featureGraphic.statusMessage }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.sub-heading {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 20px 0 4px;
}
.feature-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.feature-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: var(--radius);
  margin-top: 10px;
  font-size: 13px;
}
.feature-row i {
  color: var(--text-secondary);
}
.feature-name {
  flex: 1;
  color: var(--text-muted);
}
.shot-status {
  font-size: 11px;
  font-family: var(--font-mono);
}
</style>
