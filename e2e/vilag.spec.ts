import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { KALAND } from '../src/content/kaland'
import { GEPADAT_MAX, GEPADAT_MIN, MINTAK } from '../src/content/mintak'
import { GAZDAG_HATASOK, RETEGEK } from '../src/vilag/hatasok'
import { FEJEZETEK } from '../src/vilag/idovonal'
import { palya } from '../src/vilag/palya'
import { LEPESEK } from '../src/vilag/toltes'
import { toltesIndex } from '../src/vilag/toltoszal'
import { ALAP_HATASOK } from '../src/vilag/utofeldolgozas'
import type { Allapot, Beallitas, BezarOk, NezetId, Vilag } from '../src/vilag/tipusok'

// The adventure world's engine (src/vilag/, built into dist/vilag/vilag-<hash>.js; thread V2). No page links the bundle yet (the entry is thread V7), so this spec is its only visitor: it imports the built
// file into a real built page (/aszf/ stands in for the page the world will cover) and drives it through its public face (`keszit`, `Vilag`).
//
// Chromium only, on the software renderer Playwright's Chromium falls back to (SwiftShader; Playwright itself passes --enable-unsafe-swiftshader): the world's own gate refuses a software renderer, so the specs admit it
// through the CI hook (`proba.szoftveres`) and say so. What a software frame
// can show: that the world builds, counts its stages, draws something, answers every control and closes cleanly. What it cannot: how fast or how good it looks on a GPU (frame times here are void),
// a phone, Safari or a screen reader. Those are the open points of the thread, not things this file claims.
test.use({ viewport: { width: 800, height: 500 } })
// A software frame of the full engine (floor, mirror, 150,000 particles, the post stack) is slow on the CI runners: the heaviest tests took 60 to 90 s there against 3 to 13 s on a developer machine, so the
// limits are generous. A timeout here is never a claim about speed (frame times in this file are void); a hung world still fails, only later.
test.describe.configure({ timeout: 240_000 })

const OLDAL = '/aszf/'
const NYITO = '.mklink'

declare global {
  interface Window {
    __v: Vilag
    __bezarva: BezarOk[]
  }
}

function vilagUrl(): string {
  const fajlok = fs.readdirSync('dist/vilag').filter((f) => /^vilag-[\w-]+\.js$/.test(f))
  expect(fajlok, 'exactly one world file in dist/vilag').toHaveLength(1)
  return `/vilag/${fajlok[0]}`
}

interface Inditas {
  /** The CI hook; left out, the world runs under the visitor's own gate (and refuses this software renderer). */
  proba?: Beallitas['proba']
  diagnosztika?: boolean
  /** Reduced motion: the still world. */
  nyugodt?: boolean
}

/** Opens the built page and makes (does not open) the world over it. */
async function keszit(page: Page, o: Inditas = {}): Promise<void> {
  await page.emulateMedia({ reducedMotion: o.nyugodt ? 'reduce' : 'no-preference' })
  await page.goto(OLDAL)
  await page.evaluate(
    async ({ url, beallitas, nyito }) => {
      const m = (await import(url)) as { keszit: (b: Beallitas) => Vilag }
      window.__bezarva = []
      window.__v = m.keszit({
        ...beallitas,
        lap: document.getElementById('top'),
        nyito: document.querySelector<HTMLElement>(nyito),
        bezarva: (ok) => window.__bezarva.push(ok),
      })
    },
    { url: vilagUrl(), beallitas: { proba: o.proba, diagnosztika: o.diagnosztika }, nyito: NYITO },
  )
}

const SZOFTVERES = { szoftveres: true } as const

/** Records every WebGL context a page asks for in `window.__gl` (before any script of the page runs). */
async function glFigyel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: string[] }
    w.__gl = []
    const eredeti = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, ...a: unknown[]) => unknown
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipus: string, ...a: unknown[]) {
      if (/webgl/.test(tipus)) w.__gl.push(tipus)
      return eredeti.call(this, tipus, ...a)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}
const glKerelmek = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __gl: string[] }).__gl)
const allapot = (page: Page): Promise<Allapot> => page.evaluate(() => window.__v.allapot())
const kepkockak = async (page: Page): Promise<number> => (await allapot(page)).kepkockak

/** Makes the world and opens it; resolves once it shows and has drawn. */
async function nyit(page: Page, o: Inditas = { proba: SZOFTVERES }): Promise<void> {
  await keszit(page, o)
  await page.evaluate(() => window.__v.megnyit())
  await expect.poll(() => kepkockak(page), { timeout: 60_000 }).toBeGreaterThan(0)
}

/** Waits until the world has drawn more frames than `elozo` (a still world draws on demand). */
const ujKocka = async (page: Page, elozo: number): Promise<void> => {
  await expect.poll(() => kepkockak(page), { timeout: 60_000 }).toBeGreaterThan(elozo)
}

/** Hides everything but the canvas (so a screenshot of it is the picture alone) until called again with `be` false. */
async function csakVaszon(page: Page, be = true): Promise<void> {
  await page.evaluate(() => {
    if (document.getElementById('csak-vaszon')) return
    const st = document.createElement('style')
    st.id = 'csak-vaszon'
    st.textContent = 'html.csak-vaszon .vilag > :not(.vilag-vaszon) { visibility: hidden !important }'
    document.head.append(st)
  })
  await page.evaluate((b) => document.documentElement.classList.toggle('csak-vaszon', b), be)
}

interface Kep {
  png: Buffer
  /** The share of pixels clearly lit (a channel above 96 of 255), of clearly dark ones (all below 24), and how many 4-bit colours occur. */
  fenyes: number
  sotet: number
  szinek: number
}

async function vaszonKep(page: Page): Promise<Kep> {
  const png = await page.locator('.vilag-vaszon').screenshot()
  const jel = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const kep = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const c = document.createElement('canvas')
    c.width = kep.width
    c.height = kep.height
    const x = c.getContext('2d', { willReadFrequently: true })!
    x.drawImage(kep, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    const szinek = new Set<number>()
    let fenyes = 0
    let sotet = 0
    for (let i = 0; i < d.length; i += 4) {
      const m = Math.max(d[i], d[i + 1], d[i + 2])
      if (m > 96) fenyes++
      if (m < 24) sotet++
      szinek.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4))
    }
    const n = d.length / 4
    return { fenyes: fenyes / n, sotet: sotet / n, szinek: szinek.size }
  }, png.toString('base64'))
  return { png, ...jel }
}

