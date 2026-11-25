import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { DEMOS } from './pages'

// PR 4: the shared frame (header, footer, line, theme) of the legal pages and 404, the return strip of the demos, and the demo accessibility fixes.
// The shared frame's checks that can be asserted on the built site.

const PAGES = ['/impresszum/', '/aszf/', '/adatkezeles/', '/en/imprint/', '/nincs-ilyen']
const WIDTHS = [360, 768, 1024, 1280]

const papir = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--papir').trim().toLowerCase())
const stripLap = (page: Page) => page.evaluate(() => getComputedStyle(document.getElementById('ob-sav')!).getPropertyValue('--lap').trim().toLowerCase())

/** The dark and the light paper colour, as the home page's tokens give them. */
async function themeColours(page: Page) {
  await page.addInitScript(() => localStorage.setItem('jel-tema', 'sotet'))
  await page.goto('/')
  const dark = await papir(page)
  await page.evaluate(() => document.documentElement.setAttribute('data-tema', 'vilagos'))
  const light = await papir(page)
  return { dark, light }
}

test.describe('theme carried to every page of the frame (A2, A3)', () => {
  for (const width of [360, 1280]) {
    test(`a stored dark choice: the first frame of each page and demo strip is dark (${width} px)`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } })
      const probe = await ctx.newPage()
      const { dark } = await themeColours(probe)
      await probe.close()
      const page = await ctx.newPage()
      await page.addInitScript(() => localStorage.setItem('jel-tema', 'sotet'))
      for (const url of PAGES) {
        await page.goto(url)
        expect(await papir(page), url).toBe(dark)
        const first = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
        expect(first, `${url}: the painted ground`).not.toBe('rgb(255, 255, 255)')
      }
      for (const url of Object.keys(DEMOS)) {
        await page.goto(url)
        const lap = await stripLap(page)
        expect(lap, `${url}: the strip is dark`).not.toBe('#fbfaf6')
      }
      await ctx.close()
    })
  }

  for (const [label, javaScriptEnabled] of [['with script', true], ['with script off', false]] as const) {
    test(`nothing stored and the system in dark: dark everywhere (${label})`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: 'dark', javaScriptEnabled })
      const light = await browser.newContext({ colorScheme: 'light', javaScriptEnabled })
      const [a, b] = [await ctx.newPage(), await light.newPage()]
      for (const url of PAGES) {
        await a.goto(url)
        await b.goto(url)
        const bg = (p: Page) => p.evaluate(() => getComputedStyle(document.body).backgroundColor)
        expect(await bg(a), url).not.toBe(await bg(b))
      }
      for (const url of Object.keys(DEMOS)) {
        await a.goto(url)
        await b.goto(url)
        expect(await stripLap(a), url).not.toBe(await stripLap(b))
      }
      if (!javaScriptEnabled) await expect(a.locator('.tkey')).toBeHidden() // without script the switch is absent
      await ctx.close()
      await light.close()
    })
  }
})

test('the switch on a legal page holds after reload and on the home page (A4)', async ({ page }) => {
  await page.goto('/impresszum/')
  const sw = page.getByRole('switch', { name: 'Sötét mód' })
  await expect(sw).toBeEnabled()
  const before = await papir(page)
  await sw.click()
  expect(await papir(page)).not.toBe(before)
  expect(await page.evaluate(() => localStorage.getItem('jel-tema'))).not.toBeNull()
  const after = await papir(page)
  await page.reload()
  expect(await papir(page)).toBe(after)
  await expect(page.getByRole('switch', { name: 'Sötét mód' })).toHaveAttribute('aria-checked', await page.evaluate(() => (document.documentElement.getAttribute('data-tema') === 'sotet' ? 'true' : 'false')))
  await page.goto('/')
  expect(await papir(page)).toBe(after)
})

