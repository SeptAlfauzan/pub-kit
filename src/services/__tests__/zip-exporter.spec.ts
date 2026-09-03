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
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [], storeScreenshots: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.startsWith('ios/AppIcon.appiconset/'))).toBe(true)
  })

  it('creates Android mipmap folders', () => {
    const zip = new JSZip()
    const iconResults = [
      { key: 'mdpi', blob: new Blob(['fake']), url: '' },
      { key: 'hdpi', blob: new Blob(['fake']), url: '' },
    ]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [], storeScreenshots: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.startsWith('android/mipmap-mdpi/'))).toBe(true)
    expect(files.some((f) => f.startsWith('android/mipmap-hdpi/'))).toBe(true)
  })

  it('creates Contents.json', () => {
    const zip = new JSZip()
    const iconResults = [{ key: 'appstore', blob: new Blob(['fake']), url: '' }]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [], storeScreenshots: [] })
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
      storeScreenshots: [],
    })
    const files = Object.keys(zip.files)
    expect(files).toContain('android/feature-graphic.png')
  })

  it('uses framed store screenshots over raw shots', () => {
    const zip = new JSZip()
    const shot = {
      id: 's1',
      name: 'hero.png',
      width: 1320,
      height: 2868,
      file: new File(['raw'], 'hero.png'),
      url: 'blob:raw',
      status: 'pass' as const,
      statusMessage: 'ok',
    }
    buildZipStructure(zip, {
      iconResults: [],
      shots: [shot],
      featureGraphic: null,
      mockupImages: [],
      storeScreenshots: [{ id: 's1', blob: new Blob(['framed']), name: 'hero.png' }],
    })
    const appstore = zip.file('screenshots/appstore/01_hero.png')!
    const playstore = zip.file('screenshots/playstore/01_hero.png')!
    expect(appstore).toBeTruthy()
    expect(playstore).toBeTruthy()
  })

  it('renames rendered screenshots to .png regardless of source extension', () => {
    const zip = new JSZip()
    const shot = {
      id: 's1',
      name: 'photo.webp',
      width: 1320,
      height: 2868,
      file: new File(['raw-webp'], 'photo.webp'),
      url: 'blob:raw',
      status: 'pass' as const,
      statusMessage: 'ok',
    }
    buildZipStructure(zip, {
      iconResults: [],
      shots: [shot],
      featureGraphic: null,
      mockupImages: [],
      storeScreenshots: [{ id: 's1', blob: new Blob(['framed-png']), name: 'photo.webp' }],
    })
    expect(zip.file('screenshots/appstore/01_photo.png')).toBeTruthy()
    expect(zip.file('screenshots/playstore/01_photo.png')).toBeTruthy()
    expect(zip.file('screenshots/appstore/01_photo.webp')).toBeFalsy()
  })
})
