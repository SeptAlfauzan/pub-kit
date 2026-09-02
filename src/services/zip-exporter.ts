import JSZip from 'jszip'
import type { IconResult, Shot } from '@/models/types'
import { IOS_ICON_SIZES } from '@/config/ios-icon-sizes'
import { ANDROID_LAUNCHER_SIZES } from '@/config/android-icon-sizes'

export interface ZipInput {
  iconResults: IconResult[]
  shots: Shot[]
  featureGraphic: Blob | null
  mockupImages: { id: string; blob: Blob; name: string }[]
}

function generateContentsJson(): string {
  const images = IOS_ICON_SIZES.map((s) => {
    const scale = s.key.includes('-3x') ? '3x' : s.key.includes('-2x') ? '2x' : '1x'
    return {
      size: `${s.width}x${s.height}`,
      idiom: 'universal',
      filename: `app_icon_${s.width}x${s.height}.png`,
      scale,
    }
  })
  return JSON.stringify({ images, info: { version: 1, author: 'xcode' } }, null, 2)
}

export function buildZipStructure(zip: JSZip, input: ZipInput): void {
  const iosFolder = zip.folder('ios')!.folder('AppIcon.appiconset')!
  const android = zip.folder('android')!

  for (const result of input.iconResults) {
    const iosEntry = IOS_ICON_SIZES.find((s) => s.key === result.key)
    if (iosEntry) {
      iosFolder.file(`app_icon_${iosEntry.width}x${iosEntry.height}.png`, result.blob)
    }

    const launcherEntry = ANDROID_LAUNCHER_SIZES.find((s) => s.key === result.key)
    if (launcherEntry) {
      if (launcherEntry.key === 'play-store') {
        android.file('play-store-icon.png', result.blob)
      } else {
        android.folder(`mipmap-${launcherEntry.key}`)!.file('ic_launcher.png', result.blob)
      }
    }
  }

  if (input.iconResults.some((r) => IOS_ICON_SIZES.some((s) => s.key === r.key))) {
    iosFolder.file('Contents.json', generateContentsJson())
  }

  if (input.featureGraphic) {
    android.file('feature-graphic.png', input.featureGraphic)
  }

  const appstoreFolder = zip.folder('screenshots')!.folder('appstore')!
  const playstoreFolder = zip.folder('screenshots')!.folder('playstore')!

  for (let i = 0; i < input.shots.length; i++) {
    const shot = input.shots[i]!
    const idx = String(i + 1).padStart(2, '0')
    const mockup = input.mockupImages.find((m) => m.id === shot.id)
    const blob = mockup ? mockup.blob : shot.file
    appstoreFolder.file(`${idx}_${shot.name}`, blob)
    playstoreFolder.file(`${idx}_${shot.name}`, blob)
  }

  if (input.mockupImages.length > 0) {
    const marketing = zip.folder('marketing')!
    for (const m of input.mockupImages) {
      marketing.file(m.name, m.blob)
    }
  }
}

export async function exportAll(input: ZipInput): Promise<Blob> {
  const zip = new JSZip()
  buildZipStructure(zip, input)
  return zip.generateAsync({ type: 'blob' })
}
