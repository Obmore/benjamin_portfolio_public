import { expect } from '@playwright/test'
import { resizeTo, scheme, test } from './sweep'

// Wires that must not cross text: the controller cable in the folded band (B12), the key and the idle wire that is gone, on a
// phone (B13, N10) and the earth symbol on the spine (B14). Measured from path geometry and Range text rects, not from screenshots.
const COMBOS = [{ colorScheme: 'light' }, { colorScheme: 'dark' }] as const

// ---------- B12 ----------
for (const width of [360, 727, 768, 800, 834, 870, 900, 960, 1023]) {
  test(`the cable and its reading keep 12 px from the card, the list and the link, five selections, at ${width} px`, async ({ homeReduced: page }) => {
    const initial = await page.locator('.wl button[aria-checked="true"]').getAttribute('data-wi')   // the shared page keeps its default selection
    try {
    {
      await resizeTo(page, width)
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => document.querySelector('.allw')!.scrollIntoView({ block: 'center' }))
        await page.locator(`.wl button[data-wi="${i}"]`).click()
        await page.evaluate(() => document.querySelector('.run')!.scrollIntoView({ block: 'center' }))
        await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.run .tick')!).opacity)), { timeout: 5000 }).toBe(1)
        // the swap has ended: the old trace is gone and no finite transition is still running
        await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length === 0 && document.querySelectorAll('.run .tsvg').length === 1), { timeout: 5000 }).toBe(true)
        // one selection, measured in both colour schemes (the geometry does not depend on them, the assertions are the same in each)
        for (const combo of COMBOS) {
        await scheme(page, combo.colorScheme)
        const r = await page.evaluate(() => {
          const infl = (q: DOMRect | { left: number; top: number; right: number; bottom: number }) => ({ left: q.left - 12, top: q.top - 12, right: q.right + 12, bottom: q.bottom + 12 })
          const rectsOf = (el: Element) => { const g = document.createRange(); g.selectNodeContents(el); return [...g.getClientRects()].filter((q) => q.width > 0) }
          const obstacles = [
            ...document.querySelectorAll('.dview, .wl button, .allw a'),
          ].map((e) => e.getBoundingClientRect()).map(infl)
          const inside = (x: number, y: number) => obstacles.some((o) => x > o.left && x < o.right && y > o.top && y < o.bottom)
          const hits: string[] = []
          const paths = [...document.querySelectorAll('.run-svg path, .run .tsvg path.ln:not(.heat)')] as SVGGeometryElement[]
          let samples = 0
          const linkBottom = document.querySelector('.allw a')!.getBoundingClientRect().bottom
          let levelY = Infinity
          for (const p of paths) {
            const m = (p as SVGGraphicsElement).getScreenCTM()!
            const L = p.getTotalLength()
            for (let d = 0; d <= L; d += 4) {
              const pt = p.getPointAtLength(d)
              const x = m.a * pt.x + m.c * pt.y + m.e
              const y = m.b * pt.x + m.d * pt.y + m.f
              samples++
              if (d === 0 && p.closest('.run-svg')) levelY = y   // the cable path starts at the end of the trace (M x1 endY) and runs level before it rises: its first point is the level run
              if (inside(x, y)) { hits.push(`${p.getAttribute('class')} at ${Math.round(x)},${Math.round(y)}`); break }
            }
          }
          const readingEl = document.querySelector('.run .reading')!
          const reading = [...rectsOf(readingEl)].filter((q) => q.width > 0)
          for (const q of reading) if (obstacles.some((o) => q.left < o.right && q.right > o.left && q.top < o.bottom && q.bottom > o.top)) hits.push('reading')
          // the cut-length labels of the cable (Lapszabászati): none overlaps another or any text of the card, the list or the link
          const labels = [...document.querySelectorAll('.run .lbl')].map((e) => e.getBoundingClientRect())
          for (let a = 0; a < labels.length; a++) {
            for (let b = a + 1; b < labels.length; b++) {
              const A = labels[a]!, B = labels[b]!
              if (A.left < B.right && A.right > B.left && A.top < B.bottom && A.bottom > B.top) hits.push(`labels ${a} and ${b} overlap`)
            }
            if (obstacles.some((o) => labels[a]!.left < o.right && labels[a]!.right > o.left && labels[a]!.top < o.bottom && labels[a]!.bottom > o.top)) hits.push(`label ${a} near the card`)
          }
          return { hits, samples, readingRects: reading.length, readingText: readingEl.textContent ?? '', levelY, linkBottom, labels: labels.length, labelTexts: [...document.querySelectorAll('.run .lbl')].map((e) => e.textContent) }
        })
        expect(r.samples, `${width} px work ${i}: path samples measured`).toBeGreaterThan(0)
        expect(r.readingRects > 0 || r.readingText === '', `${width} px work ${i}: the reading has a rect when it has text`).toBe(true)
        if (i === 1) { expect(r.labels, `${width} px: the cut-length labels are drawn`).toBe(2); expect(r.labelTexts, 'the labels are the lengths of the two parts of the demo sample (720 x 400 and 564 x 380 mm), none invented, the 400 mm width is no block').toEqual(['720 mm', '564 mm']) }
        if (width < 1024 && width > 726) expect(Number.isFinite(r.levelY), `${width} px work ${i}: the cable level run was measured`).toBe(true)
        if (width < 1024 && width > 726) expect(r.levelY, `${width} px work ${i}: cable level run ${Math.round(r.levelY)} vs the link bottom ${Math.round(r.linkBottom)} + 32`).toBeGreaterThanOrEqual(r.linkBottom + 32 - 1)
        expect(r.hits, `${width} px ${combo.colorScheme}, work ${i}: cable/trace/reading/labels within 12 px of the card, list or link, or labels overlapping`).toEqual([])
        }
      }
    }
    } finally {
      if (initial !== null) await page.locator(`.wl button[data-wi="${initial}"]`).click()
    }
  })
}

