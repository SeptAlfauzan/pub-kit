import Konva from 'konva'

export async function stageToPng(stage: Konva.Stage): Promise<Blob> {
  const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1 })
  const res = await fetch(dataUrl)
  return res.blob()
}

export interface StoreShotRender {
  shotUrl: string
  bg: string
  frame: 'phone' | 'tablet' | 'none'
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function renderStoreShot(opts: StoreShotRender): Promise<Blob> {
  const shotImage = await loadImage(opts.shotUrl)

  const stageWidth = 320
  const stageHeight = Math.round(stageWidth * (shotImage.naturalHeight / shotImage.naturalWidth))

  const showFrame = opts.frame !== 'none'
  const frameRadius = opts.frame === 'phone' ? 38 : opts.frame === 'tablet' ? 24 : 4
  const pad = showFrame ? 20 : 0

  const frameWidth = stageWidth - pad * 2
  const frameHeight = stageHeight - pad * 2
  const frameX = pad
  const frameY = pad

  const stage = new Konva.Stage({
    width: stageWidth,
    height: stageHeight,
  })
  const layer = new Konva.Layer()

  layer.add(
    new Konva.Rect({
      width: stageWidth,
      height: stageHeight,
      fill: opts.bg,
    }),
  )

  layer.add(
    new Konva.Image({
      image: shotImage,
      x: frameX + 4,
      y: frameY + 4,
      width: frameWidth - 8,
      height: frameHeight - 8,
      cornerRadius: Math.max(frameRadius - 2, 0),
    }),
  )

  if (showFrame) {
    layer.add(
      new Konva.Rect({
        x: frameX,
        y: frameY,
        width: frameWidth,
        height: frameHeight,
        cornerRadius: frameRadius,
        stroke: '#e2e0db',
        strokeWidth: 6,
      }),
    )
  }

  stage.add(layer)

  const blob = await stageToPng(stage)
  stage.destroy()
  return blob
}
