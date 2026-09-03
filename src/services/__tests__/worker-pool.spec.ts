import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorkerPool } from '../worker-pool'

// Mock Worker
class MockWorker {
  static instanceCount = 0
  id: number
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  constructor(_url: string | URL) {
    MockWorker.instanceCount++
    this.id = MockWorker.instanceCount
  }

  postMessage(data: unknown) {
    // Simulate async response
    setTimeout(() => {
      this.onmessage?.({
        data: { id: (data as { id: string }).id, status: 'ok', result: `result-${this.id}` },
      } as MessageEvent)
    }, 0)
  }

  terminate() {}
}

// MockWorker variant that returns status 'error' for the first `failuresToStart`
// attempts and then succeeds. Used to exercise the retry path.
class FlakyWorker {
  static instanceCount = 0
  static failuresToStart = 0
  id: number
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  failuresRemaining: number

  constructor(_url: string | URL) {
    FlakyWorker.instanceCount++
    this.id = FlakyWorker.instanceCount
    this.failuresRemaining = FlakyWorker.failuresToStart
  }

  postMessage(data: unknown) {
    const job = data as { id: string }
    setTimeout(() => {
      if (this.failuresRemaining > 0) {
        this.failuresRemaining--
        this.onmessage?.({
          data: { id: job.id, status: 'error', error: 'boom' },
        } as MessageEvent)
      } else {
        this.onmessage?.({
          data: { id: job.id, status: 'ok', result: `result-${this.id}` },
        } as MessageEvent)
      }
    }, 0)
  }

  terminate() {}
}

describe('WorkerPool', () => {
  beforeEach(() => {
    MockWorker.instanceCount = 0
    FlakyWorker.instanceCount = 0
    FlakyWorker.failuresToStart = 0
    vi.stubGlobal('Worker', MockWorker)
    vi.stubGlobal('navigator', { hardwareConcurrency: 4 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates workers based on hardwareConcurrency', () => {
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 4,
    })
    expect(MockWorker.instanceCount).toBe(4)
    pool.terminate()
  })

  it('caps workers at maxWorkers', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 16 })
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 4,
    })
    expect(MockWorker.instanceCount).toBe(4)
    pool.terminate()
  })

  it('dispatches a job and resolves', async () => {
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 2,
    })
    const result = await pool.dispatch<{ test: boolean }>({ id: 'job-1', op: 'test', payload: {} })
    expect(result).toBeDefined()
    pool.terminate()
  })

  it('round-robins across workers', async () => {
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 2,
    })
    const postSpy = vi.spyOn(MockWorker.prototype, 'postMessage')
    await pool.dispatch({ id: 'j1', op: 'test', payload: {} })
    await pool.dispatch({ id: 'j2', op: 'test', payload: {} })
    const targets = postSpy.mock.instances.map((w) => (w as MockWorker).id)
    // Two jobs across two workers should hit distinct worker instances.
    expect(new Set(targets).size).toBe(2)
    pool.terminate()
  })

  it('terminate kills all workers', () => {
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 3,
    })
    const spy = vi.spyOn(MockWorker.prototype, 'terminate')
    pool.terminate()
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('retries a failed job and resolves on success', async () => {
    vi.stubGlobal('Worker', FlakyWorker)
    FlakyWorker.failuresToStart = 1
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 1,
    })
    // The single worker fails once, then succeeds → retry path must recover.
    const result = await pool.dispatch({ id: 'flaky-1', op: 'test', payload: {} })
    expect(result).toBeDefined()
    pool.terminate()
  })

  it('rejects after maxRetries (3) consecutive failures', async () => {
    vi.stubGlobal('Worker', FlakyWorker)
    FlakyWorker.failuresToStart = 999 // always fail
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 1,
    })
    await expect(pool.dispatch({ id: 'doomed', op: 'test', payload: {} })).rejects.toThrow(
      'Worker job failed after 3 retries',
    )
    pool.terminate()
  })

  it('retries a crashing worker job and replaces the dead worker', async () => {
    let totalPostCalls = 0
    class CrashThenSucceedWorker {
      static instanceCount = 0
      id: number
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: Event) => void) | null = null

      constructor(_url: string | URL) {
        CrashThenSucceedWorker.instanceCount++
        this.id = CrashThenSucceedWorker.instanceCount
      }

      postMessage(data: unknown) {
        totalPostCalls++
        if (totalPostCalls <= 3) {
          // Crash: original + 3 retries all crash
          setTimeout(() => {
            this.onerror?.(new Event('error'))
          }, 0)
        } else {
          // Succeed on retry #3
          setTimeout(() => {
            this.onmessage?.({
              data: { id: (data as { id: string }).id, status: 'ok', result: `ok-${this.id}` },
            } as MessageEvent)
          }, 0)
        }
      }

      terminate() {}
    }

    totalPostCalls = 0
    CrashThenSucceedWorker.instanceCount = 0
    vi.stubGlobal('Worker', CrashThenSucceedWorker)

    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 1,
    })

    const result = await pool.dispatch({ id: 'crash-job', op: 'test', payload: {} })
    expect(result).toBeDefined()
    // Worker was replaced (at least 2 instances created)
    expect(CrashThenSucceedWorker.instanceCount).toBeGreaterThanOrEqual(2)
    pool.terminate()
  })

  it('rejects after 3 crashes and replaces the worker', async () => {
    class AlwaysCrashWorker {
      static instanceCount = 0
      id: number
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: Event) => void) | null = null

      constructor(_url: string | URL) {
        AlwaysCrashWorker.instanceCount++
        this.id = AlwaysCrashWorker.instanceCount
      }

      postMessage(_data: unknown) {
        setTimeout(() => {
          this.onerror?.(new Event('error'))
        }, 0)
      }

      terminate() {}
    }

    AlwaysCrashWorker.instanceCount = 0
    vi.stubGlobal('Worker', AlwaysCrashWorker)

    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 1,
    })

    await expect(pool.dispatch({ id: 'doom-crash', op: 'test', payload: {} })).rejects.toThrow(
      'Worker job failed after 3 retries',
    )
    // Worker replaced each time
    expect(AlwaysCrashWorker.instanceCount).toBeGreaterThanOrEqual(2)
    pool.terminate()
  })

  it('creates at least 1 worker when maxWorkers is 0', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 0 })
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 0,
    })
    expect(MockWorker.instanceCount).toBe(1)
    pool.terminate()
  })

  it('cancels a pending job', async () => {
    const pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 1,
    })
    const promise = pool.dispatch({ id: 'job-c', op: 'test', payload: {} })
    pool.cancel('job-c')
    await expect(promise).rejects.toThrow('Cancelled')
    pool.terminate()
  })
})
