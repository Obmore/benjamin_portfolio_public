import { expect, test, type Page } from '@playwright/test'
import { CSOMAGOK_OLDAL } from '../src/content/csomagok'
import { JEL } from '../src/content/fooldal'
import { BEMUTATKOZO } from '../src/content/szegmensek/bemutatkozo'
import { GEPKONYV } from '../src/content/szegmensek/gepkonyv'
import { LAPSZABASZAT } from '../src/content/szegmensek/lapszabaszat'
import { TERMEKLEIRAS } from '../src/content/szegmensek/termekleiras'

// The jump pills of /megrendeles/ (the same element as on /munkaim/, src/site/elemek/Ugrasok.tsx): the four entry packages by their names, "További szolgáltatások" and
// "Kapcsolat", the words the page already has, in the page's order. The page is about 11 600 px tall on a phone, so a visitor can go straight to the part they came for.
const SEGMENTS = [TERMEKLEIRAS, GEPKONYV, LAPSZABASZAT, BEMUTATKOZO]
const WANTED: [string, string][] = [
  ...SEGMENTS.map((s): [string, string] => [s.belepo.nev, `#szolgaltatas-${s.id}`]),
  [CSOMAGOK_OLDAL.tovabbiCim, '#egyeb-szolgaltatasok'],
  [JEL.nav.kapcsolat, '#kapcsolat'],
]

async function open(page: Page, width = 1280, path = '/megrendeles/') {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(path)
  await page.evaluate(() => document.fonts.ready)
}

test('the pills use the words of the page and lead to the part named, 44 px high', async ({ page }) => {
  await open(page)
  const links = page.locator('.ank a')
  await expect(links).toHaveText(WANTED.map(([text]) => text))
  expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(WANTED.map(([, href]) => href))
  for (const [, href] of WANTED) await expect(page.locator(href), href).toHaveCount(1)
  for (const box of await links.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44)
  // the row stands under the introduction and before the first package
  const [bev, row, first] = await Promise.all([page.locator('.cs-bev').boundingBox(), page.locator('.ank').boundingBox(), page.locator('#szolgaltatas-termekleiras').boundingBox()])
  expect(row!.y, 'under the introduction').toBeGreaterThan(bev!.y + bev!.height)
  expect(row!.y + row!.height, 'before the first panel').toBeLessThan(first!.y)
})

test('each pill takes the visitor to its part, and the panel it names is the page\'s target', async ({ page }) => {
  await open(page)
  for (const [text, href] of WANTED) {
    await page.locator('.ank a', { hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.locator(href), href).toBeInViewport()
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  // a package's panel is :target, so its entry square is filled (adatlap.css)
  await page.locator('.ank a').first().click()
  const fill = await page.locator('#szolgaltatas-termekleiras .adl-bel').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill, 'the entry square is filled').not.toBe('rgba(0, 0, 0, 0)')
})

for (const width of [320, 360, 390, 768, 1280]) {
  test(`the pills wrap inside the page at ${width}px`, async ({ page }) => {
    await open(page, width)
    for (const box of await page.locator('.ank a').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
      expect(box.left, `at ${width}`).toBeGreaterThanOrEqual(0)
      expect(box.right, `at ${width}`).toBeLessThanOrEqual(width)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'no horizontal scroll').toBeLessThanOrEqual(0)
  })
}

test('the pills look the same as on /munkaim/ (one element, one stylesheet)', async ({ page }) => {
  const face = () => page.locator('.ank a').first().evaluate((el) => {
    const cs = getComputedStyle(el)
    return { bg: cs.backgroundColor, color: cs.color, border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderTopLeftRadius, height: cs.minHeight, font: cs.fontWeight + ' ' + cs.fontSize }
  })
  await open(page, 1280, '/megrendeles/')
  const order = await face()
  await open(page, 1280, '/munkaim/')
  expect(order).toEqual(await face())
})
