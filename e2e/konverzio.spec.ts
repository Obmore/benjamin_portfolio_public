import { expect, test, type Page } from '@playwright/test'
import { VALLALKOZO } from '../src/content/alapadatok'

// Conversion quick fixes: hero CTA, duplicate headings, the work page on a phone, repeated phrases, Rollin font weights.

// The four offer pages are merged into /megrendeles/ (PR 6): the phrase checks run on the home page and the merged page.
const OFFER_PAGES = ['/', '/megrendeles/'] as const
const CTA_TEXT = '15 perces beszélgetést kérek'
const REPLY_NOTE = 'A következő munkanap végéig válaszolok.'

async function open(page: Page, url: string) {
  expect((await page.goto(url, { waitUntil: 'networkidle' }))?.status(), `${url} answers 200`).toBe(200)
  await page.evaluate(() => window.scrollTo(0, 0))
}

/** Number of VISIBLE elements whose own trimmed textContent equals the text exactly. */
async function visibleExact(page: Page, text: string): Promise<string[]> {
  return page.evaluate((wanted) => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      if (!(r.width > 1 && r.height > 1) || s.visibility === 'hidden' || s.display === 'none') return false
      // Screen-reader-only text: the element or an ancestor is clipped to nothing or fully transparent.
      for (let node: Element | null = el; node; node = node.parentElement) {
        const c = getComputedStyle(node)
        if (c.opacity === '0') return false
        if (/^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(c.clip)) return false
        if (/^inset\(50%\)$/.test(c.clipPath)) return false
      }
      return true
    }
    return [...document.body.querySelectorAll('*')]
      .filter((el) => (el.textContent ?? '').trim() === wanted && visible(el))
      .map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className && typeof el.className === 'string' ? `.${el.className}` : ''))
  }, text)
}

function count(haystack: string, needle: string) {
  return haystack.toLowerCase().split(needle.toLowerCase()).length - 1
}

test.describe('hero call to action', () => {
  test('the first screen has one key button (the website action) and one text link (the technical-software action), both at least 44 px high, with their targets, at 360 and 1280 px', async ({ page }) => {
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, '/')
      const button = page.locator('#nyitas .adl-gomb')
      const link = page.locator('#nyitas .acts-link')
      await expect(button).toHaveCount(1)
      await expect(button).toHaveAttribute('href', '/megrendeles/#szolgaltatas-bemutatkozo')
      await expect(link).toHaveAttribute('href', '#kapcsolat')
      for (const el of [button, link]) {
        await expect(el).toBeVisible()
        expect((await el.boundingBox())!.height, `${width} px: tap target`).toBeGreaterThanOrEqual(44)
      }
      expect((await button.innerText()).length, 'label length').toBeLessThanOrEqual(22)
      expect((await link.innerText()).length, 'label length').toBeLessThanOrEqual(22)
    }
  })

  test('the "Levelet írok" mailto link and the reply promise are in the contact section (direction D: the page has no hero call to action)', async ({ page }) => {
    await open(page, '/')
    const contact = page.locator('#kapcsolat')
    const link = contact.getByRole('link', { name: 'Levelet írok', exact: true })
    await expect(link).toHaveCount(1)
    const href = (await link.getAttribute('href')) ?? ''
    expect(href.startsWith(`mailto:${VALLALKOZO.email}`), `href ${href}`).toBe(true)
    await expect(contact.getByText(REPLY_NOTE)).toBeVisible()
    // the second text link of the contact end: the 15-minute talk request with its prefilled mail (the home subject), reporting "hivas"
    const talk = contact.getByRole('link', { name: CTA_TEXT, exact: true })
    await expect(talk).toHaveCount(1)
    const talkHref = (await talk.getAttribute('href')) ?? ''
    expect(talkHref.startsWith(`mailto:${VALLALKOZO.email}`), `href ${talkHref}`).toBe(true)
    const talkQuery = new URLSearchParams(talkHref.split('?')[1] ?? '')
    expect(talkQuery.get('subject'), 'the home subject, no topic').toBe('15 perces beszélgetés')
    expect((talkQuery.get('body') ?? '').trim().length, 'a prefilled body').toBeGreaterThan(0)
    await expect(talk).toHaveAttribute('data-esemeny', 'hivas')
    await page.setViewportSize({ width: 360, height: 800 })
    await link.scrollIntoViewIfNeeded()
    expect((await link.boundingBox())!.height, 'link tap target').toBeGreaterThanOrEqual(24)
    for (const target of [link, talk]) expect((await target.boundingBox())!.height, 'both links are 44 px rows on a phone').toBeGreaterThanOrEqual(44)
  })

})