// ---------- B13 / N10, now H4 ----------
// The main switch and its idle wire are gone: no wire, handle, dial or legend of it is in the DOM, and the "Sötét mód" key (its box with the focus ring included)
// intersects no text of the header or of the opening, on a phone and up to 726 px.
for (const width of [320, 360, 390, 403, 404, 430, 480, 540, 600, 660, 726]) {
  test(`no idle wire or switch drawing exists, and the key's box with its focus ring touches no text at ${width} px`, async ({ homeFull: page }) => {
    for (const combo of COMBOS) {
      await resizeTo(page, width)
      await scheme(page, combo.colorScheme)
      await page.locator('.tkey').focus()
      const r = await page.evaluate(() => {
        const key = document.querySelector('.tkey') as HTMLElement
        const cs = getComputedStyle(key)
        const ring = (parseFloat(cs.outlineWidth) || 0) + (parseFloat(cs.outlineOffset) || 0)
        const k = key.getBoundingClientRect()
        const text = [...document.querySelectorAll('.opening .sub, .opening h1 .l, .hdr nav a')].flatMap((e) => { const g = document.createRange(); g.selectNodeContents(e); return [...g.getClientRects()].filter((q) => q.width > 0) })
        const hit = text.filter((q) => q.left < k.right + ring && q.right > k.left - ring && q.top < k.bottom + ring && q.bottom > k.top - ring).length
        return {
          textCount: text.length, hit, ring,
          wire: document.querySelectorAll('.opn-svg path.supply, .opn-svg .ln.idle.supply').length,
          oldSwitch: document.querySelectorAll('.msw, .msv').length,
          // the overlay's shapes, counted (so the check sees something), and any shape or element of the removed duct / device rail
          drawn: [...document.querySelectorAll('.opn-svg path, .opn-svg circle, .opn-svg rect')].length,
          duct: document.querySelectorAll('.ductrow, .opn-svg [class*="duct" i], .opn-svg [class*="rail" i], .opn-svg [data-duct]').length,
        }
      })
      const where = `${width} px ${combo.colorScheme}`
      expect(r.textCount, `${where}: text rects`).toBeGreaterThan(0)
      expect(r.wire, `${where}: no idle wire from the header`).toBe(0)
      expect(r.oldSwitch, `${where}: nothing of the rotary switch is drawn`).toBe(0)
      expect(r.hit, `${where}: text rects touched by the key and its focus ring (${r.ring} px)`).toBe(0)
      // the duct went with the device rail: the overlay is drawn (so the check sees something) and holds no shape of it
      expect(r.drawn, `${where}: the overlay is drawn`).toBeGreaterThan(3)
      expect(r.duct, `${where}: no shape or row of the removed duct`).toBe(0)
    }
  })
}

// ---------- B14 ----------
for (const width of [320, 360, 480, 600, 726, 727, 768, 800, 871, 872, 1024, 1180, 1280]) {
  test(`the earth bars are centred on the spine's x and clear of the footer text at ${width} px`, async ({ homeReduced: page }) => {
    await resizeTo(page, width)
    await scheme(page, 'light')   // the shared page: no scheme left over from another test
    const r = await page.evaluate(() => {
      const spine = document.querySelector('.spine-svg > path.pen-r') as SVGGeometryElement
      const sm = (spine as SVGGraphicsElement).getScreenCTM()!
      const end = spine.getPointAtLength(spine.getTotalLength())
      const spineX = sm.a * end.x + sm.c * end.y + sm.e
      const spineEndY = sm.b * end.x + sm.d * end.y + sm.f
      const bars = [...document.querySelectorAll('.earth-svg path')].map((p) => { const m = (p as SVGGraphicsElement).getScreenCTM()!; const b = (p as SVGGraphicsElement).getBBox(); return { cx: m.a * (b.x + b.width / 2) + m.e, top: m.d * b.y + m.f, left: m.a * b.x + m.e, right: m.a * (b.x + b.width) + m.e, bottom: m.d * (b.y + b.height) + m.f } })
      const g = document.createRange(); g.selectNodeContents(document.querySelector('.fdata p')!)
      const first = [...g.getClientRects()].filter((q) => q.width > 0)[0]!
      const clearX = first.left - Math.max(...bars.map((b) => b.right))
      const clearY = Math.min(...bars.map((b) => first.top - b.bottom).filter((v) => v > -1e9), 1e9)
      return { spineX, spineEndY, bars, clearX, clearY, topBarTop: bars[0]!.top }
    })
    expect(r.bars.length).toBe(3)
    for (const b of r.bars) expect(Math.abs(b.cx - r.spineX), `bar centre ${b.cx} vs spine ${r.spineX}`).toBeLessThanOrEqual(1)
    expect(Math.abs(r.topBarTop - r.spineEndY), `top bar ${r.topBarTop} touches the spine's end ${r.spineEndY}`).toBeLessThanOrEqual(3)
    // 12 px from the footer's first line: sideways, or the bars end above its top
    const lowest = Math.max(...r.bars.map((b) => b.bottom))
    expect(r.clearX >= 12 || r.clearY >= 12, `earth vs the first footer line: sideways ${Math.round(r.clearX)} px, above ${Math.round(r.clearY)} px (lowest bar ${Math.round(lowest)})`).toBe(true)
  })
}
