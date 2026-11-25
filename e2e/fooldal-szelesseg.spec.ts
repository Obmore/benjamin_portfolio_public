import { expect, type Page } from '@playwright/test'
import { resizeTo, scheme, settled, test } from './sweep'
import { VALLALKOZO } from '../src/content/alapadatok'

// The opening at tablet widths (the wide composition folded below 1024 px, scaled from 1024
// to 1279 px), the contact address, the run control and the works column, light and dark, full and reduced motion. html and body clip
// horizontally (overflow-x: clip), so scrollWidth cannot see overflow: element right edges and Range text rects are measured against the viewport.
const WIDTHS = [727, 740, 767, 768, 800, 834, 870, 900, 960, 1000, 1023, 1024, 1040, 1099, 1100, 1140, 1180, 1199, 1200, 1240, 1279, 1280]
const COMBOS = [
  { colorScheme: 'light', reducedMotion: 'no-preference' },
  { colorScheme: 'dark', reducedMotion: 'reduce' },
] as const

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const rects = (el: Element) => {
      const r = document.createRange()
      r.selectNodeContents(el)
      return [...r.getClientRects()].filter((q) => q.width > 0)
    }
    const lead = rects(document.querySelector('.opening .sub')!)
    const lines = [...document.querySelectorAll('.opening h1 .l')].map((l) => rects(l))
    const text = [...lead, ...lines.flat()]
    if (lead.length === 0 || lines.length !== 3 || lines.some((l) => l.length === 0)) throw new Error('the subline or a headline line has no text rect: the measurement would pass on +-Infinity')
    const ar0 = rects(document.querySelector('#cmz-cim .cmz-t')!)
    if (ar0.length === 0) throw new Error('the address has no text rect')
    const textRight = Math.max(...text.map((q) => q.right))
    const h1Right = Math.max(...lines.flat().map((q) => q.right))
    const subBottom = Math.max(...lead.map((q) => q.bottom))
    const subBox = document.querySelector('.opening .sub')!.getBoundingClientRect()
    // the right cluster: the screen, the actions; the left one: the source and the keys (the visible pair's)
    const devs = document.querySelector('.kij')!.getBoundingClientRect()
    const src = document.querySelector('.sp:not([hidden])')!.getBoundingClientRect()
    const keys = document.querySelector('.keys')!.getBoundingClientRect()
    const acts = document.querySelector('.acts')!.getBoundingClientRect()
    const duct = src
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    const overlap = text.filter((q) => [devs, src, keys, acts].some((b) => intersects(b, q as DOMRect))).length
    const h1 = parseFloat(getComputedStyle(document.querySelector('h1')!).fontSize)
    const h2 = parseFloat(getComputedStyle(document.querySelector('.h2')!).fontSize)
    const addrLink = document.querySelector('#cmz-cim')!
    const ar = rects(addrLink.querySelector('.cmz-t')!)
    const field = document.querySelector('.cmz-mezo')!.getBoundingClientRect()
    const run = [document.querySelector('.runbtn .rt'), document.querySelector('.runlbl')].find((e) => e && e.getClientRects().length)
    const wleft = document.querySelector('.wleft')!.getBoundingClientRect()
    const fig = document.querySelector('.cfig.cw')!.getBoundingClientRect()
    // every visible element of the page against the viewport (the full-width band and the overlay drawings are wider on purpose)
    const past = [...document.querySelectorAll('header *, main *, footer *')]
      .filter((e) => !e.closest('svg, .sav') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
      .filter((e) => e.getBoundingClientRect().right > vw + 0.5)
      .map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`)
    return {
      vw, textRight, h1Right, subBottom, subBoxBottom: subBox.bottom, subLeft: subBox.left, overlap, h1, h2, srcTop: src.top, actsTop: acts.top, actsRight: acts.right, keysRight: keys.right, srcRight: src.right,
      devs: { left: devs.left, right: devs.right, top: devs.top, bottom: devs.bottom, width: devs.width, height: devs.height },
      ductTop: duct.top,
      kijCount: document.querySelectorAll('.kij').length,
      past,
      addr: { lines: new Set(ar.map((q) => Math.round(q.top))).size, left: Math.min(...ar.map((q) => q.left)), right: Math.max(...ar.map((q) => q.right)), size: parseFloat(getComputedStyle(addrLink).fontSize) },
      fieldLeft: field.left,
      fieldRight: field.right,
      runHeight: run ? run.getBoundingClientRect().height : 0,
      wleftWidth: wleft.width,
      room: vw - 46 - (wleft.right + 16),
      figWidth: fig.width,
    }
  })
}

// The opening, address, run control and works column assertions for one measurement: shared by the resized-page sweep and the fresh-load tests.
function expectOpening(m: Awaited<ReturnType<typeof measure>>, width: number, combo: (typeof COMBOS)[number]) {
  const where = `${width} px ${combo.colorScheme}/${combo.reducedMotion}`
  // 1. no overlap, any width: the source, the keys, the screen and the actions cover no text rect of the subline or of the headline
  expect(m.overlap, `${where}: the source, keys, screen or actions cover ${m.overlap} text rects of the subline or the headline`).toBe(0)
  // 4. nothing past the viewport
  expect(m.past, `${where}: visible elements past the viewport`).toEqual([])
  // 5. the address: right edge, font size (the line count is C2 at the end of this file)
  expect(m.addr.right, `${where}: address right edge`).toBeLessThanOrEqual(m.vw - 86 + 1)
  expect(m.fieldRight, `${where}: the field's right edge is inside the content column`).toBeLessThanOrEqual(m.vw - 64 + 1)
  expect(m.addr.size, `${where}: address font size`).toBeGreaterThanOrEqual(width >= 1024 ? 34 : 24)
  // 6. B10: the run control label is one line
  expect(m.runHeight, `${where}: run control label height`).toBeLessThanOrEqual(30)
  if (width <= 1023) {
    // 2. stacked in the phone order: the source 32 px under the subline (the larger type), the screen at the content width
    expect(Math.abs(m.srcTop - m.subBoxBottom - 32), `${where}: the source starts 32 px under the subline's box`).toBeLessThanOrEqual(1)
    expect(Math.abs(m.devs.left - m.subLeft), `${where}: the screen's left edge is the content column's (the subline's)`).toBeLessThanOrEqual(1)
    expect(m.addr.left - m.fieldLeft, `${where}: the address starts inside the field, 12 px or more from its edge`).toBeGreaterThanOrEqual(11.5)
  } else if (width <= 1279) {
    // 3. side by side, H1 52/58 px: the screen's right edge at most on the content's right edge, and the portrait screen (HONLAP, the one measured here) keeps its 250 x 330
    expect(m.devs.left, `${where}: the screen's left edge vs the headline's first line (portrait screen)`).toBeGreaterThanOrEqual(m.h1Right + 24)
    expect(Math.abs(m.devs.width - 250), `${where}: portrait screen width`).toBeLessThanOrEqual(1)
    expect(m.devs.height, `${where}: screen height`).toBeGreaterThanOrEqual(330 - 1)
    expect(m.actsRight, `${where}: the actions end left of the rising line`).toBeLessThanOrEqual(m.devs.right - 76 - 12)
    expect(m.h1, `${where}: headline size (exactly 48 px from 1024 to 1099 so that it clears the landscape screen, exactly 52 px after)`).toBe(width <= 1099 ? 48 : 52)
  }
  if (width <= 1199) expect(m.h1, `${where}: headline vs H2 + 8`).toBeGreaterThanOrEqual(m.h2 + 8)
  if (width <= 899) {
    // 6. B11: the card column and the controller figure
    expect(m.wleftWidth, `${where}: card column`).toBeGreaterThanOrEqual(248)
    expect(m.figWidth, `${where}: controller figure width (room ${Math.round(m.room)})`).toBeGreaterThanOrEqual(300)
  }
}

