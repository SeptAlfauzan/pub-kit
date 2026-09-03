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
  private workerPending: (string | null)[] = []
  private nextIndex = 0
  private pending = new Map<string, PendingJob>()
  private cancelled = new Set<string>()
  private retryCounts = new Map<string, number>()
  private maxRetries = 3

  constructor(
    { workerUrl, maxWorkers = 4 }: PoolOptions,
    private _workerUrl: string | URL = workerUrl,
  ) {
    const rawCount =
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2
    const count = Math.max(1, Math.min(rawCount, maxWorkers))
    for (let i = 0; i < count; i++) {
      this._spawnWorker(workerUrl, i)
    }
  }

  private _spawnWorker(workerUrl: string | URL, index?: number): Worker {
    const worker = new Worker(workerUrl)
    const idx = index ?? this.workers.length

    if (index !== undefined) {
      this.workers[idx] = worker
      this.workerPending[idx] = null
    } else {
      this.workers.push(worker)
      this.workerPending.push(null)
    }

    worker.onmessage = (e: MessageEvent) => {
      const { id, status, result } = e.data
      const wIdx = this.workers.indexOf(worker)
      if (wIdx !== -1 && this.workerPending[wIdx] === id) {
        this.workerPending[wIdx] = null
      }
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

    worker.onerror = (_e: Event) => {
      const wIdx = this.workers.indexOf(worker)
      const inFlightId = wIdx !== -1 ? this.workerPending[wIdx] : null

      this._replaceWorker(wIdx, workerUrl)

      if (inFlightId) {
        this.retryJob(inFlightId)
      }
    }

    return worker
  }

  private _replaceWorker(failedIndex: number, workerUrl: string | URL): void {
    if (failedIndex < 0 || failedIndex >= this.workers.length) return
    this.workers[failedIndex]!.terminate()
    this._spawnWorker(workerUrl, failedIndex)
  }

  dispatch<T>(job: PoolJob): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(job.id, { resolve: resolve as ResolveFn, reject, originalJob: job })
      const wIdx = this.nextIndex % this.workers.length
      this.nextIndex++
      this.workerPending[wIdx] = job.id
      this.workers[wIdx]!.postMessage(job)
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
    const wIdx = this.nextIndex % this.workers.length
    this.nextIndex++
    this.workerPending[wIdx] = id
    this.workers[wIdx]!.postMessage(pending.originalJob)
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
    this.workerPending = []
    for (const [, job] of this.pending) {
      job.reject(new Error('Pool terminated'))
    }
    this.pending.clear()
    this.retryCounts.clear()
  }
}
