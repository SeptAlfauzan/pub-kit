import type { TargetSize } from '@/models/types'

export const TARGET_SIZES: TargetSize[] = [
  { label: 'iPhone 6.9" display', width: 1320, height: 2868, platform: 'ios' },
  { label: 'iPhone 6.5" display', width: 1284, height: 2778, platform: 'ios' },
  { label: 'iPad Pro 13"', width: 2064, height: 2752, platform: 'ios' },
  { label: 'Android phone', width: 1080, height: 1920, platform: 'android' },
  { label: 'Android 7" tablet', width: 1200, height: 1920, platform: 'android' },
  { label: 'Android 10" tablet', width: 1600, height: 2560, platform: 'android' },
]

export const FEATURE_GRAPHIC_SIZE = { width: 1024, height: 500 } as const
