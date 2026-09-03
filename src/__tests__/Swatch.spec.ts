import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Swatch from '../components/ui/Swatch.vue'

describe('Swatch', () => {
  it('renders with background color', () => {
    const wrapper = mount(Swatch, {
      props: { color: '#B5D4F4', label: 'Blue' },
    })
    expect(wrapper.find('.swatch').attributes('style')).toContain('background: rgb(181, 212, 244)')
  })

  it('sets aria-label from label prop', () => {
    const wrapper = mount(Swatch, {
      props: { color: '#fff', label: 'White' },
    })
    expect(wrapper.find('button').attributes('aria-label')).toBe('White')
  })

  it('sets aria-pressed when selected', () => {
    const wrapper = mount(Swatch, {
      props: { color: '#fff', label: 'White', selected: true },
    })
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
  })

  it('sets aria-pressed false when not selected', () => {
    const wrapper = mount(Swatch, {
      props: { color: '#fff', label: 'White', selected: false },
    })
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false')
  })

  it('applies selected class when selected', () => {
    const wrapper = mount(Swatch, {
      props: { color: '#fff', label: 'White', selected: true },
    })
    expect(wrapper.find('button').classes()).toContain('selected')
  })

  it('emits select event on click', async () => {
    const wrapper = mount(Swatch, {
      props: { color: '#fff', label: 'White' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