/** The largest difference in any colour channel of any pixel between two PNGs of the same size (0 when they are identical; 1 is the dither of a gradient, not a change in the picture). */
async function legnagyobbElteres(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([x, y]) => {
      const olvas = async (b64: string): Promise<Uint8ClampedArray> => {
        const kep = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }))
        const c = document.createElement('canvas')
        c.width = kep.width
        c.height = kep.height
        const g = c.getContext('2d', { willReadFrequently: true })!
        g.drawImage(kep, 0, 0)
        return g.getImageData(0, 0, c.width, c.height).data
      }
      const [p, q] = [await olvas(x), await olvas(y)]
      if (p.length !== q.length) return 255
      let m = 0
      for (let i = 0; i < p.length; i++) m = Math.max(m, Math.abs(p[i] - q[i]))
      return m
    },
    [a.toString('base64'), b.toString('base64')],
  )
}

const olvasat = (page: Page) => page.locator('.vilag-olvasat')
const csuszka = (page: Page) => page.locator('.vilag input[type="range"]')
const dialog = (page: Page) => page.getByRole('dialog', { name: KALAND.vezerlok.nev })

test('the world is one lazy file: making it adds no page element, no GL context and no second request', async ({ page }) => {
  const kerelmek: string[] = []
  page.on('request', (r) => kerelmek.push(new URL(r.url()).pathname))
  await glFigyel(page)
  await keszit(page, { proba: SZOFTVERES })
  expect(kerelmek.filter((u) => u.startsWith('/vilag/'))).toEqual([vilagUrl()])
  expect(await page.locator('.vilag').count(), 'the world adds nothing to the page until it is prepared or opened').toBe(0)
  expect(await glKerelmek(page), 'no GL context before the world is prepared').toEqual([])
  const a = await allapot(page)
  expect(a.fazis).toBe('uj')
  expect(a.lepesek).toMatchObject({ kesz: 1, osszes: LEPESEK.length })
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
})

test('opening a made world counts its real stages, then shows it as a dialog with the text twin', async ({ page }) => {
  await keszit(page, { proba: SZOFTVERES })
  await page.evaluate(() => {
    const w = window as unknown as { __sorrend: number[] }
    w.__sorrend = []
    new MutationObserver((rs) => {
      for (const r of rs) w.__sorrend.push(Number(r.oldValue))
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-valuenow'], attributeOldValue: true })
  })
  await page.evaluate(() => window.__v.megnyit())
  const toltes = page.locator('.vilag-toltes')
  await expect(toltes).toBeHidden() // the fade has ended
  const sorrend = await page.evaluate(() => (window as unknown as { __sorrend: number[] }).__sorrend)
  const vegso = Number(await toltes.getAttribute('aria-valuenow'))
  const lista = [...sorrend, vegso].filter((n) => n > 0)
  expect(vegso, 'the counter ends at every declared stage').toBe(LEPESEK.length)
  expect(await toltes.getAttribute('aria-valuemax')).toBe(String(LEPESEK.length))
  expect(new Set(lista).size, 'the counter moved through several of the stages').toBeGreaterThanOrEqual(3)
  lista.forEach((n, i) => {
    if (i > 0) {
      expect(n - lista[i - 1], `step ${i} of the counter never goes back`).toBeGreaterThanOrEqual(0)
      expect(n - lista[i - 1], `step ${i} of the counter is one stage`).toBeLessThanOrEqual(1)
    }
  })
  const a = await allapot(page)
  expect(a).toMatchObject({ fazis: 'nyitva', nyitott: true, hiba: null })
  expect(a.lepesek.kesz).toBe(a.lepesek.osszes)
  expect(a.renderer).not.toBe('-')
  expect(a.vaszon.w * a.vaszon.h).toBeGreaterThan(0)

  // the dialog is the only live thing: the page under it is inert, and the focus is inside it
  await expect(dialog(page)).toBeVisible()
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(true)
  await expect(csuszka(page)).toBeFocused()
  await expect(page.locator('html')).toHaveClass(/vilag-nyitva/)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'the page behind cannot scroll').toBe('hidden')

  // the twin: the same chapters as text, in the accessibility tree while out of sight, a plain panel once something in it has the focus
  const iker = page.locator('.vilag-iker')
  await expect(iker).toContainText(KALAND.gepadat.ikerOsszegzes)
  await expect(iker).toContainText(KALAND.honlap.mondat)
  await expect(iker).toContainText('48,5')
  await expect(iker).toContainText('54,2')
  expect([GEPADAT_MIN, GEPADAT_MAX], 'the twin quotes the series; if the data changed, update the two literals above').toEqual([48.5, 54.2])
  await expect(dialog(page).getByRole('heading', { name: KALAND.gepadat.cim })).toHaveCount(1)
  await expect(dialog(page).getByRole('heading', { name: KALAND.honlap.cim })).toHaveCount(1)
  await expect(dialog(page).getByRole('link', { name: KALAND.kapcsolat.felirat })).toHaveAttribute('href', KALAND.kapcsolat.href)
  await expect(iker.getByRole('link', { name: KALAND.gepadat.link.felirat })).toHaveAttribute('href', KALAND.gepadat.link.href)
  await iker.getByRole('link').first().focus()
  const doboz = await iker.boundingBox()
  expect(doboz?.width, 'the twin is a visible panel while it holds the focus').toBeGreaterThan(300)
})

test('a prepared world waits unseen and opens at once: no loader, no inert page, no focus taken until it is opened', async ({ page }) => {
  await keszit(page, { proba: SZOFTVERES })
  await page.evaluate(() => window.__v.elokeszit())
  const a = await allapot(page)
  expect(a).toMatchObject({ fazis: 'kesz', nyitott: false, hiba: null })
  expect(a.lepesek.kesz).toBe(a.lepesek.osszes)
  await expect(page.locator('.vilag')).toBeHidden()
  await expect(page.locator('html')).not.toHaveClass(/vilag-nyitva/)
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  expect(a.kepkockak, 'no frame loop runs while it waits').toBe(0)

  // opening it must not flash the loader: its `hidden` attribute is never touched
  const toltesValtozas = await page.evaluate(async () => {
    const toltes = document.querySelector('.vilag-toltes')!
    let n = 0
    new MutationObserver((rs) => (n += rs.length)).observe(toltes, { attributes: true, attributeFilter: ['hidden'] })
    await window.__v.megnyit()
    await new Promise((r) => setTimeout(r, 200))
    return { n, rejtett: (toltes as HTMLElement).hidden }
  })
  expect(toltesValtozas).toEqual({ n: 0, rejtett: true })
  await expect(dialog(page)).toBeVisible()
  await expect.poll(() => kepkockak(page), { timeout: 60_000 }).toBeGreaterThan(0)
})

test('the picture is drawn, differs along the route and keeps its colours to the world', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await csakVaszon(page)
  const kepek: Kep[] = []
  for (const p of [0, 0.5, 1]) {
    const elozo = await kepkockak(page)
    await page.evaluate((x) => window.__v.allit(x, true), p)
    await ujKocka(page, elozo)
    kepek.push(await vaszonKep(page))
    expect((await allapot(page)).p).toBeCloseTo(p, 5)
  }
  for (const k of kepek) {
    expect(k.fenyes, 'particles are lit').toBeGreaterThan(0.0005)
    expect(k.sotet, 'the ground is dark (the Grafit set; the glow, the floor and the mirror light part of it)').toBeGreaterThan(0.15)
    expect(k.szinek, 'more than a flat fill').toBeGreaterThan(8)
  }
  expect(Buffer.compare(kepek[0].png, kepek[1].png)).not.toBe(0)
  expect(Buffer.compare(kepek[1].png, kepek[2].png)).not.toBe(0)
  expect((await allapot(page)).fejezet).toBe('honlap')
})

