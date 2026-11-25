import fs from 'node:fs'
import { expect, test } from '@playwright/test'

// The remaining pages in the home page's design system: no kicker, the 404 title.

test.describe('no kicker', () => {
  test('no page has a kicker (the small label above a heading)', async ({ page }) => {
    for (const url of ['/megrendeles/', '/munkaim/']) {
      await page.goto(url)
      await expect(page.locator('.kicker, .kicker-vonal'), url).toHaveCount(0)
      expect(await page.locator('h1').count(), url).toBe(1)
    }
  })
})

test('the 404 page title carries the site name', async () => {
  const html = fs.readFileSync(new URL('../404.html', import.meta.url), 'utf8')
  expect(html).toContain('<title>Az oldal nem található – Ott Benjámin</title>')
})
