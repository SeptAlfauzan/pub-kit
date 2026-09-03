<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import { generateIcons } from '@/services/icon-generator'
import { IOS_ICON_SIZES } from '@/config/ios-icon-sizes'
import { ALL_ANDROID_SIZES } from '@/config/android-icon-sizes'
import { validateIconResolution } from '@/services/validation'
import Dropzone from '@/components/ui/Dropzone.vue'
import IconSizeGrid from './IconSizeGrid.vue'
import { onUnmounted, ref } from 'vue'

const store = useProjectStore()
const warning = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onUnmounted(() => {
  revokeSourceUrl()
  revokeResultUrls()
})

function revokeSourceUrl() {
  if (store.iconSource) {
    URL.revokeObjectURL(store.iconSource)
  }
}

function revokeResultUrls() {
  for (const r of store.iconResults) {
    URL.revokeObjectURL(r.url)
  }
}

async function onFiles(files: File[]) {
  const file = files[0]
  if (!file) return

  error.value = null

  const bitmap = await createImageBitmap(file)
  const validation = validateIconResolution(bitmap.width, bitmap.height)
  if (validation.status === 'warn') {
    warning.value = validation.message
  } else {
    warning.value = null
  }
  bitmap.close()

  revokeResultUrls()
  revokeSourceUrl()

  const url = URL.createObjectURL(file)
  store.setIconSource(url, file)

  loading.value = true
  try {
    const results = await generateIcons(file)
    store.setIconResults(results)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Icon generation failed'
    store.setIconResults([])
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section>
    <h2 class="panel-title">Source icon</h2>
    <p class="panel-sub">
      Upload a 1024×1024 PNG. Every store size regenerates from this one file.
    </p>

    <Dropzone label="Drop file or click to browse" accept="image/png" @files="onFiles" />

    <div v-if="warning" class="warn-text" role="alert">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      {{ warning }}
    </div>

    <div v-if="loading" aria-busy="true" role="status" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      Generating icons…
    </div>

    <div v-if="error" class="error-text" role="alert">
      <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
      {{ error }}
    </div>

    <IconSizeGrid title="iOS icons" :sizes="IOS_ICON_SIZES" :results="store.iconResults" />

    <IconSizeGrid title="Android icons" :sizes="ALL_ANDROID_SIZES" :results="store.iconResults" />
  </section>
</template>

<style scoped>
.panel-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
.panel-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}
.warn-text {
  font-size: 12px;
  color: var(--text-warning);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.loading-state {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.error-text {
  font-size: 12px;
  color: var(--text-error);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
