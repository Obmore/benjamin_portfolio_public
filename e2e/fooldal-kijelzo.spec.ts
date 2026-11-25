import { expect, test, type Page } from '@playwright/test'

// The first screen's clearances (art director's ruling 34, H1 and H2) and the Gépadat card at the deadline (H3). Measured on the page's own boxes and text rects.
const PAROK = ['honlap', 'rendeles', 'gepkonyv', 'gepadat'] as const
const T0 = new Date('2026-11-16T10:00:00Z')

async function openAt(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('html')).toHaveClass(/jel-kesz/)
  await page.evaluate(() => document.fonts.ready)
}
async function pick(page: Page, p: string) {
  await page.locator(`.key-gomb[data-p="${p}"]`).click()
  await expect(page.locator(`.key-gomb[data-p="${p}"]`)).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator(`.sp[data-p="${p}"]`)).toBeVisible()
}

test.describe('first screen clearances', () => {
  test.use({ reducedMotion: 'reduce' })
  for (const width of [1024, 1099, 1100, 1207, 1208, 1280]) {
    test(`${width}: the headline ends 24 px or more left of the screen, the keys stand 48 px (96 from 1208) clear of the actions, the key labels keep 8 px`, async ({ page }) => {
      await openAt(page, width)
      for (const p of PAROK) {
        await pick(page, p)
        const m = await page.evaluate(() => {
          const rg = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].filter((q) => q.width > 0) }
          const h1Right = Math.max(...[...document.querySelectorAll('.opening h1 .l')].flatMap((l) => rg(l).map((q) => q.right)))
          const kij = document.querySelector('.kij')!.getBoundingClientRect()
          const keys = { right: Math.max(...[...document.querySelectorAll('.key-gomb')].map((k) => k.getBoundingClientRect().right)) }
          const actsLeft = Math.min(...[...document.querySelectorAll('.acts-gomb, .acts-link')].map((a) => a.getBoundingClientRect().left))
          const cols = getComputedStyle(document.querySelector('.keys')!).gridTemplateColumns.split(' ').length
          const pad = [...document.querySelectorAll('.key-gomb')].map((k) => { const r = k.getBoundingClientRect(); return r.right - Math.max(...rg(k).map((q) => q.right)) })
          return { h1Right, kijLeft: kij.left, keysRight: keys.right, actsLeft, cols, pad }
        })
        const where = `${width} px ${p}`
        expect(m.kijLeft - m.h1Right, `${where}: headline to screen`).toBeGreaterThanOrEqual(24)
        expect(m.actsLeft - m.keysRight, `${where}: keys to actions`).toBeGreaterThanOrEqual(width >= 1208 ? 96 : 48)
        expect(m.cols, `${where}: the keys are ${width >= 1208 ? 'a 2 x 2 block' : 'one column'}`).toBe(width >= 1208 ? 2 : 1)
        for (const q of m.pad) expect(q, `${where}: key label to the key's outline`).toBeGreaterThanOrEqual(8)
      }
    })
  }

  for (const width of [1024, 1100, 1180, 1280]) {
    test(`${width}: the reading and the single-recording label never separate (equal tops), and sit right-aligned in the row`, async ({ page }) => {
      await openAt(page, width)
      for (const p of PAROK) {
        await pick(page, p)
        const m = await page.evaluate(() => {
          const R = (q: string) => document.querySelector(q)!.getBoundingClientRect()
          const row = R('.ctl-row')
          const label = R('.runlbl')
          return { readingTop: R('.ctl-row .reading').top, labelMid: (label.top + label.bottom) / 2, readingMid: (R('.ctl-row .reading').top + R('.ctl-row .reading').bottom) / 2, labelRight: label.right, rowRight: row.right }
        })
        expect(Math.abs(m.labelMid - m.readingMid), `${width} px ${p}: the reading and the label share a line`).toBeLessThanOrEqual(6)
        expect(m.rowRight - m.labelRight, `${width} px ${p}: the control ends on the row's right edge`).toBeLessThanOrEqual(6)
      }
    })
  }

  test('1280 x 900: the readout is one line and its row ends above the fold for every pair', async ({ page }) => {
    await openAt(page, 1280, 900)
    for (const p of PAROK) {
      await pick(page, p)
      const m = await page.evaluate(() => {
        const ro = document.querySelector('.readout')!
        const r = document.createRange(); r.selectNodeContents(ro)
        return { lines: new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size, bottom: document.querySelector('.ctl-row')!.getBoundingClientRect().bottom }
      })
      expect(m.lines, `${p}: one line`).toBe(1)
      expect(m.bottom, `${p}: the row's bottom`).toBeLessThanOrEqual(896)
    }
  })
})

