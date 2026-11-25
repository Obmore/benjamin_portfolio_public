import { expect, test } from '@playwright/test'

// Visitor analytics (src/site/meres.ts): on localhost nothing is sent, and a click on a data-esemeny element reports its value.

test('on localhost no analytics script is injected and no request goes to umami.is', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  await page.waitForLoadState('load')
  await page.waitForTimeout(500)
  expect(requests.filter((url) => /umami/i.test(url))).toEqual([])
  await expect(page.locator('script[data-website-id]')).toHaveCount(0)
})

test('a click on a data-esemeny link calls umami.track with its value and the link keeps its default action', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const w = window as unknown as { umami: { track: (name: string) => void }; __esemenyek: string[] }
    w.__esemenyek = []
    w.umami = { track: (name) => void w.__esemenyek.push(name) }
  })
  await page.goto('/')
  const link = page.locator('a[data-esemeny="email"]').first()
  const name = await link.getAttribute('data-esemeny')
  // A bubbling listener records whether the default action is still allowed, then cancels it so the test stays on the page.
  await page.evaluate(() => {
    const w = window as unknown as { __alapertelmezett: boolean[] }
    w.__alapertelmezett = []
    document.addEventListener('click', (e) => {
      w.__alapertelmezett.push(!e.defaultPrevented)
      e.preventDefault()
    })
  })
  await link.click()
  expect(await page.evaluate(() => (window as unknown as { __esemenyek: string[] }).__esemenyek)).toEqual([name])
  expect(await page.evaluate(() => (window as unknown as { __alapertelmezett: boolean[] }).__alapertelmezett)).toEqual([true])
  // A click outside any data-esemeny element reports nothing.
  await page.locator('h1').first().click()
  expect(await page.evaluate(() => (window as unknown as { __esemenyek: string[] }).__esemenyek)).toEqual([name])
  expect(errors).toEqual([])
})

test('a click works without umami loaded (blocked or not yet ready)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()))
  await page.locator('a[data-esemeny="email"]').first().click()
  expect(errors).toEqual([])
})
