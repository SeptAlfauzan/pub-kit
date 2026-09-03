import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'
import { useProjectStore } from '@/stores/project'
import IconUploader from '../components/icon-step/IconUploader.vue'
import Step2Screenshots from '../components/steps/Step2Screenshots.vue'
import Step3Mockup from '../components/steps/Step3Mockup.vue'
import Step4Store from '../components/steps/Step4Store.vue'

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the Launchsheet header', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Launchsheet')
  })

  it('shows project name from store', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('My App')
  })

  it('renders step rail with 4 steps', () => {
    const wrapper = mount(App)
    expect(wrapper.findAll('.step-btn')).toHaveLength(4)
  })

  it('shows 0 of 3 steps ready initially', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('0 of 3 steps ready')
  })

  it('active step has aria-current="step"', () => {
    const wrapper = mount(App)
    const buttons = wrapper.findAll('.step-btn')
    expect(buttons[0]!.attributes('aria-current')).toBe('step')
    expect(buttons[1]!.attributes('aria-current')).toBeUndefined()
  })

  it('clicking a step updates the store currentStep', async () => {
    const wrapper = mount(App)
    const store = useProjectStore()
    const buttons = wrapper.findAll('.step-btn')

    await buttons[2]!.trigger('click')
    expect(store.currentStep).toBe('mockup')
    expect(buttons[2]!.attributes('aria-current')).toBe('step')
  })
})

describe('Step stubs mount', () => {
  it('IconUploader mounts without error', () => {
    expect(mount(IconUploader).text()).toContain('Source icon')
  })

  it('Step2Screenshots mounts without error', () => {
    expect(mount(Step2Screenshots).text()).toContain('Screenshots')
  })

  it('Step3Mockup mounts without error', () => {
    expect(mount(Step3Mockup).text()).toContain('Mockup preview')
  })

  it('Step4Store mounts without error', () => {
    expect(mount(Step4Store).text()).toContain('Store preview')
  })
})
