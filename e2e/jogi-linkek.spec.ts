import { test, expect } from '@playwright/test'

// Links inside the legal articles must never sit on top of each other: every line box of every link
// (getClientRects) and its bounding box (getBoundingClientRect: a link that wraps onto two lines spans both lines, so a
// neighbouring link that starts on the second line sits inside that box) is compared with those of every other link,
// at narrow and wide widths.
for (const url of ['/impresszum/', '/en/imprint/']) {
  for (const [width, large] of [[280, false], [320, false], [360, false], [1280, false], [280, true], [360, true]] as const) {
    test(`${url} at ${width}px${large ? ' with a 32px default font' : ''}: links do not overlap and nothing overflows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      if (large) await page.addStyleTag({ content: 'html { font-size: 32px } body { font-size: 32px !important }' })
      await page.evaluate(() => document.fonts.ready)
      const result = await page.evaluate(() => {
        const links = [...document.querySelectorAll('article a')]
        const rects = links.map(link => [...link.getClientRects(), link.getBoundingClientRect()].filter(r => r.width > 0 && r.height > 0))
        const overlaps: string[] = []
        const tolerance = 0.5
        for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++)
          for (const a of rects[i]) for (const b of rects[j]) {
            const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
            const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
            if (w > tolerance && h > tolerance) overlaps.push(`${links[i].textContent} / ${links[j].textContent}: ${w.toFixed(1)}x${h.toFixed(1)}`)
          }
        return { overlaps, overflow: document.documentElement.scrollWidth - innerWidth, count: links.length }
      })
      expect(result.count).toBeGreaterThan(2)
      expect(result.overlaps).toEqual([])
      expect(result.overflow).toBeLessThanOrEqual(0)
    })
  }
}

// A shared link to a heading of a long legal page: the late web-font swap changes the height above the target, and WebKit (no scroll anchoring) leaves it
// drifted from the fallback-font position. The page script (src/site/keret.ts -> horgony.ts) re-aligns it once. The fonts are held until the test opens the gate,
// so no font can arrive early however slow the runner is. (/adatkezeles/ and /impresszum/ have no heading ids below the title, so they cannot drift.)
test('/aszf/#adatfeldolgozasi-melleklet stays aligned after the late web fonts', async ({ page }) => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/fonts/*.woff2', async (route) => {
    await gate
    await route.continue()
  })
  const loaded = () => page.evaluate(() => [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')))
  await page.goto('/aszf/#adatfeldolgozasi-melleklet', { waitUntil: 'domcontentloaded' })
  // The target's distance from where a hash jump puts it: the root's scroll-padding-top plus the target's own scroll-margin-top.
  const offset = () => page.locator('#adatfeldolgozasi-melleklet').evaluate((e) => e.getBoundingClientRect().top - (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) - (parseFloat(getComputedStyle(e).scrollMarginTop) || 0))
  await expect.poll(async () => Math.abs(await offset()), { message: 'fragment scroll has landed' }).toBeLessThanOrEqual(2)
  expect(await loaded()).toBe(false)
  release()
  await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
  await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
  await expect.poll(async () => Math.abs(await offset())).toBeLessThanOrEqual(2)
  await page.waitForTimeout(400)
  expect(Math.abs(await offset())).toBeLessThanOrEqual(2)
})
