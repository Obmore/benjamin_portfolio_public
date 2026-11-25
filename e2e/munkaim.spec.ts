import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { HIVAS_LEVEL } from '../src/content/alapadatok'
import { MUNKAIM_KAPCSOLAT, MUNKAIM_OLDAL } from '../src/content/munkaim'
import { MUNKAK, SAJAT_HONLAP, technikaCimkek } from '../src/content/munkak'
import { IDOVONAL, TERULETEK, evSzoveg } from '../src/content/tapasztalat'
import { waitForPageFonts } from './fonts'

// /munkaim/ on the Grafit layer (PR 7, spec 40): the page header, five work blocks and "Ez a honlap" on the signal line, "Évek" (the former /tapasztalat/) and the shared contact end.
// The Rollin block's keys and scene have their own spec (rollin.spec.ts); the old addresses' redirects are checked at the end.

const PAGE = '/munkaim/'
const WIDTHS = [320, 360, 390, 727, 768, 1024, 1280] as const
const LIVE = 'https://lelekesnyelv.hu/'

async function open(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(PAGE, { waitUntil: 'networkidle' })
  await waitForPageFonts(page, test.info())
}

const rect = (page: Page, selector: string, nth = 0) =>
  page.locator(selector).nth(nth).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top + window.scrollY, right: r.right, bottom: r.bottom + window.scrollY, width: r.width, height: r.height }
  })

