interface ResizeJobPayload {
  targetWidth: number
  targetHeight: number
  mode: 'center-crop' | 'letterbox'
  sourceBitmap?: ImageBitmap
}

self.onmessage = async (e: MessageEvent) => {
  const { id, payload } = e.data as { id: string; payload: ResizeJobPayload }

  try {
    const bitmap = payload.sourceBitmap
    if (!bitmap) {
      self.postMessage({ id, status: 'error', error: 'No source bitmap' })
      return
    }

    const { targetWidth: tw, targetHeight: th, mode } = payload
    const canvas = new OffscreenCanvas(tw, th)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (mode === 'center-crop') {
      const srcAspect = bitmap.width / bitmap.height
      const dstAspect = tw / th
      let sx: number, sy: number, sw: number, sh: number
      if (srcAspect > dstAspect) {
        sh = bitmap.height
        sw = sh * dstAspect
        sx = (bitmap.width - sw) / 2
        sy = 0
      } else {
        sw = bitmap.width
        sh = sw / dstAspect
        sx = 0
        sy = (bitmap.height - sh) / 2
      }
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, tw, th)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tw, th)
      const srcAspect = bitmap.width / bitmap.height
      const dstAspect = tw / th
      let dw: number, dh: number
      if (srcAspect > dstAspect) {
        dw = tw
        dh = tw / srcAspect
      } else {
        dh = th
        dw = th * srcAspect
      }
      const dx = (tw - dw) / 2
      const dy = (th - dh) / 2
      ctx.drawImage(bitmap, dx, dy, dw, dh)
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    bitmap.close()
    self.postMessage({ id, status: 'ok', result: blob })
  } catch (err) {
    self.postMessage({ id, status: 'error', error: String(err) })
  }
}
