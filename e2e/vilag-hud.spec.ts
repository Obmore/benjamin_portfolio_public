// E2E spec for the 3D world's DOM controls (HUD): sound state label, Esc key badge, error recovery, and pointer hover.
// Runs on the software renderer through the CI hook (proba), except T4 which exercises the visitor's own gate.

import fs from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { KALAND } from '../src/content/kaland'
import type { Allapot, Beallitas, BezarOk, Vilag } from '../src/vilag/tipusok'

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
interface Inditas { proba?: Beallitas['proba']; nyugodt?: boolean }
async function keszit(page: Page, o: Inditas = {}): Promise<void> {
  await page.emulateMedia({ reducedMotion: o.nyugodt ? 'reduce' : 'no-preference' })
  await page.goto(OLDAL)
  await page.evaluate(
    async ({ url, beallitas, nyito }) => {
      const m = (await import(url)) as { keszit: (b: Beallitas) => Vilag }
      window.__bezarva = []
      window.__v = m.keszit({ ...beallitas, lap: document.getElementById('top'), nyito: document.querySelector<HTMLElement>(nyito), bezarva: (ok) => window.__bezarva.push(ok) })
    },
    { url: vilagUrl(), beallitas: { proba: o.proba }, nyito: NYITO },
  )
}
const SZOFTVERES = { szoftveres: true } as const
const allapot = (page: Page): Promise<Allapot> => page.evaluate(() => window.__v.allapot())
async function nyit(page: Page, o: Inditas = { proba: SZOFTVERES }): Promise<void> {
  await keszit(page, o)
  await page.evaluate(() => window.__v.megnyit())
  await expect.poll(async () => (await allapot(page)).kepkockak, { timeout: 60_000 }).toBeGreaterThan(0)
}
const hatterSzin = (gomb: Locator): Promise<string> => gomb.evaluate((el) => getComputedStyle(el).backgroundColor)
const keretSzin = (gomb: Locator): Promise<string> => gomb.evaluate((el) => getComputedStyle(el).borderColor)

test.use({ viewport: { width: 800, height: 500 } })
test.describe.configure({ timeout: 240_000 })

test('the sound key shows its state in a word, and its name stays the same', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await expect(page.locator('.vilag')).toHaveAttribute('role', 'dialog')

  const hang = page.getByRole('button', { name: KALAND.vezerlok.hang, exact: true })
  const allapotSpan = hang.locator('span.vilag-allapot')
  const ki = allapotSpan.locator('span[data-allapot="ki"]')
  const be = allapotSpan.locator('span[data-allapot="be"]')

  await expect(hang).toHaveAttribute('aria-pressed', 'false')
  await expect(allapotSpan).toHaveAttribute('aria-hidden', 'true')
  await expect(ki).toHaveText(KALAND.vezerlok.hangAllapot.ki)
  await expect(be).toHaveText(KALAND.vezerlok.hangAllapot.be)
  await expect(ki).toBeVisible()
  await expect(be).toBeHidden()

  await hang.click()
  await expect(hang).toHaveAttribute('aria-pressed', 'true')
  await expect(be).toBeVisible()
  await expect(ki).toBeHidden()

  await hang.click()
  await expect(hang).toHaveAttribute('aria-pressed', 'false')
  await expect(ki).toBeVisible()
  await expect(be).toBeHidden()
})

test('the exit key carries the Esc sign on a mouse-and-keyboard device', async ({ page }) => {
  await nyit(page)

  const kilepes = page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true })
  const kbd = kilepes.locator('kbd.vilag-kbd')

  await expect(kilepes).toHaveAttribute('aria-keyshortcuts', 'Escape')
  await expect(kbd).toHaveAttribute('aria-hidden', 'true')
  await expect(kbd).toHaveCount(1)
  await expect(kbd).toHaveText('')
  await expect(kbd).toHaveAttribute('data-billentyu', KALAND.vezerlok.kilepes.billentyu)
  expect(await kbd.evaluate((el) => getComputedStyle(el, '::before').content)).toBe(JSON.stringify(KALAND.vezerlok.kilepes.billentyu))

  const finomMutato = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  expect(finomMutato).toBe(true)
  await expect(kbd).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.vilag')).not.toHaveAttribute('data-nyitva')
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['esc'])
})

