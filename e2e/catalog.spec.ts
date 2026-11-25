import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { BELEPOK } from '../src/content/belepok'
import { isKerdes } from '../src/content/kerdes'
import { AMOUNTS, THRESHOLDS } from '../src/data/pricing'
import { BEMUTATKOZO } from '../src/content/szegmensek/bemutatkozo'
import { GEPKONYV } from '../src/content/szegmensek/gepkonyv'
import { LAPSZABASZAT } from '../src/content/szegmensek/lapszabaszat'
import { TERMEKLEIRAS } from '../src/content/szegmensek/termekleiras'

// The approved fixture: further services verbatim, the four entry packages as the segment files state them (see "_note" in the file). The page (PR 6) shows the further services as
// the rows of a price table (the amount in the head row's cell, the closing full stop of an amount line and the comma before "havi" dropped) and each entry package as a record panel with its right column.
const catalog = JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-approved.json', import.meta.url), 'utf8'))
const VAT = 'AAM (áfamentes)'
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()

interface Card {
  title: string
  paragraphs: string[]
  sub?: { title: string; paragraphs: string[] }
}
interface Entry {
  id: string
  title: string
  lead: string
  price: string
  time: string | null
  cta: string
  subject: string
  includes: string[]
  excludes: string[]
  tiers: { title: string; text: string; price: string | null }[]
}

/** The approved lines of a service as the table writes them: one line each, the VAT mark dropped, the hosting lines split at their comma, the amount cells without the full stop. */
function expectedLines(card: Card): string[] {
  const raw = [card.title, ...card.paragraphs, ...(card.sub ? [card.sub.title, ...card.sub.paragraphs] : [])]
  return raw
    .flatMap((p) => p.split('\n'))
    .map((l) => normalize(l.replace(/^- /, '').replaceAll(VAT, '')))
    .filter(Boolean)
    .flatMap((l) => (/^Üzemeltetés(?: módosításokkal)?, havi /.test(l) ? l.split(', havi ').map((x, i) => (i ? `havi ${x}` : x)) : [l]))
    .filter((l, i, all) => !(l === card.title && all.indexOf(l) !== i)) // the head row's name is the service title: the first hosting line's name is the same element
    .map((l) => (/egyszeri díj\.$/.test(l) ? l.slice(0, -1) : l))
}

