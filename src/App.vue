<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import StepRail from '@/components/StepRail.vue'
import ExportButton from '@/components/ExportButton.vue'
import IconUploader from '@/components/icon-step/IconUploader.vue'

const store = useProjectStore()
</script>

<template>
  <div class="app-card">
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        </div>
        <div>
          <div class="logo-title">Launchsheet</div>
          <div class="logo-sub">Project · {{ store.appName }}</div>
        </div>
      </div>
      <ExportButton @export="() => {}" />
    </div>
    <hr class="divider" />

    <div class="layout">
      <StepRail />
      <div class="panel">
        <IconUploader v-if="store.currentStep === 'icon'" />
        <section v-else-if="store.currentStep === 'shots'">
          <h2 class="panel-title">Screenshots</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
        <section v-else-if="store.currentStep === 'mockup'">
          <h2 class="panel-title">Mockup preview</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
        <section v-else-if="store.currentStep === 'store'">
          <h2 class="panel-title">Store preview</h2>
          <p class="panel-sub">Coming soon.</p>
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
</style>
