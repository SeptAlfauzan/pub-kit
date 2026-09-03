import { TARGET_SIZES, FEATURE_GRAPHIC_SIZE } from '@/config/store-screenshot-sizes'

export interface ValidationResult {
  status: 'pass' | 'warn'
  message: string
}

const ICON_MIN_SIZE = 512

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyRatio(w: number, h: number): [number, number] {
  const d = gcd(w, h)
  return [w / d, h / d]
}

function isAndroidValid(w: number, h: number): boolean {
  const [rw, rh] = simplifyRatio(w, h)
  const isNineSixteen = (rw === 9 && rh === 16) || (rw === 16 && rh === 9)
  if (!isNineSixteen) return false
  if (w < 320 || w > 3840) return false
  if (h < 320 || h > 3840) return false
  return true
}

function isExactMatch(
  w: number,
  h: number,
  targetW: number,
  targetH: number,
): boolean {
  return (w === targetW && h === targetH) || (w === targetH && h === targetW)
}

export function validateShot(
  width: number,
  height: number,
  targetSizeIndex: number,
): ValidationResult {
  const target = TARGET_SIZES[targetSizeIndex]
  if (!target) {
    return { status: 'warn', message: 'Invalid target size' }
  }

  if (target.platform === 'android') {
    if (isAndroidValid(width, height)) {
      return { status: 'pass', message: `${width}×${height} · matches` }
    }
    return {
      status: 'warn',
      message: `${width}×${height} · doesn't match ${target.width}×${target.height} (need 16:9 or 9:16, sides 320–3840px)`,
    }
  }

  if (isExactMatch(width, height, target.width, target.height)) {
    return { status: 'pass', message: `${width}×${height} · matches` }
  }
  return {
    status: 'warn',
    message: `${width}×${height} · doesn't match ${target.width}×${target.height}`,
  }
}

export function validateFeatureGraphic(
  width: number,
  height: number,
): ValidationResult {
  if (
    width === FEATURE_GRAPHIC_SIZE.width &&
    height === FEATURE_GRAPHIC_SIZE.height
  ) {
    return { status: 'pass', message: `${width}×${height} · matches` }
  }
  return {
    status: 'warn',
    message: `${width}×${height} · doesn't match ${FEATURE_GRAPHIC_SIZE.width}×${FEATURE_GRAPHIC_SIZE.height}`,
  }
}

export function validateIconResolution(
  width: number,
  height: number,
): ValidationResult {
  if (width < ICON_MIN_SIZE || height < ICON_MIN_SIZE) {
    return {
      status: 'warn',
      message: `${width}×${height} · below recommended ${ICON_MIN_SIZE}×${ICON_MIN_SIZE}`,
    }
  }
  if (width !== height) {
    return { status: 'warn', message: `${width}×${height} · not square` }
  }
  return { status: 'pass', message: `${width}×${height} · OK` }
}
