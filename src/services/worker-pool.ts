export interface PoolJob {
  id: string
  op: string
  payload: unknown
}

export interface PoolOptions {
  workerUrl: string | URL
  maxWorkers?: number
}

type ResolveFn = (value: unknown) => void
type RejectFn = (reason?: unknown) => void

interface PendingJob {
  resolve: ResolveFn
  reject: RejectFn
  originalJob: PoolJob
}

export class WorkerPool {
  private workers: Worker[] = []
  private nextIndex = 0
  private pending = new Map<string, PendingJob>()
  private cancelled = new Set<string>()
  private retryCounts = new Map<string, number>()
  private maxRetries = 3

  constructor({ workerUrl, maxWorkers = 4 }: PoolOptions) {
    const count = Math.min(
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2,
      maxWorkers,
    )
    for (let i = 0; i < count; i++) {
      const worker = new Worker(workerUrl)
      worker.onmessage = (e: MessageEvent) => {
        const { id, status, result } = e.data
        if (this.cancelled.has(id)) {
          this.cancelled.delete(id)
          return
        }
        const job = this.pending.get(id)
        if (!job) return
        if (status === 'ok') {
          this.pending.delete(id)
          this.retryCounts.delete(id)
          job.resolve(result)
        } else {
          this.retryJob(id)
        }
      }
      this.workers.push(worker)
    }
  }

  dispatch<T>(job: PoolJob): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(job.id, { resolve: resolve as ResolveFn, reject, originalJob: job })
      const worker = this.workers[this.nextIndex % this.workers.length]!
      this.nextIndex++
      worker.postMessage(job)
    })
  }

  private retryJob(id: string): void {
    const pending = this.pending.get(id)
    if (!pending) return
    const retries = this.retryCounts.get(id) ?? 0
    if (retries >= this.maxRetries) {
      this.retryCounts.delete(id)
      this.pending.delete(id)
      pending.reject(new Error('Worker job failed after 3 retries'))
      return
    }
    this.retryCounts.set(id, retries + 1)
    const worker = this.workers[this.nextIndex % this.workers.length]!
    this.nextIndex++
    worker.postMessage(pending.originalJob)
  }

  cancel(jobId: string): void {
    this.cancelled.add(jobId)
    this.retryCounts.delete(jobId)
    const job = this.pending.get(jobId)
    if (job) {
      this.pending.delete(jobId)
      job.reject(new Error('Cancelled'))
    }
  }

  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    for (const [, job] of this.pending) {
      job.reject(new Error('Pool terminated'))
    }
    this.pending.clear()
    this.retryCounts.clear()
  }
}
