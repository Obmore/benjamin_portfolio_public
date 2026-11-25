import { expect, test, type Page } from '@playwright/test'
import { VALLALKOZO } from '../src/content/alapadatok'
import { JEL } from '../src/content/fooldal'

// The states of the site's keys and links (2026-11-25 polish): a focused header key is whole on every side, every key has a hover face, the phone's text link is as wide
// as its words, the small targets reach 44 px, and a failed copy leaves the address selected. Observed on computed styles and boxes, never on screenshots.

async function home(page: Page, viewport = { width: 1280, height: 900 }) {
  await page.setViewportSize(viewport)
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.tkey')).toBeEnabled()
}

test.describe('the header keys', () => {
  test('a focused key lifts itself over its neighbour: the ring of "Szétszedve" is not painted over by "Sötét mód"', async ({ page }) => {
    await home(page)
    const z = (sel: string) => page.locator(sel).evaluate((el) => getComputedStyle(el).zIndex)
    await expect(page.locator('.szkey')).toBeEnabled()
    expect(await z('.szkey'), 'at rest').toBe('2')
    expect(await z('.tkey'), 'at rest').toBe('2')
    await page.locator('.szkey').focus()
    expect(await page.locator('.szkey').evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    expect(Number(await z('.szkey')), 'the focused key is above the one after it').toBeGreaterThan(Number(await z('.tkey')))
    await page.locator('.tkey').focus()
    expect(Number(await z('.tkey')), 'and the other way round').toBeGreaterThan(Number(await z('.szkey')))
  })
})

test.describe('hover faces', () => {
  test('the copy key and the address cell get the keys\' hover face', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/megrendeles/')
    await page.evaluate(() => document.fonts.ready)
    const key = page.locator('#kapcsolat .cmz-gomb')
    const address = page.locator('#kapcsolat .cmz-cim')
    await expect(key).toBeEnabled()
    for (const el of [key, address]) {
      await el.scrollIntoViewIfNeeded()
      await page.mouse.move(2, 2)
      const rest = await el.evaluate((e) => getComputedStyle(e).backgroundColor)
      await el.hover()
      await expect.poll(() => el.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(rest)
    }
  })

  test('the works list on the home page: a row has a hover face, the checked row keeps its weight', async ({ page }) => {
    await home(page)
    const row = page.locator('.wl li:nth-child(2) button')
    await expect(row).toBeEnabled()
    await row.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    const rest = await row.evaluate((e) => getComputedStyle(e).backgroundColor)
    await row.hover()
    await expect.poll(() => row.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(rest)
    await page.mouse.move(2, 2)
    await expect.poll(() => row.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(rest)
  })

  test('the footer links are underlined on hover and on keyboard focus, plain at rest', async ({ page }) => {
    await home(page)
    const link = page.locator('.fdata nav a').first()
    await link.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await expect(link).toHaveCSS('text-decoration-line', 'none')
    await link.hover()
    await expect(link).toHaveCSS('text-decoration-line', 'underline')
    await page.mouse.move(2, 2)
    await expect(link).toHaveCSS('text-decoration-line', 'none')
    await link.focus()
    await expect(link).toHaveCSS('text-decoration-line', 'underline')
  })
})

test.describe('the phone', () => {
  test('the text link under the first screen\'s key is as wide as its words, not as wide as the key', async ({ page }) => {
    await home(page, { width: 390, height: 844 })
    const key = await page.locator('.acts-gomb').boundingBox()
    const link = await page.locator('.acts-link').boundingBox()
    expect(key!.width, 'the key spans the column').toBeGreaterThan(300)
    expect(link!.width, 'the link is its words and the box around them').toBeLessThan(key!.width / 2)
  })

  test('the mark and the footer links reach 44 px', async ({ page }) => {
    await home(page, { width: 390, height: 844 })
    const mark = (await page.locator('.hdr .mklink').boundingBox())!
    expect(mark.width, 'the mark itself is 32 px').toBeLessThan(44)
    // the border around the mark answers a tap as the mark: 6 px above, below and before it (after it is the nav's own box)
    const owner = (x: number, y: number) => page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.closest('.mklink') !== null, [x, y])
    expect(await owner(mark.x + mark.width / 2, mark.y - 5), 'above').toBe(true)
    expect(await owner(mark.x + mark.width / 2, mark.y + mark.height + 5), 'below').toBe(true)
    expect(await owner(mark.x - 5, mark.y + mark.height / 2), 'before').toBe(true)
    expect(await owner(mark.x + mark.width / 2, mark.y - 8), 'not beyond 6 px').toBe(false)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.fdata a')].map((a) => ({ t: a.textContent, w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height })).filter((r) => r.w < 44 || r.h < 44),
    )
    expect(small, 'every footer link is at least 44 x 44 px').toEqual([])
  })
})

test.describe('a failed copy', () => {
  test('the key selects the address, the lamp says "Hiba" and the status sentence says the address is selected', async ({ page }) => {
    // neither the clipboard nor the old copy command works (a browser that refuses both)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refused')) }, configurable: true })
      document.execCommand = () => false
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/megrendeles/')
    await page.evaluate(() => document.fonts.ready)
    const key = page.locator('#kapcsolat .cmz-gomb')
    await expect(key).toBeEnabled()
    await key.scrollIntoViewIfNeeded()
    await key.click()
    await expect(page.locator('#kapcsolat .cmz')).toHaveAttribute('data-st', 'hiba')
    expect((await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim()).toBe(VALLALKOZO.email)
    await expect(page.locator('#kapcsolat .cmz-allapot')).toHaveText(JEL.kapcsolat.allapotHiba)
    await expect(page.locator('#kapcsolat .cmz-lampa-t')).toHaveText(JEL.kapcsolat.hiba)
  })
})
