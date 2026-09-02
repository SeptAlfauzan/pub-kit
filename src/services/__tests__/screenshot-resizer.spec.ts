import { afterEach, describe, it, expect, vi } from 'vitest'

describe('resizeScreenshot', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('closes the main-thread bitmap even when the worker dispatch rejects', async () => {
    const closeSpy = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(
        async () =>
          ({
            width: 1,
            height: 1,
            close: closeSpy,
          }) as unknown as ImageBitmap,
      ),
    )

    const rejectDispatch = vi.fn(async () => {
      throw new Error('Worker job failed after 3 retries')
    })

    vi.doMock('../worker-pool', () => ({
      WorkerPool: function MockWorkerPool() {
        return { dispatch: rejectDispatch, terminate: vi.fn() }
      },
    }))

    vi.doMock('@/config/store-screenshot-sizes', () => ({
      TARGET_SIZES: [{ width: 100, height: 100, platform: 'ios', label: 'test' }],
    }))

    const { resizeScreenshot } = await import('../screenshot-resizer')

    await expect(resizeScreenshot(new File([], 'shot.png'), 0)).rejects.toThrow(
      'Worker job failed after 3 retries',
    )

    expect(rejectDispatch).toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })
})

describe('batchResize', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('closes bitmaps even when dispatch rejects mid-batch', async () => {
    const closeSpy = vi.fn()
    let callCount = 0

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(
        async () =>
          ({
            width: 1,
            height: 1,
            close: closeSpy,
          }) as unknown as ImageBitmap,
      ),
    )

    vi.doMock('../worker-pool', () => ({
      WorkerPool: function MockWorkerPool() {
        return {
          dispatch: vi.fn(async () => {
            callCount++
            if (callCount === 2) throw new Error('Worker failed')
            return { type: 'image/png' } as Blob
          }),
          terminate: vi.fn(),
        }
      },
    }))

    vi.doMock('@/config/store-screenshot-sizes', () => ({
      TARGET_SIZES: [{ width: 100, height: 100, platform: 'android', label: 'test' }],
    }))

    const { batchResize } = await import('../screenshot-resizer')

    await expect(
      batchResize(
        [
          { id: 'a', file: new File([], 'a.png') },
          { id: 'b', file: new File([], 'b.png') },
        ],
        0,
      ),
    ).rejects.toThrow('Worker failed')

    expect(closeSpy).toHaveBeenCalledTimes(2)
  })
})
