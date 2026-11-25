import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Grafit: the computed tokens equal the token file, the theme follows the system until the switch is used, the switch's choice is
// remembered (and a blocked storage does not break the page), and the rendered pairs keep their contrast.
const css = fs.readFileSync(new URL('../src/site/fooldal/jel-tokens.css', import.meta.url), 'utf8')
const block = (open: string) => css.slice(css.indexOf(open), css.indexOf('}', css.indexOf(open)))
const LIGHT = block(':root:not([data-tema="sotet"]),:root [data-tema="vilagos"]{')
const DARK = block(':root[data-tema="sotet"],:root [data-tema="sotet"]{')
const tok = (b: string, name: string) => new RegExp(`--${name}:(#[0-9a-f]{6});`, 'i').exec(b)![1]!.toLowerCase()
const hex = (rgb: string) => '#' + (rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')

async function home(page: Page) {
  await page.goto('/')
  await expect(page.locator('#nyitas')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/jel-vege/)   // the chunk has started and its load sequence has ended (instead of a network-idle wait)
}
const rootTema = (page: Page) => page.locator('html').getAttribute('data-tema')
const papir = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector('main section')!).backgroundColor)

test.describe('system preference', () => {
  test.use({ colorScheme: 'dark' })
  test('a dark system gets the dark tokens without any choice', async ({ page }) => {
    await home(page)
    expect(await rootTema(page)).toBe('sotet')
    expect(hex(await papir(page))).toBe(tok(DARK, 'papir'))
    await expect(page.locator('.tkey')).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('light system', () => {
  test.use({ colorScheme: 'light' })

  test('the light tokens are the computed values', async ({ page }) => {
    await home(page)
    expect(await rootTema(page)).toBe('vilagos')
    expect(hex(await papir(page))).toBe(tok(LIGHT, 'papir'))
    const ink = await page.locator('.sub').evaluate((el) => getComputedStyle(el).color)
    expect(hex(ink)).toBe(tok(LIGHT, 'tinta'))
  })

  test('the switch turns the page dark section by section, remembers the choice, and a reload keeps it', async ({ page }) => {
    await home(page)
    const sw = page.locator('.tkey')
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
    await expect.poll(async () => hex(await papir(page)), { timeout: 5000 }).toBe(tok(DARK, 'papir'))
    expect(await page.evaluate(() => localStorage.getItem('jel-tema'))).toBe('sotet')
    await page.reload()
    expect(await rootTema(page)).toBe('sotet')
    await expect(page.locator('.tkey')).toHaveAttribute('aria-checked', 'true')
    await page.locator('.tkey').click()
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('vilagos')
    expect(await page.evaluate(() => localStorage.getItem('jel-tema'))).toBe('vilagos')
  })

  test('a stored choice beats the system', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jel-tema', 'sotet'))
    await home(page)
    expect(await rootTema(page)).toBe('sotet')
  })

  test('a blocked storage is not an error: the page works and the switch still switches', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') }, configurable: true })
    })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await home(page)
    await page.locator('.tkey').click()
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
    expect(errors).toEqual([])
  })

  test('with a blocked storage the visitor choice still stops following the system', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') }, configurable: true })
    })
    await home(page)
    await page.locator('.tkey').click() // light -> dark, by hand
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
    await page.emulateMedia({ colorScheme: 'light' }) // the system changes: the manual choice stays
    await page.waitForTimeout(300)
    expect(await rootTema(page)).toBe('sotet')
  })

  test('with no choice the page follows a change of the system theme during the visit', async ({ page }) => {
    await home(page)
    expect(await rootTema(page)).toBe('vilagos')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
  })

  test('the switch works from the keyboard (Space)', async ({ page }) => {
    await home(page)
    await page.locator('.tkey').focus()
    await page.keyboard.press('Space')
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
  })

  test('the key works from the keyboard (Enter), too', async ({ page }) => {
    await home(page)
    await page.locator('.tkey').focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
    await page.keyboard.press('Enter')
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('vilagos')
  })

  test('H3: the key is one key in the selector form: empty square and 1.5 px outline in light, filled square and 2.5 px outline in dark, a hover face, 2 px down while pressed', async ({ page }) => {
    await home(page)
    const key = page.locator('.tkey')
    const look = () => key.evaluate((el) => {
      const cs = getComputedStyle(el), sq = getComputedStyle(el, '::before'), lap = getComputedStyle(document.querySelector('header')!).getPropertyValue('--lap').trim()
      return { face: cs.backgroundColor, outline: cs.borderTopWidth, inset: cs.boxShadow, square: sq.backgroundColor, squareSize: [sq.width, sq.height], transform: cs.transform, lap }
    })
    const light = await look()
    expect(light.inset).toBe('none')
    expect(light.square, 'the square is empty in light').toBe('rgba(0, 0, 0, 0)')
    expect(light.squareSize).toEqual(['8px', '8px'])
    expect(hex(light.face), 'the face is the sheet').toBe(tok(LIGHT, 'lap'))
    await key.hover()
    expect((await look()).face, 'a 12 % blue tint on hover').not.toBe(light.face)
    await page.mouse.move(0, 0)
    await key.click()
    await expect.poll(() => rootTema(page), { timeout: 5000 }).toBe('sotet')
    await page.mouse.move(0, 0)
    await expect.poll(async () => hex((await look()).square), { timeout: 3000 }).toBe(tok(DARK, 'kezel'))
    const dark = await look()
    expect(dark.inset, 'the extra pixel of the 2.5 px outline is an inset line in ink').toMatch(/inset/)
    expect(dark.inset).toMatch(/0px 0px 0px 1px/)
    await key.hover()
    await page.mouse.down()
    expect((await look()).transform, 'pressed: 2 px down').toBe('matrix(1, 0, 0, 1, 0, 2)')
    await page.mouse.up()
  })
})

