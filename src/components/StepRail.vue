<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import type { StepId } from '@/models/types'

const store = useProjectStore()

const steps: { id: StepId; label: string; num: number }[] = [
  { id: 'icon', label: 'Icon', num: 1 },
  { id: 'shots', label: 'Screenshots', num: 2 },
  { id: 'mockup', label: 'Mockup preview', num: 3 },
  { id: 'store', label: 'Store preview', num: 4 },
]
</script>

<template>
  <nav class="step-nav" aria-label="Steps">
    <button
      v-for="step in steps"
      :key="step.id"
      class="step-btn"
      :class="{ active: store.currentStep === step.id }"
      :aria-current="store.currentStep === step.id ? 'step' : undefined"
      @click="store.setStep(step.id)"
    >
      <span class="step-num">{{ step.num }}</span>
      <span>{{ step.label }}</span>
      <i
        v-if="store.readySteps[step.id]"
        class="fa-solid fa-check step-check"
        aria-hidden="true"
      ></i>
    </button>
    <div class="ready-summary">{{ store.readyCount }} of 3 steps ready</div>
  </nav>
</template>

<style scoped>
.step-nav {
  width: 150px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 10px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
}
.step-btn:hover {
  background: var(--fill-ghost-hover);
}
.step-btn:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.step-btn.active {
  background: var(--fill-ghost-selected);
  color: var(--text-primary);
}
.step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--fill-control);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}
.step-btn.active .step-num {
  background: var(--fill-accent);
  color: var(--on-accent);
}
.step-check {
  margin-left: auto;
  color: var(--text-success);
  font-size: 14px;
}
.ready-summary {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 0.5px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
}
</style>