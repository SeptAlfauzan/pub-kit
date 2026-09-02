import { TARGET_SIZES } from '@/config/store-screenshot-sizes'
import { WorkerPool } from './worker-pool'

let pool: WorkerPool | null = null

function getPool(): WorkerPool {
  if (!pool) {
    pool = new WorkerPool({
      workerUrl: new URL('./workers/screenshot.worker.ts', import.meta.url),
      maxWorkers: 4,
    })
  }
  return pool
}

export async function resizeScreenshot(
  file: File,
  targetIndex: number,
  mode: 'center-crop' | 'letterbox' = 'center-crop',
): Promise<Blob> {
  const target = TARGET_SIZES[targetIndex]
  if (!target) throw new Error('Invalid target index')

  const bitmap = await createImageBitmap(file)
  try {
    const workerPool = getPool()
    return await workerPool.dispatch<Blob>({
      id: `shot-${Date.now()}-${file.name}`,
      op: 'resize-shot',
      payload: {
        targetWidth: target.width,
        targetHeight: target.height,
        mode,
        sourceBitmap: bitmap,
      },
    })
  } finally {
    bitmap.close()
  }
}

export async function batchResize(
  files: { id: string; file: File }[],
  targetIndex: number,
  mode: 'center-crop' | 'letterbox' = 'center-crop',
): Promise<{ id: string; blob: Blob }[]> {
  const target = TARGET_SIZES[targetIndex]
  if (!target) throw new Error('Invalid target index')

  const workerPool = getPool()
  const results = await Promise.all(
    files.map(async ({ id, file }) => {
      const bitmap = await createImageBitmap(file)
      try {
        const blob = await workerPool.dispatch<Blob>({
          id: `batch-${id}`,
          op: 'resize-shot',
          payload: {
            targetWidth: target.width,
            targetHeight: target.height,
            mode,
            sourceBitmap: bitmap,
          },
        })
        return { id, blob }
      } finally {
        bitmap.close()
      }
    }),
  )
  return results
}

export function terminateScreenshotWorker(): void {
  pool?.terminate()
  pool = null
}
