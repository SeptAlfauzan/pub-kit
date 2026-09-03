import { describe, it, expect } from 'vitest'
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