test('the English imprint has the English labels of the switch and the skip link', async ({ page }) => {
  await page.goto('/en/imprint/')
  await expect(page.getByRole('switch', { name: 'Dark mode' })).toBeVisible()
  await expect(page.locator('a.ugras')).toHaveText('Skip to content')
  await expect(page.locator('header nav a')).toHaveText(['Munkák', 'Csomagok', 'Kapcsolat'])
  await expect(page.locator('header nav a').first()).toHaveAttribute('lang', 'hu')
  await expect(page.locator('footer nav')).toHaveAttribute('aria-label', 'Legal information')
})

for (const width of WIDTHS) {
  test(`one header box and one line on every page (${width} px) (A5, A6, A7)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const box = (sel: string) => page.evaluate((s) => { const r = document.querySelector(s)!.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height].map((n) => Math.round(n * 10) / 10) }, sel)
    await page.goto('/')
    const home = { nav: await box('.hdr nav'), mark: await box('.hdr .mark'), sw: await box('.tkey') }
    for (const url of PAGES) {
      await page.goto(url)
      expect(await box('.hdr .mark'), `${url}: mark`).toEqual(home.mark)
      expect(await box('.tkey'), `${url}: switch`).toEqual(home.sw)
      // the nav row ends at the same x; its start differs only through the label of the second link (Partnerek on the old home, Csomagok now: equal)
      expect(await box('.hdr nav'), `${url}: nav`).toEqual(home.nav)
      // earth under the spine, the top bar on the spine's end, no tap on a legal page and exactly one on 404
      const geo = await page.evaluate(() => {
        const sp = document.querySelector('.sp')!.getBoundingClientRect()
        const stem = document.querySelector('.earth .stem')!.getBoundingClientRect()
        const bar = document.querySelector<SVGPathElement>('.earth svg:not([style*="none"]) path')
        const visible = [...document.querySelectorAll<SVGSVGElement>('.earth svg')].find((s) => getComputedStyle(s).display !== 'none')!
        const bars = visible.getBoundingClientRect()
        const ferrule = document.querySelector('.sp')!
        return { spineX: sp.x + sp.width / 2, stemX: stem.x + stem.width / 2, earthX: bars.x + bars.width / 2, hasBar: !!bar, spTop: sp.top + scrollY, stemBottom: stem.bottom + scrollY, taps: document.querySelectorAll('.hiba-csap').length, ferr: getComputedStyle(ferrule, '::before').height }
      })
      expect(Math.abs(geo.earthX - geo.spineX), `${url}: earth under the spine`).toBeLessThanOrEqual(1)
      expect(Math.abs(geo.stemX - geo.spineX), `${url}: the last stretch of the line`).toBeLessThanOrEqual(1)
      expect(geo.taps, `${url}: taps`).toBe(url === '/nincs-ilyen' ? 1 : 0)
      expect(geo.ferr, 'the line leaves the mark from a plain node, no ferrule').toBe('10px')
      // the line is unbroken from the mark to the earth: three stretches that meet
      const gaps = await page.evaluate(() => {
        const h = document.querySelector('.hdr .mark')!.getBoundingClientRect()
        const m = document.querySelector('main')!.getBoundingClientRect()
        const sp = document.querySelector('.sp')!.getBoundingClientRect()
        const f = document.querySelector('footer')!.getBoundingClientRect()
        const stem = document.querySelector('.earth .stem')!.getBoundingClientRect()
        return { top: sp.top - h.bottom, bottom: stem.top - sp.bottom, mainBottom: m.bottom - sp.bottom, footTop: stem.top - f.top }
      })
      expect(Math.abs(gaps.top), `${url}: the line leaves the mark's lower edge`).toBeLessThanOrEqual(0.6)
      expect(gaps.mainBottom, `${url}: the main stretch ends at the footer`).toBeLessThanOrEqual(0.6)
      expect(gaps.footTop, `${url}: the stem starts at the footer`).toBeLessThanOrEqual(0)
    }
  })
}