test('every control sets the same depth: slider, route lane, keys and wheel; the readout names the true sample', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  const gyorsMeret = await page.locator('.vilag').evaluate((e) => ({ w: e.clientWidth, h: e.clientHeight }))
  const ut = palya(MINTAK.gepadat.ertekek, MINTAK.honlap.racs.oszlop, MINTAK.honlap.racs.sor)
  const p = async () => (await allapot(page)).p

  // the slider
  for (const x of [0, 300, 700]) {
    await csuszka(page).fill(String(x))
    await expect.poll(p).toBeCloseTo(x / 1000, 5)
    const i = ut.index(x / 1000, gyorsMeret.w / gyorsMeret.h)
    await expect(olvasat(page)).toHaveText(KALAND.gepadat.olvasat(i))
    await expect(csuszka(page)).toHaveAttribute('aria-valuetext', KALAND.gepadat.olvasat(i))
  }

  // the route lane: a key per chapter, the current one marked
  const honlap = page.getByRole('button', { name: KALAND.honlap.cim, exact: true })
  const gepadat = page.getByRole('button', { name: KALAND.gepadat.cim, exact: true })
  await honlap.click()
  await expect.poll(p).toBeCloseTo(FEJEZETEK[1].nyugalom, 5)
  await expect(honlap).toHaveAttribute('aria-current', 'step')
  await expect(gepadat).not.toHaveAttribute('aria-current', 'step')
  await expect(olvasat(page)).toHaveText(KALAND.honlap.olvasat)
  expect((await allapot(page)).fejezet).toBe('honlap')
  await gepadat.click()
  await expect.poll(p).toBeCloseTo(FEJEZETEK[0].nyugalom, 5)
  await expect(gepadat).toHaveAttribute('aria-current', 'step')

  // the keys, after a click on the picture itself (the focus stays inside the world, so the keys still reach it)
  await page.mouse.click(400, 250)
  await expect(page.locator('.vilag')).toBeFocused()
  const kulcsok: [string, number][] = [['ArrowDown', 0.03], ['PageDown', 0.15], [' ', 0.27], ['ArrowUp', 0.24], ['PageUp', 0.12]]
  for (const [gomb, vart] of kulcsok) {
    await page.keyboard.press(gomb)
    await expect.poll(p, { message: `key ${JSON.stringify(gomb)}` }).toBeCloseTo(vart, 5)
  }
  await page.keyboard.press('End')
  await expect.poll(p).toBeCloseTo(1, 5)
  await page.keyboard.press('Home')
  await expect.poll(p).toBeCloseTo(0, 5)

  // the wheel: 500 px of delta is 0.35 of the route
  await page.mouse.move(400, 250)
  await page.mouse.wheel(0, 500)
  await expect.poll(p).toBeCloseTo(0.35, 5)
  expect(await csuszka(page).inputValue()).toBe('350')
})

test('Esc, the exit key and a click on the picture all end where they started: focus back, page live, state kept', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  const nyito = page.locator(NYITO)

  // Esc with the focus on the slider
  await page.keyboard.press('Escape')
  await expect(page.locator('.vilag')).not.toHaveAttribute('data-nyitva')
  await expect(nyito).toBeFocused()
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
  await expect(page.locator('html')).not.toHaveClass(/vilag-nyitva/)
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['esc'])

  // opening again is instant: no loader, the same state, and the page is inert again
  await page.evaluate(() => window.__v.allit(0.4, true))
  await page.evaluate(() => window.__v.megnyit())
  await expect(dialog(page)).toBeVisible()
  await expect(page.locator('.vilag-toltes')).toBeHidden()
  expect((await allapot(page)).p).toBeCloseTo(0.4, 5)
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(true)

  // Esc after a click on the picture
  await page.mouse.click(400, 250)
  await page.keyboard.press('Escape')
  await expect(nyito).toBeFocused()
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['esc', 'esc'])

  // the exit key
  await page.evaluate(() => window.__v.megnyit())
  await page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev }).click()
  await expect(nyito).toBeFocused()
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['esc', 'esc', 'kulcs'])
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)

  // an API close of a closed world does nothing, and a destroyed world leaves no trace in the page
  await page.evaluate(() => window.__v.bezar())
  expect(await page.evaluate(() => window.__bezarva.length)).toBe(3)
  await page.evaluate(() => window.__v.megsemmisit())
  expect(await page.locator('.vilag').count()).toBe(0)
  await expect(page.evaluate(() => window.__v.megnyit())).rejects.toThrow()
})

test('reduced motion is a still world; the calm key makes the moving one still, and neither idles or follows the pointer', async ({ page }) => {
  // still by the visitor's setting: one frame on demand, nothing in between, the pointer does not push the particles
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await csakVaszon(page)
  await page.mouse.move(100, 100)
  let n = await kepkockak(page)
  const elso = await vaszonKep(page)
  await page.waitForTimeout(700)
  expect(await kepkockak(page), 'no frame is drawn while nothing happens').toBe(n)
  await page.mouse.move(600, 300, { steps: 5 })
  await ujKocka(page, n)
  n = await kepkockak(page)
  await page.waitForTimeout(400)
  expect(await kepkockak(page)).toBe(n)
  expect(Buffer.compare((await vaszonKep(page)).png, elso.png), 'the pointer changes nothing in a still world').toBe(0)

  // moving: frames keep coming and the picture drifts
  const masik = await page.context().newPage()
  await nyit(masik)
  await csakVaszon(masik)
  const a = await kepkockak(masik)
  const k1 = await vaszonKep(masik)
  await ujKocka(masik, a + 2)
  const k2 = await vaszonKep(masik)
  expect(Buffer.compare(k1.png, k2.png), 'a moving world is never the same twice (idle drift, grain)').not.toBe(0)
  await csakVaszon(masik, false)

  // the calm key stops it, and a second press lets it move again
  const nyugodt = masik.getByRole('button', { name: KALAND.vezerlok.nyugodt.nev })
  await nyugodt.click()
  await expect(nyugodt).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => {
    const x = await kepkockak(masik)
    await masik.waitForTimeout(500)
    return (await kepkockak(masik)) - x
  }, { timeout: 15_000 }).toBeLessThanOrEqual(1)
  const m = await kepkockak(masik)
  await nyugodt.click()
  await expect(nyugodt).toHaveAttribute('aria-pressed', 'false')
  await ujKocka(masik, m + 2)
})