test.describe('no duplicated headings', () => {
  test('/munkaim/ shows "Elkészült munkák" at most once, section is named, one h1', async ({ page }) => {
    await open(page, '/munkaim/')
    const found = await visibleExact(page, 'Elkészült munkák')
    expect(found.length, `/munkaim/: visible "Elkészült munkák": ${found.join(', ')}`).toBeLessThanOrEqual(1)
    expect(await namedBy(page, 'section#munkak'), '/munkaim/: section#munkak accessible name').not.toBe('')
    await expect(page.locator('h1'), '/munkaim/: one h1').toHaveCount(1)
  })

  test('/munkaim/ names its "Évek" section, shows "Két terület" nowhere and has one h1', async ({ page }) => {
    await open(page, '/munkaim/')
    expect(await visibleExact(page, 'Két terület'), '/munkaim/: visible "Két terület"').toEqual([])
    expect(await namedBy(page, 'section#evek'), '/munkaim/: section#evek accessible name').toBe('Évek')
    await expect(page.locator('h1'), '/munkaim/: one h1').toHaveCount(1)
  })
})

/** Text of the element(s) the section's aria-labelledby points at ('' when missing). */
function namedBy(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const ids = (document.querySelector(sel)?.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
    return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim()
  }, selector)
}

test.describe('the work page on a phone', () => {
  test('/munkaim/ does not scroll horizontally at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await open(page, '/munkaim/')
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    expect(scrollWidth, '/munkaim/: scrollWidth vs clientWidth').toBeLessThanOrEqual(clientWidth)
  })
})

test.describe('repeated phrases', () => {
  for (const url of OFFER_PAGES) {
    test(`${url} says "nem becslés" and "folytatjuk-e" at most once`, async ({ page }) => {
      await open(page, url)
      const text = await page.locator('main').evaluate((m) => m.textContent ?? '')
      expect(count(text, 'nem becslés'), `${url}: "nem becslés"`).toBeLessThanOrEqual(1)
      expect(count(text, 'folytatjuk-e'), `${url}: "folytatjuk-e"`).toBeLessThanOrEqual(1)
    })
  }
})

test.describe('Rollin font weights', () => {
  test('/munkaim/ Rollin labels use a real Archivo weight, not a synthesized one', async ({ page }) => {
    await page.goto('/munkaim/')
    await page.locator('#munka-rollin').scrollIntoViewIfNeeded()
    await expect(page.locator('#munka-rollin .mb-gomb').first()).toBeAttached()
    const result = await page.evaluate(() => {
      const num = (w: string) => (w === 'normal' ? 400 : w === 'bold' ? 700 : Number(w))
      const faces = [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === 'Archivo')
      const ranges = faces.map((f) => f.weight.split(/\s+/).map(num) as number[])
      const available = ranges.map((r) => (r.length > 1 ? `${r[0]}-${r[1]}` : `${r[0]}`))
      const used = [
        ...document.querySelectorAll('#munka-rollin .mb-gomb'),
        ...document.querySelectorAll('#munka-rollin .mb-allapot'),
      ].map((el) => ({ el: el.className || el.tagName, weight: num(getComputedStyle(el).fontWeight) }))
      const bad = used.filter((u) => !ranges.some((r) => u.weight >= r[0] && u.weight <= r[r.length - 1]))
      return { available, used: used.length, bad }
    })
    expect(result.available.length, 'Archivo faces are declared').toBeGreaterThan(0)
    expect(result.used, 'Rollin elements found').toBeGreaterThan(0)
    expect(result.bad, `weights without a matching face (faces: ${result.available.join(', ')})`).toEqual([])
  })
})
