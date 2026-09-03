import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ShotRow from '../components/ui/ShotRow.vue'

describe('ShotRow', () => {
  const props = {
    name: 'home.png',
    width: 1320,
    height: 2868,
    status: 'pass' as const,
    statusMessage: '1320×2868 · matches',
  }

  it('renders file name', () => {
    const wrapper = mount(ShotRow, { props })
    expect(wrapper.text()).toContain('home.png')
  })

  it('renders status message', () => {
    const wrapper = mount(ShotRow, { props })
    expect(wrapper.text()).toContain('1320×2868 · matches')
  })

  it('applies status class', () => {
    const wrapper = mount(ShotRow, { props })
    expect(wrapper.find('.shot-status').classes()).toContain('pass')
  })

  it('has role status on status element', () => {
    const wrapper = mount(ShotRow, { props })
    expect(wrapper.find('.shot-status').attributes('role')).toBe('status')
  })

  it('remove button is focusable with aria-label', () => {
    const wrapper = mount(ShotRow, { props })
    const btn = wrapper.find('.shot-remove')
    expect(btn.attributes('aria-label')).toBe('Remove screenshot')
    expect(btn.attributes('type')).toBe('button')
  })

  it('emits remove event on button click', async () => {
    const wrapper = mount(ShotRow, { props })
    await wrapper.find('.shot-remove').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('applies warn class for warn status', () => {
    const wrapper = mount(ShotRow, {
      props: { ...props, status: 'warn', statusMessage: "doesn't match" },
    })
    expect(wrapper.find('.shot-status').classes()).toContain('warn')
  })
})
