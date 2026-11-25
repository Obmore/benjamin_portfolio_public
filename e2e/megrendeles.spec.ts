import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { HIVAS_LEVEL, levelCim } from '../src/content/alapadatok'
import { JEL } from '../src/content/fooldal'
import { BELEPOK } from '../src/content/belepok'
import { CSOMAGOK_KAPCSOLAT, CSOMAGOK_LAB, CSOMAGOK_OLDAL, TOVABBI_SZOLGALTATASOK, szolgaltatasLevel } from '../src/content/csomagok'
import { GARANCIA_MONDAT } from '../src/content/kozos'
import { AMOUNTS, THRESHOLDS, VAT_LABEL } from '../src/data/pricing'
import { BEMUTATKOZO } from '../src/content/szegmensek/bemutatkozo'
import { GEPKONYV } from '../src/content/szegmensek/gepkonyv'
import { LAPSZABASZAT } from '../src/content/szegmensek/lapszabaszat'
import { TERMEKLEIRAS } from '../src/content/szegmensek/termekleiras'
import { movingAnimations } from './motion'

// /megrendeles/ ("Csomagok és árak") on the shared layer (PR 6): the page header, four record panels with their taps, the price table with its foot,
// the shared contact end. The four offer pages are merged into it. Measured checks P1 to P23 of the page spec; no pixel baseline of the page or of a shared component.
const ORDER_PATH = '/megrendeles/'
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
const VAT = VAT_LABEL.hu
const NBSP = ' '
const SEGMENTS = [
  { id: 'termekleiras', adat: TERMEKLEIRAS, key: 'productDescriptionsTrial' },
  { id: 'gepkonyv', adat: GEPKONYV, key: 'machineManualEntry' },
  { id: 'lapszabaszat', adat: LAPSZABASZAT, key: 'orderFormSheet' },
  { id: 'bemutatkozo', adat: BEMUTATKOZO, key: 'introSite' },
] as const
const SERVICES = TOVABBI_SZOLGALTATASOK.map((s) => s.id)
const ANCHORS = ['belepo-csomagok', ...SEGMENTS.map((s) => `szolgaltatas-${s.id}`), 'egyeb-szolgaltatasok', ...SERVICES.map((id) => `szolgaltatas-${id}`), 'kapcsolat', 'kapcsolat-email']
const WIDTHS = [320, 360, 727, 768, 1024, 1180, 1280] as const
// P1: the price places (nine) by key, and the foot's threshold apart.
const PLACES: Record<string, number> = { productDescriptionsTrial: 1, machineManualEntry: 1, orderForm: 1, orderFormSheet: 2, introSite: 1, hosting: 2, hostingWithEdits: 1 }
const huf = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + `${NBSP}Ft`

function collectConsoleErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg)
  })
  page.on('pageerror', (error) => {
    throw error
  })
  return errors
}

async function gotoOrder(page: Page, hash = ''): Promise<void> {
  const response = await page.goto(ORDER_PATH + hash, { waitUntil: 'networkidle' })
  if (!response) return // a hash-only navigation on the loaded page is no new document
  expect([200, 304], `${ORDER_PATH} status`).toContain(response.status())
  await page.evaluate(() => document.fonts.ready)
}

const subject = (href: string) => new URL(href).searchParams.get('subject')

