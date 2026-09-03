import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Step1Icon from '../components/icon-step/IconUploader.vue'
import { useProjectStore } from '@/stores/project'
import type { IconResult } from '@/models/types'

vi.mock('@/services/icon-generator', () => ({
  generateIcons: vi.fn(),
}))

vi.mock('@/services/validation', () => ({
  validateIconResolution: vi.fn(() => ({ status: 'pass', message: 'OK' })),
}))

vi.stubGlobal(
  'createImageBitmap',
  vi.fn(async () => ({ width: 1024, height: 1024, close: vi.fn() } as unknown as ImageBitmap)),
)

function makeResults(count: number): IconResult[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `icon-${i}`,
    blob: new Blob(),
    url: `blob:http://localhost/icon-${i}`,
  }))
}

describe('IconUploader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the source icon title and description', () => {
    const wrapper = mount(Step1Icon)
    expect(wrapper.text()).toContain('Source icon')
    expect(wrapper.text()).toContain('1024×1024')
  })

  it('renders a Dropzone for file upload', () => {
    const wrapper = mount(Step1Icon)
    expect(wrapper.findComponent({ name: 'Dropzone' }).exists() ||
      wrapper.find('.dropzone').exists()).toBe(true)
  })

  it('calls generateIcons and sets store results on file drop', async () => {
    const { generateIcons } = await import('@/services/icon-generator')
    const results = makeResults(3)
    vi.mocked(generateIcons).mockResolvedValue(results)

    const wrapper = mount(Step1Icon)
    const store = useProjectStore()

    const file = new File(['png-data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    if (dropzone.exists()) {
      await dropzone.vm.$emit('files', [file])
    } else {
      await wrapper.find('.dropzone').trigger('drop', {
        dataTransfer: { files: [file] },
      })
    }

    await flushPromises()

    expect(generateIcons).toHaveBeenCalledWith(file)
    expect(store.iconResults).toHaveLength(3)
    expect(store.iconSource).toBeTruthy()
    expect(store.readySteps.icon).toBe(true)
  })

  it('shows loading state while icons are generating', async () => {
    const { generateIcons } = await import('@/services/icon-generator')
    let resolveGeneration: (v: IconResult[]) => void
    vi.mocked(generateIcons).mockImplementation(
      () => new Promise((resolve) => { resolveGeneration = resolve }),
    )

    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    const busyEl = wrapper.find('[aria-busy="true"]')
    expect(busyEl.exists()).toBe(true)

    resolveGeneration!(makeResults(2))
    await flushPromises()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false)
  })

  it('shows error state when generation fails', async () => {
    const { generateIcons } = await import('@/services/icon-generator')
    vi.mocked(generateIcons).mockRejectedValue(new Error('Worker failed'))

    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Worker failed')
  })

  it('renders icon tiles in grid after generation', async () => {
    const { generateIcons } = await import('@/services/icon-generator')
    vi.mocked(generateIcons).mockResolvedValue(makeResults(5))

    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    const tiles = wrapper.findAll('.icon-tile')
    expect(tiles.length).toBeGreaterThan(0)
  })

  it('renders iOS and Android grid sections', async () => {
    const { generateIcons } = await import('@/services/icon-generator')
    vi.mocked(generateIcons).mockResolvedValue(makeResults(2))

    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    expect(wrapper.text()).toContain('iOS icons')
    expect(wrapper.text()).toContain('Android icons')
  })

  it('revokes previous object URLs when a new file is uploaded', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { generateIcons } = await import('@/services/icon-generator')
    vi.mocked(generateIcons).mockResolvedValue(makeResults(2))

    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })

    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    const firstCallCount = revokeSpy.mock.calls.length

    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    expect(revokeSpy.mock.calls.length).toBeGreaterThan(firstCallCount)

    revokeSpy.mockRestore()
  })

  it('has accessible labels on icon tiles', async () => {
    const { generateIcons } = await import('@/services/icon-generator')
    vi.mocked(generateIcons).mockResolvedValue(makeResults(2))

    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    const labeledTiles = wrapper.findAll('[aria-label]')
    expect(labeledTiles.length).toBeGreaterThan(0)
  })

  it('revokes source and result URLs on unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { generateIcons } = await import('@/services/icon-generator')
    vi.mocked(generateIcons).mockResolvedValue(makeResults(3))

    const store = useProjectStore()
    const wrapper = mount(Step1Icon)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })
    const dropzone = wrapper.findComponent({ name: 'Dropzone' })
    await dropzone.vm.$emit('files', [file])
    await flushPromises()

    expect(store.iconSource).toBeTruthy()
    expect(store.iconResults).toHaveLength(3)

    wrapper.unmount()

    expect(revokeSpy).toHaveBeenCalledWith(store.iconSource)
    for (const r of store.iconResults) {
      expect(revokeSpy).toHaveBeenCalledWith(r.url)
    }

    revokeSpy.mockRestore()
  })
})
