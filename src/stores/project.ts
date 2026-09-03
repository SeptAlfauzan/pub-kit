import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import type { StepId, Shot, FeatureGraphic, MockupSettings, IconResult } from '@/models/types'
import { validateShot, validateFeatureGraphic } from '@/services/validation'
import { resizeScreenshot } from '@/services/screenshot-resizer'

export const useProjectStore = defineStore('project', () => {
  const currentStep = ref<StepId>('icon')
  const appName = ref('My App')

  // Icon state
  const iconSource = ref<string | null>(null)
  const iconFile = ref<File | null>(null)
  const iconResults = ref<IconResult[]>([])

  // Screenshot state
  const targetSizeIndex = ref(0)
  const shots = ref<Shot[]>([])
  const featureGraphic = ref<FeatureGraphic | null>(null)

  // Mockup state
  const mockupSettings = reactive<MockupSettings>({
    frame: 'phone',
    bg: '#B5D4F4',
    bgText: '#042C53',
    bgImage: null,
    captions: {},
  })

  // Step readiness
  const readySteps = reactive<Record<StepId, boolean>>({
    icon: false,
    shots: false,
    mockup: false,
    store: false,
  })

  const readyCount = computed(() => {
    return (['icon', 'shots', 'mockup'] as const).filter((s) => readySteps[s]).length
  })

  // --- Actions ---

  async function computeResizedUrls() {
    const target = targetSizeIndex.value
    const updates = await Promise.all(
      shots.value.map(async (shot) => {
        try {
          const blob = await resizeScreenshot(shot.file, target, 'center-crop')
          return { id: shot.id, url: URL.createObjectURL(blob) }
        } catch {
          return { id: shot.id, url: '' }
        }
      }),
    )
    const urlById = new Map(updates.map((u) => [u.id, u.url]))
    for (const shot of shots.value) {
      if (shot.resizedUrl) URL.revokeObjectURL(shot.resizedUrl)
      shot.resizedUrl = urlById.get(shot.id) ?? ''
    }
  }

  function setStep(step: StepId) {
    currentStep.value = step
  }

  function setIconSource(url: string, file?: File) {
    iconSource.value = url
    iconFile.value = file ?? null
  }

  function setIconResults(results: IconResult[]) {
    iconResults.value = results
    readySteps.icon = results.length > 0
  }

  function setTargetSize(index: number) {
    targetSizeIndex.value = index
    // Revalidate all shots
    for (const shot of shots.value) {
      const result = validateShot(shot.width, shot.height, targetSizeIndex.value)
      shot.status = result.status
      shot.statusMessage = result.message
    }
    // Re-resize all shots to the new target
    computeResizedUrls()
  }

  function addShot(data: {
    id: string
    name: string
    width: number
    height: number
    file: File
    url: string
  }) {
    const result = validateShot(data.width, data.height, targetSizeIndex.value)
    shots.value.push({
      ...data,
      resizedUrl: '',
      status: result.status,
      statusMessage: result.message,
    })
    if (shots.value.length > 0) {
      readySteps.shots = true
    }
    // Resize eagerly — URL updates reactively when complete
    computeResizedUrls()
  }

  function removeShot(id: string) {
    const shot = shots.value.find((s) => s.id === id)
    if (shot?.resizedUrl) URL.revokeObjectURL(shot.resizedUrl)
    shots.value = shots.value.filter((s) => s.id !== id)
    if (shots.value.length === 0 && !featureGraphic.value) {
      readySteps.shots = false
    }
  }

  function setFeatureGraphic(data: { file: File; url: string; width: number; height: number }) {
    const result = validateFeatureGraphic(data.width, data.height)
    featureGraphic.value = {
      ...data,
      status: result.status,
      statusMessage: result.message,
    }
    readySteps.shots = true
  }

  function clearFeatureGraphic() {
    featureGraphic.value = null
    if (shots.value.length === 0) {
      readySteps.shots = false
    }
  }

  function setMockupFrame(frame: MockupSettings['frame']) {
    mockupSettings.frame = frame
    readySteps.mockup = true
  }

  function setMockupBg(bg: string, bgText: string) {
    mockupSettings.bg = bg
    mockupSettings.bgText = bgText
    readySteps.mockup = true
  }

  function setMockupBgImage(url: string | null) {
    mockupSettings.bgImage = url
    readySteps.mockup = true
  }

  function setMockupCaption(shotId: string, caption: string) {
    mockupSettings.captions[shotId] = caption
  }

  function setAppName(name: string) {
    appName.value = name
  }

  function setStoreReady() {
    readySteps.store = true
  }

  return {
    currentStep,
    appName,
    iconSource,
    iconFile,
    iconResults,
    targetSizeIndex,
    shots,
    featureGraphic,
    mockupSettings,
    readySteps,
    readyCount,
    setStep,
    setIconSource,
    setIconResults,
    setTargetSize,
    addShot,
    removeShot,
    setFeatureGraphic,
    clearFeatureGraphic,
    setMockupFrame,
    setMockupBg,
    setMockupBgImage,
    setMockupCaption,
    setAppName,
    setStoreReady,
  }
})
