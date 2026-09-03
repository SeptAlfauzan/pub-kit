import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import JSZip from 'jszip'

const fixture = (f: string) => path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', f)

test('exports framed store screenshots without error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')

  await page.waitForSelector('#panel-icon .dropzone input[type=file]', { state: 'attached' })
  await page.setInputFiles('#panel-icon .dropzone input[type=file]', fixture('icon1024.png'))
  await page.waitForSelector('.icon-tile', { timeout: 15000 })

  await page.click('.step-btn:nth-child(2)')
  await page.waitForSelector('#panel-shots .dropzone input[type=file]', { state: 'attached' })
  await page.setInputFiles('#panel-shots .dropzone input[type=file]', fixture('shot.png'))
  await page.waitForSelector('.shot-row', { timeout: 15000 })

  await page.click('.step-btn:nth-child(3)')
  await page.waitForSelector('.mockup-card', { timeout: 15000 })
  await page.click('.swatch')

  const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
  await page.click('.btn-primary')
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.zip$/)

  const zipPath = await download.path()
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath!))
  const appstoreFile = Object.values(zip.files).find(
    (f) => f.name.startsWith('screenshots/appstore/') && !f.dir,
  )
  expect(appstoreFile).toBeTruthy()
  const framed = await appstoreFile!.async('blob')
  const raw = fs.readFileSync(fixture('shot.png'))
  expect(framed.size).not.toBe(raw.length)

  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
})
