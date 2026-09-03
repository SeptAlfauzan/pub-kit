import { afterEach, describe, it, expect, vi } from 'vitest'

describe('generateIcons', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('closes the main-thread bitmap even when the worker dispatch rejects', async () => {
    const closeSpy = vi.fn<() => void>()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 1, height: 1, close: closeSpy }) as unknown as ImageBitmap),
    )

    const rejectDispatch = vi.fn<() => Promise<never>>(async () => {
      throw new Error('Worker job failed after 3 retries')
    })

    vi.doMock('../worker-pool', () => ({
      WorkerPool: function MockWorkerPool() {
        return {
          dispatch: rejectDispatch,
          terminate: vi.fn<() => void>(),
          cancel: vi.fn<() => void>(),
        }
      },
    }))

    vi.doMock('@/config/ios-icon-sizes', () => ({
      IOS_ICON_SIZES: [{ key: 'ios', width: 20, height: 20, platform: 'ios' }],
    }))

    vi.doMock('@/config/android-icon-sizes', () => ({
      ALL_ANDROID_SIZES: [{ key: 'android', width: 48, height: 48, platform: 'android' }],
    }))

    const { generateIcons } = await import('../icon-generator')

    await expect(generateIcons(new File([], 'icon.png'))).rejects.toThrow(
      'Worker job failed after 3 retries',
    )

    expect(rejectDispatch).toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })
})
