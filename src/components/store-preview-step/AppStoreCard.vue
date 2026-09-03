<script setup lang="ts">
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()
</script>

<template>
  <div class="store-card">
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
          <div class="app-cat">Health &amp; Fitness</div>
          <div class="app-rating">★ 4.8 · 2.3k ratings</div>
        </div>
        <button class="store-get-btn">Get</button>
      </div>
      <div class="store-shots">
        <div v-for="shot in store.shots" :key="shot.id" class="store-shot-thumb">
          <img :src="shot.url" :alt="shot.name" class="store-shot-img" />
        </div>
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
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 22px;
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
.store-get-btn {
  background: var(--bg-accent);
  color: var(--text-accent);
  border: none;
  border-radius: 14px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  cursor: pointer;
}
.store-shots {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.store-shot-thumb {
  flex-shrink: 0;
  width: 60px;
  height: 120px;
  border-radius: 10px;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.store-shot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
</style>
