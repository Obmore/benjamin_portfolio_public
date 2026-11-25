import { expect, type Page } from '@playwright/test'
import { frames, resizeTo, scheme, settled, test } from './sweep'
// The home page's measured checks (the tap, the lane to earth, the lamp group's place, the lane and node geometry), plus the reduced-motion resting state.
// Each test sets what it needs (width, colour scheme) and puts back what it changes; the pages are the worker-scoped ones of sweep.ts.

const wait = (page: Page, ms: number) => page.waitForTimeout(ms)
/** The hot colour as sRGB (painted on a 1x1 canvas, so an oklch() computed value in the P3 block is resolved by the engine). */
const hotRgb = (page: Page) => page.evaluate(() => {
  const i = document.createElement('i'); i.style.color = 'var(--jel-forro)'; document.body.append(i)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const g = cv.getContext('2d', { willReadFrequently: true })!; g.fillStyle = getComputedStyle(i).color; g.fillRect(0, 0, 1, 1)
  i.remove()
  return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3)
}).then((rgb) => { expect(rgb, 'the canvas accepted the hot colour (a rejected string leaves black)').not.toEqual([0, 0, 0]); return rgb })

async function pickWork(page: Page, i: number) {
  await page.locator(`.wl button[data-wi="${i}"]`).evaluate((b) => (b as HTMLElement).click())
  await frames(page, 3)
}
const listTop = (page: Page) => page.evaluate(() => Math.round((document.querySelector('.wl')!.getBoundingClientRect().top + window.scrollY) * 10) / 10)