for (const width of WIDTHS) {
  test(`opening, address, run control and works column at ${width} px (light/full and dark/reduced)`, async ({ homeFull, homeReduced }) => {
    for (const [combo, page] of [[COMBOS[0], homeFull], [COMBOS[1], homeReduced]] as const) {
      await resizeTo(page, width)
      await scheme(page, combo.colorScheme)
      const m = await settled(page, () => measure(page))
      expectOpening(m, width, combo)
    }
  })
}

// A page loaded fresh at the width (the load sequence, the width decisions taken when the script starts, dark at load), one test per band and combination.
for (const width of [360, 768, 1100, 1280]) {
  for (const combo of COMBOS) {
    test(`a page loaded fresh at ${width} px (${combo.colorScheme}/${combo.reducedMotion}): the opening, address, run control and works column, nothing past the viewport`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...combo })
      try {
        const page = await ctx.newPage()
        await page.goto('/')
        await expect(page.locator('html')).toHaveClass(/jel-vege/)
        const m = await settled(page, () => measure(page))
        if (width >= 727) expectOpening(m, width, combo)   // the tablet and desktop rules of the sweep above
        else {
          // the phone form: the rules of the phone sweep below (its own rows, one address line, nothing past the viewport)
          await expect(page.locator('.keys'), `${width} px: the keys`).toBeVisible()
          expect(await page.locator('.keys').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length), `${width} px: one row of four keys`).toBe(4)
          expect(m.addr.lines, `${width} px fresh load: address lines`).toBe(1)
          // the checks of the sweep above that hold below 727 px too (the address size and right edge do not: the phone CSS sizes and pads it differently)
          expect(m.runHeight, `${width} px fresh load: run control label height`).toBeLessThanOrEqual(30)
          expect(m.textRight, `${width} px fresh load: lead and headline text inside the viewport`).toBeLessThanOrEqual(m.vw)
        }
        expect(m.past, `${width} px fresh load: visible elements past the viewport`).toEqual([])
      } finally {
        await ctx.close()
      }
    })
  }
}

