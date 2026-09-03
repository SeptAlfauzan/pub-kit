<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import Konva from 'konva'

const props = defineProps<{
  shotUrl: string
  shotName: string
}>()

const store = useProjectStore()
const containerRef = ref<HTMLDivElement | null>(null)
const stageRef = shallowRef<Konva.Stage | null>(null)

const stageWidth = 80
const stageHeight = 140
const frameWidth = 64
const frameHeight = 118
const frameRadius = 14

function renderStage() {
  if (!containerRef.value) return

  stageRef.value?.destroy()

  const stage = new Konva.Stage({
    container: containerRef.value,
    width: stageWidth,
    height: stageHeight,
  })

  const layer = new Konva.Layer()

  layer.add(
    new Konva.Rect({
      width: stageWidth,
      height: stageHeight,
      fill: store.mockupSettings.bg,
      cornerRadius: 10,
    }),
  )

  const frameX = (stageWidth - frameWidth) / 2
  const frameY = (stageHeight - frameHeight) / 2

  const img = new Image()
  img.src = props.shotUrl
  img.onload = () => {
    layer.add(
      new Konva.Image({
        image: img,
        x: frameX + 3,
        y: frameY + 3,
        width: frameWidth - 6,
        height: frameHeight - 6,
        cornerRadius: frameRadius - 2,
      }),
    )
    layer.add(
      new Konva.Rect({
        x: frameX,
        y: frameY,
        width: frameWidth,
        height: frameHeight,
        cornerRadius: frameRadius,
        stroke: '#e2e0db',
        strokeWidth: 3,
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
  [() => store.mockupSettings.bg, () => props.shotUrl],
  () => {
    renderStage()
  },
)

onUnmounted(() => {
  stageRef.value?.destroy()
})
</script>

<template>
  <div class="store-shot-card">
    <div ref="containerRef" class="store-shot-stage"></div>
  </div>
</template>

<style scoped>
.store-shot-card {
  flex-shrink: 0;
}
.store-shot-stage {
  border-radius: 10px;
  overflow: hidden;
}
</style>
