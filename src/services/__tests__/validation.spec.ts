import { describe, it, expect } from 'vitest'
import {
  validateShot,
  validateFeatureGraphic,
  validateIconResolution,
} from '../validation'
import { TARGET_SIZES } from '@/config/store-screenshot-sizes'

describe('validateShot', () => {
  it('passes for exact portrait match on iOS target', () => {
    const result = validateShot(1320, 2868, 0) // iPhone 6.9"
    expect(result.status).toBe('pass')
  })

  it('passes for landscape orientation on iOS target', () => {
    const result = validateShot(2868, 1320, 0) // iPhone 6.9" landscape
    expect(result.status).toBe('pass')
  })

  it('warns for wrong dimensions on iOS target', () => {
    const result = validateShot(800, 600, 0)
    expect(result.status).toBe('warn')
    expect(result.message).toContain("doesn't match")
  })

  it('passes for 16:9 Android screenshot within size bounds', () => {
    // 1080x1920 = 9:16
    const result = validateShot(1080, 1920, 3) // Android phone
    expect(result.status).toBe('pass')
  })

  it('passes for 9:16 landscape Android screenshot', () => {
    // 1920x1080 = 16:9
    const result = validateShot(1920, 1080, 3) // Android phone
    expect(result.status).toBe('pass')
  })

  it('warns for non-16:9 Android screenshot', () => {
    // 1000x1500 = 2:3, not 16:9
    const result = validateShot(1000, 1500, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for Android screenshot with side below 320px', () => {
    // 200x355 is roughly 16:9 but side < 320
    const result = validateShot(200, 355, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for Android screenshot with side above 3840px', () => {
    // 4000x7111 is roughly 16:9 but side > 3840
    const result = validateShot(4000, 7111, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for dimensions that are not 16:9 or 9:16 on Android', () => {
    // 1080x2340 = 9:19.5, not valid
    const result = validateShot(1080, 2340, 3)
    expect(result.status).toBe('warn')
  })

  it('passes for 16:9 at max boundary 3840x2160', () => {
    const result = validateShot(3840, 2160, 3)
    expect(result.status).toBe('pass')
  })

  it('warns for 9:16 below min side 320x180', () => {
    // GCD(320,180)=20 → [16,9] ratio valid, but h=180 < 320
    const result = validateShot(320, 180, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for invalid target size index', () => {
    const result = validateShot(1080, 1920, 999)
    expect(result.status).toBe('warn')
  })
})

describe('validateFeatureGraphic', () => {
  it('passes for exact 1024x500', () => {
    const result = validateFeatureGraphic(1024, 500)
    expect(result.status).toBe('pass')
  })

  it('warns for wrong dimensions', () => {
    const result = validateFeatureGraphic(800, 400)
    expect(result.status).toBe('warn')
  })
})

describe('validateIconResolution', () => {
  it('passes for 1024x1024', () => {
    expect(validateIconResolution(1024, 1024).status).toBe('pass')
  })

  it('passes for 512x512 (minimum)', () => {
    expect(validateIconResolution(512, 512).status).toBe('pass')
  })

  it('warns for below 512', () => {
    expect(validateIconResolution(256, 256).status).toBe('warn')
  })

  it('warns for non-square', () => {
    expect(validateIconResolution(1024, 512).status).toBe('warn')
  })
})