test('sound is off until its key is pressed: no audio context before, one after, and none left running when the world closes', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __ac: number }
    w.__ac = 0
    const Eredeti = window.AudioContext
    window.AudioContext = class extends Eredeti {
      constructor(...a: ConstructorParameters<typeof AudioContext>) {
        super(...a)
        w.__ac++
      }
    }
  })
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  const darab = () => page.evaluate(() => (window as unknown as { __ac: number }).__ac)
  const hang = page.getByRole('button', { name: KALAND.vezerlok.hang, exact: true })
  await expect(hang).toHaveAttribute('aria-pressed', 'false')
  expect(await darab()).toBe(0)
  await hang.click()
  await expect(hang).toHaveAttribute('aria-pressed', 'true')
  expect(await darab()).toBe(1)
  expect((await allapot(page)).hang).toBe(true)
  await hang.click()
  await expect(hang).toHaveAttribute('aria-pressed', 'false')
  expect((await allapot(page)).hang).toBe(false)
  await hang.click()
  expect(await darab(), 'the same context is reused').toBe(1)
  await page.keyboard.press('Escape')
  expect((await allapot(page)).hang, 'closing the world silences it').toBe(false)
})

test('the gate: a software renderer gets no world and a plain message, and the page stays whole', async ({ page }) => {
  // the visitor's own gate (no CI hook) refuses SwiftShader: nothing is shown but the exit key and one sentence
  await keszit(page)
  const kapu = await page.evaluate(async (u) => {
    const m = (await import(u)) as { kapuProba: (szoftveres?: boolean) => { indok: string | null; renderer: string } }
    return { eles: m.kapuProba(false), ci: m.kapuProba(true) }
  }, vilagUrl())
  expect(kapu.eles.indok, 'the gate refuses a software renderer').toMatch(/no-context|performance-caveat|software-renderer/)
  expect(kapu.ci.indok, 'the CI hook admits it').toBeNull()
  // preparing in the background (the pointer is over the button) is refused first; the click that follows still gets the message, and nothing else
  await expect(page.evaluate(() => window.__v.elokeszit())).rejects.toThrow(/no-context|software-renderer|performance-caveat/)
  expect((await allapot(page)).fazis).toBe('hiba')
  await expect(page.locator('.vilag')).toBeHidden()
  await expect(page.evaluate(() => window.__v.megnyit())).rejects.toThrow(/no-context|software-renderer|performance-caveat/)
  await expect(page.locator('.vilag-hiba')).toHaveText(KALAND.vezerlok.hiba)
  expect(await page.evaluate(() => document.getElementById('top')!.inert), 'the dialog holds the page while it shows').toBe(true)
  await page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev }).click()
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
  await expect(page.locator(NYITO)).toBeFocused()
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['kulcs'])
})

test('Save-Data: the gate refuses before any GL context is made', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }) })
  })
  await glFigyel(page)
  await keszit(page, { proba: SZOFTVERES })
  const indok = await page.evaluate(async (u) => {
    const m = (await import(u)) as { kapuProba: (szoftveres?: boolean) => { indok: string | null } }
    return m.kapuProba(true).indok
  }, vilagUrl())
  expect(indok).toBe('save-data')
  await expect(page.evaluate(() => window.__v.megnyit())).rejects.toThrow('save-data')
  expect(await glKerelmek(page), 'no GL context was ever made').toEqual([])
  await expect(page.locator('.vilag-hiba')).toHaveText(KALAND.vezerlok.hiba)
})

test.describe('the quality ladder is wired to the frame loop', () => {
  test('a slow GPU takes the mirror and the effects away first, then steps the picture down (smaller canvas)', async ({ page }) => {
    // the GPU cost is forced to 40 ms (the CI hook): every slow window is blamed on the GPU, so the ladder must step
    await nyit(page, { proba: { ...SZOFTVERES, leptek: true, ablak: 8, koltseg: 40 } })
    const a0 = await allapot(page)
    expect(a0.db, 'the full tier with every effect on draws 150,000 particles').toBe(150000)
    expect(a0.retegek.tukor).toBe(true)
    expect(GAZDAG_HATASOK.every((n) => a0.hatasok[n].be)).toBe(true)
    const w0 = a0.vaszon.w
    await expect.poll(async () => (await allapot(page)).megjegyzesek.join('\n'), { timeout: 60_000 }).toMatch(/mirror and effects off/)
    const a1 = await allapot(page)
    expect(a1.retegek.tukor, 'the mirror is gone').toBe(false)
    expect(GAZDAG_HATASOK.every((n) => !a1.hatasok[n].be), 'every costly effect is gone').toBe(true)
    expect(a1.db, 'with them the particle count falls back to the base').toBe(60000)
    expect(a1.retegek.racs && a1.retegek.felirat, 'the cheap layers stay').toBe(true)
    await expect.poll(async () => (await allapot(page)).skala, { timeout: 60_000 }).toBeLessThan(1)
    const a = await allapot(page)
    expect(a.vaszon.w, 'a lower scale means a smaller canvas').toBeLessThan(w0)
    const notes = a.megjegyzesek.join('\n')
    expect(notes).toMatch(/scale 0\.85/)
    expect(notes.indexOf('mirror and effects off'), 'the effects went before the scale').toBeLessThan(notes.indexOf('scale 0.85'))
    expect(a.kap).toBe(false)
  })

  test('with a cheap GPU and slow frames, the ladder says the rate is capped and changes nothing', async ({ page }) => {
    await nyit(page, { proba: { ...SZOFTVERES, leptek: true, ablak: 8, koltseg: 3 } })
    await expect.poll(async () => (await allapot(page)).kap, { timeout: 60_000 }).toBe(true)
    const a = await allapot(page)
    expect(a.skala).toBe(1)
    expect(a.szint).toBe('teljes')
    expect(a.megjegyzesek.join('\n')).toMatch(/capped/)
  })

  test('a still world runs no windows, and the quality key freezes the ladder', async ({ page }) => {
    await nyit(page, { proba: { ...SZOFTVERES, leptek: true, ablak: 4, koltseg: 40 }, nyugodt: true })
    for (let i = 0; i < 12; i++) {
      const n = await kepkockak(page)
      await page.evaluate((x) => window.__v.allit(x, true), (i % 5) / 5)
      await ujKocka(page, n)
    }
    const a = await allapot(page)
    expect(a.ablak, 'frames of a still world say nothing about the load').toBe(0)
    expect(a.skala).toBe(1)
  })

  test('the review build\'s quality key rigs the ladder to hold', async ({ page }) => {
    await nyit(page, { proba: { ...SZOFTVERES, leptek: true, ablak: 6, koltseg: 40 }, diagnosztika: true })
    const gomb = page.getByRole('button', { name: /^Minőség/ })
    await gomb.click()
    await expect(gomb).toHaveAttribute('aria-pressed', 'true')
    expect((await allapot(page)).rogzitve).toBe(true)
    const s0 = (await allapot(page)).skala // the ladder may have stepped before the key was pressed; from here on it must not
    const n = await kepkockak(page)
    await ujKocka(page, n + 40)
    expect((await allapot(page)).skala, 'frozen: no step however slow').toBe(s0)
    await expect(page.locator('.vilag-diag output').first()).toContainText('rögzítve')
  })
})