test.describe('works (reduced motion page)', () => {
  for (const width of [360, 768, 1024, 1280]) {
    test(`B4: the works list top edge does not move across the five selections and the planned slot at ${width} px`, async ({ homeReduced: page }) => {
      await resizeTo(page, width)
      const tops: number[] = []
      for (const i of [0, 1, 2, 3, 4, 5]) {
        await pickWork(page, i)
        tops.push(await settled(page, () => listTop(page)))
      }
      await pickWork(page, 2)
      expect(new Set(tops).size, `list tops ${tops.join(', ')}`).toBe(1)
    })
  }

  // B13: one more row after the last real work; selected, the detail view's head label is "Tervezett", its picture area is empty, its caption is the one string
  // and one text link to the contact end; no trace and no reading on the cable run and no signal colour on it; the controller keeps its five keys.
  for (const width of [360, 768, 1024, 1280]) {
    test(`B13: the planned slot at ${width} px: empty picture area, head label, caption and one link; what follows it stays at the same y; no trace, reading or signal colour on the cable`, async ({ homeReduced: page }) => {
      await resizeTo(page, width)
      try {
        const below = () => page.evaluate(() => Math.round((document.querySelector('.allw')!.getBoundingClientRect().top + window.scrollY) * 10) / 10)
        await pickWork(page, 2)
        const y0 = await settled(page, below)
        await pickWork(page, 5)
        await expect(page.locator('.dv-fej')).toHaveText('Tervezett')
        await expect(page.locator('.dv-t')).toHaveText('A következő: az Öné.')
        await expect(page.locator('.dv-link')).toHaveText('Kapcsolat')
        await expect(page.locator('.dv-link')).toHaveAttribute('href', '#kapcsolat')
        expect(await page.locator('.dv-s').evaluate((e) => getComputedStyle(e).display), 'no sentence').toBe('none')
        await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.run .tsvg path.ln')].filter((p) => parseFloat(getComputedStyle(p).opacity) > 0.01).length), { message: 'the outgoing trace has left' }).toBe(0)
        const m = await page.evaluate(() => {
          const box = document.querySelector('.dv-box')!
          const imgs = [...box.querySelectorAll('img')].filter((i) => !i.hidden && getComputedStyle(i).display !== 'none')
          const trace = document.querySelector('.dv-trace') as SVGElement
          const view = getComputedStyle(document.querySelector('.dview')!)
          const run = document.querySelector('.run')!
          const heads = [...document.querySelectorAll('.run .tsvg path.ln')].filter((p) => parseFloat(getComputedStyle(p).opacity) > 0.01)
          const cable = [...document.querySelectorAll('.run .run-svg path')].map((p) => getComputedStyle(p).stroke)
          const probe = document.createElement('i'); probe.style.color = 'var(--jel)'; document.body.append(probe); const jel = getComputedStyle(probe).color; probe.remove()
          return {
            imgs: imgs.length, traceShown: trace && getComputedStyle(trace).display !== 'none', borderStyle: view.borderTopStyle,
            reading: (run.querySelector('.reading') as HTMLElement).textContent, headReading: document.querySelector('.dv-hd .mono')!.textContent,
            tracePaths: heads.length, cable, jel, keys: document.querySelectorAll('.cfig.cw .key').length / 2, lcdTr: [...document.querySelectorAll('.cfig .lcd-tr')].filter((t) => (t as SVGElement).style.display !== 'none').length,
            boxText: box.textContent!.trim(),
          }
        })
        expect(m.imgs, 'the picture area is empty').toBe(0)
        expect(m.traceShown, 'no trace in the picture area').toBe(false)
        expect(m.boxText).toBe('')
        expect(m.borderStyle, 'a solid outline: no dashed outline reaches the page').toBe('solid')
        expect(m.reading, 'no reading on the cable run').toBe('')
        expect(m.headReading, 'no reading in the head row').toBe('')
        expect(m.tracePaths, 'no trace on the cable run').toBe(0)
        for (const c of m.cable) expect(c, 'no signal colour on the cable run').not.toBe(m.jel)
        expect(m.keys, 'the controller keeps its five keys').toBe(5)
        expect(m.lcdTr, 'the controller screens show no trace').toBe(0)
        expect(await settled(page, below), 'what follows the detail view does not move (0 px)').toBe(y0)
      } finally {
        await pickWork(page, 2)
      }
    })
  }

  test('the work without a picture shows its own trace: a rule at 62 %, the reading in the head row, the title once', async ({ homeNoPicture: page }) => {
    await resizeTo(page, 1280)
    await pickWork(page, 3)
    try {
      const m = await page.evaluate(() => {
        const box = document.querySelector('.dv-box')!.getBoundingClientRect()
        const rule = document.querySelector('.dv-rule')!.getBoundingClientRect()
        const line = document.querySelector('.dv-trace path.ln') as SVGGeometryElement
        return { ruleY: (rule.top - box.top) / box.height, hasD: (line.getAttribute('d') ?? '').length > 50, head: document.querySelector('.dv-hd .mono')!.textContent, titles: document.body.innerText.split('Rollin Technologies').length - 1 }
      })
      expect(m.ruleY).toBeGreaterThan(0.61)
      expect(m.ruleY).toBeLessThan(0.63)
      expect(m.hasD).toBe(true)
      expect(m.head, 'no invented charge voltage').toBe('')
      // the title is in the caption and in the list row, never also in the picture area
      await expect(page.locator('.dv-box')).not.toContainText('Rollin')
      expect(m.titles).toBeGreaterThanOrEqual(2)
    } finally {
      await pickWork(page, 2)
    }
  })

  test('the module screen of a work without a picture keeps its face: a --lap face and a --jel trace, no ink block', async ({ homeNoPicture: page }) => {
    await resizeTo(page, 1280)
    await pickWork(page, 3)
    try {
      const m = await page.evaluate(() => {
        const trs = [...document.querySelectorAll('.cfig.cw .lcd-tr')] as SVGElement[]
        return { n: trs.length, shown: trs.filter((t) => t.style.display !== 'none').length, stroke: getComputedStyle(trs[0]!).stroke }
      })
      expect(m.n).toBe(2)
      expect(m.shown).toBe(2)
      expect(m.stroke).toBe(await page.evaluate(() => { const e = document.createElement('i'); e.style.color = 'var(--jel)'; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c }))
    } finally {
      await pickWork(page, 2)
    }
  })
})

