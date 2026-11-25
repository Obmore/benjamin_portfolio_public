import { expect, test } from '@playwright/test'
import { ALL_PATHS } from './pages'

// A user whose browser default font size is doubled, on a 320 px phone: the no-break spans (.nb compounds, .ar-egy
// prices) must give way instead of pushing the page wide or sticking out of their block. The default font size is
// emulated the way the browser setting works (CDP Page.setFontSizes); only Chromium can do that.

test.describe('doubled default font size at 320 px', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'the default font size can only be emulated through the Chromium DevTools protocol')
  })

  for (const url of ALL_PATHS) {
    test(`${url}: no horizontal scroll, no-break spans stay inside their block`, async ({ page }) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } })
      await page.setViewportSize({ width: 320, height: 740 })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)

      const result = await page.evaluate(() => {
        const client = document.documentElement.clientWidth
        const outside: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>('.nb, .cs-nb, .adl-sum, .adl-ossz')) {
          if (!el.getClientRects().length) continue
          // The containing block of an inline span: its nearest ancestor that is not inline (inline-block, inline-flex and the like are containers).
          let block = el.parentElement
          while (block && ['inline', 'contents'].includes(getComputedStyle(block).display)) block = block.parentElement
          if (!block) continue
          const box = block.getBoundingClientRect()
          const style = getComputedStyle(block)
          const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)
          const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)
          for (const rect of el.getClientRects()) {
            if (rect.right > right + 1 || rect.left < left - 1) {
              outside.push(`${el.className} "${el.textContent}" ${Math.round(rect.left)}-${Math.round(rect.right)} in ${Math.round(left)}-${Math.round(right)}`)
              break
            }
          }
        }
        // Diagnostics for a failing page: the elements that end past the viewport.
        const wide = [...document.body.querySelectorAll<HTMLElement>('*')]
          .filter((el) => el.getClientRects().length && el.getBoundingClientRect().right > client + 1)
          .slice(0, 6)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}" ${Math.round(el.getBoundingClientRect().right)}`)
        return {
          wide,
          jel: document.body.classList.contains('jel-oldal'),
          rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
          // Media-query em follows the browser's default font size: 19em is 608 px when it is doubled, 304 px otherwise.
          emFollows: matchMedia('(max-width: 19em)').matches,
          scroll: document.documentElement.scrollWidth,
          client,
          outside,
        }
      })

      // The emulation must really apply, or the test would pass vacuously.
      expect(result.rootFont, 'root font size').toBeGreaterThanOrEqual(32)
      expect(result.emFollows, 'media-query em follows the default font size').toBe(true)
      expect(result.scroll, `scrollWidth ${result.scroll} > ${result.client}; wide: ${result.wide.join(' | ')}`).toBeLessThanOrEqual(result.client)
      // overflow-x: clip on the pages hides a scrollWidth overflow: the element boxes are measured too
      expect(result.jel ? result.wide : [], 'elements ending past the viewport').toEqual([])
      expect(result.outside).toEqual([])
    })
  }
})

// A narrow phone at the DEFAULT font size (280 px = 17.5em, under the 20em no-break threshold): words break only when a
// word alone cannot fit the line, so nothing scrolls sideways.
test.describe('default font size at 280 px', () => {
  for (const url of ALL_PATHS) {
    test(`${url}: no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 280, height: 740 })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
      expect(scroll, `scrollWidth ${scroll} > ${client}`).toBeLessThanOrEqual(client)
    })
  }
})

// The header and the first screen with a doubled default font size on a phone (live review 2026-11-10: at 360 px the header was
// 26 px too wide and the notes and labels ran past the viewport). The legal pages have their own header and are not part of this.
test.describe('doubled default font size: the header and the first screen fit', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'the default font size can only be emulated through the Chromium DevTools protocol')
  })

  // Every page has the shared header without a menu button: the header's doubled-font fit is covered by the no-scroll test above and by keret-fejlec.spec.ts.

  // The home page has no menu button (three anchors and the theme switch fit its header): its header, the headline lines, the
  // source, the keys, the screen, the actions, the band controls and the readout must fit at a doubled default font size (the page's own type is in px, so it holds still).
  for (const width of [320, 360] as const) {
    test(`/ at ${width}: the header, the headline, the source, keys, screen and actions, the band controls and the readout fit`, async ({ page }) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } })
      await page.setViewportSize({ width, height: 740 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const r = await page.evaluate(() => {
        const client = document.documentElement.clientWidth
        const pick = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getClientRects().length)
        const past = pick('header.fejlec *, h1 .l, .sub, .sp:not([hidden]), .keys, .key-gomb, .kij, .acts, .ctl-row > *, .readout, .runbtn')
          .filter((e) => e.getBoundingClientRect().right > client + 0.5 || e.getBoundingClientRect().left < -0.5)
          .map((e) => `${e.tagName.toLowerCase()}.${e.className}`)
        return { client, scroll: document.documentElement.scrollWidth, past }
      })
      expect(r.scroll, `scrollWidth ${r.scroll} > ${r.client}`).toBeLessThanOrEqual(r.client)
      expect(r.past, 'elements past the viewport').toEqual([])
    })
  }
})
