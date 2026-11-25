import { expect, test } from '@playwright/test'

// Cross-engine check (Chromium, Firefox, WebKit): the no-break price, its VAT chip and the hyphenated compounds
// never push a page past the viewport. WebKit offers no line-break opportunity before an inline-block that
// directly follows a nowrap span, so there the chip stayed on the price line and overflowed the card.
// The page that shows the entry prices is /megrendeles/ (the four offer pages are merged into it; the home page shows none since 2026-11-16): the amount of a plate, its VAT line and the no-break compounds (.cs-nb: the date, the threshold with its "-os").
const PAGES = ['/megrendeles/']
const WITH_COMPOUNDS = ['/megrendeles/']

for (const width of [320, 360] as const) {
  for (const url of PAGES) {
    test(`${url} at ${width}: no horizontal overflow, every price, VAT chip and compound ends inside the viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const result = await page.evaluate(() => {
        const client = document.documentElement.clientWidth
        const outside: string[] = []
        const visible: Record<string, number> = { '.adl-ossz': 0, '.adl-afa': 0, '.cs-nb': 0 }
        for (const selector of Object.keys(visible)) {
          for (const el of document.querySelectorAll(selector)) {
            if (!el.getClientRects().length) continue
            visible[selector]++
            const right = el.getBoundingClientRect().right
            // Only inside the two phone carousels of the home page (the demo cards .demok and the works row .munkak-racs) the element is
            // measured against its own card; everywhere else against the viewport.
            let limit = client
            for (let p = el.parentElement; p; p = p.parentElement) {
              if (p.matches('.demok, .munkak-racs') && p.scrollWidth > p.clientWidth) {
                let card: Element = el
                while (card.parentElement && card.parentElement !== p) card = card.parentElement
                limit = card.getBoundingClientRect().right
                break
              }
            }
            if (right > limit + 1) outside.push(`${selector} "${el.textContent}" ${Math.round(right)}`)
          }
        }
        return { fits: document.documentElement.scrollWidth <= client + 1, scroll: document.documentElement.scrollWidth, client, outside, visible }
      })
      // The measured elements must exist, or the test would pass vacuously.
      expect(result.visible['.adl-ossz'], `${url}: visible .adl-ossz`).toBeGreaterThan(0)
      expect(result.visible['.adl-afa'], `${url}: visible .adl-afa`).toBeGreaterThan(0)
      if (WITH_COMPOUNDS.includes(url)) expect(result.visible['.cs-nb'], `${url}: visible .cs-nb`).toBeGreaterThan(0)
      expect(result.fits, `scrollWidth ${result.scroll} > ${result.client}`).toBe(true)
      expect(result.outside).toEqual([])
    })
  }
}