test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true })

  test('the Esc sign is not shown, the key is', async ({ page }) => {
    await nyit(page)

    const finomMutato = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    expect(finomMutato, 'touch emulation must report no fine hover pointer').toBe(false)

    const kilepes = page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true })
    await expect(kilepes).toBeVisible()
    await expect(kilepes.locator('kbd.vilag-kbd')).toHaveCount(1)
    await expect(kilepes.locator('kbd.vilag-kbd')).toBeHidden()
  })

  test('the three keys on the right share one row on a 360 px phone', async ({ page }) => {
    await nyit(page)

    const hang = await page.getByRole('button', { name: KALAND.vezerlok.hang, exact: true }).boundingBox()
    const nyugodt = await page.getByRole('button', { name: KALAND.vezerlok.nyugodt.nev, exact: true }).boundingBox()
    const kilepes = await page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true }).boundingBox()

    expect(hang).not.toBeNull()
    expect(nyugodt).not.toBeNull()
    expect(kilepes).not.toBeNull()
    expect(Math.round(nyugodt!.y)).toBe(Math.round(hang!.y))
    expect(Math.round(kilepes!.y)).toBe(Math.round(hang!.y))
    expect(hang!.height).toBeGreaterThanOrEqual(44)
    expect(nyugodt!.height).toBeGreaterThanOrEqual(44)
    expect(kilepes!.height).toBeGreaterThanOrEqual(44)
    for (const d of [hang!, nyugodt!, kilepes!]) {
      expect(d.x).toBeGreaterThanOrEqual(0)
      expect(d.x + d.width).toBeLessThanOrEqual(360)
    }
  })

  test('a touch screen gets no hover colour', async ({ page }) => {
    await nyit(page)

    expect(await page.evaluate(() => window.matchMedia('(hover: hover)').matches)).toBe(false)

    const kapuzott = await page.evaluate(() => {
      const eredmeny: boolean[] = []
      const bejar = (szabalyok: CSSRuleList, media: CSSMediaRule | null): void => {
        for (const r of Array.from(szabalyok)) {
          if (r instanceof CSSStyleRule && r.selectorText.includes('vilag-gomb') && r.selectorText.includes(':hover')) {
            eredmeny.push(media !== null && /\(hover:\s*hover\)/.test(media.conditionText))
          }
          const kovMedia = r instanceof CSSMediaRule ? r : media
          if ('cssRules' in r && r.cssRules) bejar(r.cssRules as CSSRuleList, kovMedia)
        }
      }
      for (const lap of [...Array.from(document.styleSheets), ...(document.adoptedStyleSheets ?? [])]) {
        bejar(lap.cssRules, null)
      }
      return eredmeny
    })
    expect(kapuzott.length).toBeGreaterThan(0)
    expect(kapuzott.every((v) => v)).toBe(true)
  })
})

test('when the world fails, the error box has its own way back, which takes the focus', async ({ page }) => {
  await keszit(page)
  await expect(page.evaluate(() => window.__v.megnyit())).rejects.toThrow(
    /no-context|software-renderer|performance-caveat/,
  )

  const doboz = page.locator('.vilag-hiba-doboz')
  const hiba = doboz.locator('p.vilag-hiba')
  const vissza = doboz.getByRole('button', { name: KALAND.vezerlok.hibaKilepes, exact: true })

  await expect(doboz).toBeVisible()
  await expect(hiba).toHaveAttribute('role', 'status')
  await expect(hiba).toHaveText(KALAND.vezerlok.hiba)
  await expect(hiba.locator('button')).toHaveCount(0)
  await expect(doboz.locator('button')).toHaveCount(1)
  await expect(vissza).toBeVisible()
  await expect(vissza).toBeFocused()
  await expect(vissza).toHaveAccessibleDescription(KALAND.vezerlok.hiba)
  await expect(vissza).toHaveAttribute('aria-keyshortcuts', 'Escape')
  expect((await vissza.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])

  await vissza.click()
  await expect(page.locator('.vilag')).not.toHaveAttribute('data-nyitva')
  await expect(page.locator('#top')).not.toHaveAttribute('inert')
  expect(await page.evaluate(() => Boolean(document.getElementById('top')?.inert))).toBe(false)
  await expect(page.locator(NYITO)).toBeFocused()
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['kulcs'])
  await expect(doboz).toBeHidden()

  await expect(page.evaluate(() => window.__v.megnyit())).rejects.toThrow(
    /no-context|software-renderer|performance-caveat/,
  )
  await expect(doboz).toBeVisible()
  await expect(vissza).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.vilag')).not.toHaveAttribute('data-nyitva')
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['kulcs', 'esc'])
})

