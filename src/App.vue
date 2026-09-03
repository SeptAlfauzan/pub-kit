<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import StepRail from '@/components/StepRail.vue'
import ExportButton from '@/components/ExportButton.vue'
import Dropzone from '@/components/ui/Dropzone.vue'
import IconUploader from '@/components/icon-step/IconUploader.vue'
import TargetSizeSelect from '@/components/screenshots-step/TargetSizeSelect.vue'
import ShotList from '@/components/screenshots-step/ShotList.vue'
import FeatureGraphic from '@/components/screenshots-step/FeatureGraphic.vue'
import FrameControls from '@/components/mockup-step/FrameControls.vue'
import BackgroundControls from '@/components/mockup-step/BackgroundControls.vue'
import MockupRow from '@/components/mockup-step/MockupRow.vue'
import AppStoreCard from '@/components/store-preview-step/AppStoreCard.vue'
import GooglePlayCard from '@/components/store-preview-step/GooglePlayCard.vue'
import { exportAll } from '@/services/zip-exporter'
import { stageToPng, renderStoreShot } from '@/services/mockup-composer'

const store = useProjectStore()
const exporting = ref(false)
const previewStore = ref<'ios' | 'android'>('ios')
const mockupRowRef = ref<InstanceType<typeof MockupRow> | null>(null)

function addShots(files: File[]) {
  for (const file of files) {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      store.addShot({
        id: `shot-${Date.now()}-${file.name}`,
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        file,
        url,
      })
    }
    img.src = url
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const mockupImages: { id: string; blob: Blob; name: string }[] = []
    const storeScreenshots: { id: string; blob: Blob; name: string }[] = []
    const shotPromises = store.shots.map(async (shot) => {
      const framed = await renderStoreShot({
        shotUrl: shot.url,
        bg: store.mockupSettings.bg,
        frame: store.mockupSettings.frame,
      })
      storeScreenshots.push({ id: shot.id, blob: framed, name: shot.name })

      if (store.readySteps.mockup && mockupRowRef.value) {
        const stage = mockupRowRef.value.getStage(shot.id)
        if (stage) {
          const blob = await stageToPng(stage)
          mockupImages.push({ id: shot.id, blob, name: shot.name })
        }
      }
    })
    await Promise.all(shotPromises)

    const blob = await exportAll({
      iconResults: store.iconResults,
      shots: store.shots,
      featureGraphic: store.featureGraphic?.file ?? null,
      mockupImages,
      storeScreenshots,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.appName.replace(/\s+/g, '-').toLowerCase()}-assets.zip`
    a.click()
    URL.revokeObjectURL(url)
    store.setStoreReady()
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="app-card">
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        </div>
        <div>
          <div class="logo-title">PubKit</div>
          <div class="logo-sub">Project · {{ store.appName }}</div>
        </div>
      </div>
      <ExportButton
        :disabled="store.readyCount < 3"
        :exporting="exporting"
        @export="handleExport"
      />
    </div>
    <hr class="divider" />

    <div class="layout">
      <StepRail />
      <div class="panel">
        <section v-if="store.currentStep === 'icon'" id="panel-icon">
          <IconUploader />
        </section>

        <section v-else-if="store.currentStep === 'shots'" id="panel-shots">
          <h2 class="panel-title">Raw screenshots</h2>
          <p class="panel-sub">
            Pick a target size first, then upload. Each file is validated against it automatically.
          </p>
          <TargetSizeSelect />
          <Dropzone
            label="Drop files or click to browse"
            accept="image/*"
            :multiple="true"
            @files="addShots"
          />
          <ShotList style="margin-top: 12px" />
          <FeatureGraphic />
        </section>

        <section v-else-if="store.currentStep === 'mockup'" id="panel-mockup">
          <h2 class="panel-title">Marketing mockup</h2>
          <p class="panel-sub">
            Frame and background apply to every screen. Edit each headline individually.
          </p>
          <FrameControls />
          <BackgroundControls />
          <MockupRow ref="mockupRowRef" />
        </section>

        <section v-else-if="store.currentStep === 'store'" id="panel-store">
          <h2 class="panel-title">Store listing preview</h2>
          <p class="panel-sub">How your icon and screenshots read on each store's product page.</p>
          <div class="store-toggle-row">
            <button
              class="toggle-btn"
              :class="{ selected: previewStore === 'ios' }"
              @click="previewStore = 'ios'"
            >
              App Store
            </button>
            <button
              class="toggle-btn"
              :class="{ selected: previewStore === 'android' }"
              @click="previewStore = 'android'"
            >
              Google Play
            </button>
          </div>
          <AppStoreCard v-if="previewStore === 'ios'" />
          <GooglePlayCard v-else />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-card {
  max-width: 860px;
  margin: 0 auto;
  background: var(--surface-1);
  border-radius: 16px;
  border: 0.5px solid var(--border);
  padding: 24px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--fill-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo i {
  font-size: 15px;
  color: var(--on-primary);
}
.logo-title {
  font-size: 16px;
  font-weight: 500;
}
.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
}
hr.divider {
  border: none;
  border-top: 0.5px solid var(--border);
  margin-bottom: 1.25rem;
}
.layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.panel {
  flex: 1;
  min-width: 0;
}
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
.store-toggle-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.toggle-btn {
  cursor: pointer;
  font: inherit;
  background: var(--surface-2);
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 12px;
  color: var(--text-primary);
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

<style scoped>
.app-card {
  max-width: 860px;
  margin: 0 auto;
  background: var(--surface-1);
  border-radius: 16px;
  border: 0.5px solid var(--border);
  padding: 24px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--fill-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo i {
  font-size: 15px;
  color: var(--on-primary);
}
.logo-title {
  font-size: 16px;
  font-weight: 500;
}
.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
}
hr.divider {
  border: none;
  border-top: 0.5px solid var(--border);
  margin-bottom: 1.25rem;
}
.layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.panel {
  flex: 1;
  min-width: 0;
}
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
</style>