test.describe('/munkaim/: the page', () => {
  test('answers 200 with one h1, three h2, eight h3, no h4, one main, and marks "Munkák" as the current page', async ({ page }) => {
    expect((await page.goto(PAGE, { waitUntil: 'networkidle' }))?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText(MUNKAIM_OLDAL.cim)
    await expect(page.locator('main h2')).toHaveText([MUNKAIM_OLDAL.munkakCim, 'Évek', MUNKAIM_KAPCSOLAT.cim])
    // The five works in the order of the spec, "Ez a honlap", then the two areas.
    await expect(page.locator('main h3')).toHaveText([...MUNKAK.map((m) => m.nev), SAJAT_HONLAP.cim, ...TERULETEK.map((t) => t.cim)])
    await expect(page.locator('h4')).toHaveCount(0)
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('header a[aria-current="page"]')).toHaveCount(1)
    await expect(page.locator('header a[aria-current="page"]')).toHaveText('Munkák')
    await expect(page.locator('header a[href="#kapcsolat"]')).toHaveCount(1)
  })

  test('the first H2 is for assistive technology only; the picture of every work is a 16:10 box with its alt text', async ({ page }) => {
    await open(page)
    await expect(page.locator('#munkak-cim')).toHaveClass(/sr/)
    for (const m of MUNKAK) {
      const block = page.locator(`#munka-${m.id}`)
      await expect(block, m.id).toHaveCount(1)
      const img = block.locator('.mb-ter img')
      await expect(img).toHaveAttribute('alt', m.kep.alt)
      expect(m.kep.alt.length, `${m.id}: alt`).toBeGreaterThan(20)
      const box = await rect(page, `#munka-${m.id} .mb-ter`)
      expect(Math.abs(box.width / box.height - 1.6), `${m.id}: ${box.width} x ${box.height}`).toBeLessThan(0.01)
      await img.scrollIntoViewIfNeeded()
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: `${m.id}: the picture loads` }).toBe(true)
      expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe('contain')
    }
  })

  for (const width of WIDTHS) {
    test(`no horizontal scroll and every block inside the page at ${width}px`, async ({ page }) => {
      await open(page, width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
      for (const selector of ['.mb .adl', '.mb-szov', '.ev-rajz', '.ev-teruletek', '.mb-kapcs .in']) {
        for (const box of await page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
          expect(box.left, `${selector} at ${width}`).toBeGreaterThanOrEqual(0)
          expect(box.right, `${selector} at ${width}`).toBeLessThanOrEqual(width)
        }
      }
    })
  }

  test('each block names its kind and its address in the screen head: the path of a demo, the host of a live page', async ({ page }) => {
    await open(page)
    await expect(page.locator('.mb-fajta')).toHaveText(['Ügyfélmunka', 'Bemutató', 'Bemutató', 'Bemutató', 'Csapatmunka'])
    await expect(page.locator('.mb-cim')).toHaveText(['lelekesnyelv.hu', '/demos/lapszabaszat/', '/demos/kezikonyv/', '/demos/adatgyujto/', 'rollindocking.com'])
    // Client work is not marked as a sample, and no removed work shows.
    await expect(page.locator('#munka-lelek-es-nyelv')).not.toContainText(/minta/i)
    await expect(page.locator('img[alt*="minta" i]')).toHaveCount(0)
    await expect(page.locator('a[href="https://obmore.github.io/lelek-es-nyelv-portfolio/"]')).toHaveCount(0)
    expect(await page.locator('body').innerText()).not.toMatch(/nem ügyfélmunka|Életrendező|lelkiter/i)
  })

  test('the one link of each block goes where the facts say, external ones open safely, the demos stay on the site', async ({ page }) => {
    await open(page)
    for (const m of MUNKAK) {
      const link = page.locator(`#munka-${m.id} a.mb-cta`)
      await expect(link, m.id).toHaveAttribute('href', m.elo.href)
      await expect(link).toContainText(m.elo.felirat)
      await expect(link, `${m.id}: the link names its work for assistive technology`).toContainText(m.nev)
    }
    await expect(page.locator(`a[href="${LIVE}"]`).first()).toBeVisible()
    await expect(page.locator('a[href="https://rollindocking.com/hotel"]').first()).toBeVisible()
    for (const link of await page.locator('a[href^="http"]').all()) await expect(link).toHaveAttribute('rel', /noopener/)
    // The block's text: three labelled rows where the work has them, the technique line, no row of an empty value.
    for (const m of MUNKAK) {
      const rows = (m.feladat ? 1 : 0) + (m.amitCsinaltam ? 1 : 0) + (m.amitKap ? 1 : 0)
      await expect(page.locator(`#munka-${m.id} .adl-sor`), m.id).toHaveCount(rows)
    }
  })

  test('the contact end: its own H2, one mail link with the page\'s subject, the address field, no telephone number', async ({ page }) => {
    await open(page)
    const end = page.locator('#kapcsolat')
    await expect(end).toBeVisible()
    await expect(end.locator('h2')).toHaveText(MUNKAIM_KAPCSOLAT.cim)
    const subjects = await end.locator('a[href^="mailto:"][href*="?"]').evaluateAll((as) => as.map((a) => new URL(a.getAttribute('href')!).searchParams.get('subject')))
    // The shared contact end has the field's letter link (the page's own subject) and the 15-minute call link (its own subject).
    expect([...subjects].sort()).toEqual([HIVAS_LEVEL.targy, MUNKAIM_KAPCSOLAT.targy].sort())
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0)
    expect(await page.locator('main').innerText()).not.toMatch(/\+36|06[ -]?\d{2}[ -]?\d{3}/)
    // The four offers are panels of /megrendeles/ now: the page's two area links point at their panels.
    expect(await page.locator('#teruletek a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(TERULETEK.map((t) => t.link.href))
  })

  test('no CV, PDF, LinkedIn or employer name, no video, and the 2025 label\'s "távfelügyelet" is on the page only where it belongs', async ({ page }) => {
    await open(page)
    const text = await page.locator('body').innerText()
    for (const word of ['Voltrack', 'Önéletrajz', 'LinkedIn', 'Kompetenciák', 'Azure Functions']) expect(text, word).not.toContain(word)
    await expect(page.locator('a[href*="/cv/"], a[href$=".pdf"], a[href*="linkedin"]')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(/videó/i)
    // The timeline label, its table row and the area text: three places, nowhere else.
    expect((await page.locator('main').evaluate((el) => el.textContent ?? '')).match(/távfelügyelet/g)).toHaveLength(3)
  })
})

// UI PR 1 (the direction of the three reels, "form first"): pills, tags, the headline's accent word, the jump pills and the dark-theme halo. No colour is new: the pens keep their jobs.
const colourOf = (page: Page, token: string) =>
  page.evaluate((t) => {
    const probe = document.createElement('i')
    probe.style.background = `var(${t})`
    document.body.append(probe)
    const c = getComputedStyle(probe).backgroundColor
    probe.remove()
    return c
  }, token)

test.describe('/munkaim/: pills and tags', () => {
  test('the headline keeps its words and the accent word is the red pen', async ({ page }) => {
    await open(page)
    await expect(page.locator('h1')).toHaveText(MUNKAIM_OLDAL.cim)
    await expect(page.locator('h1 .ph-akc')).toHaveText(MUNKAIM_OLDAL.kiemelt)
    expect(await page.locator('h1 .ph-akc').evaluate((el) => getComputedStyle(el).color)).toBe(await colourOf(page, '--jel'))
    expect(await page.locator('h1').evaluate((el) => getComputedStyle(el).color)).toBe(await colourOf(page, '--tinta'))
  })

  test('the jump pills use the words of the page, each leads to the first block of its kind or to "Évek", 44 px high', async ({ page }) => {
    await open(page)
    const kinds = [...new Set(MUNKAK.map((m) => m.fajta))]
    const wanted = [...kinds.map((k) => [k, `#munka-${MUNKAK.find((m) => m.fajta === k)!.id}`]), ['Évek', '#evek']]
    const links = page.locator('.mb-ank a')
    await expect(links).toHaveText(wanted.map(([text]) => text!))
    expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(wanted.map(([, href]) => href))
    for (const [, href] of wanted) await expect(page.locator(href!), href).toHaveCount(1)
    for (const box of await links.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44)
    await links.last().click()
    await expect(page).toHaveURL(/#evek$/)
    await expect(page.locator('#evek')).toBeInViewport()
  })

  test('the one link of a block is a pill: solid with an arrow to a page of this site, outlined with another arrow to another site; 44 px or more, the shape survives the focus ring', async ({ page }) => {
    await open(page)
    const kekSzin = await colourOf(page, '--kezel')
    for (const m of MUNKAK) {
      const link = page.locator(`#munka-${m.id} a.mb-cta`)
      const kulso = /^https?:\/\//.test(m.elo.href)
      await expect(link, m.id).toHaveClass(kulso ? /mb-cta-kulso/ : /mb-cta-teli/)
      await expect(link.locator('svg.mb-nyil')).toHaveAttribute('aria-hidden', 'true')
      const css = await link.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { face: cs.backgroundColor, collar: cs.borderTopColor, text: cs.color, radius: parseFloat(cs.borderTopLeftRadius), height: el.getBoundingClientRect().height }
      })
      expect(css.collar, `${m.id}: the blue collar`).toBe(kekSzin)
      expect(css.height, `${m.id}: tap target`).toBeGreaterThanOrEqual(44)
      expect(css.radius, `${m.id}: a pill`).toBeGreaterThanOrEqual(20)
      if (kulso) {
        expect(css.face, `${m.id}: outlined, no face`).toBe('rgba(0, 0, 0, 0)')
        expect(css.text, `${m.id}: blue words`).toBe(kekSzin)
      } else {
        expect(css.face, `${m.id}: solid blue`).toBe(kekSzin)
        expect(css.text, `${m.id}: the sheet's colour on it`).toBe(await colourOf(page, '--lap'))
      }
    }
    // the shared focus ring squares a focused element (keret.css); a pill keeps its shape and the ring stays
    await page.keyboard.press('Tab')
    const first = page.locator('#munka-lelek-es-nyelv a.mb-cta')
    await first.focus()
    expect(await first.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    const ring = await first.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { radius: parseFloat(cs.borderTopLeftRadius), outline: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }
    })
    expect(ring.radius).toBeGreaterThanOrEqual(20)
    expect(ring.outline).toBe('solid')
    expect(ring.width).toBeGreaterThanOrEqual(3)
  })

  test('the technique line is a label and one tag per item: small, mono, no link, no button, no hover state', async ({ page }) => {
    await open(page)
    for (const [selector, text] of [...MUNKAK.map((m) => [`#munka-${m.id}`, m.technika] as const), ['#munka-sajat-honlap', SAJAT_HONLAP.technika] as const]) {
      const line = page.locator(`${selector} .mb-tech`)
      if (!text) {
        await expect(line, selector).toHaveCount(0)
        continue
      }
      await expect(line.locator('b')).toHaveText('Technika:')
      await expect(line.locator('.mb-tag')).toHaveText(technikaCimkek(text))
      await expect(line.locator('a, button, [tabindex], [role]')).toHaveCount(0)
      for (const tag of await line.locator('.mb-tag').all()) {
        const css = await tag.evaluate((el) => ({ cursor: getComputedStyle(el).cursor, height: el.getBoundingClientRect().height, family: getComputedStyle(el).fontFamily }))
        expect(css.cursor, `${selector}: a tag is not a control`).toBe('auto')
        expect(css.height).toBeGreaterThanOrEqual(22.5)
        expect(css.height).toBeLessThanOrEqual(23.5)
        expect(css.family).toContain('Martian Mono')
      }
    }
  })

  test('the kind of work is a tag in the screen head: the same word, the legend type, the address stays plain text', async ({ page }) => {
    await open(page)
    const css = await page.locator('.mb-fajta').first().evaluate((el) => {
      const cs = getComputedStyle(el)
      return { radius: parseFloat(cs.borderTopLeftRadius), transform: cs.textTransform, height: el.getBoundingClientRect().height }
    })
    expect(css.radius).toBeGreaterThan(0)
    expect(css.transform).toBe('uppercase')
    expect(css.height).toBeLessThanOrEqual(22)
    expect(await page.locator('.mb-cim').first().evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px')
  })

  test('the halo is a dark-theme wash only: no strength in the light theme, 16 % in the dark (the key and the system alike), a background layer under every line and word', async ({ page, browser }) => {
    await open(page)
    const strength = (p: Page) => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--halop').trim())
    // the key's two states (the stored choice sets data-tema on the root)
    await page.evaluate(() => (document.documentElement.dataset.tema = 'vilagos'))
    expect(await strength(page)).toBe('0%')
    await page.evaluate(() => (document.documentElement.dataset.tema = 'sotet'))
    expect(await strength(page)).toBe('16%')
    expect(await page.locator('main').evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/^radial-gradient\(/)
    // it is a background of the page's own face (never a layer over a line or a word), drawn once at the top
    expect(await page.locator('main').evaluate((el) => getComputedStyle(el).backgroundRepeat)).toBe('no-repeat, repeat')
    expect(await page.locator('main').evaluate((el) => getComputedStyle(el).backgroundSize)).toBe('100% 340px, auto')
    // with no stored choice the system decides (the media rule)
    for (const [scheme, want] of [['dark', '16%'], ['light', '0%']] as const) {
      const context = await browser.newContext({ colorScheme: scheme })
      const fresh = await context.newPage()
      await fresh.goto(PAGE)
      await fresh.evaluate(() => delete document.documentElement.dataset.tema)
      expect(await strength(fresh), `system ${scheme}`).toBe(want)
      await context.close()
    }
  })

  test('the arrow moves only where motion is allowed', async ({ page, browser }) => {
    await open(page)
    expect(await page.locator('.mb-nyil').first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.16s')
    const reduced = await browser.newContext({ reducedMotion: 'reduce' })
    const quiet = await reduced.newPage()
    await quiet.goto(PAGE)
    expect(await quiet.locator('.mb-nyil').first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
    await reduced.close()
  })

  for (const width of [320, 360, 390, 768, 1280]) {
    test(`the pills and tags wrap inside the page at ${width}px`, async ({ page }) => {
      await open(page, width)
      for (const selector of ['.mb-ank a', '.mb-cta', '.mb-tag', '.mb-fajta']) {
        for (const box of await page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
          expect(box.left, `${selector} at ${width}`).toBeGreaterThanOrEqual(0)
          expect(box.right, `${selector} at ${width}`).toBeLessThanOrEqual(width)
        }
      }
      // the address and the kind never overlap in a screen head
      for (const head of await page.locator('.mb-kep .adl-fej').all()) {
        const [kind, address] = await Promise.all([head.locator('.mb-fajta').boundingBox(), head.locator('.mb-cim').boundingBox()])
        if (address && (await head.locator('.mb-cim').isVisible())) expect(kind!.x + kind!.width, `${width}: head row`).toBeLessThanOrEqual(address.x + 0.5)
      }
    })
  }
})

test.describe('/munkaim/: the signal line', () => {
  for (const width of [1280, 1024, 768, 360]) {
    test(`a tap runs from the spine to each screen's entry square, and "Ez a honlap" is on the line (${width}px)`, async ({ page }) => {
      await open(page, width)
      const spine = await rect(page, '.sp-l .sp')
      const centre = (spine.left + spine.right) / 2
      for (const m of MUNKAK) {
        const tap = await rect(page, `#munka-${m.id} .mb-tap`)
        const entry = await rect(page, `#munka-${m.id} .adl-bel`)
        expect(tap.left, `${m.id}: the tap starts on the spine`).toBeLessThanOrEqual(centre + 0.5)
        expect(tap.left, `${m.id}: the tap starts on the spine`).toBeGreaterThanOrEqual(spine.left - 0.5)
        expect(Math.abs(tap.right - entry.left), `${m.id}: the tap ends at the entry square`).toBeLessThanOrEqual(1)
        expect(Math.abs((tap.top + tap.bottom) / 2 - (entry.top + entry.bottom) / 2), `${m.id}: level with the square`).toBeLessThanOrEqual(1.5)
      }
      const h3 = await rect(page, '#munka-sajat-honlap .mb-h3')
      const brk = await rect(page, '#munka-sajat-honlap .mb-brk')
      if (width >= 727) {
        // The line leaves the spine level with the H3, turns down and returns at the Technika line: a bracket that never covers text.
        const tech = await rect(page, '#munka-sajat-honlap .mb-tech')
        expect(brk.top, 'the bracket opens at the H3 level').toBeLessThanOrEqual(h3.top + h3.height / 2 + 1)
        expect(brk.top).toBeGreaterThanOrEqual(h3.top)
        expect(brk.bottom, 'and returns at the Technika line').toBeGreaterThanOrEqual(tech.top)
        expect(brk.bottom).toBeLessThanOrEqual(tech.bottom + 1)
        expect(brk.right, 'it stays 12 px clear of the text').toBeLessThanOrEqual(h3.left - 11)
      } else {
        // Too narrow a lane: one node on the spine, level with the H3.
        expect(brk.width).toBeLessThanOrEqual(1)
      }
    })
  }
})

test.describe('/munkaim/: Évek', () => {
  test('the hidden table carries the five periods without employer names, the area rows and the closing sentence follow', async ({ page }) => {
    await open(page)
    await expect(page.locator('#evek table caption')).toHaveText('Évek')
    await expect(page.locator('#evek table thead th')).toHaveText(['Év', 'Terület'])
    expect(await page.locator('#evek table tbody tr').evaluateAll((rows) => rows.map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent)))).toEqual(IDOVONAL.map((i) => [evSzoveg(i), i.terulet]))
    await expect(page.locator('#evek .ev-rajz [aria-hidden="true"]').first()).toBeAttached()
    await expect(page.locator('#teruletek h3')).toHaveText(TERULETEK.map((t) => t.cim))
    for (const t of TERULETEK) await expect(page.locator(`#terulet-${t.id} p`).first()).toHaveText(t.reszlet)
    await expect(page.locator('.ev-zaro')).toHaveText('Egyéni vállalkozóként, egyedül dolgozom: Ön velem beszél, nincs közvetítő, és ugyanaz készíti el a munkát, akivel egyeztet.')
    // The old addresses of the pieces keep working as anchors.
    for (const id of ['idovonal', 'teruletek', 'terulet-villamosmernok', 'terulet-szoftverfejleszto', 'evek']) await expect(page.locator(`#${id}`), id).toHaveCount(1)
  })

  for (const width of [1280, 1024, 768, 360]) {
    test(`the timing diagram: year cells from 2023 to the build year, every edge on a cell edge within 1 px (${width}px)`, async ({ page }) => {
      await open(page, width)
      const cells = await page.locator('.ev-cella').allTextContents()
      const last = Number(cells.at(-1))
      expect(Number(cells[0])).toBe(2023)
      expect(last).toBeGreaterThanOrEqual(2026)
      expect(cells.map(Number)).toEqual(Array.from({ length: last - 2022 }, (_, i) => 2023 + i))
      const cellBoxes = await page.locator('.ev-cella').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })))
      const axis = await rect(page, '.ev-cellak')
      expect(cellBoxes[0]!.left - axis.left, 'the lead-in').toBeGreaterThanOrEqual(15.5)
      // the cells are equal
      const w = cellBoxes[0]!.right - cellBoxes[0]!.left
      for (const c of cellBoxes) expect(Math.abs(c.right - c.left - w)).toBeLessThanOrEqual(0.6)
      for (let i = 0; i < IDOVONAL.length; i += 1) {
        const p = IDOVONAL[i]!
        const a = p.kezdet - 2023
        const b = (p.veg ?? last) - 2023 + 1
        const hi = await rect(page, '.ev-kan .ev-hi', i)
        expect(Math.abs(hi.left - cellBoxes[a]!.left), `row ${i} (${evSzoveg(p)}) rises at the start of ${p.kezdet}`).toBeLessThanOrEqual(1)
        const wanted = cellBoxes[b - 1]!.right
        const edge = p.veg === undefined ? hi.right : hi.right - hi.height / 2
        expect(Math.abs(edge - wanted), `row ${i} (${evSzoveg(p)}) ends at the end of ${p.veg ?? 'now'}`).toBeLessThanOrEqual(1.5)
        if (p.veg === undefined) await expect(page.locator('.ev-kan').nth(i)).toHaveAttribute('data-tart', '')
        else await expect(page.locator('.ev-kan').nth(i)).not.toHaveAttribute('data-tart', /.*/)
      }
      // the tap ends in the node at the axis's left end, level with the rule
      const tap = await rect(page, '.ev-tap')
      expect(Math.abs(tap.right - axis.left)).toBeLessThanOrEqual(1)
      expect(Math.abs((tap.top + tap.bottom) / 2 - (axis.bottom - 0.5))).toBeLessThanOrEqual(1)
    })
  }

  test('running periods are hot only while they draw: after the drawing no --jel-forro is on the page', async ({ page }) => {
    await open(page)
    await page.locator('#idovonal').scrollIntoViewIfNeeded()
    await expect(page.locator('#idovonal')).toHaveAttribute('data-kesz', '')
    // 300 ms drawing, up to 4 x 80 ms of delay, a 700 ms heat that cools: 2 s is past all of it.
    await page.waitForTimeout(2000)
    const colours = await page.evaluate(() => {
      const probe = document.createElement('i')
      probe.style.background = 'var(--jel-forro)'
      document.body.append(probe)
      const forro = getComputedStyle(probe).backgroundColor
      probe.remove()
      const jel = (() => {
        const p = document.createElement('i')
        p.style.background = 'var(--jel)'
        document.body.append(p)
        const c = getComputedStyle(p).backgroundColor
        p.remove()
        return c
      })()
      const painted = [...document.querySelectorAll('#idovonal .ev-kan > i, #idovonal .ev-tap')].map((el) => getComputedStyle(el).backgroundColor)
      const nodes = [...document.querySelectorAll('#idovonal .ev-kan[data-tart] .ev-hi')].map((el) => getComputedStyle(el, '::after').backgroundColor)
      return { forro, jel, painted, nodes }
    })
    expect(colours.painted.every((c) => c === colours.jel), JSON.stringify(colours)).toBe(true)
    expect(colours.nodes.every((c) => c === colours.jel), JSON.stringify(colours)).toBe(true)
    expect(colours.forro).not.toBe(colours.jel)
  })

  test('the diagram is drawn once when 40 % is in view; under reduced motion it is all drawn at load', async ({ page, browser }) => {
    await open(page)
    await expect(page.locator('#idovonal')).toHaveAttribute('data-var', '')
    await page.locator('#idovonal').scrollIntoViewIfNeeded()
    await expect(page.locator('#idovonal')).toHaveAttribute('data-kesz', '')
    const reduced = await browser.newContext({ reducedMotion: 'reduce' })
    const quiet = await reduced.newPage()
    await quiet.goto(PAGE)
    await expect(quiet.locator('#idovonal')).not.toHaveAttribute('data-var', /.*/)
    expect(await quiet.locator('#idovonal .ev-kan').first().evaluate((el) => getComputedStyle(el).clipPath)).toBe('none')
    await reduced.close()
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('the diagram is drawn, the table and the blocks are there, the keys of Rollin are not', async ({ page }) => {
      await page.goto(PAGE)
      await expect(page.locator('#idovonal')).not.toHaveAttribute('data-var', /.*/)
      expect(await page.locator('#idovonal .ev-kan').first().evaluate((el) => getComputedStyle(el).clipPath)).toBe('none')
      await expect(page.locator('#idovonal .ev-kan')).toHaveCount(5)
      await expect(page.locator('[data-rollin-vez]')).toBeHidden()
      await expect(page.locator('#kapcsolat')).toBeVisible()
    })
  })
})