test('the keys answer a hovering pointer, pressed or not', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  await page.mouse.move(400, 250)

  const kilepes = page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true })
  const hang = page.getByRole('button', { name: KALAND.vezerlok.hang, exact: true })
  await expect(kilepes).toHaveClass(/\bvilag-gomb\b/)
  await expect(hang).toHaveClass(/\bvilag-gomb\b/)

  const kilepesAlap = await hatterSzin(kilepes)
  const kilepesKeretAlap = await keretSzin(kilepes)
  await kilepes.hover()
  await expect.poll(() => hatterSzin(kilepes)).not.toBe(kilepesAlap)
  await expect.poll(() => keretSzin(kilepes)).not.toBe(kilepesKeretAlap)

  await page.mouse.move(400, 250)
  await hang.click()
  await expect(hang).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.move(400, 250)
  await expect.poll(() => hang.evaluate((el) => el.matches(':hover'))).toBe(false)

  const hangBenyomva = await hatterSzin(hang)
  await hang.hover()
  await expect.poll(() => hatterSzin(hang)).not.toBe(hangBenyomva)
})

test('the open world has no axe violation', async ({ page }) => {
  await nyit(page, { proba: SZOFTVERES, nyugodt: true })
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
})

test('closing the world while it prepares keeps the error box shut and the focus with the opener', async ({ page }) => {
  await keszit(page)
  const hiba = await page.evaluate(async () => {
    const p = window.__v.megnyit()
    window.__v.bezar()
    try {
      await p
      return null
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  })
  expect(hiba).toMatch(/no-context|software-renderer|performance-caveat/)

  await expect(page.locator('.vilag')).not.toHaveAttribute('data-nyitva')
  await expect(page.locator('.vilag-hiba-doboz')).toBeHidden()
  await expect(page.locator('.vilag-hiba-doboz')).toHaveAttribute('hidden', '')
  await expect(page.locator(NYITO)).toBeFocused()
  await expect(page.locator('#top')).not.toHaveAttribute('inert')
  expect(await page.evaluate(() => window.__bezarva)).toEqual(['api'])
})

test('a narrow mouse window drops the Esc sign, and the three keys keep one row', async ({ page }) => {
  const egySorban = async (w: number): Promise<void> => {
    const hang = await page.getByRole('button', { name: KALAND.vezerlok.hang, exact: true }).boundingBox()
    const nyugodt = await page.getByRole('button', { name: KALAND.vezerlok.nyugodt.nev, exact: true }).boundingBox()
    const kilepes = await page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true }).boundingBox()

    expect(hang).not.toBeNull()
    expect(nyugodt).not.toBeNull()
    expect(kilepes).not.toBeNull()
    expect(Math.round(nyugodt!.y)).toBe(Math.round(hang!.y))
    expect(Math.round(kilepes!.y)).toBe(Math.round(hang!.y))
    expect(hang!.height).toBeGreaterThanOrEqual(44)
    expect(nyugodt!.height).toBeGreaterThanOrEqual(44)
    expect(kilepes!.height).toBeGreaterThanOrEqual(44)
    for (const d of [hang!, nyugodt!, kilepes!]) {
      expect(d.x).toBeGreaterThanOrEqual(0)
      expect(d.x + d.width).toBeLessThanOrEqual(w)
    }
  }

  for (const w of [360, 401, 420]) {
    await page.setViewportSize({ width: w, height: 800 })
    await nyit(page)

    const finomMutato = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    expect(finomMutato).toBe(true)

    const kilepesGomb = page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true })
    const kbd = kilepesGomb.locator('kbd.vilag-kbd')
    await expect(kbd).toHaveCount(1)
    await expect(kbd).toBeHidden()

    await egySorban(w)
  }

  await page.setViewportSize({ width: 449, height: 800 })
  await nyit(page)

  const finomMutato = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  expect(finomMutato).toBe(true)

  const kilepesGomb = page.getByRole('button', { name: KALAND.vezerlok.kilepes.nev, exact: true })
  const kbd = kilepesGomb.locator('kbd.vilag-kbd')
  await expect(kbd).toHaveCount(1)
  await expect(kbd).toBeVisible()

  await egySorban(449)
})
