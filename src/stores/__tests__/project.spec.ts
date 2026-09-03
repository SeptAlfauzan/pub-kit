import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../project'

describe('useProjectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts at step icon', () => {
    const store = useProjectStore()
    expect(store.currentStep).toBe('icon')
  })

  it('starts with no steps ready', () => {
    const store = useProjectStore()
    expect(store.readyCount).toBe(0)
  })

  it('sets icon step ready when results are non-empty', () => {
    const store = useProjectStore()
    store.setIconSource('data:image/png;base64,...')
    expect(store.readySteps.icon).toBe(false)
    store.setIconResults([{ key: 'a', blob: new Blob(), url: '' }])
    expect(store.readySteps.icon).toBe(true)
    expect(store.readyCount).toBe(1)
  })

  it('does not set icon step ready when results are empty', () => {
    const store = useProjectStore()
    store.setIconSource('data:image/png;base64,...')
    store.setIconResults([])
    expect(store.readySteps.icon).toBe(false)
    expect(store.readyCount).toBe(0)
  })

  it('adds a shot and sets shots step ready', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1320,
      height: 2868,
      file: new File([], 'home.png'),
      url: '',
    })
    expect(store.shots).toHaveLength(1)
    expect(store.readySteps.shots).toBe(true)
  })

  it('removes a shot by id', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1320,
      height: 2868,
      file: new File([], 'home.png'),
      url: '',
    })
    store.removeShot('s1')
    expect(store.shots).toHaveLength(0)
  })

  it('revalidates all shots on target size change', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1000,
      height: 1500,
      file: new File([], 'home.png'),
      url: '',
    })
    store.setTargetSize(0) // iPhone 6.9" — 1000x1500 won't match
    expect(store.shots[0]!.status).toBe('warn')
  })

  it('updates mockup frame', () => {
    const store = useProjectStore()
    store.setMockupFrame('tablet')
    expect(store.mockupSettings.frame).toBe('tablet')
  })

  it('updates mockup caption per shot', () => {
    const store = useProjectStore()
    store.setMockupCaption('s1', 'Hello World')
    expect(store.mockupSettings.captions['s1']).toBe('Hello World')
  })

  it('navigates steps', () => {
    const store = useProjectStore()
    store.setStep('shots')
    expect(store.currentStep).toBe('shots')
  })

  it('clears feature graphic and resets shots-ready when no shots remain', () => {
    const store = useProjectStore()
    store.setFeatureGraphic({
      file: new File([], 'fg.png'),
      url: '',
      width: 1024,
      height: 500,
    })
    expect(store.readySteps.shots).toBe(true)
    store.clearFeatureGraphic()
    expect(store.featureGraphic).toBeNull()
    expect(store.readySteps.shots).toBe(false)
  })

  it('clears feature graphic but keeps shots-ready when shots exist', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1320,
      height: 2868,
      file: new File([], 'home.png'),
      url: '',
    })
    store.setFeatureGraphic({
      file: new File([], 'fg.png'),
      url: '',
      width: 1024,
      height: 500,
    })
    store.clearFeatureGraphic()
    expect(store.readySteps.shots).toBe(true)
  })
})
