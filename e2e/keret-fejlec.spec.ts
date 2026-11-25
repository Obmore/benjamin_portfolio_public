import { test, expect } from '@playwright/test'

// The shared header's row (the OB mark, three links, the "Sötét mód" key) at every width that has ever been a boundary: the links never touch or run under the
// key, whatever the platform's font width. Measured on the boxes: from 727 px the last link's text is at least 32 px from the key's outline, from 340 to
// 726 px at least 12 px (the label is in two lines, about 62 x 44 px), below 340 px the key is the square alone in a 44 x 44 px key; always at least 44 x 44 px, with its
// accessible name unchanged and the focus ring not reaching a link, in both themes, on the home page, the page of the shared layer, a legal page and 404.
const WIDTHS = [...new Set([...Array.from({ length: 9 }, (_, i) => 320 + i * 10), 359, 360, 726, 727, 768, 800, 824, 1024, 1180, 1279, 1280])].sort((a, b) => a - b)
const PAGES = ['/', '/megrendeles/', '/munkaim/', '/impresszum/', '/nincs-ilyen', '/a/b/c/']
const MIN_GAP = (width: number) => (width >= 727 ? 32 : 12)

for (const scheme of ['light', 'dark'] as const) {
  for (const url of PAGES) {
    test(`header row: links clear of the key at every width, and its form (H1), ${url}, ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 400, height: 800 } })
      const page = await ctx.newPage()
      await page.goto(url)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('.tkey')).toBeEnabled()
      const worst: string[] = []
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 })
        await page.locator('.tkey').focus({ timeout: 5000 })
        const m = await page.evaluate(() => {
          const links = [...document.querySelectorAll<HTMLElement>('.hdr nav a')]
          const last = links[links.length - 1]!
          const key = document.querySelector<HTMLElement>('.tkey')!
          const sw = key.getBoundingClientRect()
          const label = key.querySelector<HTMLElement>('.tk-l')!
          const lg = document.createRange()
          lg.selectNodeContents(label)
          const labelLines = new Set([...lg.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size
          const r = last.getBoundingClientRect()
          const text = document.createRange()
          text.selectNodeContents(last)
          const t = text.getBoundingClientRect()
          const ring = parseFloat(getComputedStyle(document.querySelector('.tkey')!).outlineWidth) + parseFloat(getComputedStyle(document.querySelector('.tkey')!).outlineOffset) || 0
          const hit = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2)
          const rows = new Set(links.map((l) => Math.round(l.getBoundingClientRect().top)))
          return { keyW: sw.width, keyH: sw.height, labelShown: getComputedStyle(label).display !== 'none', labelLines, name: key.getAttribute('aria-label'), gapBox: sw.left - r.right, gapText: sw.left - t.right, ring, covered: hit !== last && !last.contains(hit), rows: rows.size, overflow: document.documentElement.scrollWidth - innerWidth, headerH: document.querySelector('header')!.getBoundingClientRect().height }
        })
        worst.push(`${width}: ${m.gapBox.toFixed(1)}`)
        expect(m.covered, `${url} ${width}: the last link is covered`).toBe(false)
        expect(m.overflow, `${url} ${width}: horizontal overflow`).toBeLessThanOrEqual(0)
        expect(m.gapText, `${url} ${width}: gap between the last link's text and the key's outline (${worst.join(', ')})`).toBeGreaterThanOrEqual(MIN_GAP(width))
        expect(m.gapBox, `${url} ${width}: gap between the last link's box and the key`).toBeGreaterThanOrEqual(width >= 727 ? 18 : 8)
        // the form: one line from 727 px; two lines of the label in about 62 x 44 px from 340 px; the square alone in 44 x 44 px below
        expect(m.keyW, `${url} ${width}: the key is at least 44 px wide`).toBeGreaterThanOrEqual(44)
        expect(m.keyH, `${url} ${width}: the key is 44 px high`).toBeGreaterThanOrEqual(44)
        if (width >= 727) expect(m.labelLines, `${url} ${width}: one line`).toBe(1)
        else if (width >= 340) {
          expect(m.labelLines, `${url} ${width}: the label in two lines`).toBe(2)
          expect(Math.abs(m.keyW - 62), `${url} ${width}: about 62 px wide`).toBeLessThanOrEqual(2)
        } else {
          expect(m.labelShown, `${url} ${width}: the square alone`).toBe(false)
          expect(Math.abs(m.keyW - 44), `${url} ${width}: 44 px wide`).toBeLessThanOrEqual(1)
        }
        expect(m.name, `${url} ${width}: the accessible name is unchanged`).toMatch(/^(Sötét mód|Dark mode)$/)
        expect(m.rows, `${url} ${width}: the links stay on one row`).toBe(1)
        // the focus ring of the key (3 px, offset 3 px) must not reach the link either
        expect(m.gapBox - m.ring, `${url} ${width}: the key's focus ring clears the link`).toBeGreaterThan(0)
      }
      // A platform whose font is wider (the Linux renderer's Archivo is a little wider than Edge's): 4 % more letter space on the links. They may wrap, never run under the key.
      await page.evaluate(() => {
        const st = document.createElement('style')
        st.id = 'breder'
        st.textContent = '.hdr nav a { letter-spacing: .04em !important }'
        st.disabled = true
        document.head.append(st)
      })
      const headerHeight = () => page.evaluate(() => document.querySelector('header')!.getBoundingClientRect().height)
      for (const width of [320, 360, 400, 800]) {
        await page.setViewportSize({ width, height: 800 })
        await page.evaluate(() => { (document.getElementById('breder') as HTMLStyleElement).disabled = true })
        const normal = await headerHeight() // this width, without the extra letter space
        await page.evaluate(() => { (document.getElementById('breder') as HTMLStyleElement).disabled = false })
        const stress = await page.evaluate(() => {
          const links = [...document.querySelectorAll<HTMLElement>('.hdr nav a')]
          const sw = document.querySelector<HTMLElement>('.tkey')!.getBoundingClientRect()
          return links.map((l) => { const r = l.getBoundingClientRect(); return r.top < sw.bottom && r.bottom > sw.top && r.right > sw.left && r.left < sw.right })
        })
        expect(stress, `${url} ${width}: a wider font must not put a link under the key`).toEqual([false, false, false])
        expect(await headerHeight(), `${url} ${width}: at most one more row of links (this width's normal header is ${normal} px)`).toBeLessThanOrEqual(normal + 44)
      }
      await ctx.close()
    })
  }
}