test('404 is one viewport tall at least, three levels deep too, and the same page (assets by absolute URL)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const url of ['/nincs-ilyen', '/a/b/c']) {
    const res = await page.goto(url)
    expect(res?.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('Ez az oldal nem található.')
    await expect(page.locator('.hiba-jel')).toHaveText('Hiba 404')
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThanOrEqual(900)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.hiba-jel')!).textTransform)).toBe('uppercase')
    expect(await page.evaluate(() => document.fonts.check('16px Archivo'))).toBe(true)
  }
})

test('every new link is 44 px tall and has the 3 px operable-colour focus ring (A10)', async ({ page }) => {
  for (const url of ['/impresszum/', '/nincs-ilyen']) {
    await page.goto(url)
    const heights = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('header a, .ph-nyelv a, .pr-linkek a, .hiba-vissza a, footer a')].map((a) => [a.textContent!.trim(), a.getBoundingClientRect().height]))
    for (const [name, h] of heights) expect(h as number, `${url}: ${name}`).toBeGreaterThanOrEqual(43.5)
    await page.keyboard.press('Tab') // the skip link
    await page.keyboard.press('Tab') // the mark
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return [s.outlineWidth, s.outlineOffset, s.outlineColor === getComputedStyle(document.documentElement).getPropertyValue('--kezel') || s.outlineStyle] })
    expect(ring[0]).toBe('3px')
    expect(ring[1]).toBe('3px')
  }
})

for (const [url, back] of Object.entries(DEMOS)) {
  for (const width of [360, 1280]) {
    test(`return strip on ${url} at ${width} px: 44 px, first, one link to ${back.href} (A8)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(url)
      const strip = page.locator('#ob-sav .sav')
      const box = await strip.boundingBox()
      expect(box!.height).toBe(44)
      expect(box!.y).toBe(0)
      const link = page.locator('#ob-sav a.vissza')
      await expect(link).toHaveText(back.label)
      await expect(link).toHaveAttribute('href', back.href)
      const mark = await page.locator('#ob-sav .m').first().boundingBox()
      expect(mark!.y).toBe(6)
      expect(mark!.height).toBe(32)
      // the first things in the tab order are the demo's skip link (if it has one) and the strip's own links
      await page.keyboard.press('Tab')
      const first = await page.evaluate(() => (document.activeElement as HTMLElement).closest('#ob-sav') !== null)
      expect(first).toBe(true)
      // no other way back
      expect(await page.locator('a[href="/"], a[href^="/megrendeles"], a[href^="http"][href*="ottbenjamin.hu"]').evaluateAll((els) => els.filter((e) => !(e.getRootNode() instanceof ShadowRoot) && !e.matches('#ob-sav > a[data-ob-sav-fallback]')).length)).toBe(0)
    })
  }

  test(`the strip does not touch the demo's colours on ${url}: the same with the strip light and dark (A9)`, async ({ browser }) => {
    const sample = async (scheme: 'light' | 'dark') => {
      const ctx = await browser.newContext({ colorScheme: scheme })
      const page = await ctx.newPage()
      await page.goto(url)
      const out = await page.evaluate(() => {
        const g = (el: Element | null) => (el ? getComputedStyle(el).backgroundColor + '|' + getComputedStyle(el).color : 'none')
        return [g(document.body), g(document.querySelector('h1')), g(document.querySelector('button')), getComputedStyle(document.documentElement).colorScheme]
      })
      const strip = await page.evaluate(() => getComputedStyle(document.getElementById('ob-sav')!).getPropertyValue('--lap').trim())
      await ctx.close()
      return { out, strip }
    }
    const [l, d] = [await sample('light'), await sample('dark')]
    expect(l.strip).not.toBe(d.strip)
    // tudaslap answers the system theme itself (it has its own dark mode); the three older demos must be identical
    if (url !== '/demos/tudaslap/') expect(l.out).toEqual(d.out)
  })
}