test('a lost GL context closes the world cleanly and the ordinary page carries on', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('.vilag-vaszon')!.getContext('webgl2')!
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await expect.poll(() => page.evaluate(() => window.__bezarva)).toEqual(['kontextus'])
  expect((await allapot(page)).fazis).toBe('hiba')
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
  await expect(page.locator(NYITO)).toBeFocused()
  await expect(page.evaluate(() => window.__v.megnyit()), 'a world that lost its context answers the click with the message').rejects.toThrow()
  await expect(page.locator('.vilag-hiba')).toHaveText(KALAND.vezerlok.hiba)
  await page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev }).click()
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['kontextus', 'kulcs'])
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
})

test('the post stack is a set of switchable passes: each changes the picture and none is locked in', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await csakVaszon(page)
  expect((await allapot(page)).hatasok, 'the defaults are the prototype\'s, all on and not decided').toEqual(ALAP_HATASOK)
  const kep = async () => (await vaszonKep(page)).png
  for (const nev of ['bloom', 'szegely', 'vignetta', 'szemcse'] as const) {
    const be = await kep()
    let n = await kepkockak(page)
    await page.evaluate((x) => window.__v.hatas(x, false), nev)
    await ujKocka(page, n)
    expect((await allapot(page)).hatasok[nev].be).toBe(false)
    // The grain is a moving-world pass (a still world has none), so switching it off changes a still picture not at all; every other pass does.
    const kulonbseg = Buffer.compare(be, await kep()) !== 0
    expect(kulonbseg, `${nev} off ${nev === 'szemcse' ? 'leaves a still picture as it is' : 'changes the picture'}`).toBe(nev !== 'szemcse')
    n = await kepkockak(page)
    await page.evaluate(([x, ero]) => window.__v.hatas(x as 'bloom', true, ero as number), [nev, ALAP_HATASOK[nev].ero])
    await ujKocka(page, n)
    expect((await allapot(page)).hatasok[nev], `${nev} back on, at its default strength`).toEqual(ALAP_HATASOK[nev])
  }
})

test('tearing the world down while the "Mérés" key measures ends the measurement without an error', async ({ page }) => {
  const hibak: string[] = []
  page.on('pageerror', (e) => hibak.push(e.message))
  await nyit(page, { proba: SZOFTVERES, diagnosztika: true })
  const sorok = await page.evaluate(async () => {
    const mereses = window.__v.merj(12) // gives way to the event loop every sixth frame, two configurations deep
    await new Promise((r) => setTimeout(r, 0))
    window.__v.megsemmisit()
    return mereses
  })
  expect(Array.isArray(sorok)).toBe(true)
  expect(hibak).toEqual([])
  expect(await page.locator('.vilag').count()).toBe(0)
})

test('a whole visit touches nothing outside the page: same origin only, nothing stored, no errors', async ({ page, baseURL }) => {
  const kulso: string[] = []
  const hibak: string[] = []
  const origin = new URL(baseURL!).origin
  page.on('request', (r) => {
    const u = new URL(r.url())
    if ((u.protocol === 'http:' || u.protocol === 'https:') && u.origin !== origin) kulso.push(r.url())
  })
  page.on('pageerror', (e) => hibak.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') hibak.push(`console.error: ${m.text()}`)
  })
  await nyit(page, { proba: SZOFTVERES, diagnosztika: true })
  await csuszka(page).fill('500')
  await page.mouse.move(300, 200, { steps: 4 })
  await page.getByRole('button', { name: KALAND.honlap.cim }).click()
  await page.getByRole('button', { name: KALAND.vezerlok.hang, exact: true }).click()
  await page.getByRole('button', { name: KALAND.vezerlok.nyugodt.nev }).click()
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.__v.megsemmisit())

  expect(kulso, 'requests to another origin').toEqual([])
  expect(hibak).toEqual([])
  const tar = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    sutik: document.cookie,
    adatbazisok: (await indexedDB.databases()).length,
    gyorsitotar: (await caches.keys()).length,
  }))
  expect(tar).toEqual({ local: 0, session: 0, sutik: '', adatbazisok: 0, gyorsitotar: 0 })
})

// ---------------------------------------------------------------------------------------------------------------------------------
// V2b: the looks engine (src/vilag/nezet.ts and the layers). Pixel comparisons need a still world: reduced motion draws one deterministic frame per state (no idle drift, no grain, no pointer),
// so the same state is the same picture and a different state differs.
/** Jumps to a place on the route and waits for the frame that shows it. */
const ugrik = async (page: Page, p: number): Promise<void> => {
  const n = await kepkockak(page)
  await page.evaluate((x) => window.__v.allit(x, true), p)
  await ujKocka(page, n)
}

/** Waits for the next frame after `muvelet`. */
const valtoztat = async (page: Page, muvelet: () => Promise<unknown>): Promise<void> => {
  const n = await kepkockak(page)
  await muvelet()
  await ujKocka(page, n)
}