test.describe('resting colour and head lengths', () => {
  for (const [theme, width] of [['light', 1280], ['dark', 360]] as const) {
    test(`B5: one second after the last input no hot stretch is drawn anywhere (${theme}, ${width} px)`, async ({ homeFull: page }) => {
      await scheme(page, theme)
      await resizeTo(page, width)
      let paused = false
      try {
        for (const y of [1500, 3000, 100000, 0]) {
          await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
          await frames(page, 3)
        }
        // a bus or offers run in flight (they start on entry and take a few seconds) must have ended first
        await expect.poll(() => page.evaluate(() => document.querySelectorAll('.slot.q').length), { timeout: 8000, message: 'a bus run entered by the scrolling above is still answering; the heat check must wait for it' }).toBe(0)
        await wait(page, 1200)
        const hot = await page.evaluate(() => [...document.querySelectorAll('path.heat, .cmz-hev')].filter((p) => parseFloat(getComputedStyle(p).opacity) > 0.01).length)
        expect(hot, 'visible hot overlays').toBe(0)
        // the band on "Áll": no stroke of the first screen is drawn in the hot colour after the cooling time (the trace keeps the signal colour, the hot overlays are invisible)
        // the run key exists on the Gépadat pair only (the one band that moves)
        await page.locator('.key-gomb[data-p="gepadat"]').click()
        await expect(page.locator('.runbtn')).toBeVisible({ timeout: 8000 })
        paused = true
        await page.locator('.runbtn').click()
        await wait(page, 1200)
        const [r, g, b] = await hotRgb(page)
        const orange = await page.evaluate(([r, g, b]) => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1
          const g2 = cv.getContext('2d', { willReadFrequently: true })!
          let n = 0
          for (const p of document.querySelectorAll('.opn-svg path')) {
            const cs = getComputedStyle(p)
            if (cs.stroke === 'none' || parseFloat(cs.opacity) <= 0.01) continue
            g2.clearRect(0, 0, 1, 1); g2.fillStyle = cs.stroke; g2.fillRect(0, 0, 1, 1)
            const d = g2.getImageData(0, 0, 1, 1).data
            if (Math.abs(d[0]! - r!) <= 10 && Math.abs(d[1]! - g!) <= 10 && Math.abs(d[2]! - b!) <= 10) n++
          }
          return n
        }, [r, g, b] as const)
        expect(orange, 'strokes of the first screen in the hot colour on Áll').toBe(0)
      } finally {
        if (paused && (await page.locator('.runbtn').getAttribute('aria-pressed')) === 'false') await page.locator('.runbtn').click()
        // the page is shared by the specs of this worker: leave it on the first pair, as it was found (the width spec measures the portrait screen of HONLAP)
        if (paused) {
          await page.locator('.key-gomb[data-p="honlap"]').click()
          await expect(page.locator('.opening')).toHaveAttribute('data-par', 'honlap', { timeout: 8000 })
        }
        await scheme(page, 'light')
        await resizeTo(page, 1280)
      }
    })
  }

  // the band's load sweep carries a hot head of a quarter of the band's width (240 px at most); it exists only while the trace is drawn
  for (const [width, head] of [[320, 80], [360, 90], [480, 120], [768, 192], [1280, 240]] as const) {
    test(`B6: the band's hot head is ${head} px at ${width} px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' })
      const page = await ctx.newPage()
      try {
        await page.clock.install({ time: new Date('2026-11-16T10:00:00Z') })
        await page.clock.pauseAt(new Date('2026-11-16T10:00:01Z'))
        await page.goto('/')
        await page.evaluate(() => document.fonts.ready)
        // the longest head seen while the trace is drawn (the sweep takes 900 ms; at its very start the head is still growing out of the lane)
        let got = 0
        for (let t = 0; t < 1500; t += 50) {
          await page.clock.runFor(50)
          got = Math.max(got, await page.evaluate(() => {
            let total = 0
            for (const q of document.querySelectorAll('.opn-svg path.heat') as NodeListOf<SVGElement>) {
              if (parseFloat(q.style.opacity) <= 0.01) continue
              total += parseFloat(q.style.strokeDasharray)
            }
            return total
          }))
        }
        expect(Math.abs(got - head), `head ${got}`).toBeLessThanOrEqual(4)
      } finally {
        await ctx.close()
      }
    })
  }

  for (const [width, head] of [[360, 120], [768, 240]] as const) {
    test(`B6: the spine's hot head is ${head} px at ${width} px while it moves`, async ({ homeFull: page }) => {
      await resizeTo(page, width)
      try {
        await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
        await frames(page, 2)
        const len = await page.evaluate(() => {
          let s = 1e9, e = -1
          for (const q of document.querySelectorAll('.spine-svg path.heat') as NodeListOf<SVGElement>) {
            if (parseFloat(q.style.opacity) <= 0.01) continue
            const off = -parseFloat(q.style.strokeDashoffset)
            s = Math.min(s, off); e = Math.max(e, off + parseFloat(q.style.strokeDasharray))
          }
          return e - s
        })
        expect(Math.abs(len - head), `spine head ${len}`).toBeLessThanOrEqual(4)
      } finally {
        await resizeTo(page, 1280)
      }
    })
  }
})

