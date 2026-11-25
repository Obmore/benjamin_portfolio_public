import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { ALL_PATHS, REGISTRY_PATHS } from './pages'
import { JEL } from '../src/content/fooldal'

// Line breaks of the entry price and of hyphenated compounds, the copy key's presses (the shared contact end) and the keyboard position after a
// legacy hash redirect. (Text contrast is axe's job in the page specs.)

const WIDTHS = [320, 360, 1280] as const
const HEIGHT = (w: number) => (w >= 1280 ? 800 : 740)

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

for (const width of WIDTHS) {
  test.describe(`${width}: entry price and hyphenated compounds`, () => {
    test.use({ viewport: { width, height: HEIGHT(width) } })

    test('the amount is one line and the suffix one whole box, the VAT chip never splits, no horizontal overflow', async ({ page }) => {
      for (const url of ['/megrendeles/']) {
        await page.goto(url, { waitUntil: 'networkidle' })
        const found = await page.evaluate(() => {
          const out: { amount: string; unit: string; sameLine: boolean }[] = []
          for (const el of document.querySelectorAll('.adl-sum')) {
            const amount = el.querySelector('.adl-ossz')!
            const unit = el.querySelector('.adl-utotag')
            // A price without a separate unit (the home page's price list: "49 000 Ft" is one text) has no second element; the guarded thing is
            // the same: the whole amount, number and "Ft", is laid out on ONE line.
            if (!unit) {
              const range = document.createRange()
              range.selectNodeContents(amount)
              out.push({ amount: amount.textContent!, unit: '', sameLine: range.getClientRects().length === 1 })
              continue
            }
            // The shared plate (A2, K1): the amount is one box on one line and the suffix is one box that stays whole, on the amount's line or dropped whole under it.
            const lines = (e: Element) => { const r = document.createRange(); r.selectNodeContents(e); return r.getClientRects().length }
            out.push({ amount: amount.textContent!, unit: unit.textContent!, sameLine: lines(amount) === 1 && lines(unit) === 1 })
          }
          return out
        })
        expect(found.length, `${url}: price lines found`).toBeGreaterThan(0)
        for (const f of found) {
          expect(f.sameLine, `${url} ${f.amount}${f.unit}: same line`).toBe(true)
        }
        for (const chip of await page.locator('.adl-afa').all()) {
          if (!(await chip.isVisible())) continue
          const rects = await chip.evaluate((el) => {
            const range = document.createRange()
            range.selectNodeContents(el)
            return range.getClientRects().length
          })
          expect(rects, `${url}: the VAT chip text is on one line`).toBe(1)
        }
        expect(await noHorizontalScroll(page), `${url} at ${width}`).toBe(true)
      }
    })

    test('hyphenated compounds in headings, buttons and package names stay on one line', async ({ page }) => {
      // Only the rendered registry pages carry `.nb` spans; the hand-written static pages are out of scope for
      // the compounds (they get the overflow check below).
      for (const url of REGISTRY_PATHS) {
        await page.goto(url, { waitUntil: 'networkidle' })
        const split = await page.evaluate((narrow) => {
          const bad: string[] = []
          for (const el of document.querySelectorAll('.nb')) {
            // Below 360 px the longest package name may break at its hyphen.
            if (narrow && el.matches('.adl-test h3 .nb')) continue
            const range = document.createRange()
            range.selectNodeContents(el)
            if (range.getClientRects().length > 1) bad.push(el.textContent!)
          }
          return bad
        }, width < 360)
        expect(split, `${url} at ${width}`).toEqual([])
      }
      for (const url of ALL_PATHS) {
        await page.goto(url, { waitUntil: 'networkidle' })
        expect(await noHorizontalScroll(page), `${url} at ${width}`).toBe(true)
      }
      // A package name keeps its compound together on /megrendeles/ (the panel's H3).
      await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
      await expect(page.locator('h3 .nb', { hasText: 'Termékleírás-próbakör' })).toHaveCount(1)
    })
  })
}

