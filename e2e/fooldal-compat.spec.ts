import { expect, type Page } from '@playwright/test'
import { resizeTo, scheme, test } from './sweep'
import AxeBuilder from '@axe-core/playwright'
import { JEL } from '../src/content/fooldal'
import { VALLALKOZO } from '../src/content/alapadatok'

// The home page in every engine (Chromium, Firefox, WebKit; playwright.compat.config.ts): what must hold for any visitor, including an iPhone.
// Engine-neutral: no clipboard permissions (not every engine has them), no fixed sleeps for the sequence (the page marks its end with html.jel-vege),
// measurements from Range/element rects, never scrollWidth (html and body clip horizontally).
async function home(page: Page) {
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/jel-vege/)
}
const rootTema = (page: Page) => page.locator('html').getAttribute('data-tema')

test('sections and key copy render', async ({ page }) => {
  await home(page)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toContainText('műszaki szoftver')
  await expect(page.locator('.sub')).toContainText('böngészőig')
  for (const id of ['nyitas', 'munkak', 'partnerek', 'kapcsolat']) await expect(page.locator(`#${id}`)).toBeAttached()
  await expect(page.locator('#h-munkak')).toHaveText(JEL.munkak.cim)
  await expect(page.locator('#h-partnerek')).toHaveText(JEL.partnerek.cim)
  await expect(page.locator('#h-kapcsolat')).toHaveText(JEL.kapcsolat.cim)
  await expect(page.locator('footer')).toContainText(VALLALKOZO.adoszam)
  await expect(page.locator('#cmz-cim')).toHaveAttribute('href', `mailto:${VALLALKOZO.email}`)
})

test.describe('without script', () => {
  test.use({ javaScriptEnabled: false })
  test('the static form is complete and no chunk-only control can be focused', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('.sp:visible')).toHaveCount(1)
    await expect(page.locator('.keys')).toBeHidden()
    await expect(page.locator('.fz-ssr:visible path').first()).toBeAttached()
    for (const el of await page.locator('.ws').all()) await expect(el).toBeVisible()
    await expect(page.locator('.tkey')).toBeHidden()
    await expect(page.locator('.cmz-kc')).toBeHidden()
    for (const sel of ['.key-gomb', '[data-wi]']) for (const el of await page.locator(sel).all()) await expect(el, sel).toBeDisabled()
    // the partner names are plain text: not buttons, not focusable
    for (const el of await page.locator('.slot').all()) {
      expect(await el.evaluate((e) => e.tagName)).not.toBe('BUTTON')
      expect(await el.evaluate((e) => (e as HTMLElement).tabIndex)).toBe(-1)
      await expect(el).not.toHaveAttribute('role', 'button')
    }
  })
})

test.describe('theme', () => {
  test.use({ colorScheme: 'light' })
  test('the switch toggles and the choice survives a reload', async ({ page }) => {
    await home(page)
    expect(await rootTema(page)).toBe('vilagos')
    await page.locator('.tkey').click()
    await expect.poll(() => rootTema(page), { timeout: 8000 }).toBe('sotet')
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/jel-kesz/)
    expect(await rootTema(page)).toBe('sotet')
    await expect(page.locator('.tkey')).toHaveAttribute('aria-checked', 'true')
  })
  test('a blocked storage does not break the page', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') }, configurable: true })
    })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await home(page)
    await page.locator('.tkey').click()
    await expect.poll(() => rootTema(page), { timeout: 8000 }).toBe('sotet')
    expect(errors).toEqual([])
  })
})

