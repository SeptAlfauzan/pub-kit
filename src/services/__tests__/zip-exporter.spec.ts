import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildZipStructure } from '../zip-exporter'

describe('buildZipStructure', () => {
  it('creates iOS AppIcon.appiconset folder', () => {
    const zip = new JSZip()
    const iconResults = [
      { key: 'appstore', blob: new Blob(['fake']), url: '' },
      { key: 'iphone-60-2x', blob: new Blob(['fake']), url: '' },
    ]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.startsWith('ios/AppIcon.appiconset/'))).toBe(true)
  })

  it('creates Android mipmap folders', () => {
    const zip = new JSZip()
    const iconResults = [
      { key: 'mdpi', blob: new Blob(['fake']), url: '' },
      { key: 'hdpi', blob: new Blob(['fake']), url: '' },
    ]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.startsWith('android/mipmap-mdpi/'))).toBe(true)
    expect(files.some((f) => f.startsWith('android/mipmap-hdpi/'))).toBe(true)
  })

  it('creates Contents.json', () => {
    const zip = new JSZip()
    const iconResults = [{ key: 'appstore', blob: new Blob(['fake']), url: '' }]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.endsWith('Contents.json'))).toBe(true)
  })

  it('creates feature-graphic.png when provided', () => {
    const zip = new JSZip()
    buildZipStructure(zip, {
      iconResults: [],
      shots: [],
      featureGraphic: new Blob(['fake-banner']),
      mockupImages: [],
    })
    const files = Object.keys(zip.files)
    expect(files).toContain('android/feature-graphic.png')
  })
})
