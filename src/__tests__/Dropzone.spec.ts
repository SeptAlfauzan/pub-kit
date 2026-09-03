import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Dropzone from '../components/ui/Dropzone.vue'

describe('Dropzone', () => {
  it('renders label text', () => {
    const wrapper = mount(Dropzone, { props: { label: 'Drop file here' } })
    expect(wrapper.text()).toContain('Drop file here')
  })

  it('sets aria-label from label prop', () => {
    const wrapper = mount(Dropzone, { props: { label: 'Upload icon' } })
    expect(wrapper.find('label').attributes('aria-label')).toBe('Upload icon')
  })

  it('renders as role button and is focusable', () => {
    const wrapper = mount(Dropzone, { props: { label: 'Test' } })
    expect(wrapper.find('label').attributes('role')).toBe('button')
    expect(wrapper.find('label').attributes('tabindex')).toBe('0')
  })

  it('has hidden file input', () => {
    const wrapper = mount(Dropzone, { props: { label: 'Test' } })
    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('aria-hidden')).toBe('true')
    expect(input.attributes('tabindex')).toBe('-1')
  })

  it('click()s the file input on Enter', async () => {
    const wrapper = mount(Dropzone, { props: { label: 'Test' } })
    const input = wrapper.find('input[type="file"]')
    const click = vi.spyOn(input.element as HTMLInputElement, 'click').mockImplementation(() => {})
    await wrapper.find('label').trigger('keydown', { key: 'Enter' })
    expect(click).toHaveBeenCalled()
  })

  it('click()s the file input on Space', async () => {
    const wrapper = mount(Dropzone, { props: { label: 'Test' } })
    const input = wrapper.find('input[type="file"]')
    const click = vi.spyOn(input.element as HTMLInputElement, 'click').mockImplementation(() => {})
    await wrapper.find('label').trigger('keydown', { key: ' ' })
    expect(click).toHaveBeenCalled()
  })

  it('applies inline class when inline prop is true', () => {
    const wrapper = mount(Dropzone, { props: { label: 'Test', inline: true } })
    expect(wrapper.find('label').classes()).toContain('inline')
  })

  it('emits files event on drop', async () => {
    const wrapper = mount(Dropzone, { props: { label: 'Test' } })
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    await wrapper.find('label').trigger('drop', {
      dataTransfer: { files: [file] },
    })
    expect(wrapper.emitted('files')).toBeTruthy()
  })
})
