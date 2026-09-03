<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import Konva from 'konva'

const props = defineProps<{
  shotId: string
  shotUrl: string
  shotName: string
}>()

const store = useProjectStore()
const containerRef = ref<HTMLDivElement | null>(null)
const stageRef = shallowRef<Konva.Stage | null>(null)

const frameWidth = computed(() =>
  store.mockupSettings.frame === 'tablet' ? 140 : store.mockupSettings.frame === 'phone' ? 96 : 110,
)
const frameHeight = computed(() =>
  store.mockupSettings.frame === 'tablet'
    ? 170
    : store.mockupSettings.frame === 'phone'
      ? 190
      : 170,
)
const frameRadius = computed(() =>
  store.mockupSettings.frame === 'phone' ? 18 : store.mockupSettings.frame === 'tablet' ? 12 : 4,
)

const caption = computed({
  get: () => store.mockupSettings.captions[props.shotId] ?? '',
  set: (val: string) => store.setMockupCaption(props.shotId, val),
})

function renderStage() {
  if (!containerRef.value) return

  stageRef.value?.destroy()

  const stage = new Konva.Stage({
    container: containerRef.value,
    width: frameWidth.value + 28,
    height: frameHeight.value + 50,
  })

  const layer = new Konva.Layer()

  if (store.mockupSettings.bgImage) {
    const bgImg = new Image()
    bgImg.src = store.mockupSettings.bgImage
    bgImg.onload = () => {
      layer.add(new Konva.Image({ image: bgImg, width: stage.width(), height: stage.height() }))
      layer.draw()
    }
  } else {
    layer.add(
      new Konva.Rect({
        width: stage.width(),
        height: stage.height(),
        fill: store.mockupSettings.bg,
      }),
    )
  }

  const frameX = (stage.width() - frameWidth.value) / 2
  const frameY = 4

  const img = new Image()
  img.src = props.shotUrl
  img.onload = () => {
    layer.add(
      new Konva.Image({
        image: img,
        x: frameX + 4,
        y: frameY + 4,
        width: frameWidth.value - 8,
        height: frameHeight.value - 8,
        cornerRadius: frameRadius.value - 2,
      }),
    )
    layer.add(
      new Konva.Rect({
        x: frameX,
        y: frameY,
        width: frameWidth.value,
        height: frameHeight.value,
        cornerRadius: frameRadius.value,
        stroke: store.mockupSettings.frame === 'none' ? 'transparent' : '#e2e0db',
        strokeWidth: 4,
      }),
    )
    layer.add(
      new Konva.Text({
        text: caption.value,
        x: 8,
        y: frameHeight.value + 10,
        width: stage.width() - 16,
        fontSize: 11,
        fontFamily: '-apple-system, sans-serif',
        fill: store.mockupSettings.bgText,
        align: 'center',
      }),
    )
    layer.draw()
  }

  stage.add(layer)
  stageRef.value = stage
}

onMounted(() => {
  renderStage()
})

watch(
  [
    () => store.mockupSettings.bg,
    () => store.mockupSettings.bgImage,
    () => store.mockupSettings.frame,
    caption,
    () => props.shotUrl,
  ],
  () => {
    renderStage()
  },
)

onUnmounted(() => {
  stageRef.value?.destroy()
})

function getStage(): Konva.Stage | null {
  return stageRef.value as Konva.Stage | null
}

defineExpose({ getStage, shotId: props.shotId })
</script>

<template>
  <div class="mockup-card">
    <div ref="containerRef" class="mockup-stage"></div>
    <input
      v-model="caption"
      class="mockup-caption-input"
      :style="{ color: store.mockupSettings.bgText }"
      :aria-label="`Caption for ${shotName}`"
    />
    <p class="mockup-filename">{{ shotName }}</p>
  </div>
</template>

<style scoped>
.mockup-card {
  width: 140px;
}
.mockup-stage {
  border-radius: 14px;
  overflow: hidden;
}
.mockup-caption-input {
  width: 100%;
  font-size: 11px;
  text-align: center;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  padding: 2px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
  margin-top: 8px;
}
.mockup-filename {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}
</style>