/** A pen colour as sRGB (painted on a 1x1 canvas, so an oklch() computed value in the P3 block is resolved by the engine). */
const penRgb = (page: Page, token: string) => page.evaluate((t) => {
  const i = document.createElement('i'); i.style.color = `var(${t})`; document.body.append(i)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const g = cv.getContext('2d', { willReadFrequently: true })!; g.fillStyle = getComputedStyle(i).color; g.fillRect(0, 0, 1, 1)
  i.remove()
  return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3)
}, token)

test.describe('contact: the copy key and its line', () => {
  for (const width of [360, 768, 1024, 1280]) {
    test(`B8: the tap is one level run from the lane to the terminal, no turn, light and dark, at ${width} px`, async ({ homeReduced: page }) => {
      await resizeTo(page, width)
      try {
        for (const theme of ['light', 'dark'] as const) {
          await scheme(page, theme)
          const d = await settled(page, () => page.locator('.cmz-svg path.pen-r').first().getAttribute('d'))
          // M x y H x: one horizontal run and nothing else (the component draws it from the lane's x; the old breaker's tap turned up into its terminal)
          expect(d, theme).toMatch(/^M[-\d.]+ [-\d.]+H[-\d.]+$/)
          const m = await page.evaluate(() => {
            const p = document.querySelector('.cmz-svg path.pen-r') as unknown as SVGGeometryElement
            const ctm = p.getScreenCTM()!
            const L = p.getTotalLength()
            const a = p.getPointAtLength(0), b = p.getPointAtLength(L)
            const lane = document.querySelector('.hdr .lane')!.getBoundingClientRect()
            const field = document.querySelector('.cmz-mezo')!.getBoundingClientRect()
            return { x0: ctm.a * a.x + ctm.e, x1: ctm.a * b.x + ctm.e, laneX: lane.left + lane.width / 2, fieldLeft: field.left }
          })
          expect(Math.abs(m.x0 - m.laneX), `${theme}: the tap leaves the lane's x`).toBeLessThanOrEqual(1)
          expect(Math.abs(m.fieldLeft - 8 - m.x1), `${theme}: the tap ends at the terminal square, 8 px left of the field`).toBeLessThanOrEqual(1)
        }
      } finally {
        await scheme(page, 'light')
        await resizeTo(page, 1280)
      }
    })

    test(`the lamp group stands in its reserved place and nothing on the page moves when it appears (0 px) at ${width} px`, async ({ homeReduced: page }) => {
      await resizeTo(page, width)
      try {
        const measure = () => page.evaluate(() => {
          const box = (s: string) => { const r = document.querySelector(s)!.getBoundingClientRect(); return [r.left, r.top + window.scrollY, r.right, r.bottom + window.scrollY].map((n) => Math.round(n * 10) / 10) }
          return { field: box('.cmz-mezo'), sentence: box('.cmz-mondat'), links: box('.cmz-linkek'), foot: box('footer'), height: document.documentElement.scrollHeight, column: document.querySelector('.cmz')!.clientWidth }
        })
        const key = page.locator('.cmz-gomb')
        await key.scrollIntoViewIfNeeded()
        const before = await measure()
        await key.click()
        await expect(page.locator('.cmz')).toHaveAttribute('data-st', /kesz|hiba/)
        await expect(page.locator('.cmz-lampa')).toBeVisible()
        const after = await measure()
        expect(after, 'every box on the page keeps its place').toEqual(before)
        const lamp = await page.locator('.cmz-lampa').evaluate((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top + window.scrollY, r.right, r.bottom + window.scrollY] })
        const [fl, ft, fr, fb] = after.field as [number, number, number, number]
        if (after.column >= 940) {
          expect(Math.abs(lamp[0]! - fr - 16), 'right of the field, 16 px apart').toBeLessThanOrEqual(1)
          expect(Math.abs((lamp[1]! + lamp[3]!) / 2 - (ft + fb) / 2), 'centred on the field\'s height').toBeLessThanOrEqual(1.5)
        } else {
          expect(lamp[1]!, 'under the field').toBeGreaterThanOrEqual(fb - 0.5)
          expect(lamp[3]!, 'inside the 24 px gap above the sentence').toBeLessThanOrEqual(after.sentence[1]! + 0.5)
          expect(Math.abs(lamp[2]! - fr), 'on the field\'s right edge').toBeLessThanOrEqual(1)
        }
        expect(fl, 'the lamp group stays in the viewport').toBeGreaterThanOrEqual(0)
        expect(lamp[2]!, 'the lamp group stays in the viewport').toBeLessThanOrEqual(width)
        await expect(page.locator('.cmz')).not.toHaveAttribute('data-st', /.+/, { timeout: 6500 })   // the answer is taken back: the shared page is at rest again
      } finally {
        await resizeTo(page, 1280)
      }
    })
  }

  for (const width of [360, 1280]) {
    test(`C6: in the lane's pixel column the red runs unbroken from the station's node into the earth's top bar, one node for this station, at ${width} px`, async ({ homeReduced: page }) => {
      await resizeTo(page, width)
      try {
        await page.evaluate(() => window.scrollTo({ top: 100000, behavior: 'instant' }))
        await frames(page, 4)
        const g = await page.evaluate(() => {
          const node = document.querySelector('.cmz-nod')!.getBoundingClientRect()
          const bar = (document.querySelector('.earth-svg path') as unknown as SVGGraphicsElement).getBoundingClientRect()
          const y0 = node.top + window.scrollY + node.height / 2
          const nodesNear = [...document.querySelectorAll('.spine-svg circle.tapn')].filter((c) => Math.abs(c.getBoundingClientRect().top + window.scrollY + 5 - y0) < 40).length
          return { x: node.left + node.width / 2, y0, y1: bar.top + window.scrollY + bar.height / 2, nodes: document.querySelectorAll('.cmz-nod').length, nodesNear }
        })
        expect(g.nodes, 'one node of the component on the lane').toBe(1)
        expect(g.nodesNear, "the spine draws no node of its own at this station").toBe(0)
        const [r, gr, b] = await penRgb(page, '--jel')
        const shot = await page.screenshot({ fullPage: true, clip: { x: Math.floor(g.x) - 1, y: Math.ceil(g.y0), width: 3, height: Math.floor(g.y1 - g.y0) } })
        const missing = await page.evaluate(async ([b64, rgb]) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
          const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(img, 0, 0)
          const d = ctx.getImageData(0, 0, c.width, c.height).data
          let gaps = 0
          for (let y = 0; y < c.height; y++) {
            let row = false
            for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (Math.abs(d[i]! - rgb[0]!) <= 30 && Math.abs(d[i + 1]! - rgb[1]!) <= 30 && Math.abs(d[i + 2]! - rgb[2]!) <= 30) row = true }
            if (!row) gaps++
          }
          return gaps
        }, [shot.toString('base64'), [r, gr, b]] as const)
        expect(missing, `rows without the red pen in the lane column between the node and the earth (${Math.round(g.y1 - g.y0)} px)`).toBe(0)
      } finally {
        await resizeTo(page, 1280)
      }
    })
  }
})

