import { test, expect } from '@playwright/test'
import { DEMOS } from './pages'

// The return strip is a declarative shadow root. A browser that does not attach it (Firefox before 123, Safari before 16.4) would show nothing and the demo
// has no other way back, so the host carries one plain link as a light child: not rendered next to a shadow root, rendered without one.

for (const [url, back] of Object.entries(DEMOS)) {
  test(`strip fallback on ${url}: one plain link back, hidden while the shadow root is attached, shown where it is not`, async ({ page }) => {
    await page.goto(url)
    const fallback = page.locator('#ob-sav > a[data-ob-sav-fallback]')
    await expect(fallback).toHaveCount(1)
    await expect(fallback).toHaveAttribute('href', back.href)
    await expect(fallback).toHaveText(back.label)
    await expect(fallback).toBeHidden()
    // A browser without declarative shadow DOM: the template stays an inert template and the host's light children are what it renders.
    const html = await (await page.request.get(url)).text()
    await page.route(`**${url}`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace('<template shadowrootmode="open">', '<template>') }))
    await page.goto(url)
    expect(await page.evaluate(() => document.getElementById('ob-sav')!.shadowRoot)).toBeNull()
    await expect(fallback).toBeVisible()
    await expect(fallback).toHaveAttribute('href', back.href)
  })
}
