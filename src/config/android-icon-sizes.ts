import type { IconSizeEntry } from '@/models/types'

export const ANDROID_LAUNCHER_SIZES: IconSizeEntry[] = [
  { key: 'play-store', label: 'Play Store', width: 512, height: 512, platform: 'android' },
  { key: 'xxxhdpi', label: 'xxxhdpi', width: 192, height: 192, platform: 'android' },
  { key: 'xxhdpi', label: 'xxhdpi', width: 144, height: 144, platform: 'android' },
  { key: 'xhdpi', label: 'xhdpi', width: 96, height: 96, platform: 'android' },
  { key: 'hdpi', label: 'hdpi', width: 72, height: 72, platform: 'android' },
  { key: 'mdpi', label: 'mdpi', width: 48, height: 48, platform: 'android' },
]

export const ANDROID_ADAPTIVE_SIZES: IconSizeEntry[] = [
  { key: 'adaptive-xxxhdpi', label: 'xxxhdpi fg', width: 432, height: 432, platform: 'android' },
  { key: 'adaptive-xxhdpi', label: 'xxhdpi fg', width: 324, height: 324, platform: 'android' },
  { key: 'adaptive-xhdpi', label: 'xhdpi fg', width: 216, height: 216, platform: 'android' },
  { key: 'adaptive-hdpi', label: 'hdpi fg', width: 162, height: 162, platform: 'android' },
  { key: 'adaptive-mdpi', label: 'mdpi fg', width: 108, height: 108, platform: 'android' },
]

export const ALL_ANDROID_SIZES = [...ANDROID_LAUNCHER_SIZES, ...ANDROID_ADAPTIVE_SIZES]
