import { test, expect } from '@playwright/test'

test('Launchsheet loads and shows all four steps', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.logo-title')).toHaveText('Launchsheet')
  await expect(page.locator('.step-btn')).toHaveCount(4)

  await expect(page.locator('#panel-icon')).toBeVisible()

  await page.click('.step-btn:nth-child(2)')
  await expect(page.locator('#panel-shots')).toBeVisible()

  await page.click('.step-btn:nth-child(3)')
  await expect(page.locator('#panel-mockup')).toBeVisible()

  await page.click('.step-btn:nth-child(4)')
  await expect(page.locator('#panel-store')).toBeVisible()
})