test('V1–V4: the approved catalog, four entry packages and five further services, only pricing.ts amounts', async ({ page }) => {
  await page.goto('/megrendeles/')
  await expect(page.locator('.adl')).toHaveCount(4)
  await expect(page.locator('.cs-szolg')).toHaveCount(5)

  // Further services: every approved line word for word (the set of lines of the service equals the fixture's, none more, none less).
  const further: Card[] = catalog.furtherServices
  const ids = ['rendelolap', 'automatizalas', 'adatok', 'egyedi', 'uzemeltetes']
  for (const [i, card] of further.entries()) {
    const lines = await page.locator(`#szolgaltatas-${ids[i]}`).evaluate((tb) => {
      const out: string[] = []
      for (const e of tb.querySelectorAll('th, td.cs-ar, .cs-szoveg p, .cs-szoveg li')) {
        const c = e.cloneNode(true) as HTMLElement
        c.querySelectorAll('.cs-afa-i').forEach((x) => x.remove())
        out.push((c.textContent ?? '').replace(/\s+/g, ' ').trim())
      }
      return out.filter(Boolean)
    })
    // The cell of a service without an amount says "Egyedi ajánlat" (owner, 2026-11-18); it is not an approved line.
    expect([...lines.filter((l) => l !== 'Egyedi ajánlat')].sort(), card.title).toEqual([...expectedLines(card)].sort())
  }

  // Entry packages: names, sentence, time, price, button and letter subject of the content files; scope, the steps without a price.
  const entries: Entry[] = catalog.entryPackages
  expect(entries.map((e) => e.title)).toEqual([BELEPOK.webshop.nev, BELEPOK.gepkonyv.nev, BELEPOK.lapszabaszat.nev, BELEPOK.bemutatkozo.nev])
  for (const e of entries) {
    const panel = page.locator(`#szolgaltatas-${e.id}`)
    const col = panel.locator('xpath=following-sibling::div[contains(@class,"cs-szov")]')
    await expect(panel.locator('h3'), e.id).toHaveText(e.title)
    await expect(panel.locator('.adl-ertek').first(), `${e.title} lead`).toHaveText(e.lead)
    if (e.time) await expect(panel.locator('.adl-ertek').nth(1), `${e.title} time`).toHaveText(e.time)
    else await expect(panel.locator('.adl-ertek'), `${e.title} has no time`).toHaveCount(1)
    expect(normalize(`${await panel.locator('.adl-ossz').innerText()} ${(await panel.locator('.adl-utotag').innerText()).trim()}`), `${e.title} price`).toBe(e.price)
    await expect(panel.locator('.adl-afa')).toHaveText(VAT)
    await expect(panel.locator('.adl-gomb'), `${e.title} cta`).toHaveText(e.cta)
    await expect(col.locator('.cs-tenyek > div').nth(1).locator('li'), `${e.title} includes`).toHaveText(e.includes)
    await expect(col.locator('.cs-tenyek > div').nth(2).locator('li'), `${e.title} excludes`).toHaveText(e.excludes)
    expect(new URL((await panel.locator('.adl-gomb').getAttribute('href'))!).searchParams.get('subject'), `${e.title} subject`).toBe(e.subject)
    // The steps without a price stand in the right column, name and text exactly; the priced hosting steps stand once, in the table.
    const steps = await col.locator('p:has(> strong)').evaluateAll((ps) => ps.map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim()))
    expect(steps, `${e.title} steps`).toEqual(e.tiers.filter((t) => !t.price).map((t) => normalize(`${t.title} ${t.text}`)))
    const colText = normalize(await col.innerText())
    for (const t of e.tiers.filter((t) => t.price)) expect(colText, `${e.title}: ${t.title} is in the table, not here`).not.toContain(t.text)
  }
  // The tiers as the source modules state them.
  const sources = { termekleiras: TERMEKLEIRAS, gepkonyv: GEPKONYV, lapszabaszat: LAPSZABASZAT, bemutatkozo: BEMUTATKOZO }
  for (const [id, source] of Object.entries(sources)) {
    const col = page.locator(`#szolgaltatas-${id}`).locator('xpath=following-sibling::div[contains(@class,"cs-szov")]')
    await expect(col.locator('p > strong'), id).toHaveText(source.lepcsok.filter((l) => l.ar === undefined).map((l) => l.nev))
    for (const tier of source.lepcsok.filter((l) => l.ar != null && !isKerdes(l.ar))) expect(normalize(await col.innerText()), `${id}: ${tier.nev}`).not.toContain(tier.szoveg)
  }
  // The machine-manual entry keeps its scope (owner decision, 2026-11-05).
  await expect(page.locator('#szolgaltatas-gepkonyv ~ .cs-szov .cs-lista').nth(0).locator('li').last()).toHaveText('Egy nyelv, legfeljebb 40 oldal, egy javítási kör.')

  // The amounts: exactly the pricing.ts values and the foot's threshold, in the format the site uses.
  const text = normalize(await page.locator('main').innerText())
  const shown = [...new Set([...text.matchAll(/\d{1,3}(?: \d{3})* Ft/g)].map((m) => m[0]))].sort()
  const fmt = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Ft`
  // Two packages may share an amount (orderForm, machineManualEntry and the threshold), so compare the distinct values.
  const expectedAmounts = [...new Set([...Object.values(AMOUNTS), THRESHOLDS.depositFrom].map(fmt))].sort()
  expect(shown).toEqual(expectedAmounts)
  expect(text).not.toMatch(/Ft\/óra|3D termék|59 000/)
})

for (const width of [360, 380, 390, 899, 900, 1023, 1024, 1440]) {
  test(`The price table at ${width}: one column, the services touch, every text row inside the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
    const m = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.cs-szolg')].map((e) => e.getBoundingClientRect())
      return { rows: rows.map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, email: document.getElementById('kapcsolat-email')!.getBoundingClientRect().right }
    })
    expect(m.overflow).toBe(false)
    expect(m.email, 'the address is not clipped').toBeLessThanOrEqual(width)
    expect(new Set(m.rows.map((r) => Math.round(r.x))).size, 'one column').toBe(1)
    for (let i = 1; i < m.rows.length; i++) expect(Math.abs(m.rows[i].y - m.rows[i - 1].y - m.rows[i - 1].h), 'the services touch (the rule between them is the border)').toBeLessThanOrEqual(1)
    for (const r of m.rows) expect(r.x + r.w).toBeLessThanOrEqual(width)
  })
}

test('the plate amounts are larger than the table amounts', async ({ page }) => {
  await page.goto('/megrendeles/')
  const size = (selector: string) => page.locator(selector).evaluateAll((es) => es.map((e) => parseFloat(getComputedStyle(e).fontSize)))
  const plate = await size('.adl-ossz')
  const cells = await size('td.cs-ar')
  expect(plate).toHaveLength(4)
  for (const p of plate) for (const c of cells) expect(p).toBeGreaterThan(c)
})
