import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import type { StepId, Shot, FeatureGraphic, MockupSettings, IconResult } from '@/models/types'
import { validateShot, validateFeatureGraphic } from '@/services/validation'

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
      status: result.status,
      statusMessage: result.message,
    })
    if (shots.value.length > 0) {
      readySteps.shots = true
    }
  }

  function removeShot(id: string) {
    shots.value = shots.value.filter((s) => s.id !== id)
    if (shots.value.length === 0 && !featureGraphic.value) {
      readySteps.shots = false
    }
  }

  function setFeatureGraphic(data: {
    file: File
    url: string
    width: number
    height: number
  }) {
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
  }
})
