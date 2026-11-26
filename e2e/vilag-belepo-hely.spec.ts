import { expect, test, type Page } from '@playwright/test'
import type { Proba } from '../src/vilag/tipusok'

// The home page's world entry button slot reservation on narrow screens (src/site/fooldal/nyito.css).
//
// In CI Chromium runs on SwiftShader, so without the hook the gate refuses (button stays hidden) and with
// `window.__vilagProba = { szoftveres: true }` it passes (button becomes visible after load and an idle moment).
// What this spec proves: at 360 and 768 px `#nyitas .acts` keeps the same height with JS disabled, when refused and when
// visible, while the hidden button stays `visibility: hidden` and unreachable by Tab; at 1280 px it stays `display: none`.
test.describe.configure({ timeout: 240_000 })

declare global {
  interface Window {
    __vilagProba?: Proba
  }
}

const belepo = (page: Page) => page.locator('[data-vilag-belepo]')
const actsMagassag = (page: Page): Promise<number> =>
  page.locator('#nyitas .acts').evaluate((el) => el.getBoundingClientRect().height)

async function szoftveresEngedely(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vilagProba = { szoftveres: true }
  })
}

async function szoftveresElutasitas(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const eredeti = WebGL2RenderingContext.prototype.getParameter
    WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, p: GLenum): unknown {
      if (p === 0x9246) return 'Google SwiftShader'
      return eredeti.call(this, p)
    }
  })
}

for (const width of [360, 768] as const) {
  test(`1. (${width} × 800) the hidden entry button keeps its slot on a narrow screen, so nothing moves when it appears`, async ({ browser }) => {
    const viewport = { width, height: 800 }
    const ctxA = await browser.newContext({ javaScriptEnabled: false, viewport })
    const ctxB = await browser.newContext({ viewport })
    const ctxC = await browser.newContext({ viewport })
    try {
      const pageA = await ctxA.newPage()
      await pageA.goto('/')
      const magassagA = await actsMagassag(pageA)

      const pageB = await ctxB.newPage()
      await szoftveresElutasitas(pageB)
      await pageB.goto('/')
      await expect(belepo(pageB)).toHaveAttribute('data-vilag-belepo', 'elutasitva', { timeout: 15_000 })
      const gombB = belepo(pageB)
      await expect(gombB).toHaveAttribute('hidden', '')
      await expect(gombB).toBeHidden()
      expect(await gombB.evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden')
      const boxB = await gombB.boundingBox()
      expect(boxB).not.toBeNull()
      expect(boxB!.height).toBeGreaterThan(0)
      await pageB.locator('#nyitas .acts-link').focus()
      await pageB.keyboard.press('Tab')
      await expect(gombB).not.toBeFocused()
      expect(await pageB.evaluate(() => document.activeElement === document.querySelector('[data-vilag-belepo]'))).toBe(false)
      const magassagB = await actsMagassag(pageB)

      const pageC = await ctxC.newPage()
      await szoftveresEngedely(pageC)
      await pageC.goto('/')
      await expect(belepo(pageC)).toBeVisible()
      const magassagC = await actsMagassag(pageC)

      expect(Math.abs(magassagA - magassagB)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(magassagB - magassagC)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(magassagA - magassagC)).toBeLessThanOrEqual(0.5)
    } finally {
      await Promise.all([ctxA.close(), ctxB.close(), ctxC.close()])
    }
  })
}

for (const width of [1024, 1280] as const) {
  test(`2. (${width} × 800) a wide screen keeps no gap for the hidden button`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } })
    try {
      const page = await ctx.newPage()
      await szoftveresElutasitas(page)
      await page.goto('/')
      await expect(belepo(page)).toHaveAttribute('data-vilag-belepo', 'elutasitva', { timeout: 15_000 })
      const gomb = belepo(page)
      await expect(gomb).toBeHidden()
      expect(await gomb.evaluate((el) => getComputedStyle(el).display)).toBe('none')
    } finally {
      await ctx.close()
    }
  })
}
