import type Konva from 'konva'

export async function stageToPng(stage: Konva.Stage): Promise<Blob> {
  const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1 })
  const res = await fetch(dataUrl)
  return res.blob()
}