test.describe('/megrendeles/', () => {
  test('P15 P16: one H1, three H2, four H3 (the package names), no H4; head as before; one address; no form; indexable; privacy link', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await gotoOrder(page)
    await expect(page.locator('h1')).toHaveText(CSOMAGOK_OLDAL.cim)
    await expect(page.locator('h2')).toHaveText([CSOMAGOK_OLDAL.belepokCim, CSOMAGOK_OLDAL.tovabbiCim, CSOMAGOK_KAPCSOLAT.cim])
    await expect(page.locator('h3')).toHaveText(SEGMENTS.map((s) => s.adat.belepo.nev))
    await expect(page.locator('h4, h5, h6')).toHaveCount(0)
    await expect(page).toHaveTitle('Csomagok és árak – Ott Benjámin')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://ottbenjamin.hu/megrendeles/')
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://ottbenjamin.hu/megrendeles/')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page.locator('form, input, textarea')).toHaveCount(0)
    await expect(page.locator('footer a[href="/adatkezeles/"]')).toHaveCount(1)
    // Engine-neutral (WebKit joins the address and the copy key's label without whitespace in innerText): every mailto points to the business address, the visible text carries it,
    // and with every occurrence of it removed (text and head) no other address pattern is left.
    const hrefs = await page.locator('a[href^="mailto:"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(new URL(h).pathname).toBe(EMAIL)
    const all = await page.evaluate(() => document.body.innerText + ' ' + document.head.innerHTML)
    expect(all).toContain(EMAIL)
    expect(all.replaceAll(EMAIL, ' ').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []).toEqual([])
    // The head carries no amount (JSON-LD, meta).
    expect(await page.evaluate(() => /\d\s?Ft\b/.test(document.head.innerHTML.replaceAll(' ', ' ')))).toBe(false)
    expect(errors.map((m) => m.text())).toEqual([])
  })

  test('P4: each panel carries the strings of the content files: name, sentence, time, price, button, promise, mail subject; the intro, the sentence under "Belépő csomagok" and the contact paragraph are the approved ones', async ({ page }) => {
    await gotoOrder(page)
    await expect(page.locator('.cs-bev')).toHaveText(CSOMAGOK_OLDAL.bevezeto)
    await expect(page.locator('.cs-mondat')).toHaveText(CSOMAGOK_OLDAL.belepokMondat)
    await expect(page.locator('.cs-par-k')).toHaveText(`${CSOMAGOK_KAPCSOLAT.szoveg} ${CSOMAGOK_KAPCSOLAT.masodik}`)
    expect(CSOMAGOK_KAPCSOLAT.szoveg).toBe('Írja le, hogyan dolgozik most, mi okoz nehézséget, és milyen eredményt szeretne.')
    for (const { id, adat } of SEGMENTS) {
      const panel = page.locator(`#szolgaltatas-${id}`)
      const b = adat.belepo
      await expect(panel.locator('.adl-fej')).toHaveText(CSOMAGOK_OLDAL.adatlap.fej)
      await expect(panel.locator('h3')).toHaveText(b.nev)
      const rows = [[CSOMAGOK_OLDAL.adatlap.tartalom, b.leiras], ...(b.ido ? [[CSOMAGOK_OLDAL.adatlap.hatarido, b.ido]] : [])]
      await expect(panel.locator('.adl-cimke')).toHaveText(rows.map((r) => r[0]))
      await expect(panel.locator('.adl-ertek')).toHaveText(rows.map((r) => r[1]))
      await expect(panel.locator('.adl-ossz')).toHaveText(huf(AMOUNTS[(b.ar as { osszeg: keyof typeof AMOUNTS }).osszeg]))
      await expect(panel.locator('.adl-utotag')).toHaveText((b.ar as { utotag: string }).utotag)
      await expect(panel.locator('.adl-afa')).toHaveText(VAT)
      await expect(panel.locator('.adl-gomb')).toHaveText(adat.hos.gomb.felirat)
      await expect(panel.locator('.adl-gar')).toHaveText(GARANCIA_MONDAT)
      const link = panel.locator('a.adl-link')
      await expect(link).toHaveText(adat.hos.garancia)
      await expect(link).toHaveAttribute('href', '/aszf/#elso-resz')
      await expect(panel.locator('.adl-gomb')).toHaveAttribute('href', levelCim(adat.kapcsolat.level))
      expect(subject((await panel.locator('.adl-gomb').getAttribute('href'))!)).toBe(adat.kapcsolat.level.targy)
    }
    await expect(page.locator('#szolgaltatas-termekleiras .adl-cimke')).toHaveText(['Tartalom', 'Határidő'])
    await expect(page.locator('#szolgaltatas-gepkonyv .adl-cimke')).toHaveText(['Tartalom'])
    await expect(page.locator('#szolgaltatas-lapszabaszat .adl-cimke')).toHaveText(['Tartalom'])
    await expect(page.locator('#szolgaltatas-bemutatkozo .adl-cimke')).toHaveText(['Tartalom', 'Határidő'])
    // Four distinct accessible names on the key buttons (the visible labels differ, no aria-label overrides them).
    const names = await page.locator('.adl-gomb').evaluateAll((as) => as.map((a) => (a.getAttribute('aria-label') ?? a.textContent ?? '').trim()))
    expect(new Set(names).size).toBe(4)
    expect(names).toEqual(SEGMENTS.map((s) => s.adat.hos.gomb.felirat))
    // The right column: the carrying sentence, the four fact rows in the label voice, the row's text link.
    for (const { id, adat } of SEGMENTS) {
      const col = page.locator(`#szolgaltatas-${id}`).locator('xpath=following-sibling::div[contains(@class,"cs-szov")]')
      await expect(col.locator('.cs-hos')).toHaveText(adat.hos.cim)
      await expect(col.locator('.cs-tenyek dt')).toHaveText(Object.values(CSOMAGOK_OLDAL.tenyek))
      await expect(col.locator('.cs-tenyek dd').first()).toHaveText(adat.hos.kinek)
      for (const m of adat.csomagMondatok) await expect(col).toContainText(m.replace(/\s+/g, ' '))
      expect(await col.locator('.cs-tenyek dt').first().evaluate((e) => getComputedStyle(e).fontWeight)).toBe('700')
    }
    await expect(page.locator('#szolgaltatas-gepkonyv ~ .cs-szov .cs-nb')).toHaveText(['2027. január 20-tól'])
  })

  test('P1 P2 P3: nine price places by key, each followed by the VAT label; the threshold only in the foot, once, no VAT mark', async ({ page }) => {
    await gotoOrder(page)
    const body = (await page.locator('main').innerText()).replaceAll(NBSP, ' ')
    const foot = (await page.locator('.cs-lab').innerText()).replaceAll(NBSP, ' ')
    expect(await page.locator('.cs-lab').count()).toBe(1)
    const outside = body.replace(foot, '')
    const shown = [...outside.matchAll(/\d{1,3}(?: \d{3})* Ft/g)].map((m) => m[0])
    const expected: Record<string, number> = {}
    for (const [k, n] of Object.entries(PLACES)) {
      const text = huf(AMOUNTS[k as keyof typeof AMOUNTS]).replaceAll(NBSP, ' ')
      expected[text] = (expected[text] ?? 0) + n
    }
    const seen: Record<string, number> = {}
    for (const a of shown) seen[a] = (seen[a] ?? 0) + 1
    expect(seen).toEqual(expected)
    expect(shown).toHaveLength(9)
    expect([...foot.matchAll(/\d{1,3}(?: \d{3})* Ft/g)].map((m) => m[0])).toEqual([huf(THRESHOLDS.depositFrom).replaceAll(NBSP, ' ')])
    expect(foot).not.toContain('AAM')
    // 9 of 9: the VAT label follows each amount in its plate row, cell or line.
    expect((body.match(/AAM \(áfamentes\)/g) ?? []).length).toBe(9)
    await expect(page.locator('.adl-ossz + .adl-utotag')).toHaveCount(4)
    await expect(page.locator('.adl-sum + .adl-afa')).toHaveCount(4)
    await expect(page.locator('td.cs-ar:has-text("Ft") + td.cs-afa')).toHaveText([VAT, VAT, VAT, VAT])
    expect(await page.locator('.cs-afa-i').evaluate((e) => e.parentElement?.textContent ?? '')).toContain(`havi ${huf(AMOUNTS.hosting)}`)
    expect(body).not.toMatch(/59 000|Ft\/óra|alanyi adómentes/)
  })

  test('the table: five services in order, sub-rows, one text link each (no key button), "Egyedi ajánlat" exactly in the three amount-less cells, the approved price sentences in bold', async ({ page }) => {
    await gotoOrder(page)
    await expect(page.locator('table.cs-tabla caption')).toHaveText(CSOMAGOK_OLDAL.tovabbiCim)
    await expect(page.locator('table.cs-tabla > tbody')).toHaveCount(5)
    expect(await page.locator('table.cs-tabla > tbody').evaluateAll((e) => e.map((t) => t.id))).toEqual(SERVICES.map((id) => `szolgaltatas-${id}`))
    for (const s of TOVABBI_SZOLGALTATASOK) {
      const t = page.locator(`#szolgaltatas-${s.id}`)
      await expect(t.locator('.cs-fej').first().locator('th')).toHaveText(s.cim)
      const link = t.locator('.cs-link a')
      await expect(link).toHaveCount(1)
      await expect(link).toHaveText(s.gomb)
      await expect(link).toHaveAttribute('aria-label', `${s.gomb} – ${s.cim}`)
      await expect(link).toHaveAttribute('href', levelCim(szolgaltatasLevel(s.cim)))
      for (const a of s.alsorok ?? []) await expect(t.locator('.cs-al th')).toContainText(a.cim)
      for (const b of [...s.blokkok, ...(s.zaro ?? [])]) if (b.tipus === 'dij') await expect(t.locator('.cs-dij')).toHaveText(b.szoveg)
    }
    expect(await page.locator('td.cs-ar', { hasText: 'Egyedi ajánlat' }).count()).toBe(3)
    expect(await page.locator('body').innerText()).toMatch(/Egyedi ajánlat/)
    expect(((await page.locator('main').innerText()).match(/Egyedi ajánlat/g) ?? []).length).toBe(3)
    for (const id of ['automatizalas', 'adatok', 'egyedi']) {
      await expect(page.locator(`#szolgaltatas-${id} td.cs-ar`)).toHaveText('Egyedi ajánlat')
      await expect(page.locator(`#szolgaltatas-${id} td.cs-afa`)).toHaveText('')
      expect(await page.locator(`#szolgaltatas-${id} .cs-dij`).evaluate((e) => getComputedStyle(e).fontWeight)).toBe('700')
    }
    await expect(page.locator('#szolgaltatas-uzemeltetes td.cs-ar')).toHaveText([`havi ${huf(AMOUNTS.hosting)}`, `havi ${huf(AMOUNTS.hostingWithEdits)}`])
    await expect(page.locator('#szolgaltatas-rendelolap td.cs-ar')).toHaveText([`${huf(AMOUNTS.orderForm)} egyszeri díj`, `${huf(AMOUNTS.orderFormSheet)} egyszeri díj`])
  })

  test('the foot: two paragraphs (price-final first, payment second), the threshold with its "-os" on one line, "ÁSZF" the only link', async ({ page }) => {
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await gotoOrder(page)
      const paras = page.locator('.cs-lab p')
      await expect(paras).toHaveCount(2)
      await expect(paras.nth(0)).toHaveText(CSOMAGOK_LAB.dij)
      const pay = (await paras.nth(1).innerText()).replaceAll(NBSP, ' ')
      expect(pay).toBe(CSOMAGOK_LAB.fizetes.replace('{kuszob:depositFrom}', huf(THRESHOLDS.depositFrom).replaceAll(NBSP, ' ')).replace('{aszf}', CSOMAGOK_LAB.aszf))
      await expect(page.locator('.cs-lab a')).toHaveCount(1)
      await expect(page.locator('.cs-lab a')).toHaveText('ÁSZF')
      await expect(page.locator('.cs-lab a')).toHaveAttribute('href', '/aszf/#elso-resz')
      const lines = await page.locator('.cs-lab .cs-nb').evaluate((e) => e.getClientRects().length)
      expect(lines, 'the amount with its "-os" is one box on one line').toBe(1)
      await expect(page.locator('.cs-lab .cs-nb')).toHaveText(`${huf(THRESHOLDS.depositFrom)}-os`)
      const w = await page.locator('.cs-lab').evaluate((e) => e.getBoundingClientRect().width)
      expect(w).toBeLessThanOrEqual(640.5)
      expect(await paras.nth(0).evaluate((e) => getComputedStyle(e).fontWeight)).toBe('400')
      // Under the table's last rule, from the table's text edge.
      const geo = await page.evaluate(() => {
        const t = document.querySelector('.cs-tabla')!.getBoundingClientRect()
        const f = document.querySelector('.cs-lab')!.getBoundingClientRect()
        return { gap: f.top - t.bottom }
      })
      expect(geo.gap).toBeCloseTo(16, 0)
    }
  })

  // One test per anchor and width (a fresh load and the late-font wait for each is too long for one test).
  for (const width of [360, 1280]) {
    for (const id of ANCHORS) {
      test(`P5: #${id} exists once, lands its top 24 px under the viewport top (or as far as the page end allows) and nothing covers it, at ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        // Each anchor is a fresh arrival (a shared link), not a hash change inside the loaded page: the page-load jump is instant, an in-page hash change scrolls smoothly.
        await gotoOrder(page, `#${id}`)
        expect(await page.locator(`[id="${id}"]`).count(), id).toBe(1)
        // The target has landed (24 px under the top), or, for a target the page end does not let reach it, it stops moving with the page at its end. A target that is merely unchanged
        // between two reads is not enough: an engine may start the fragment scroll late. The jump is instant, so the target can stand aligned before the late fonts change the layout and
        // the page script re-aligns it: wait for the fonts, then for the frames the re-align takes, before the reads.
        await page.evaluate(() => document.fonts.ready.then(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
        let last = -1
        for (let i = 0; i < 60; i++) {
          const s = await page.evaluate((i2) => ({ top: document.getElementById(i2)!.getBoundingClientRect().top, atEnd: window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1 }), id)
          if (Math.abs(s.top - 24) <= 2 || (s.atEnd && s.top === last)) break
          last = s.top
          await page.waitForTimeout(100)
        }
        const m = await page.evaluate((i2) => {
          const e = document.getElementById(i2)!
          const r = e.getBoundingClientRect()
          const max = document.documentElement.scrollHeight - window.innerHeight
          const hit = document.elementFromPoint(Math.min(window.innerWidth - 2, Math.max(2, r.left + 6)), Math.max(1, r.top + 6))
          return { top: r.top, atEnd: window.scrollY >= max - 1, covered: !!hit && !e.contains(hit) && !hit.contains(e) }
        }, id)
        if (m.atEnd) expect(m.top, `${id} at ${width}: page end reached`).toBeGreaterThanOrEqual(24 - 2)
        else expect(Math.abs(m.top - 24), `${id} at ${width}`).toBeLessThanOrEqual(2)
        expect(m.covered, `${id} is not under another element`).toBe(false)
      })
    }
  }

  for (const width of [727, 1024, 1280]) {
    test(`a nested row's name lines up with its own text, targeted or not, at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const inset = (sel: string, from: ReturnType<typeof page.locator>) => from.locator(sel).first().evaluate((e) => e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft))
      for (const s of TOVABBI_SZOLGALTATASOK.filter((x) => x.alsorok?.length)) {
        for (const hash of ['', `#szolgaltatas-${s.id}`]) {
          await gotoOrder(page, hash)
          const group = page.locator(`#szolgaltatas-${s.id}`)
          const name = await inset('tr.cs-al > th.cs-nev', group)
          const text = await inset('tr.cs-al .cs-szoveg-be', group)
          expect(Math.abs(name - text), `${s.id}${hash ? ' targeted' : ''}: name ${name} text ${text}`).toBeLessThanOrEqual(0.5)
        }
      }
    })
  }

  test('arrival at a panel: only its entry square is filled; at a table service: that service sits on the second paper and no tap is drawn', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await gotoOrder(page, '#szolgaltatas-gepkonyv')
    const fills = await page.locator('.adl-bel').evaluateAll((e) => e.map((x) => getComputedStyle(x).backgroundColor))
    expect(fills.filter((c) => c !== 'rgba(0, 0, 0, 0)')).toHaveLength(1)
    expect(fills[1]).not.toBe('rgba(0, 0, 0, 0)')
    await expect(page.locator('.cs-tap')).toHaveCount(4)
    await gotoOrder(page, '#szolgaltatas-adatok')
    // one unbroken face on the row group (not patches on the cells), as wide as the table's rules
    const bg = await page.locator('#szolgaltatas-adatok').evaluate((e) => getComputedStyle(e).backgroundColor)
    const other = await page.locator('#szolgaltatas-egyedi').evaluate((e) => getComputedStyle(e).backgroundColor)
    expect(await page.locator('#szolgaltatas-adatok :is(th, td)').evaluateAll((es) => es.every((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)')), 'the cells carry no patches').toBe(true)
    expect(await page.evaluate(() => Math.abs(document.getElementById('szolgaltatas-adatok')!.getBoundingClientRect().width - document.querySelector('.cs-tabla')!.getBoundingClientRect().width)), 'rule to rule').toBeLessThanOrEqual(0.5)
    expect(bg).not.toBe(other)
    expect(await page.locator('.adl-bel').evaluateAll((e) => e.every((x) => getComputedStyle(x).backgroundColor === 'rgba(0, 0, 0, 0)'))).toBe(true)
    // A malformed hash does not stop the page's script: the key still turns the theme.
    await page.goto(`${ORDER_PATH}#%E0%A4%A`, { waitUntil: 'networkidle' })
    await expect(page.locator('.tkey')).toBeEnabled()
  })

  test('P12: one unbroken line, four taps plus the contact station\'s; each tap ends flush on its panel\'s entry square (0 px) at the square\'s height, the node on the lane; every tap is 12 px or more from any text', async ({ page }) => {
    for (const width of [360, 727, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await gotoOrder(page)
      await expect(page.locator('.cs-tap')).toHaveCount(4)
      await expect(page.locator('.cmz-svg .cmz-nod')).toHaveCount(1)
      const m = await page.evaluate(() => {
        const lane = document.querySelector('.hdr .lane')!.getBoundingClientRect()
        const spine = document.querySelector('.sp-l .sp')!.getBoundingClientRect()
        const taps = [...document.querySelectorAll('.cs-tap')].map((t) => {
          const r = t.getBoundingClientRect()
          const sq = t.closest('.cs-sor')!.querySelector('.adl-bel')!.getBoundingClientRect()
          const texts: DOMRect[] = []
          const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent?.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(n)
            for (const q of range.getClientRects()) texts.push(q)
          }
          const dist = (a: DOMRect, b: DOMRect) => Math.hypot(Math.max(a.left - b.right, b.left - a.right, 0), Math.max(a.top - b.bottom, b.top - a.bottom, 0))
          return { right: r.right, left: r.left, cy: r.top + r.height / 2, sqLeft: sq.left, sqCy: sq.top + sq.height / 2, minText: Math.min(...texts.map((q) => dist(r, q))) }
        })
        return { laneX: lane.left + lane.width / 2, spineX: spine.left + spine.width / 2, taps }
      })
      expect(Math.abs(m.laneX - m.spineX), 'the spine runs through the lane').toBeLessThanOrEqual(1.5)
      for (const t of m.taps) {
        expect(Math.abs(t.right - t.sqLeft), `tap end meets the square at ${width}`).toBeLessThanOrEqual(0.5)
        expect(Math.abs(t.cy - t.sqCy)).toBeLessThanOrEqual(0.5)
        expect(Math.abs(t.left - m.laneX), 'the tap starts on the lane').toBeLessThanOrEqual(1.5)
        expect(t.minText, 'a tap keeps 12 px from any text').toBeGreaterThanOrEqual(12)
      }
    }
  })

  test('the four panels have one width from 727 px up; the right column is at least 440 px beside the panel from 1180 px', async ({ page }) => {
    for (const width of [727, 768, 1024, 1180, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await gotoOrder(page)
      const m = await page.evaluate(() => ({
        panels: [...document.querySelectorAll('.adl')].map((e) => e.getBoundingClientRect().width),
        cols: [...document.querySelectorAll('.cs-szov')].map((e) => ({ w: e.getBoundingClientRect().width, left: e.getBoundingClientRect().left, panelRight: e.parentElement!.querySelector('.adl')!.getBoundingClientRect().right })),
      }))
      expect(new Set(m.panels.map((w) => Math.round(w))).size, `one width at ${width}`).toBe(1)
      expect(m.panels[0], `panel width at ${width}`).toBeGreaterThanOrEqual(466 - 0.5)
      if (width >= 1180) for (const c of m.cols) { expect(c.w).toBeGreaterThanOrEqual(440); expect(c.left).toBeGreaterThan(c.panelRight) }
    }
  })

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [360, 1280]) {
      test(`P10 axe: no violations, ${width} px, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: theme })
        await gotoOrder(page)
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])
      })
    }
  }

  test('P11: no horizontal overflow and no clipped key label at 320 to 1280 px', async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await gotoOrder(page)
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        clipped: [...document.querySelectorAll('.adl-gomb, .adl-link, .cs-tabla th, .cs-tabla td.cs-ar, .cs-link a, .cmz-gomb')]
          .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5)
          .map((e) => `${e.className}:${e.textContent?.slice(0, 24)}`),
        tapsOut: [...document.querySelectorAll('.cs-tap')].some((e) => e.getBoundingClientRect().left < -0.5),
      }))
      expect(m.sw, `scrollWidth at ${width}`).toBeLessThanOrEqual(m.cw)
      expect(m.clipped, `clipped at ${width}`).toEqual([])
      expect(m.tapsOut).toBe(false)
    }
  })

  test('P11: the amount with its suffix stays inside its plate at 320 to 1280 px', async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await gotoOrder(page)
      const bad = await page.evaluate(() =>
        [...document.querySelectorAll('.adl-ar')]
          .map((plate) => {
            const p = plate.getBoundingClientRect()
            const part = plate.querySelector('.adl-utotag')!.getBoundingClientRect()
            return part.right <= p.right + 0.5 && part.left >= p.left - 0.5 ? '' : `${plate.closest('.adl')!.id}: ${part.right} beyond plate ${p.right}`
          })
          .filter(Boolean),
      )
      expect(bad, `outside its plate at ${width}`).toEqual([])
    }
  })

  test('P14: key buttons and text links are 44 px high or more; one key button per package, none in the table section; the focus ring is 3 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 })
    await gotoOrder(page)
    await expect(page.locator('.adl-gomb')).toHaveCount(4)
    await expect(page.locator('#egyeb-szolgaltatasok .adl-gomb, #egyeb-szolgaltatasok button, #egyeb-szolgaltatasok .gomb')).toHaveCount(0)
    const heights = await page.locator('.adl-gomb, .adl-link, .cs-sorlink a, .cs-link a').evaluateAll((e) => e.map((x) => x.getBoundingClientRect().height))
    expect(heights.length).toBe(4 + 4 + 4 + 5)
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44 - 0.5)
    await page.locator('#szolgaltatas-termekleiras .adl-gomb').focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    // Safari/WebKit moves focus with Tab to links only with Option+Tab (the keyboard-order test skips it for the same reason); the key presses above still make the last input keyboard,
    // so focusing the button now shows the keyboard focus ring there too.
    await page.locator('#szolgaltatas-termekleiras .adl-gomb').focus()
    expect(await page.locator('#szolgaltatas-termekleiras .adl-gomb').evaluate((e) => ({ w: getComputedStyle(e).outlineWidth, s: getComputedStyle(e).outlineStyle }))).toEqual({ w: '3px', s: 'solid' })
    // Keyboard order inside a package: key button, promise link, then the right column's row link.
    const order = await page.evaluate(() => {
      const a = document.querySelector('#szolgaltatas-gepkonyv .adl-gomb')!
      const b = document.querySelector('#szolgaltatas-gepkonyv a.adl-link')!
      const c = document.querySelector('#szolgaltatas-gepkonyv ~ .cs-szov .cs-sorlink a')!
      return [a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING, b.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING]
    })
    expect(order.every(Boolean)).toBe(true)
  })

  test('the row links: the demo links of the segments with a demo, the second links of the other two (external one safe, named)', async ({ page }) => {
    await gotoOrder(page)
    const link = (id: string) => page.locator(`#szolgaltatas-${id} ~ .cs-szov .cs-sorlink a`)
    await expect(link('termekleiras')).toHaveText(TERMEKLEIRAS.hos.masodlagos!.felirat)
    await expect(link('gepkonyv')).toHaveText(GEPKONYV.demo!.cim)
    await expect(link('gepkonyv')).toHaveAttribute('href', '/demos/kezikonyv/')
    await expect(link('lapszabaszat')).toHaveText(LAPSZABASZAT.demo!.cim)
    await expect(link('lapszabaszat')).toHaveAttribute('href', '/demos/lapszabaszat/')
    await expect(link('bemutatkozo')).toHaveText(BEMUTATKOZO.hos.masodlagos!.felirat)
    await expect(link('bemutatkozo')).toHaveAttribute('rel', 'noopener')
    await expect(link('bemutatkozo')).toHaveAttribute('aria-label', /Lélek & Nyelv/)
    // No link to an old offer address anywhere on the page (P8).
    await expect(page.locator('a[href^="/termekleiras/"], a[href^="/gepkonyv/"], a[href^="/lapszabaszat/"], a[href^="/bemutatkozo-oldal/"]')).toHaveCount(0)
  })

  test('P9: the page loads the shared layer and its own sheet only: one stylesheet csomagok-*, no home-page script', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(new URL(r.url()).pathname))
    await gotoOrder(page)
    const sheets = requests.filter((p) => p.endsWith('.css'))
    expect(sheets).toHaveLength(1)
    expect(sheets[0]).toMatch(/\/assets\/csomagok-[\w-]+\.css$/)
    const scripts = requests.filter((p) => p.endsWith('.js'))
    for (const s of scripts) expect(s, 'a script outside the shared layer and the page entry').toMatch(/\/assets\/(csomagok|keret|tema-tar|masolo|anim|meres|horgony|rolldown-runtime|preload-helper)-[\w-]+\.js$/)
    expect(scripts.some((s) => /fooldal-|jel-|mount-/.test(s))).toBe(false)
  })

  test('P13: the header boxes equal those of /impresszum/ (mark, every link, key) at 320, 360, 727 and 1280 px; the current mark changes no link width', async ({ page }) => {
    const read = () =>
      page.evaluate(() => {
        const box = (e: Element) => {
          const r = e.getBoundingClientRect()
          return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 2) / 2)
        }
        return { mark: box(document.querySelector('.hdr .mklink')!), links: [...document.querySelectorAll('.hdr nav a')].map(box), key: box(document.querySelector('.hdr .tkey')!) }
      })
    for (const width of [320, 360, 727, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/impresszum/', { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const legal = await read()
      await gotoOrder(page)
      const here = await read()
      expect(here.mark, `mark at ${width}`).toEqual(legal.mark)
      expect(here.key, `key at ${width}`).toEqual(legal.key)
      // Below 727 px the current mark is width-neutral: every link box, the current one included, equals the legal page's. From 727 px the mark is the node before the label, so the
      // current link is that much wider and the ones before it shift; every link keeps its row and height, and every other link its width.
      if (width < 727) expect(here.links, `every link box, the current one included, at ${width}`).toEqual(legal.links)
      else {
        here.links.forEach((l, i) => {
          expect([l[1], l[3]], `link ${i} row at ${width}`).toEqual([legal.links[i][1], legal.links[i][3]])
          if (i !== 1) expect(l[2], `link ${i} width at ${width}`).toBe(legal.links[i][2])
        })
      }
    }
  })

  test('P19: arriving with the dark choice stored, the first painted frame is dark', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jel-tema', 'sotet'))
    await page.goto(ORDER_PATH, { waitUntil: 'domcontentloaded' })
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-tema'))).toBe('sotet')
    await page.evaluate(() => document.fonts.ready)
    const [r, g, b] = await page.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number))
    expect(r + g + b, 'a dark ground').toBeLessThan(200)
    await expect(page.locator('.tkey')).toHaveAttribute('aria-checked', 'true')
  })

  test('P20: print shows no line, no tap, no header, no footer, no key', async ({ page }) => {
    await gotoOrder(page)
    await page.emulateMedia({ media: 'print' })
    for (const sel of ['.sp-l', '.cs-tap', 'header', 'footer']) expect(await page.locator(sel).first().evaluate((e) => getComputedStyle(e).display), sel).toBe('none')
  })

  test('readable and laid out without script: the same panels, the four taps drawn, the key hidden, the address and both links working', async ({ browser }) => {
    const on = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const off = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false })
    // Only protocol-level APIs below (boundingBox, expect on a locator): page.evaluate does not run with JavaScript off in every engine.
    const boxes = async (ctx: typeof on) => {
      const page = await ctx.newPage()
      await page.goto(ORDER_PATH, { waitUntil: 'networkidle' })
      const out: number[][] = []
      for (const sel of ['.adl', '.cs-tap', '.cs-szov']) for (const l of await page.locator(sel).all()) { const b = (await l.boundingBox())!; out.push([Math.round(b.x), Math.round(b.width)]) }
      return { page, out }
    }
    const a = await boxes(on)
    const b = await boxes(off)
    expect(b.out).toHaveLength(12)
    expect(b.out).toEqual(a.out)
    await expect(b.page.locator('.cs-tap')).toHaveCount(4)
    for (const l of await b.page.locator('.cs-tap').all()) expect((await l.boundingBox())!.width, 'a tap is drawn').toBeGreaterThan(10)
    await expect(b.page.locator('.tkey')).toHaveCSS('visibility', 'hidden')
    await expect(b.page.locator('.cmz-kc')).toHaveCSS('display', 'none')
    await expect(b.page.locator('#kapcsolat-email')).toHaveAttribute('href', `mailto:${EMAIL}`)
    await expect(b.page.locator('.cmz-linkek a')).toHaveCount(2)
    await on.close()
    await off.close()
  })

  test('the contact end is the shared one: the copy key copies the address and the lamp answers; mail links decode to the source texts', async ({ page, context, browserName }) => {
    // As main's copy test: permissions are granted everywhere, the clipboard content is read on Chromium only. The engines that do not know a permission name refuse it; the click is a
    // user gesture, which they accept without one. Only an engine's "unknown permission" refusal is expected, and never on Chromium.
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    } catch (error) {
      if (browserName === 'chromium' || !/permission/i.test(String(error))) throw error
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrder(page)
    await expect(page.locator('#kapcsolat h2')).toHaveText(CSOMAGOK_KAPCSOLAT.cim)
    await expect(page.locator('#kapcsolat-email')).toHaveText(EMAIL)
    const before = await page.locator('#kapcsolat').boundingBox()
    await page.locator('#kapcsolat .cmz-gomb').click()
    await expect(page.locator('#kapcsolat .cmz')).toHaveAttribute('data-st', 'kesz')
    const after = await page.locator('#kapcsolat').boundingBox()
    expect(after!.height, 'contact block keeps its height').toBeCloseTo(before!.height, 0)
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL)
    const hrefs = await page.locator('#kapcsolat .cmz-linkek a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
    expect(hrefs[0]).toBe(`mailto:${EMAIL}?subject=Megrendel%C3%A9s`)
    expect(decodeURIComponent(hrefs[1]!)).toContain(HIVAS_LEVEL.targy)
    // The two text links of the shared contact end: the mail link, and the talk request with its prefilled letter, both reporting their events.
    const mailLink = page.locator('#kapcsolat .cmz-linkek a').nth(0)
    const talk = page.locator('#kapcsolat .cmz-linkek a', { hasText: HIVAS_LEVEL.felirat })
    await expect(mailLink).toHaveText(JEL.kapcsolat.link)
    await expect(mailLink).toHaveAttribute('data-esemeny', 'email')
    expect(subject((await mailLink.getAttribute('href'))!), 'the approved subject').toBe(CSOMAGOK_KAPCSOLAT.targy)
    expect(CSOMAGOK_KAPCSOLAT.targy).toBe('Megrendelés')
    await expect(page.locator('.hdr nav a', { hasText: 'Kapcsolat' })).toHaveAttribute('href', '#kapcsolat')
    await expect(talk).toHaveCount(1)
    await expect(talk).toHaveAttribute('data-esemeny', 'hivas')
    expect(subject((await talk.getAttribute('href'))!)).toBe(HIVAS_LEVEL.targy)
    expect(new URL((await talk.getAttribute('href'))!).pathname).toBe(EMAIL)
    // every letter of the page: subject and body decode to the source, %20 for spaces
    const all = await page.locator('a[href^="mailto:"][href*="subject="]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
    for (const h of all) {
      expect(h).not.toMatch(/\+|%0D/)
      expect(new URL(h).pathname).toBe(EMAIL)
    }
    const expected = [...SEGMENTS.map((s) => s.adat.kapcsolat.level.targy), ...TOVABBI_SZOLGALTATASOK.map((s) => szolgaltatasLevel(s.cim).targy), HIVAS_LEVEL.targy].sort()
    expect(all.map((h) => subject(h)!).filter((s) => expected.includes(s)).sort()).toEqual(expected)
    expect(BELEPOK.webshop.nev).toBeTruthy()
  })

  test('reduced motion: nothing on the page moves; no layout shift while it loads', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => {
      ;(window as unknown as { __cls: number }).__cls = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await gotoOrder(page)
    expect(await movingAnimations(page)).toEqual([])
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.02)
    // Main's reduced-motion test also pinned this: no smooth scrolling, after the load too (data-sima is set by then and the smooth rule needs no-preference).
    await expect(page.locator('html')).toHaveAttribute('data-sima', '')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto')
  })

  test('CLS at 1440 and 390 with normal motion', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only')
    const results: Record<string, number> = {}
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const page = await browser.newPage()
      await page.addInitScript(() => {
        Object.defineProperty(window, '__cls', { value: 0, writable: true, configurable: true })
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as unknown as { hadRecentInput?: boolean; value: number }
            if (!shift.hadRecentInput) (window as unknown as { __cls: number }).__cls += shift.value
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
      })
      await page.setViewportSize(viewport)
      await page.goto(ORDER_PATH, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      results[String(viewport.width)] = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
      await page.close()
    }
    expect(results['1440'], `CLS 1440=${results['1440']}`).toBeLessThan(0.05)
    expect(results['390'], `CLS 390=${results['390']}`).toBeLessThan(0.05)
  })

  test('analytics: a click on a data-esemeny element (package key, table link, row demo link) calls umami.track with its value and keeps the default action; a click elsewhere reports nothing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript(() => {
      const w = window as unknown as { umami: { track: (n: string) => void }; __e: string[]; __d: boolean[] }
      w.__e = []
      w.__d = []
      w.umami = { track: (n) => void w.__e.push(n) }
    })
    await gotoOrder(page)
    await page.evaluate(() => {
      const w = window as unknown as { __d: boolean[] }
      document.addEventListener('click', (e) => { w.__d.push(!e.defaultPrevented); e.preventDefault() })
    })
    const events = () => page.evaluate(() => (window as unknown as { __e: string[] }).__e)
    await page.locator('#szolgaltatas-termekleiras .adl-gomb').click()
    await page.locator('#szolgaltatas-automatizalas .cs-link a').click()
    await page.locator('#szolgaltatas-gepkonyv ~ .cs-szov .cs-sorlink a').click()
    expect(await events()).toEqual(['fo-gomb', 'email', 'demo'])
    expect(await page.evaluate(() => (window as unknown as { __d: boolean[] }).__d), 'no click had its default action taken away').toEqual([true, true, true])
    await page.locator('h1').click()
    expect(await events(), 'a click elsewhere reports nothing').toEqual(['fo-gomb', 'email', 'demo'])
    expect(errors).toEqual([])
  })

  test('layout rulings: panels keep their own height beside a longer text; service names in 700; rules end at the column edges; the contact section is spaced like the others; on a phone the price stands left under the name', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await gotoOrder(page)
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll('.cs-par')].map((p) => ({ panel: p.querySelector('.adl')!.getBoundingClientRect().height, col: p.querySelector('.cs-szov')!.getBoundingClientRect().height, bottom: p.querySelector('.adl')!.querySelector('.adl-link')!.getBoundingClientRect().bottom - p.querySelector('.adl')!.getBoundingClientRect().top })),
    )
    for (const r of wide) expect(r.panel, 'no empty panel face: the panel ends 40 px under its last line at most').toBeLessThanOrEqual(r.bottom + 40)
    expect(wide.some((r) => r.col > r.panel + 100), 'a text column longer than its panel exists in this set').toBe(true)
    expect(await page.locator('.cs-tabla th.cs-nev').evaluateAll((es) => es.every((e) => getComputedStyle(e).fontWeight === '700'))).toBe(true)
    for (const [width, gap] of [[1280, 96], [360, 64]] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(ORDER_PATH, { waitUntil: 'networkidle' })
      const m = await page.evaluate(() => {
        const t = document.querySelector('.cs-tabla')!.getBoundingClientRect()
        const col = document.querySelector('#egyeb-szolgaltatasok h2')!.getBoundingClientRect()
        const tb = document.querySelector('.cs-szolg')!.getBoundingClientRect()
        const s3 = document.querySelector('#kapcsolat')!.getBoundingClientRect()
        const h3 = document.querySelector('#kapcsolat h2')!.getBoundingClientRect().top
        const s1 = document.querySelector('#belepo-csomagok')!.getBoundingClientRect().top
        const h1 = document.querySelector('#belepo-csomagok h2')!.getBoundingClientRect().top
        const price = document.querySelector('#szolgaltatas-rendelolap td.cs-ar')!.getBoundingClientRect()
        const name = document.querySelector('#szolgaltatas-rendelolap th.cs-nev')!.getBoundingClientRect()
        return { ruleL: tb.left - col.left, ruleR: tb.right - t.right, above: h3 - s3.top, above1: h1 - s1, priceLeft: price.left - name.left, priceTop: price.top - name.bottom }
      })
      expect(Math.abs(m.ruleL) + Math.abs(m.ruleR), `rules end at the column edges at ${width}`).toBeLessThanOrEqual(1)
      expect(Math.abs(m.above - m.above1), `the contact heading is spaced like the first section's at ${width}`).toBeLessThanOrEqual(1)
      expect(m.above1).toBe(gap)
      if (width === 360) {
        expect(Math.abs(m.priceLeft), 'the price at the name\'s left edge').toBeLessThanOrEqual(1)
        expect(m.priceTop, 'under the name').toBeGreaterThanOrEqual(-1)
      }
    }
  })

  test('the VAT mark of every priced head row: 12 px from the price text from 727 px up; on a phone it starts at the left edge of the price when wrapped, else at least 8 px from it', async ({ page }) => {
    for (const width of [320, 360, 727, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await gotoOrder(page)
      const rows = await page.evaluate(() => {
        const text = (e: Element) => { const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } }
        return [...document.querySelectorAll('.cs-fej')].filter((tr) => tr.querySelector('.cs-afa')?.textContent).map((tr) => ({ price: text(tr.querySelector('.cs-ar')!), mark: text(tr.querySelector('.cs-afa')!) }))
      })
      expect(rows).toHaveLength(4)
      for (const { price, mark } of rows) {
        if (width >= 727) expect(Math.abs(mark.l - price.r - 12), `gap at ${width}`).toBeLessThanOrEqual(1)
        else if (mark.t >= price.b - 2) expect(Math.abs(mark.l - price.l), `wrapped mark at ${width}`).toBeLessThanOrEqual(1)
        else expect(mark.l - price.r, `shared line at ${width}`).toBeGreaterThanOrEqual(8 - 1)
      }
    }
  })

  test('a shared link lands under the header, and the visitor can scroll away afterwards', async ({ page }) => {
    await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'networkidle' })
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))
    const offset = () => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => Math.abs(e.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)))
    expect(padding).toBeGreaterThan(0)
    await expect.poll(offset).toBeLessThanOrEqual(2)
    await page.waitForTimeout(800)
    await expect.poll(offset).toBeLessThanOrEqual(2)
    await page.mouse.move(400, 400)
    await page.mouse.wheel(0, 300)
    await expect.poll(() => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(padding - 40)
    // A snap-back to the anchor would bring the top back to about `padding`; a wheel scroll that is still running only moves it further.
    await page.waitForTimeout(700)
    expect(await page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(padding - 40)
  })

  // Holds every web-font response until the test opens the gate, so no font can arrive early however slow the runner is.
  const holdFonts = async (page: Page) => {
    let gate: Promise<void> = Promise.resolve()
    let release: () => void = () => {}
    const close = () => { gate = new Promise<void>((resolve) => { release = resolve }) }
    close()
    await page.route('**/fonts/*.woff2', async (route) => {
      await gate
      await route.continue()
    })
    return { open: () => release(), close }
  }

  // The alignment script (src/site/horgony-futtat.ts) is a script of its own that keret.ts (itself a script that the page entry appends) adds after the first paint: wait until it has been fetched, so
  // a test that acts "before the fonts arrive" cannot beat its listeners.
  const horgonyBent = (page: Page) => page.waitForFunction(() => (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).some((r) => r.name.includes('/assets/horgony-futtat') && r.responseEnd > 0))

  test('a shared link is re-aligned once the late web fonts have changed the layout', async ({ page }) => {
    const fonts = await holdFonts(page)
    // domcontentloaded: the page entry has run by then, and the fonts are held at the gate until the test opens it.
    await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'domcontentloaded' })
    const offset = () => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => Math.abs(e.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)))
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))).toBeGreaterThan(0)
    // Before the fonts arrive the target sits in place under the fallback font; the swap is what moves it, the fix what puts it back.
    expect(await page.evaluate(() => [...document.fonts].every((f) => f.status !== 'loaded' || f.family.includes('Fallback')))).toBe(true)
    await expect.poll(offset).toBeLessThanOrEqual(2)
    fonts.open()
    await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
    await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
    await expect.poll(offset).toBeLessThanOrEqual(2)
  })

  // On the pages of the shared layer (this one, through keret.ts) the page-load jump is instant: `scroll-behavior: smooth` applies only under html[data-sima], which keret.ts sets after the load and one frame (A3). So no smooth
  // fragment scroll is still running when the fonts arrive. This test: the jump is instant (the target stands under the header before any font and
  // before data-sima), and once the late fonts are released the target is re-aligned under the header, at 360 and 1280.
  for (const width of [360, 1280]) {
    test(`a shared link jumps instantly on load and is re-aligned under the header once the late fonts are in, at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      const fonts = await holdFonts(page)
      await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'domcontentloaded' })
      const offset = () => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => Math.abs(e.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)))
      // Instant: the first scroll the page shows is already the aligned one, and smooth scrolling is not on yet (data-sima comes after the load, which the held fonts hold back).
      await page.waitForFunction(() => window.scrollY > 0, undefined, { timeout: 15000 })
      expect(await offset(), 'aligned at the first scrolled frame').toBeLessThanOrEqual(2)
      expect(await page.evaluate(() => document.documentElement.hasAttribute('data-sima')), 'no data-sima before the load').toBe(false)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'no smooth scrolling before the load').toBe('auto')
      fonts.open()
      await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
      await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
      await expect.poll(offset, { timeout: 10000 }).toBeLessThanOrEqual(2)
      await page.waitForTimeout(500)
      expect(await offset()).toBeLessThanOrEqual(2)
      await expect(page.locator('html')).toHaveAttribute('data-sima', '')
    })
  }

  test('a visitor who scrolls away (wheel) before the late fonts arrive is not snapped back', async ({ page }) => {
    const fonts = await holdFonts(page)
    // domcontentloaded: the module script has registered its listeners by then (the wheel cannot arrive before them); the fonts are still pending.
    await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'domcontentloaded' })
    const top = () => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => e.getBoundingClientRect().top)
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))
    // The browser's own smooth fragment scroll (scroll-behavior: smooth) runs for a few hundred ms even with the fonts held, and Chromium lets it absorb
    // a wheel that arrives meanwhile (the page ends on the target, not 600 px further). Wait until it has landed, then scroll away: the fonts are still held, so this is still "before the swap".
    await expect.poll(async () => Math.abs((await top()) - padding), { message: 'fragment scroll has landed' }).toBeLessThanOrEqual(2)
    expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')))).toBe(false)
    await horgonyBent(page)
    await page.mouse.move(400, 400)
    await page.mouse.wheel(0, 600)
    await expect.poll(top).toBeLessThan(padding - 100)
    fonts.open()
    await page.waitForFunction(() => [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
    await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
    await page.waitForTimeout(500)
    expect(await top()).toBeLessThan(padding - 100)
  })

  // The visitor's input before the alignment script has even been fetched (a slow network) counts: keret.ts flags it, the script treats the flag as "moved".
  test('a wheel before the alignment script has arrived is not snapped back', async ({ page }) => {
    const fonts = await holdFonts(page)
    let release: () => void = () => {}
    const scriptGate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/assets/horgony-futtat*.js', async (route) => {
      await scriptGate
      await route.continue()
    })
    await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'domcontentloaded' })
    const top = () => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => e.getBoundingClientRect().top)
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))
    await expect.poll(async () => Math.abs((await top()) - padding), { message: 'fragment scroll has landed' }).toBeLessThanOrEqual(2)
    await page.mouse.move(400, 400)
    await page.mouse.wheel(0, 600)
    await expect.poll(top).toBeLessThan(padding - 100)
    release()
    await horgonyBent(page)
    fonts.open()
    await page.waitForFunction(() => [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
    await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
    await page.waitForTimeout(500)
    expect(await top()).toBeLessThan(padding - 100)
  })

  // A scroll by script fires no input event: only the scrollY rule of the page script can tell that the visitor moved (that rule sees scrolls after the load event, where
  // it takes its baseline). The test therefore scrolls after the load and before the page's post-font check, which waits on document.fonts.ready: the test holds
  // that promise back and releases it on its own cue, so the order is fixed instead of racing a frame.
  test('a scroll by script after the load, before the post-font check, is not snapped back', async ({ page }) => {
    const fonts = await holdFonts(page)
    await page.addInitScript(() => {
      const w = window as unknown as { __readyGate: () => void }
      let open: () => void = () => {}
      const gate = new Promise<void>((resolve) => { open = resolve })
      const real = Object.getOwnPropertyDescriptor(FontFaceSet.prototype, 'ready')!.get!
      Object.defineProperty(document.fonts, 'ready', { configurable: true, get: () => gate.then(() => real.call(document.fonts)) })
      w.__readyGate = open
    })
    await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'domcontentloaded' })
    const top = () => page.locator('#szolgaltatas-bemutatkozo').evaluate((e) => e.getBoundingClientRect().top)
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))
    await expect.poll(async () => Math.abs((await top()) - padding), { message: 'fragment scroll has landed' }).toBeLessThanOrEqual(2)
    await horgonyBent(page)
    fonts.open()
    await page.waitForLoadState('load')
    await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'instant' }))
    expect(await top()).toBeLessThan(padding - 100)
    await page.evaluate(() => (window as unknown as { __readyGate: () => void }).__readyGate())
    await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
    await page.waitForTimeout(500)
    expect(await top()).toBeLessThan(padding - 100)
  })

  // Engine-neutral: engines differ in where a reload or back/forward leaves the scroll offset (WebKit re-scrolls to the fragment itself),
  // so the test does not assume an offset. It asserts the promise: the page's own script does not scroll after the late fonts.
  for (const how of ['reload', 'back/forward'] as const) {
    test(`on ${how} the page script does not scroll after the late fonts`, async ({ page }) => {
      const fonts = await holdFonts(page)
      await page.addInitScript(() => {
        const w = window as unknown as { __scrolls: number; __persisted: boolean | null }
        w.__scrolls = 0
        // The test is vacuous if the browser restores the page from its back/forward cache (no script runs): it asserts below that the page was
        // really loaded again, and the unload handler (for this test only) keeps the page out of that cache.
        w.__persisted = null
        window.addEventListener('pageshow', (e) => { w.__persisted = e.persisted })
        window.addEventListener('unload', () => {})
        for (const [obj, name] of [[Element.prototype, 'scrollIntoView'], [window, 'scrollTo'], [window, 'scrollBy']] as const) {
          const original = (obj as any)[name] as (...args: unknown[]) => unknown
          ;(obj as any)[name] = function (this: unknown, ...args: unknown[]) { w.__scrolls++; return original.apply(this, args) }
        }
      })
      const fontsIn = () => page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
      await page.goto(`${ORDER_PATH}#szolgaltatas-bemutatkozo`, { waitUntil: 'domcontentloaded' })
      fonts.open()
      await fontsIn()
      // The second visit gets a fresh gate: its fonts are late again.
      fonts.close()
      if (how === 'reload') {
        await page.reload({ waitUntil: 'domcontentloaded' })
      } else {
        await page.goto('/', { waitUntil: 'domcontentloaded' })
        fonts.open()
        await page.waitForLoadState('load')
        fonts.close()
        await page.goBack({ waitUntil: 'domcontentloaded' })
      }
      // The held fonts also hold the load event, so the page script has not taken its baseline yet. Put the page where a browser's scroll restore would
      // (without a call the counter sees and without an input event): a script that re-aligns on reload or back/forward would scroll to the target.
      await page.evaluate(() => { document.scrollingElement!.scrollTop = 100 })
      // Let it settle with the fonts still held.
      await page.waitForTimeout(500)
      const scrolls = () => page.evaluate(() => (window as unknown as { __scrolls: number }).__scrolls)
      expect(await scrolls()).toBe(0)
      fonts.open()
      await fontsIn()
      await page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
      await page.waitForTimeout(500)
      // scrollY itself is not asserted: the font gate also holds the load event, so the engine's own restore or fragment scroll may still arrive after the gate opens.
      expect(await scrolls(), 'script scroll calls after the fonts').toBe(0)
      // Not a vacuous pass: this document was loaded by a reload or a history navigation (not restored from the back/forward cache), so the script really ran and skipped.
      expect(await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type)).toBe(how === 'reload' ? 'reload' : 'back_forward')
      expect(await page.evaluate(() => (window as unknown as { __persisted: boolean | null }).__persisted), 'pageshow.persisted').toBe(false)
    })
  }

  test('the home page links /megrendeles/ and the shared header\'s "Csomagok" reaches this page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('a[href="/megrendeles/"]')).toHaveCount(2)
    await gotoOrder(page)
    await expect(page.locator('.hdr nav a[href="/megrendeles/"]')).toHaveText('Csomagok')
    // The header marks this page current: waits for the shared header's current-page input (A2); fails until then.
    await expect(page.locator('.hdr nav a[href="/megrendeles/"]')).toHaveAttribute('aria-current', 'page')
  })
})