// The headline's size is a step of the scale, not a curve: 52/58 px from 727 to 1279 px, 64/68 px from 1280 px, three line boxes at every width; the screen's
// right edge is the same at 1279 and 1280 within the margin the rule gives it (49 px at 1280, 0 at 1024).
test('the headline is 64/68 px from 1280 px and 52/58 px below, in three lines; the screen sits where the rule puts it', async ({ homeFull: page }) => {
  await scheme(page, 'light')   // the shared page: no scheme left over from another test
  const got: Record<number, { h1: number; right: number }> = {}
  for (const width of [727, 1024, 1279, 1280]) {
    await resizeTo(page, width)
    const m = await settled(page, () => measure(page))
    got[width] = { h1: m.h1, right: m.devs.right }
  }
  expect(got[727]!.h1).toBe(52)
  expect(got[1279]!.h1).toBe(52)
  expect(got[1280]!.h1).toBe(64)
  expect(Math.abs(got[1280]!.right - (1280 - 64 - 49)), 'the screen\'s right edge at 1280').toBeLessThanOrEqual(1)
  expect(Math.abs(got[1024]!.right - (1024 - 64)), 'the screen\'s right edge at 1024 sits on the content\'s right edge').toBeLessThanOrEqual(1)
})

// The answered field's underline is exact: it starts at the terminal on the field's left edge and ends 8 px before the key cell's rule (key cell beside the
// address) or 12 px before the field's right edge (key cell a second row), and it spans the address text either way. The cell's place tells which, from the layout.
for (const width of [727, 768, 1000, 1024, 1180]) {
  test(`the answered field's underline starts at the terminal and ends where the spec says at ${width} px`, async ({ homeFull: page }) => {
    await scheme(page, 'light')
    await resizeTo(page, width)
    await page.locator('.cmz-mezo').scrollIntoViewIfNeeded()
    await page.locator('.cmz-gomb').click()
    try {
      await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
      await expect.poll(() => page.locator('.cmz-ul').evaluate((p) => parseFloat((p as SVGElement).style.strokeDashoffset)), { timeout: 2000 }).toBeLessThan(0.5)
      // the underline's geometry has settled (two equal reads), not a fixed time later
      const e = await settled(page, () => page.evaluate(() => {
        const path = document.querySelector('.cmz-ul') as unknown as SVGGeometryElement
        const m = path.getScreenCTM()!
        const L = path.getTotalLength()
        const g = document.createRange()
        g.selectNodeContents(document.querySelector('#cmz-cim .cmz-t')!)
        const text = [...g.getClientRects()].filter((q) => q.width > 0)
        const kc = document.querySelector('.cmz-kc')!.getBoundingClientRect()
        const field = document.querySelector('.cmz-mezo')!.getBoundingClientRect()
        const cim = document.querySelector('.cmz-cim')!.getBoundingClientRect()
        const node = document.querySelector('.cmz-ter-be')!.getBoundingClientRect()
        // the layout rule (cimmezo.css): one row from 840 px of the column, stacked below that
        const row = (document.querySelector('.cmz') as HTMLElement).clientWidth >= 840
        return {
          placed: Math.abs(kc.top - (row ? cim.top : cim.bottom)),
          left: m.a * path.getPointAtLength(0).x + m.e, right: m.a * path.getPointAtLength(L).x + m.e, nodeX: node.left + node.width / 2,
          aRight: Math.max(...text.map((q) => q.right)), aLeft: Math.min(...text.map((q) => q.left)),
          want: row ? kc.left - 8 : field.right - 12,
        }
      }))
      expect(e.placed, 'the key cell is where the layout rule puts it').toBeLessThanOrEqual(2)
      expect(Math.abs(e.left - e.nodeX), `underline left ${e.left} vs the terminal ${e.nodeX}`).toBeLessThanOrEqual(1)
      expect(Math.abs(e.right - e.want), `underline right ${e.right} vs ${e.want}`).toBeLessThanOrEqual(1)
      expect(e.left, `underline left ${e.left} vs address ${e.aLeft}`).toBeLessThanOrEqual(e.aLeft + 0.5)
      expect(e.right, `underline right ${e.right} vs address ${e.aRight}`).toBeGreaterThanOrEqual(e.aRight - 0.5)
    } finally {
      // back to the state the other sweeps expect, also after a failed assertion: the answer is taken back after four seconds
      await expect(page.locator('.cmz')).not.toHaveAttribute('data-st', /.+/, { timeout: 6500 })
    }
  })
}