test('the look follows the route (Mérőműszer, Áramlás in the flight, Színpad at the picture); a pinned look overrides it, and the route\'s look at a keyframe is that look exactly', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await csakVaszon(page)
  for (const [p, nev] of [[0, 'muszer'], [0.35, 'aramlas'], [1, 'szinpad']] as const) {
    await ugrik(page, p)
    expect((await allapot(page)).nezet, `at ${p}`).toBe(nev)
  }
  await ugrik(page, 0.35)
  const utvonal = (await vaszonKep(page)).png
  const kepek = {} as Record<NezetId, Buffer>
  for (const nev of ['muszer', 'szinpad', 'aramlas'] as const) {
    await valtoztat(page, () => page.evaluate((x) => window.__v.nezet(x), nev))
    expect(await allapot(page)).toMatchObject({ nezet: nev, nezetRogzitett: nev })
    kepek[nev] = (await vaszonKep(page)).png
  }
  expect(Buffer.compare(kepek.muszer, kepek.szinpad), 'Mérőműszer and Színpad look different').not.toBe(0)
  expect(Buffer.compare(kepek.muszer, kepek.aramlas), 'Mérőműszer and Áramlás look different').not.toBe(0)
  expect(Buffer.compare(kepek.szinpad, kepek.aramlas), 'Színpad and Áramlás look different').not.toBe(0)
  await valtoztat(page, () => page.evaluate(() => window.__v.nezet(null)))
  expect(await allapot(page)).toMatchObject({ nezet: 'aramlas', nezetRogzitett: null })
  expect(Buffer.compare((await vaszonKep(page)).png, utvonal), 'the route at a keyframe draws exactly what the pinned look draws').toBe(0)
  expect(Buffer.compare(utvonal, kepek.aramlas), 'and that is Áramlás').toBe(0)
  // between two keyframes both looks are mixed: the picture is neither of them
  await ugrik(page, 0.11)
  const kozben = (await vaszonKep(page)).png
  expect(Buffer.compare(kozben, kepek.muszer)).not.toBe(0)
  expect(Buffer.compare(kozben, kepek.aramlas)).not.toBe(0)
})

test('every costly effect and layer is a switch that changes the picture and gives it back, and none is locked in', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await csakVaszon(page)
  await page.evaluate(() => window.__v.nezet('szinpad')) // the look with the light shafts, the depth of field and the strongest mirror
  await ugrik(page, 0.3)
  const kep = async (): Promise<Buffer> => (await vaszonKep(page)).png
  const alap = await kep()
  const a0 = await allapot(page)
  expect(GAZDAG_HATASOK.every((n) => a0.hatasok[n].be) && RETEGEK.every((n) => a0.retegek[n]), 'everything starts on').toBe(true)
  for (const nev of GAZDAG_HATASOK) {
    await valtoztat(page, () => page.evaluate((x) => window.__v.hatas(x, false), nev))
    expect((await allapot(page)).hatasok[nev].be).toBe(false)
    expect(Buffer.compare(await kep(), alap), `${nev} off changes the picture`).not.toBe(0)
    if (nev === 'sok') expect((await allapot(page)).db, 'without "sok" the full tier draws 60,000').toBe(60000)
    await valtoztat(page, () => page.evaluate((x) => window.__v.hatas(x, true), nev))
    expect(Buffer.compare(await kep(), alap), `${nev} back on gives the same picture`).toBe(0)
  }
  for (const nev of RETEGEK.filter((n) => n !== 'felirat')) {
    await valtoztat(page, () => page.evaluate((x) => window.__v.reteg(x, false), nev))
    expect((await allapot(page)).retegek[nev]).toBe(false)
    expect(Buffer.compare(await kep(), alap), `${nev} off changes the picture`).not.toBe(0)
    await valtoztat(page, () => page.evaluate((x) => window.__v.reteg(x, true), nev))
    expect(Buffer.compare(await kep(), alap), `${nev} back on gives the same picture`).toBe(0)
  }
  // a factor on the look's own strength: half the shafts is neither none nor all
  await valtoztat(page, () => page.evaluate(() => window.__v.hatas('fenycsova', true, 0.5)))
  const fele = await kep()
  await valtoztat(page, () => page.evaluate(() => window.__v.hatas('fenycsova', false)))
  const nincs = await kep()
  expect(Buffer.compare(fele, alap)).not.toBe(0)
  expect(Buffer.compare(fele, nincs)).not.toBe(0)
})