// Chromium snaps a computed 1.5 px border to 1 px (the computed value is the layout's, whatever the device pixel ratio), so the declared widths are read from the style rules.
test('the declared outlines: 1.5 px on the header key, the first screen\'s keys and its screen', async ({ page }) => {
  await home(page)
  const declared = await page.evaluate(() => {
    const out: Record<string, string[]> = {}
    const walk = (rules: CSSRuleList, into: (r: CSSStyleRule) => void) => {
      for (const r of rules) {
        if (r instanceof CSSStyleRule) into(r)
        else if ('cssRules' in r && !(r instanceof CSSMediaRule)) walk((r as CSSGroupingRule).cssRules, into)
      }
    }
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList
      try { rules = sheet.cssRules } catch { continue }
      walk(rules, (r) => {
        for (const sel of r.selectorText.split(',').map((s) => s.trim())) {
          // a shorthand with var() has no longhands in the object model: its first length is the declared width
          const w = r.style.borderTopWidth || /[\d.]+px/.exec(r.style.getPropertyValue('border'))?.[0]
          if (['.tkey', '.key-gomb', '.kij'].includes(sel) && w) (out[sel] ??= []).push(w)
        }
      })
    }
    return out
  })
  expect(declared['.tkey'], 'the header key').toContain('1.5px')
  expect(declared['.key-gomb'], 'the first screen\'s keys').toEqual(['1.5px'])
  expect(declared['.kij'], 'the first screen\'s screen').toEqual(['1.5px'])
})

const lum = (hexColor: string) => {
  const c = (i: number) => {
    const v = parseInt(hexColor.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2)
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

for (const scheme of ['light', 'dark'] as const) {
  test(`rendered pairs keep their contrast (${scheme}): text 4.5, links 4.5, pens 3`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme })
    const page = await ctx.newPage()
    await home(page)
    await expect(page.locator('html')).toHaveClass(/jel-vege/) // the chunk has started and its load sequence has ended
    const c = await page.evaluate(() => {
      const col = (sel: string, prop: 'color' | 'backgroundColor' | 'stroke') => getComputedStyle(document.querySelector(sel)!)[prop as 'color']
      return {
        ink: col('.sub', 'color'),
        soft: col('.fadat dt', 'color'),
        link: col('.fdata a', 'color'),
        bg: col('#nyitas', 'backgroundColor'),
        red: col('.pen-r', 'stroke'),
      }
    })
    const bg = hex(c.bg)
    expect(ratio(hex(c.ink), bg)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(hex(c.soft), bg)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(hex(c.link), bg)).toBeGreaterThanOrEqual(4.5)
    if (c.red.startsWith('rgb')) expect(ratio(hex(c.red), bg)).toBeGreaterThanOrEqual(3)
    await ctx.close()
  })
}