test.describe('/munkaim/ and /megrendeles/: the section H2 never above the page H1', () => {
  for (const url of [PAGE, '/megrendeles/']) {
    test(`H2 <= H1 at every width, 36 px from 727 to 1279 (${url})`, async ({ page }) => {
      for (const width of [320, 340, 359, 360, 500, 726, 727, 900, 1023, 1024, 1200, 1279, 1280, 1600]) {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(url)
        const [h1, h2] = await page.evaluate(() => [parseFloat(getComputedStyle(document.querySelector('h1')!).fontSize), parseFloat(getComputedStyle(document.querySelector('main h2.h2')!).fontSize)])
        expect(h2, `${url} at ${width}: H2 ${h2} against H1 ${h1}`).toBeLessThanOrEqual(h1)
        if (width >= 727 && width <= 1279) expect(h2, `${url} at ${width}`).toBe(36)
      }
    })
  }
})

test.describe('/munkaim/: accessibility', () => {
  for (const tema of ['vilagos', 'sotet'] as const) {
    for (const width of [1280, 360]) {
      test(`axe finds nothing at ${width}px in the ${tema === 'sotet' ? 'dark' : 'light'} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: tema === 'sotet' ? 'dark' : 'light' })
        await open(page, width)
        await page.evaluate((t) => (document.documentElement.dataset.tema = t), tema)
        // the draw-in of Évek and the reveals are done before axe measures colours
        await page.locator('#idovonal').scrollIntoViewIfNeeded()
        await page.waitForTimeout(1500)
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])
      })
    }
  }
})

test.describe('the retired addresses', () => {
  for (const from of ['/tapasztalat/', '/cv/']) {
    test(`${from} leads to /munkaim/#evek`, async ({ page }) => {
      await page.goto(from)
      await expect(page).toHaveURL(/\/munkaim\/#evek$/)
      await expect(page.locator('#evek')).toBeInViewport()
    })
  }

  test('no built page links /tapasztalat/ or /cv/, and the sitemap lists /munkaim/ only', async ({ request }) => {
    for (const url of ['/', '/munkaim/', '/megrendeles/', '/impresszum/', '/aszf/', '/adatkezeles/', '/en/imprint/', '/404.html']) {
      const html = await (await request.get(url)).text()
      expect(html.match(/href="[^"]*(?:\/tapasztalat\/|\/cv\/)[^"]*"/g) ?? [], url).toEqual([])
    }
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('/munkaim/')
    expect(sitemap).not.toMatch(/\/(tapasztalat|cv)\//)
  })
})
