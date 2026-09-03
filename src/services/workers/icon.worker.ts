interface IconJobPayload {
  sourceWidth: number
  sourceHeight: number
  sizes: { key: string; width: number; height: number }[]
  sourceBitmap?: ImageBitmap
}

self.onmessage = async (e: MessageEvent) => {
  const { id, payload } = e.data as { id: string; payload: IconJobPayload }

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = payload.sourceBitmap
    if (!bitmap) {
      self.postMessage({ id, status: 'error', error: 'No source bitmap' })
      return
    }

    const results: { key: string; blob: Blob }[] = []

    for (const size of payload.sizes) {
      const canvas = new OffscreenCanvas(size.width, size.height)
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, size.width, size.height)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      results.push({ key: size.key, blob })
    }

    self.postMessage({ id, status: 'ok', result: results })
  } catch (err) {
    self.postMessage({ id, status: 'error', error: String(err) })
  } finally {
    bitmap?.close()
  }
}
