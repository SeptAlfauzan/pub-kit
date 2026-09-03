<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import StoreShotCard from './StoreShotCard.vue'

const store = useProjectStore()
</script>

<template>
  <div class="store-card">
    <div
      class="feature-banner"
      :style="
        store.featureGraphic
          ? { backgroundImage: `url(${store.featureGraphic.url})` }
          : { backgroundColor: store.mockupSettings.bg }
      "
    >
      {{ store.featureGraphic ? '' : 'Feature graphic · 1024×500' }}
    </div>
    <div class="store-card-body">
      <div class="store-app-row">
        <div class="store-icon">
          <img
            v-if="store.iconSource"
            :src="store.iconSource"
            alt="App icon"
            class="store-icon-img"
          />
          <span v-else>—</span>
        </div>
        <div class="store-meta">
          <div class="app-name">{{ store.appName }}</div>
          <div class="app-cat">PubKit Labs</div>
          <div class="app-rating">★ 4.6 · 10k+ downloads</div>
        </div>
        <button class="store-install-btn">Install</button>
      </div>
      <div class="store-shots">
        <StoreShotCard
          v-for="shot in store.shots"
          :key="shot.id"
          :shot-url="shot.url"
          :shot-name="shot.name"
        />
        <div v-if="store.shots.length === 0" class="store-shot-thumb placeholder">—</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store-card {
  background: var(--surface-2);
  border-radius: 16px;
  overflow: hidden;
}
.feature-banner {
  height: 80px;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 11px;
  background-size: cover;
  background-position: center;
}
.store-card-body {
  padding: 16px;
}
.store-app-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.store-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-accent);
  overflow: hidden;
}
.store-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.store-meta {
  flex: 1;
  min-width: 0;
}
.app-name {
  font-size: 15px;
  font-weight: 500;
}
.app-cat {
  font-size: 12px;
  color: var(--text-secondary);
}
.app-rating {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.store-install-btn {
  border: 0.5px solid var(--border-strong);
  background: transparent;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 13px;
  flex-shrink: 0;
  cursor: pointer;
}
.store-shots {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.placeholder {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
</style>