test.describe('partners and the phone poll', () => {
  test('B10: during the poll on a phone no hot-coloured pixel lies outside the 3 px line in the lane', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'no-preference' })
    const page = await ctx.newPage()
    try {
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveClass(/jel-vege/)
      const hot = await hotRgb(page)
      const y = await page.evaluate(() => document.querySelector('.bus')!.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55)
      for (let i = 0; i < 40; i++) {
        const cur = await page.evaluate(() => window.scrollY)
        if (Math.abs(y - cur) < 4) break
        await page.mouse.wheel(0, Math.max(-120, Math.min(120, y - cur)))
        await page.waitForTimeout(100)
      }
      let outside = 0, inside = 0
      for (let k = 0; k < 14; k++) {
        const shot = await page.screenshot()
        const r = await page.evaluate(async ([b64, rgb]) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
          const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0)
          const d = g.getImageData(0, 0, 40, c.height).data
          let out = 0, inn = 0
          for (let i = 0; i < d.length; i += 4) {
            if (Math.abs(d[i]! - rgb[0]!) <= 10 && Math.abs(d[i + 1]! - rgb[1]!) <= 10 && Math.abs(d[i + 2]! - rgb[2]!) <= 10) { const x = (i / 4) % 40; if (x >= 22 && x <= 26) inn++; else out++ }
          }
          return [out, inn]
        }, [shot.toString('base64'), hot] as const)
        outside += r[0]!; inside += r[1]!
        await page.waitForTimeout(120)
      }
      expect(inside, 'the hot stretch was seen on the line in at least one sample').toBeGreaterThan(0)
      expect(outside, 'hot pixels outside the line (inside it: ' + inside + ')').toBe(0)
      await expect.poll(() => page.locator('.slot.q').count(), { timeout: 6000 }).toBe(0)
    } finally {
      await ctx.close()
    }
  })

  test('reduced motion: a full-page still shows all four names answered, the cable complete and the earth drawn, with no scrolling', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    try {
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveClass(/jel-vege/)
      await page.waitForTimeout(800)
      expect(await page.locator('.slot.q').count()).toBe(0)
      const s = await page.evaluate(() => ({
        cable: (document.querySelector('.run .tsvg path.ln') as SVGElement).style.strokeDashoffset,
        earth: [...document.querySelectorAll('.earth-svg path')].map((p) => (p as SVGElement).style.opacity).join(),
        tap: (() => { const p = document.querySelector('.cmz-svg path.pen-r') as unknown as SVGGeometryElement | null; const t = document.querySelector('.cmz-svg .cmz-ter'); if (!p || !t) return 'missing'; const m = p.getScreenCTM()!; const end = m.a * p.getPointAtLength(p.getTotalLength()).x + m.e; return Math.abs(end - t.getBoundingClientRect().left) <= 1 ? 'drawn' : 'ends at ' + end })(),
      }))
      expect(s).toEqual({ cable: '0', earth: '1,1,1', tap: 'drawn' })
    } finally {
      await ctx.close()
    }
  })
})