// 7. the phone form (320-726 px: from 727 px the card column and a 300 px figure fit side by side) and the wide form from 1280
for (const width of [320, 360, 390, 600, 699, 700, 720, 726, 1280, 1440]) {
  test(`nothing is past the viewport and the address is one line at ${width} px`, async ({ homeFull: page }) => {
    await scheme(page, 'light')
    await resizeTo(page, width)
    // which layout is active: the phone rows up to 726 px, the wide rows from 727 px
    const phone = width <= 726
    expect(await page.locator('.keys').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length), `${width} px: one row of four keys on a phone, a 2 x 2 block from 1024`).toBe(width >= 1024 ? 2 : 4)
    expect(await page.locator('.sav').evaluate((e) => e.getBoundingClientRect().height), `${width} px: the band's height`).toBe(phone ? 120 : width <= 1023 ? 170 : 228)
    const past = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      return [...document.querySelectorAll('header *, main *, footer *')]
        .filter((e) => !e.closest('svg, .sav') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
        .filter((e) => e.getBoundingClientRect().right > vw + 0.5)
        .map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`)
    })
    expect(past).toEqual([])
  })
}

// C2: the address is one line and at least 14 px from 360 px up; at 320 px it has at most two lines and the one break is exactly before the "@" (the owner's
// rule of 2026-11-18, replacing "one line at 320"); the whole address is the link's text and its mailto at every width.
for (const width of [320, 340, 359, 360, 390, 480, 600, 726, 727, 1024, 1280]) {
  test(`C2: the address in the field is one line from 360 px, breaks only before the "@" below, and is the whole address at ${width} px`, async ({ homeFull: page }) => {
    await scheme(page, 'light')
    await resizeTo(page, width)
    const m = await settled(page, () => page.evaluate(() => {
      const a = document.querySelector('#cmz-cim') as HTMLAnchorElement
      const chars: { c: string; top: number }[] = []
      const walker = document.createTreeWalker(document.querySelector('.cmz-t')!, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n as Text
        for (let i = 0; i < t.length; i++) {
          const r = document.createRange()
          r.setStart(t, i)
          r.setEnd(t, i + 1)
          chars.push({ c: t.data[i]!, top: Math.round(r.getClientRects()[0]!.top) })
        }
      }
      const field = document.querySelector('.cmz-mezo')!.getBoundingClientRect()
      return {
        lines: new Set(chars.map((x) => x.top)).size,
        breaks: chars.filter((x, i) => i > 0 && x.top > chars[i - 1]!.top + 2).map((x) => x.c),
        size: parseFloat(getComputedStyle(a).fontSize),
        text: a.textContent,
        href: a.getAttribute('href'),
        fieldRight: field.right,
        vw: document.documentElement.clientWidth,
      }
    }))
    expect(m.text, `${width} px: the whole address is the link's text`).toBe(VALLALKOZO.email)
    expect(m.href, `${width} px: and its mailto`).toBe(`mailto:${VALLALKOZO.email}`)
    expect(m.fieldRight, `${width} px: the field is inside the viewport`).toBeLessThanOrEqual(m.vw)
    if (width >= 360) {
      expect(m.lines, `${width} px: one line`).toBe(1)
      expect(m.size, `${width} px: at least 14 px`).toBeGreaterThanOrEqual(14)
    } else {
      expect(m.lines, `${width} px: at most two lines`).toBeLessThanOrEqual(2)
      expect(m.breaks, `${width} px: the one break, if any, is exactly before the "@"`).toEqual(m.lines === 2 ? ['@'] : [])
    }
  })
}
