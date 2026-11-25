import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'

const source = fs.readFileSync('adatkezeles/index.html', 'utf8')
for (const width of [360, 390, 1024, 1440]) test(`${width}: privacy notice is complete, accessible and readable without JavaScript`, async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } })
  const page = await context.newPage()
  const response = await page.goto('/adatkezeles/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Adatkezelési tájékoztató')
  const text = await page.locator('article').textContent()
  const expected = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').querySelector('article')!.textContent, source)
  const normalize = (text: string | null) => text!.replace(/\s+/g, ' ').trim()
  expect(normalize(text)).toBe(normalize(expected))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // The page's scripts are its own (the shared head snippet and its modules: the theme storage chunk, then the page module); no third-party or measurement script.
  expect(await page.locator('script[src]').evaluateAll((els) => els.map((e) => e.getAttribute('src')))).toEqual([expect.stringMatching(/^\/assets\/tema-tar-[\w-]+\.js$/), expect.stringMatching(/^\/assets\/jogi-[\w-]+\.js$/)])
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://ottbenjamin.hu/adatkezeles/')
  await page.screenshot({ path: `tmp/privacy-review/privacy-${width}.png`, fullPage: true })
  await context.close()
})

test('privacy links work from the home page and the order footer', async ({ page }) => {
  await page.goto('/')
  await page.locator('footer').getByRole('link', { name: 'Adatkezelési tájékoztató' }).click()
  await expect(page).toHaveURL(/\/adatkezeles\/$/)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('link', { name: 'Ott Benjámin, főoldal' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/megrendeles/')
  await page.locator('footer').getByRole('link', { name: 'Adatkezelési tájékoztató' }).click()
  await expect(page).toHaveURL(/\/adatkezeles\/$/)
})
