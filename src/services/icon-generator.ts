import { IOS_ICON_SIZES } from '@/config/ios-icon-sizes'
import { ALL_ANDROID_SIZES } from '@/config/android-icon-sizes'
import type { IconResult } from '@/models/types'
import { WorkerPool } from './worker-pool'
import IconWorker from './workers/icon.worker.ts?worker'

let pool: WorkerPool | null = null

function getPool(): WorkerPool {
  if (!pool) {
    pool = new WorkerPool({
      workerFactory: () => new IconWorker(),
      maxWorkers: 2,
    })
  }
  return pool
}

export async function generateIcons(sourceFile: File): Promise<IconResult[]> {
  const bitmap = await createImageBitmap(sourceFile)
  try {
    const sizes = [...IOS_ICON_SIZES, ...ALL_ANDROID_SIZES].map((s) => ({
      key: s.key,
      width: s.width,
      height: s.height,
    }))

    const workerPool = getPool()
    const results = await workerPool.dispatch<{ key: string; blob: Blob }[]>({
      id: `icon-${Date.now()}`,
      op: 'gen-icons',
      payload: {
        sourceWidth: bitmap.width,
        sourceHeight: bitmap.height,
        sizes,
        sourceBitmap: bitmap,
      },
    })

    return results.map((r) => ({
      key: r.key,
      blob: r.blob,
      url: URL.createObjectURL(r.blob),
    }))
  } finally {
    bitmap.close()
  }
}

export function terminateIconWorker(): void {
  pool?.terminate()
  pool = null
}