test.describe('nowrap rules', () => {
  test('the entry price, the VAT chip and the hyphenated compounds are white-space: nowrap', async ({ page }) => {
    for (const [selector, url] of [['.adl-ossz', '/megrendeles/'], ['.cs-afa-i', '/megrendeles/'], ['.cs-nb', '/megrendeles/'], ['h3 .nb', '/megrendeles/']] as const) {
      await page.goto(url, { waitUntil: 'networkidle' }) // the home price list has no VAT chip: it states the exemption in its intro line
      const first = page.locator(selector).first()
      await expect(first, selector).toBeAttached()
      expect(await first.evaluate((el) => getComputedStyle(el).whiteSpace), selector).toBe('nowrap')
    }
  })

  test('a compound stays whole while its paragraph wraps around it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
    const result = await page.evaluate(() => {
      const h1 = document.querySelectorAll('.cs-lab p')[1] as HTMLElement // the payment paragraph: many words around the amount with its "-os"
      const nb = h1.querySelector('.cs-nb')!
      const compound = nb.getBoundingClientRect().width
      h1.style.maxWidth = `${Math.ceil(compound) + 40}px`
      const range = document.createRange()
      range.selectNodeContents(nb)
      return { rects: range.getClientRects().length, lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)), text: nb.textContent }
    })
    expect(result.text).toBe(`${(149000).toLocaleString('hu-HU').replace(/\s/g, '\u00a0')}\u00a0Ft-os`)
    expect(result.rects).toBe(1)
    expect(result.lines).toBeGreaterThan(1)
  })
})

for (const width of WIDTHS) {
  test(`${width}: every nowrap item keeps at least 8 px of free width in its card`, async ({ page }) => {
    await page.setViewportSize({ width, height: HEIGHT(width) })
    for (const url of REGISTRY_PATHS) {
      await page.goto(url, { waitUntil: 'networkidle' })
      const tight = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll('.nb, .cs-nb')) {
          if (getComputedStyle(el).whiteSpace !== 'nowrap') continue
          // The card or list item that holds it (a flex item such as the h3 shrink-wraps its own text).
          const box = el.closest('.adl-test, li, article, details, section, .keret')
          if (!box) continue
          const cs = getComputedStyle(box)
          const free = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - el.getBoundingClientRect().width
          if (free < 8) out.push(`${el.textContent} ${free.toFixed(1)}`)
        }
        return out
      })
      expect(tight, `${url} at ${width}`).toEqual([])
    }
  })
}