// The current mark never changes a link's width. On the phone the mark is the 2 px underline in the ::after place, which takes no room: each header link is exactly as
// wide on the home page with a current section (aria-current="location") as on a subpage where no link is current, and as wide with aria-current set by hand as without it.
for (const width of [320, 360]) {
  test(`header links are as wide with aria-current as without it at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const widths = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.hdr nav a')].map((a) => [a.textContent!.trim(), a.getBoundingClientRect().width] as const))
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => document.getElementById('munkak')!.scrollIntoView())
    await expect(page.locator('.hdr nav a[aria-current]')).toHaveCount(1)
    const withCurrent = await widths()
    await page.goto('/impresszum/')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.hdr nav a[aria-current]')).toHaveCount(0)
    const without = await widths()
    expect(withCurrent.map(([t]) => t)).toEqual(without.map(([t]) => t))
    expect(withCurrent.map(([, w]) => w)).toEqual(without.map(([, w]) => w))
    // The same page, every link current in turn: the widths do not move.
    for (let i = 0; i < without.length; i++) {
      await page.evaluate((n) => document.querySelectorAll('.hdr nav a')[n]!.setAttribute('aria-current', 'page'), i)
      expect((await widths()).map(([, w]) => w), `link ${i} current`).toEqual(without.map(([, w]) => w))
      await page.evaluate((n) => document.querySelectorAll('.hdr nav a')[n]!.removeAttribute('aria-current'), i)
    }
  })
}