test.describe('the labels', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  const lathato = (page: Page, tip?: string): Promise<number> =>
    page.locator(tip ? `.vilag-felirat[data-tip="${tip}"]` : '.vilag-felirat').evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) > 0.05).length)

  test('are real facts as DOM text in the scene, aria-hidden, and every one is also in the text twin', async ({ page }) => {
    await nyit(page, { proba: SZOFTVERES, nyugodt: true })
    const P = palya(MINTAK.gepadat.ertekek, MINTAK.honlap.racs.oszlop, MINTAK.honlap.racs.sor, MINTAK.gepadat.kezdetPerc)
    const F = KALAND.gepadat.feliratok
    const lista = page.locator('.vilag-felirat')
    const szovegek = await lista.allTextContents()
    expect(szovegek, 'an hour mark and a value per full hour but the last, the two extremes, the end of the run, and the picture\'s two dimension lines').toHaveLength(P.oraIdx.length + (P.oraIdx.length - 1) + 2 + 2)
    expect(szovegek).toContain(F.csucs(P.iMax))
    expect(szovegek).toContain(F.melypont(P.iMin))
    expect(szovegek).toContain(F.muszakvaltas)
    expect(szovegek).toContain(F.ora(P.oraIdx[1]))
    expect(szovegek).toContain(F.ertek(P.oraIdx[1]))
    expect(szovegek).toContain(F.szeles)
    expect(szovegek).toContain(F.magas)
    expect(F.csucs(P.iMax)).toContain(String(GEPADAT_MAX).replace('.', ','))
    expect(F.melypont(P.iMin)).toContain(String(GEPADAT_MIN).replace('.', ','))
    expect(await page.locator('.vilag-feliratok').getAttribute('aria-hidden'), 'the canvas text is for the eye only: the twin and the readout carry the facts').toBe('true')
    expect(await page.locator('.vilag-feliratok').evaluate((e) => getComputedStyle(e).pointerEvents), 'a label never takes input').toBe('none')
    const iker = (await page.locator('.vilag-iker').textContent()) ?? ''
    for (const t of szovegek) expect(iker, `the twin lists "${t}"`).toContain(t)
    await expect(page.locator('.vilag-iker').getByRole('heading', { name: KALAND.gepadat.ikerCim })).toHaveCount(1)
  })

  test('read at the opening, fade out as the look changes (the values first), and yield to the picture; the layer key hides them all', async ({ page }) => {
    await nyit(page, { proba: SZOFTVERES, nyugodt: true })
    await ugrik(page, 0)
    expect(await lathato(page, 'ora'), 'hours on the floor').toBeGreaterThanOrEqual(3)
    expect(await lathato(page, 'ertek'), 'the value at an hour (Mérőműszer)').toBeGreaterThanOrEqual(1)
    expect(await lathato(page, 'cs')).toBe(1)
    await ugrik(page, 0.35)
    expect(await lathato(page, 'ertek'), 'Áramlás asks for the hours and the extremes only').toBe(0)
    expect(await lathato(page, 'ora') + (await lathato(page, 'cs')) + (await lathato(page, 'csle'))).toBeGreaterThanOrEqual(1)
    await ugrik(page, 1)
    expect(await lathato(page, 'ora') + (await lathato(page, 'ertek')) + (await lathato(page, 'cs')) + (await lathato(page, 'csle')), 'the picture takes the scene\'s labels away').toBe(0)
    expect(await lathato(page, 'meret') + (await lathato(page, 'meretf')), 'and brings its own two dimension lines').toBe(2)
    await ugrik(page, 0)
    expect(await lathato(page, 'meret') + (await lathato(page, 'meretf')), 'the dimension lines belong to the picture and are not there before it forms').toBe(0)
    const n = await lathato(page)
    expect(n).toBeGreaterThan(0)
    await valtoztat(page, () => page.evaluate(() => window.__v.reteg('felirat', false)))
    expect(await lathato(page), 'the layer key hides them').toBe(0)
    await valtoztat(page, () => page.evaluate(() => window.__v.reteg('felirat', true)))
    expect(await lathato(page)).toBe(n)
  })

  test('reduced motion is one still frame per chapter, labels included: nothing moves between frames', async ({ page }) => {
    await nyit(page, { proba: SZOFTVERES, nyugodt: true })
    const honlap = page.getByRole('button', { name: KALAND.honlap.cim, exact: true })
    const gepadat = page.getByRole('button', { name: KALAND.gepadat.cim, exact: true })
    for (const [gomb, vart] of [[honlap, 0], [gepadat, 1]] as const) {
      const n = await kepkockak(page)
      await gomb.click()
      await ujKocka(page, n)
      const kocka = await kepkockak(page)
      const felirat = async (): Promise<string> => page.locator('.vilag-felirat').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).style.transform}|${(e as HTMLElement).style.opacity}`).join(';'))
      const f1 = await felirat()
      const k1 = (await vaszonKep(page)).png
      await page.waitForTimeout(1200)
      expect(await kepkockak(page), 'no frame is drawn while nothing happens').toBe(kocka)
      expect(await felirat(), 'the labels stand still').toBe(f1)
      // byte for byte, but for the one level the header's gradient scrim may dither differently between two screenshots of the same composited page
      expect(await legnagyobbElteres(page, (await vaszonKep(page)).png, k1), 'the picture (with the labels over it) stands still').toBeLessThanOrEqual(1)
      const scene = (await lathato(page, 'ora')) + (await lathato(page, 'ertek')) + (await lathato(page, 'cs')) + (await lathato(page, 'csle'))
      expect(scene > 0, vart ? 'the first chapter\'s frame carries labels' : 'the picture\'s frame carries none of the scene\'s').toBe(vart === 1)
      expect((await lathato(page, 'meret')) + (await lathato(page, 'meretf')), 'the picture\'s own two dimension lines belong to its frame').toBe(vart === 1 ? 0 : 2)
    }
  })
})

test('a phone-sized viewport starts on the light tier: Mérőműszer all the way, no mirror and no effects, 30,000 particles, the labels and the floor stay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  const a = await allapot(page)
  expect(a).toMatchObject({ szint: 'konnyu', db: 30000, nezet: 'muszer' })
  expect(a.retegek).toMatchObject({ tukor: false, racs: true, felirat: true })
  expect(GAZDAG_HATASOK.every((n) => !a.hatasok[n].be)).toBe(true)
  for (const p of [0.35, 1]) {
    await ugrik(page, p)
    expect((await allapot(page)).nezet, 'the light tier never leaves Mérőműszer').toBe('muszer')
  }
  await ugrik(page, 0)
  expect(await page.locator('.vilag-felirat').evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) > 0.05).length)).toBeGreaterThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll at 390 px').toBe(true)
})

test('the review build\'s keys switch the look, the effects and the layers; a visitor has none', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, diagnosztika: true, nyugodt: true })
  const gomb = (nev: string) => page.getByRole('button', { name: nev, exact: true })
  await expect(gomb('Útvonal szerint')).toHaveAttribute('aria-pressed', 'true')
  await valtoztat(page, () => gomb('Fénycsóva').click())
  await expect(gomb('Fénycsóva')).toHaveAttribute('aria-pressed', 'false')
  expect((await allapot(page)).hatasok.fenycsova.be).toBe(false)
  await valtoztat(page, () => gomb('Tükör').click())
  expect((await allapot(page)).retegek.tukor).toBe(false)
  await valtoztat(page, () => gomb('Színpad').click())
  expect(await allapot(page)).toMatchObject({ nezetRogzitett: 'szinpad', nezet: 'szinpad' })
  await expect(gomb('Színpad')).toHaveAttribute('aria-pressed', 'true')
  await expect(gomb('Útvonal szerint')).toHaveAttribute('aria-pressed', 'false')
  await valtoztat(page, () => gomb('Útvonal szerint').click())
  expect((await allapot(page)).nezetRogzitett).toBeNull()
  await valtoztat(page, () => gomb('Több részecske').click())
  expect((await allapot(page)).db).toBe(60000)
  await expect(page.locator('.vilag-diag output').first()).toContainText('nézet: Mérőműszer')
  // the loader keys pin the loader scene at a fraction and give the world back
  await expect(gomb('A világ')).toHaveAttribute('aria-pressed', 'true')
  await valtoztat(page, () => gomb('50 %').click())
  await expect(gomb('50 %')).toHaveAttribute('aria-pressed', 'true')
  await expect(gomb('A világ')).toHaveAttribute('aria-pressed', 'false')
  expect(await page.locator('.vilag-tolt-olvasat').textContent()).toBe(KALAND.gepadat.olvasat(Math.round(toltesIndex(0.5, MINTAK.gepadat.ertekek.length))))
  await valtoztat(page, () => gomb('A világ').click())
  await expect(gomb('50 %')).toHaveAttribute('aria-pressed', 'false')

  const masik = await page.context().newPage()
  await nyit(masik, { proba: SZOFTVERES, nyugodt: true })
  await expect(masik.getByRole('button', { name: 'Fénycsóva' })).toHaveCount(0)
  await expect(masik.getByRole('button', { name: 'Mérés' })).toHaveCount(0)
  await expect(masik.getByRole('button', { name: '50 %' })).toHaveCount(0)
})

test('the "Mérés" key measures twelve rows (each effect and layer alone against the bare base, then the look as it stands) and restores every switch', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, diagnosztika: true })
  const sorok = await page.evaluate(() => window.__v.merj(8))
  expect(sorok).toHaveLength(12)
  expect(sorok.map((s) => s.split(' ·')[0])).toEqual(['alap', 'alap', '+ mélységélesség', '+ fénycsóva', '+ por', '+ több részecske', '+ rács', '+ tükör', 'nézet így (Mérőműszer)', 'nézet így (Áramlás)', 'nézet így (Színpad)', 'nézet így (Színpad)'])
  expect(sorok[0], 'the base draws the 60,000 of the full tier').toMatch(/60k/)
  expect(sorok[5], 'the effect "több részecske" alone draws 150,000').toMatch(/150k/)
  expect(sorok[11]).toMatch(/skála 0\.7/)
  const a = await allapot(page)
  expect(GAZDAG_HATASOK.every((n) => a.hatasok[n].be) && RETEGEK.every((n) => a.retegek[n]), 'every switch is back where it was').toBe(true)
  expect(a).toMatchObject({ nezetRogzitett: null, db: 150000, skala: 1 })
  expect(a.p).toBe(0)
})

// ---------------------------------------------------------------------------------------------------------------------------------
// V3: chapters 0 to 2 as a worked scene (the loader's pen, the captions, the probe). The pictures are for the owner's eyes on a real GPU; what a software frame proves is that each layer is there, truthful and out of the way.
test.describe('chapters 0 to 2 as a scene', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the captions are a visual copy of the chapter: title, sentence and note (the simulated-data notice included), hidden from assistive technology, and they follow the route', async ({ page }) => {
    await nyit(page, { proba: SZOFTVERES, nyugodt: true })
    const cim = page.locator('.vilag-cim')
    expect(await cim.getAttribute('aria-hidden')).toBe('true')
    const g = cim.locator('[data-fejezet="gepadat"]')
    const h = cim.locator('[data-fejezet="honlap"]')
    await expect(g).toContainText(KALAND.gepadat.cim)
    await expect(g).toContainText(KALAND.gepadat.mondat)
    await expect(g, 'the data is simulated and the caption says so, not only the twin').toContainText(KALAND.gepadat.szimulalt)
    await expect(h).toContainText(KALAND.honlap.mondat)
    await expect(h).toContainText(KALAND.honlap.minta)
    const o = async (e: ReturnType<Page['locator']>): Promise<number> => Number(await e.evaluate((x) => getComputedStyle(x).opacity))
    await ugrik(page, 0)
    expect(await o(g)).toBeGreaterThan(0.9)
    expect(await o(h)).toBeLessThan(0.05)
    await ugrik(page, 1)
    expect(await o(g)).toBeLessThan(0.05)
    expect(await o(h)).toBeGreaterThan(0.9)
    // the headings are in the twin once, not twice: the caption is a picture of the words
    await expect(dialog(page).getByRole('heading', { name: KALAND.gepadat.cim })).toHaveCount(1)
  })

  test('the probe names the sample nearest to a resting mouse with its real time and value, and nothing else; it leaves with the pointer and yields to the picture', async ({ page }) => {
    await nyit(page, { proba: SZOFTVERES, nyugodt: true })
    const P = palya(MINTAK.gepadat.ertekek, MINTAK.honlap.racs.oszlop, MINTAK.honlap.racs.sor, MINTAK.gepadat.kezdetPerc)
    const szonda = page.locator('.vilag-szonda')
    expect(await szonda.getAttribute('aria-hidden'), 'a visual aid only').toBe('true')
    expect(await szonda.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none')
    await ugrik(page, 0)
    expect(Number(await szonda.evaluate((e) => getComputedStyle(e).opacity)), 'no pointer, no probe').toBeLessThan(0.05)
    // the maximum's label hangs just above the thread's highest point: a mouse just under it is near that sample
    const cs = await page.locator('.vilag-felirat[data-tip="cs"]').boundingBox()
    expect(cs).not.toBeNull()
    const x = cs!.x + cs!.width / 2
    const y = cs!.y + cs!.height + 16
    const n = await kepkockak(page)
    await page.mouse.move(x, y, { steps: 2 })
    await ujKocka(page, n)
    await expect.poll(async () => Number(await szonda.evaluate((e) => getComputedStyle(e).opacity)), { timeout: 30_000 }).toBeGreaterThan(0.5)
    const szoveg = (await szonda.textContent()) ?? ''
    const mogotte = Array.from({ length: 13 }, (_, k) => P.iMax - 6 + k).map((i) => KALAND.gepadat.olvasat(i))
    expect(mogotte, 'the probe says what the twin says for a sample near the peak').toContain(szoveg)
    // the picture takes it away, a pointer that leaves takes it away
    await ugrik(page, 1)
    expect(Number(await szonda.evaluate((e) => getComputedStyle(e).opacity)), 'the picture has no thread to name').toBeLessThan(0.05)
    await ugrik(page, 0)
    await page.mouse.move(x + 1, y + 1)
    await expect.poll(async () => Number(await szonda.evaluate((e) => getComputedStyle(e).opacity)), { timeout: 30_000 }).toBeGreaterThan(0.5)
    await page.locator('.vilag').dispatchEvent('pointerleave')
    await expect.poll(async () => Number(await szonda.evaluate((e) => getComputedStyle(e).opacity)), { timeout: 30_000 }).toBeLessThan(0.05)
  })

  test('the loader scene is the series drawn by a pen: pinned at a fraction it differs from the world and from other fractions, reads out the true sample under the pen, and gives the world back', async ({ page }) => {
    await nyit(page, { proba: SZOFTVERES, nyugodt: true })
    await csakVaszon(page)
    await ugrik(page, 0)
    const vilag = await vaszonKep(page)
    const kep = async (a: number | null): Promise<Kep> => {
      const n = await kepkockak(page)
      await page.evaluate((x) => window.__v.toltesKep(x), a)
      await ujKocka(page, n)
      return vaszonKep(page)
    }
    const fele = await kep(0.5)
    const teli = await kep(1)
    expect(Buffer.compare(fele.png, vilag.png), 'the loader is its own scene').not.toBe(0)
    expect(Buffer.compare(fele.png, teli.png), 'the pen has moved').not.toBe(0)
    expect(fele.sotet, 'a spare scene: the ribbon and the floor on the dark ground').toBeGreaterThan(0.85)
    expect(teli.fenyes, 'the whole ribbon is lit').toBeGreaterThan(fele.fenyes)
    const n = MINTAK.gepadat.ertekek.length
    expect(await page.locator('.vilag-tolt-olvasat').textContent(), 'the pen reads the real sample it is at').toBe(KALAND.gepadat.olvasat(Math.round(toltesIndex(1, n))))
    expect(await page.locator('.vilag-tolt-olvasat').getAttribute('aria-hidden'), 'not a live region: nothing is announced while loading').toBe('true')
    const vissza = await kep(null)
    expect(Buffer.compare(vissza.png, vilag.png), 'the same state is the same picture').toBe(0)
  })
})