test('the copy key announces a result: copied, or the honest failure state (never a silent no-op), and the state is taken back', async ({ page }) => {
  await home(page)
  const key = page.locator('.cmz-gomb')
  await expect(key).toBeEnabled()
  await key.scrollIntoViewIfNeeded()
  await key.click()
  await expect(page.locator('.cmz-allapot')).toHaveText(new RegExp(`^(${JEL.kapcsolat.kimasolva}|${JEL.kapcsolat.allapotHiba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`), { timeout: 8000 })
  const answered = await page.locator('.cmz').getAttribute('data-st')
  expect(['kesz', 'hiba']).toContain(answered)
  await expect(page.locator('.cmz-lampa-t')).toHaveText(answered === 'kesz' ? JEL.kapcsolat.kimasolva : JEL.kapcsolat.hiba)
  await expect(page.locator('.cmz')).not.toHaveAttribute('data-st', /.+/, { timeout: 8000 })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('the complete end state is shown: a plain run label, the frozen band, the drawn line', async ({ page }) => {
    await home(page)
    await expect(page.locator('.runlbl')).toBeVisible()
    await expect(page.locator('.runbtn')).toBeHidden()
    await expect(page.locator('.opn-svg path.pen-r').first()).toBeAttached()
    // The reduced form draws the line on the first layout frame, which a loaded WebKit can run after html.jel-vege: poll, the bound is unchanged.
    await expect.poll(() => page.locator('.spine-svg > path.pen-r').evaluate((p) => parseFloat((p as SVGElement).style.strokeDashoffset || '0')), { timeout: 8000 }).toBeLessThan(4)
  })
})

for (const width of [320, 360, 768, 1024, 1280]) {
  test(`nothing is past the viewport and no headline text is clipped at ${width} px`, async ({ homeFull: page }) => {
    await resizeTo(page, width, 800)
    await scheme(page, 'light')   // the shared page: no scheme left over from another test
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const lines = [...document.querySelectorAll('h1 .l')].map((el) => { const g = document.createRange(); g.selectNodeContents(el); return Math.max(...[...g.getClientRects()].filter((q) => q.width > 0).map((q) => q.right)) })
      const past = [...document.querySelectorAll('header *, main *, footer *')]
        // bleeding on purpose: svg (the spine, taps and the band run to the page edge) and the full-width band container itself (.sav);
        // everything else (readout, labels, text) is measured like the rest of the page
        .filter((e) => !e.closest('svg') && !e.matches('.sav') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
        .filter((e) => e.getBoundingClientRect().right > vw + 0.5)
        .map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`)
      const textPast: string[] = []
      for (const host of document.querySelectorAll('.sav')) {
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim() || n.parentElement?.closest('svg') || getComputedStyle(n.parentElement!).visibility === 'hidden') continue
          const g = document.createRange(); g.selectNodeContents(n)
          for (const q of g.getClientRects()) if (q.width > 0 && (q.right > vw + 0.5 || q.left < -0.5)) textPast.push(`"${n.textContent.trim().slice(0, 24)}" ${Math.round(q.left)}..${Math.round(q.right)}`)
        }
      }
      return { vw, lines, past, textPast }
    })
    expect(r.lines.length).toBe(3)
    for (const right of r.lines) expect(Number.isFinite(right) && right <= r.vw - 8, `headline line ends at ${right} in ${r.vw} px`).toBe(true)
    expect(r.past).toEqual([])
    expect(r.textPast, `text inside .sav outside the ${r.vw} px viewport`).toEqual([])
  })
}

// Firefox on Linux: axe's whole-tree pass crashes the content process on this page once the lazy chunk (live band, spine, offers) runs: in the
// 2-CPU container most runs crashed with the chunk and none without it (blocked chunk 5 of 5 clean), whatever rule was selected, and with the
// canvas or the SVG removed. Firefox therefore audits the server-rendered page (same DOM and colours); Chromium and WebKit audit the live page,
// and the chromium project's e2e specs audit every state of it.
test('axe has no serious or critical violation', async ({ page, browserName }) => {
  if (browserName === 'firefox') {
    let aborted = 0
    await page.route('**/jel-*.js', (route) => { aborted++; return route.abort() })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible()
    // a renamed chunk must not silently put the live page back under axe
    expect(aborted, 'the jel chunk request was aborted').toBeGreaterThanOrEqual(1)
    await expect(page.locator('html')).not.toHaveClass(/jel-kesz/)
  } else await home(page)
  const result = await new AxeBuilder({ page }).analyze()
  const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
})