// The copy key of the shared contact end (src/site/elemek/masolo.ts), on /munkaim/. The rule of the key: the latest press decides, the result of an older press is dropped
// (it neither shows nor clears the newer state), and every answer holds for four seconds from the press that decided it. (The old per-page copy key, whose older applied
// success stayed up until the newer result arrived, left with the last page that had it, PR 7.)
test.describe('copy-address presses on the shared contact end: the latest press decides the state', () => {
  const error = JEL.kapcsolat.allapotHiba
  const success = JEL.kapcsolat.kimasolva
  /** writeText stub whose promises settle only when the test says so (`__settle(index, ok)`); a failed one has no textarea fallback either. */
  async function stub(page: Page) {
    await page.goto('/munkaim/', { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      const pending: { resolve: () => void; reject: (e: Error) => void }[] = []
      const w = window as unknown as { __settle: (i: number, ok: boolean) => void }
      w.__settle = (i, ok) => (ok ? pending[i].resolve() : pending[i].reject(new Error('denied')))
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })),
      })
      document.execCommand = () => false
    })
  }
  const settle = (page: Page, i: number, ok: boolean) => page.evaluate(([n, good]) => (window as unknown as { __settle: (i: number, ok: boolean) => void }).__settle(n, good), [i, ok] as const)
  const open = async (page: Page, context: BrowserContext) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.clock.install()
    await stub(page)
    const key = page.locator('.cmz-gomb')
    await expect(key).toBeEnabled()
    await key.scrollIntoViewIfNeeded()
    return { key, root: page.locator('.cmz'), status: page.locator('.cmz-allapot') }
  }
  /** Every answer is taken back four seconds after its press, plus the withdraw (300 ms). */
  const rest = async (page: Page, root: Locator, status: Locator) => {
    await page.clock.runFor(4500)
    await expect(root).not.toHaveAttribute('data-st', /.+/)
    await expect(status).toHaveText('')
  }

  test('a failed press after a successful one: the error replaces the success, and the first press\'s four seconds do not clear it', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    const { key, root, status } = await open(page, context)
    await key.click()
    await settle(page, 0, true)
    await expect(root).toHaveAttribute('data-st', 'kesz')
    await expect(status).toHaveText(success)
    await page.clock.runFor(2000)
    await key.click()
    await settle(page, 1, false)
    await expect(root).toHaveAttribute('data-st', 'hiba')
    await expect(status).toHaveText(error)
    // 4.5 s after the first press, 2.5 s after the second: the first press's timer would have fired by now.
    await page.clock.runFor(2500)
    await expect(root).toHaveAttribute('data-st', 'hiba')
    await expect(status).toHaveText(error)
    await rest(page, root, status)
  })

  test('the first copy settles after a failed second one: the error stays', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    const { key, root, status } = await open(page, context)
    await key.click()
    await key.click()
    await settle(page, 1, false)
    await expect(root).toHaveAttribute('data-st', 'hiba')
    await expect(status).toHaveText(error)
    // The older copy finishing late must not overwrite the newer, failed one with a success.
    await settle(page, 0, true)
    await page.clock.runFor(100)
    await expect(root).toHaveAttribute('data-st', 'hiba')
    await expect(status).toHaveText(error)
    await expect(page.locator('.cmz-svg .cmz-ul')).toHaveCount(0)
    await page.clock.runFor(3000)
    await expect(status).toHaveText(error)
    await rest(page, root, status)
  })

  test('the first copy fails after a successful second one: the success and its four seconds stay', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    const { key, root, status } = await open(page, context)
    await key.click()
    await key.click()
    await settle(page, 1, true)
    await expect(root).toHaveAttribute('data-st', 'kesz')
    await expect(status).toHaveText(success)
    // The older copy failing late must not clear the newer success or its pending four seconds.
    await settle(page, 0, false)
    await page.clock.runFor(100)
    await expect(root).toHaveAttribute('data-st', 'kesz')
    await expect(status).toHaveText(success)
    await page.clock.runFor(3000)
    await expect(root).toHaveAttribute('data-st', 'kesz')
    await rest(page, root, status)
  })

  test('the first copy succeeds while the second is still pending (a permission prompt): nothing shows until the second result arrives', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    const { key, root, status } = await open(page, context)
    await key.click()
    await key.click()
    await settle(page, 0, true)
    await page.clock.runFor(200)
    await expect(root).not.toHaveAttribute('data-st', /.+/)
    await expect(status).toHaveText('')
    // The newer result decides.
    await settle(page, 1, false)
    await expect(root).toHaveAttribute('data-st', 'hiba')
    await expect(status).toHaveText(error)
    await page.clock.runFor(3000)
    await expect(status).toHaveText(error)
    await rest(page, root, status)
  })

  test('the first copy fails while the second is still pending: nothing shows until the second result arrives, then the success shows', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    const { key, root, status } = await open(page, context)
    await key.click()
    await key.click()
    await settle(page, 0, false)
    await page.clock.runFor(200)
    await expect(root).not.toHaveAttribute('data-st', /.+/)
    await expect(status).toHaveText('')
    await settle(page, 1, true)
    await expect(root).toHaveAttribute('data-st', 'kesz')
    await expect(status).toHaveText(success)
    await rest(page, root, status)
  })
})

test.describe('legacy hash redirect keeps the keyboard position', () => {
  for (const [old, target] of [['demok', 'munkak'], ['projektek', 'munkak']] as const) {   // anchors that still map to a home section; the page-changing ones are covered in fooldal.spec.ts
    test(`/#${old}: the next Tab continues inside #${target}`, async ({ page }) => {
      await page.goto(`/#${old}`, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(`#${target}$`))
      await expect(page.locator(`#${target}`)).toBeFocused()
      // No visible focus ring on the section itself.
      expect(await page.locator(`#${target}`).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
      await page.keyboard.press('Tab')
      expect(await page.evaluate((id) => !!document.activeElement?.closest(`#${id}`) && document.activeElement !== document.getElementById(id), target)).toBe(true)
    })
  }
})