test.describe('the Gépadat card at the deadline', () => {
  test('1200 ms after the key the card is whole: nothing hides it, head, card and readout show one value', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.clock.install({ time: T0 })
    await page.clock.pauseAt(new Date(T0.getTime() + 1000))
    await page.goto('/', { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    for (let t = 0; t < 2300; t += 50) await page.clock.runFor(50)
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    for (let t = 0; t < 1200; t += 50) await page.clock.runFor(50)
    const m = await page.evaluate(() => {
      const gk = document.querySelector('.gk')!.getBoundingClientRect()
      const kt = document.querySelector('.kij-test') as HTMLElement
      const cell = document.querySelector('[data-hom]')!
      const vis = (e: Element) => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.95 }
      return {
        h: gk.height,
        w: gk.width,
        clip: getComputedStyle(kt).clipPath,
        anims: kt.getAnimations().length,
        shown: vis(document.querySelector('.gk')!) && vis(kt) && vis(document.querySelector('.gk-trend')!),
        trend: document.querySelector('[data-trend]')!.getAttribute('d')!.length,
        termBg: getComputedStyle(document.querySelector('.term')!).backgroundColor,
        be: (() => { const i = document.createElement('i'); i.style.color = 'var(--be)'; document.body.appendChild(i); const c = getComputedStyle(i).color; i.remove(); return c })(),
        values: [document.querySelector('.kij-olv')!.textContent, document.querySelector('.ctl-row .reading')!.textContent, cell.textContent],
      }
    })
    expect(m.h).toBeGreaterThan(200)
    expect(m.clip, 'no clip hides a part of the screen').toBe('none')
    expect(m.anims, 'no reveal is still running over the screen').toBe(0)
    expect(m.shown, 'card, body and trend are fully visible').toBe(true)
    expect(m.trend, 'the trend is drawn').toBeGreaterThan(20)
    expect(m.termBg, 'the terminal is filled whole at the deadline').toBe(m.be)
    expect(new Set(m.values).size, `one value in the head, the readout and the cell: ${m.values.join(' | ')}`).toBe(1)
  })
})

test.describe('the first screen without script is the script\'s resting drawing (M4)', () => {
  test.use({ javaScriptEnabled: false })
  for (const width of [1280, 1024, 768, 360, 320]) {
    test(`${width}: a lane, the trace at rest size inside the band, the turn into the lit terminal`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/', { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      const m = await page.evaluate(() => {
        const R = (e: Element) => e.getBoundingClientRect()
        const lane = document.querySelector('.lane-ssr')!
        const svg = [...document.querySelectorAll('.sav .fz-ssr')].find((e) => getComputedStyle(e).display !== 'none')!
        const sav = R(document.querySelector('.sav')!)
        const term = document.querySelector('.term')!
        const t = R(term)
        const path = svg.querySelector('path.ln') as SVGPathElement
        const bb = path.getBBox()
        const vb = (svg as SVGSVGElement).viewBox.baseVal
        const turn = getComputedStyle(document.querySelector('.sav')!, '::after')
        const sr = R(svg)
        const hdrLane = R(document.querySelector('.hdr .lane')!)
        const low = vb.height > 200 ? vb.height - 30 : vb.height - 14
        const probe = document.createElement('i')
        probe.style.color = 'var(--be)'
        document.body.appendChild(probe)
        const be = getComputedStyle(probe).color
        probe.remove()
        return {
          laneW: R(lane).width, laneH: R(lane).height, laneX: R(lane).left + R(lane).width / 2, markX: hdrLane.left + hdrLane.width / 2,
          peak: Math.max(0, low - bb.y),
          svgRight: sr.right, savRight: sav.right, termX: t.left + t.width / 2, termBg: getComputedStyle(term).backgroundColor, be,
          turnW: parseFloat(turn.width),
          squares: [...document.querySelectorAll('.opening .adl-bel')].map((e) => getComputedStyle(e).display),
        }
      })
      expect(m.laneW, 'a lane box').toBeGreaterThanOrEqual(3)
      expect(m.laneH, 'the lane runs the height of the opening').toBeGreaterThan(400)
      expect(Math.abs(m.laneX - m.markX), 'the lane is under the mark').toBeLessThanOrEqual(1.5)
      expect(m.peak, 'the speech peaks are at most 40 px (32 on a phone) high').toBeLessThanOrEqual(width <= 726 ? 32.5 : 40.5)
      expect(Math.abs(m.svgRight - m.termX), 'the trace ends on the terminal').toBeLessThanOrEqual(1.5)
      expect(m.svgRight, 'the trace stays inside the band box').toBeLessThanOrEqual(m.savRight)
      expect(m.termBg, 'the terminal is lit').toBe(m.be)
      expect(m.turnW, 'the turn is a bar').toBeGreaterThanOrEqual(2.5)
      expect(m.squares.length, 'the panels have their entry squares in the markup').toBeGreaterThan(0)
      expect(m.squares.every((d) => d === 'none'), 'no entry square without a tap to it (no script draws none)').toBe(true)
    })
  }
})