test('M8: the shift report region is reachable by keyboard and the demo buttons carry their visible text in their names (A11)', async ({ page }) => {
  await page.goto('/demos/adatgyujto/')
  const region = page.getByRole('region', { name: 'Műszakjelentés' })
  await expect(region).toHaveAttribute('tabindex', '0')
  await region.focus()
  await expect(region).toBeFocused()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.goto('/demos/lapszabaszat/')
  await page.locator('#sample').click()
  const names = await page.locator('.icon-btn').evaluateAll((els) => els.map((e) => [e.textContent!.trim(), e.getAttribute('aria-label')!]))
  expect(names.length).toBeGreaterThan(0)
  for (const [visible, name] of names) expect(name.toLowerCase(), `${name} contains ${visible}`).toContain(visible.toLowerCase())
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe, serious and critical: the pages of the frame in ${scheme}`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme })
    const page = await ctx.newPage()
    for (const url of [...PAGES, '/']) {
      await page.goto(url)
      const found = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(found.map((v) => `${url}: ${v.id}`)).toEqual([])
    }
    await ctx.close()
  })
}

test('print: the legal text only, black on white, no line, no switch (A14)', async ({ page }) => {
  await page.goto('/aszf/')
  await page.emulateMedia({ media: 'print' })
  expect(await page.evaluate(() => [getComputedStyle(document.querySelector('header')!).display, getComputedStyle(document.querySelector('.sp-l')!).display, getComputedStyle(document.querySelector('footer')!).display])).toEqual(['none', 'none', 'none'])
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.pr-szoveg p')!).color)).toBe('rgb(0, 0, 0)')
})

// Below 727 px the mark's box is at x 8 to 40 and the lane at x 24 on every page, the content's left edge does
// not move (x 44), at least 12 px stay clear between the line and any text; the footer is one link per row (44 px) below 727, a fixed two-column grid, column by column,
// from 727 to 1023, one row of links from 1024; a data label never parts from its value.
for (const width of [320, 360, 390, 726]) {
  for (const url of ['/', '/impresszum/', '/nincs-ilyen']) {
    test(`B15: the mark box is x 8 to 40, the lane is x 24 and the content starts at x 44 on ${url} at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      const m = await page.evaluate(() => {
        const r = (s: string) => document.querySelector(s)!.getBoundingClientRect()
        const mark = r('.hdr .mark'), lane = r('.hdr .lane')
        const first = document.querySelector('main h1, main h2')!.getBoundingClientRect()
        return { left: mark.left, right: mark.right, laneX: lane.left + lane.width / 2, text: first.left }
      })
      expect(Math.abs(m.left - 8)).toBeLessThanOrEqual(0.6)
      expect(Math.abs(m.right - 40)).toBeLessThanOrEqual(0.6)
      expect(Math.abs(m.laneX - 24)).toBeLessThanOrEqual(0.6)
      expect(m.text - m.laneX, 'the line is 12 px or more from the text').toBeGreaterThanOrEqual(12 + 1.5)
    })
  }
}

for (const width of [360, 768, 1280]) {
  test(`B15: the footer rows at ${width} px, on a legal page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/impresszum/')
    const f = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.fdata nav a, .fdata nav span')].map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), h: r.height } })
      const pairs = [...document.querySelectorAll('.fadat > div')].map((d) => { const t = d.querySelector('dt')!.getBoundingClientRect(), v = d.querySelector('dd')!.getBoundingClientRect(); return { dtBottom: t.bottom, ddTop: v.top } })
      return { links, pairs }
    })
    const rows = new Set(f.links.map((l) => l.y)).size
    if (width < 727) {
      expect(rows, 'one link per row (Impresszum, ÁSZF, Adatkezelési tájékoztató: the Tapasztalat entry left with the page, PR 7)').toBe(3)
      for (const l of f.links) expect(l.h).toBeGreaterThanOrEqual(44)
    } else if (width < 1024) {
      expect(rows, 'two rows').toBe(2)
      expect(new Set(f.links.map((l) => l.x)).size, 'two columns').toBe(2)
    } else {
      expect(rows, 'one row').toBe(1)
    }
    if (width < 1024) for (const p of f.pairs) expect(p.ddTop, 'the value follows its label directly').toBeGreaterThanOrEqual(p.dtBottom - 1)   // from 1024 a pair is one line (nowrap), label and value side by side
  })
}
