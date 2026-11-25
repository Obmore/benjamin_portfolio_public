import { expect, test, type Page } from '@playwright/test'
import { REGISTRY_PATHS } from './pages'

// The prerendered pages (src/site, src/content), 2026-11. The four segment pages are panels of /megrendeles/ since PR 6.
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
const PAGES = REGISTRY_PATHS
const WIDTHS = [390, 1366] as const

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

for (const width of WIDTHS) {
  test(`${width}: no horizontal scroll and no console errors on every page`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 })
    for (const url of PAGES) {
      expect((await page.goto(url, { waitUntil: 'networkidle' }))?.status(), url).toBe(200)
      expect(await noHorizontalScroll(page), `${url} at ${width}`).toBe(true)
    }
    expect(errors).toEqual([])
  })
}

// Narrowest supported phone width: the first screen's parts (the source, the keys, the screen, the actions), the headline and the package panels must fit.
test('320: no horizontal scroll on the home page and on the package page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const url of ['/', '/megrendeles/']) {
    expect((await page.goto(url, { waitUntil: 'networkidle' }))?.status(), url).toBe(200)
    expect(await noHorizontalScroll(page), `${url} at 320`).toBe(true)
  }
})

for (const width of [320, 341, 344, 348, 352, 353, 360, 375, 390]) {
  test(`${width}: the first screen's parts fit inside the page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('.keys')).toBeVisible()
    const edges = await page.evaluate(() => {
      const parts = ['.sp:not([hidden])', '.keys', '.key-gomb', '.kij', '.acts-gomb', '.acts-link', '.sub', '.readout'].flatMap((s) => [...document.querySelectorAll(s)]).map((b) => b.getBoundingClientRect())
      return { rights: parts.map((b) => b.right), lefts: parts.map((b) => b.left), widths: parts.map((b) => b.width), viewport: document.documentElement.clientWidth }
    })
    expect(edges.widths, `source, keys (4), screen, two actions, subline, readout at ${width}`).toHaveLength(11)
    for (const w of edges.widths) expect(w, `part width at ${width}`).toBeGreaterThan(0)
    for (const left of edges.lefts) expect(left, `part left edge at ${width}`).toBeGreaterThanOrEqual(0)
    for (const right of edges.rights) expect(right, `part right edge vs the viewport at ${width}`).toBeLessThanOrEqual(edges.viewport + 0.5)
  })
}

test('every internal link and image on every page resolves, including the demos', async ({ page, request }) => {
  const seen = new Set<string>()
  for (const url of PAGES) {
    await page.goto(url)
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname))
    const imgs = await page.locator('img').evaluateAll((is) => is.flatMap((i) => [(i as HTMLImageElement).getAttribute('src')!, ...((i as HTMLImageElement).srcset || '').split(',').map((s) => s.trim().split(' ')[0]).filter(Boolean)]))
    for (const target of [...hrefs, ...imgs]) seen.add(target)
  }
  expect([...seen].some((u) => u.startsWith('/demos/lapszabaszat/'))).toBe(true)
  expect([...seen].some((u) => u.startsWith('/demos/adatgyujto/'))).toBe(true)
  for (const target of seen) {
    expect((await request.get(target)).status(), target).toBe(200)
  }
})

test('main buttons open a prefilled e-mail to the business address', async ({ page }) => {
  for (const url of ['/megrendeles/', '/']) {
    await page.goto(url)
    const mailtos = await page.locator('a[href^="mailto:"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
    expect(mailtos.length, url).toBeGreaterThan(0)
    for (const href of mailtos) {
      const parsed = new URL(href)
      expect(parsed.pathname, url).toBe(EMAIL)
      if (parsed.search) expect(parsed.searchParams.get('subject'), url).toBeTruthy()
    }
  }
})

test('skip link is the first Tab stop and moves focus to the content', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.locator('.ugras')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#tartalom')).toBeFocused()
})

// No page has a phone menu any more: the shared header (the home page, /megrendeles/, /munkaim/, the legal pages) is three links and the theme key at every width
// (e2e/keret-fejlec.spec.ts).

test('old home page anchors land on the matching new section', async ({ page }) => {
  // Names that still map to a home section (#munkak, the works) land on it; the names of a separate page change the page.
  for (const old of ['munkaim', 'projektek', 'kompetenciak', 'demok']) {
    await page.goto(`/#${old}`, { waitUntil: 'networkidle' })
    await expect(page, old).toHaveURL(/#munkak$/)
    await expect(page.locator('#munkak'), old).toBeInViewport()
  }
  for (const [old, path] of [['csomagok', '/megrendeles/'], ['megoldasok', '/megrendeles/'], ['arjegyzek', '/megrendeles/'], ['tapasztalat', '/munkaim/#evek'], ['oneletrajz', '/munkaim/#evek'], ['rolam', '/munkaim/#evek']] as const) {
    await page.goto(`/#${old}`, { waitUntil: 'networkidle' })
    await expect(page, old).toHaveURL(new RegExp(`${path}$`))
  }
})

test('open questions are clearly marked in the preview build', async ({ page }) => {
  // In this (non-production) build every [KÉRDÉS: …] is visible and styled; the production
  // build refuses to finish while any remain (scripts/helyorzo-kapu.test.mjs).
  for (const url of PAGES) {
    await page.goto(url)
    for (const mark of await page.locator('.kerdes').all()) {
      await expect(mark).toHaveText(/^\[KÉRDÉS: .+\]$/)
      expect(await mark.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('dashed')
    }
  }
  // A case study without written consent is only shown as a marked preview.
  await page.goto('/')
  for (const card of await page.locator('[data-hozzajarulas="false"]').all()) {
    await expect(card.locator('.elonezet-jel')).toContainText('hozzájárulására vár')
  }
})

// The 390 px twin of this test is mozgas.spec.ts "CLS below 0.1 while scrolling / at 390" (same page, bound and engine); 1366 px has no twin there.
test('1366: home page layout is stable (CLS under 0.1)', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.addInitScript(() => {
    Object.assign(window, { __cls: 0 })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2600)
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.1)
  await page.close()
})

