import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Toggle from '../components/ui/Toggle.vue'

describe('Toggle', () => {
  const options = [
    { value: 'phone', label: 'Phone' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'none', label: 'None' },
  ]

  it('renders all options', () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    expect(wrapper.text()).toContain('Phone')
    expect(wrapper.text()).toContain('Tablet')
    expect(wrapper.text()).toContain('None')
  })

  it('marks selected option with aria-checked', () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'tablet', options },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.attributes('aria-checked')).toBe('false')
    expect(buttons[1]!.attributes('aria-checked')).toBe('true')
    expect(buttons[2]!.attributes('aria-checked')).toBe('false')
  })

  it('has radiogroup role', () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true)
  })

  it('each button has radio role', () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    wrapper.findAll('button').forEach((btn) => {
      expect(btn.attributes('role')).toBe('radio')
    })
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    await wrapper.findAll('button')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['none'])
  })

  it('moves to next option on ArrowRight', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tablet'])
  })

  it('moves to previous option on ArrowLeft', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'tablet', options },
    })
    await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['phone'])
  })

  it('moves to next option on ArrowDown', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tablet'])
  })

  it('moves to previous option on ArrowUp', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'tablet', options },
    })
    await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['phone'])
  })

  it('wraps around from last to first on ArrowRight', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'none', options },
    })
    await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['phone'])
  })

  it('wraps around from first to last on ArrowLeft', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['none'])
  })

  it('applies selected class to active option', () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: 'phone', options },
    })
    expect(wrapper.findAll('button')[0]!.classes()).toContain('selected')
  })
})