test.describe('opening keys', () => {
  test('L7: Enter and Space on a focused key select its pair, arrow keys move the choice, and a key is pressed 2 px down for 60 ms', async ({ homeFull: page }) => {
    await resizeTo(page, 1280)
    const key = (id: string) => page.locator(`.key-gomb[data-p="${id}"]`)
    for (const [id, k] of [['rendeles', 'Enter'], ['gepkonyv', 'Space'], ['gepadat', 'Enter'], ['honlap', 'Space']] as const) {
      await key(id).focus()
      await page.keyboard.press(k)
      await expect(key(id)).toHaveAttribute('aria-checked', 'true')
      await expect(page.locator(`.sp[data-p="${id}"]`)).toBeVisible()
      await expect(page.locator('.sp:visible')).toHaveCount(1)
      await expect(page.locator('.kp:visible')).toHaveCount(1)
    }
    await key('honlap').focus()
    await page.keyboard.press('ArrowRight')
    await expect(key('rendeles')).toBeFocused()
    await expect(key('rendeles')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowLeft')
    await expect(key('honlap')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowLeft')
    await expect(key('gepadat')).toHaveAttribute('aria-checked', 'true')
    await key('honlap').click()
    await expect(key('honlap')).toHaveAttribute('aria-checked', 'true')
  })
})
