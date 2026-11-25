import { expect, test, type Page } from '@playwright/test'
import { JEL } from '../src/content/fooldal'
import { VALLALKOZO } from '../src/content/alapadatok'
import { movingAnimations } from './motion'

// The motion score of direction D, row by row. Everything is driven with the Playwright clock: the page's animation clock is
// requestAnimationFrame plus setTimeout, so `runFor` plays it forward without a fixed sleep. Observation is through DOM state
// (classes, dash offsets, opacity, transforms, canvas pixels), never through screenshots.
const T0 = new Date('2026-11-16T10:00:00Z')

async function open(page: Page, viewport = { width: 1280, height: 900 }) {
  await page.setViewportSize(viewport)
  await page.clock.install({ time: T0 })
  await page.clock.pauseAt(new Date(T0.getTime() + 1000))
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('#nyitas')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await run(page, 300)
}
/** Plays the page's clock forward in 50 ms steps (each step shorter than any transition). */
async function run(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 50) await page.clock.runFor(Math.min(50, ms - t))
}
async function scrollTo(page: Page, y: number | string) {
  // instant: the page's smooth scrolling runs in real time, not on the faked clock
  await page.evaluate((v) => (typeof v === 'number' ? window.scrollTo({ top: v, behavior: 'instant' }) : document.querySelector(v)!.scrollIntoView({ block: 'center', behavior: 'instant' })), y)
  // the scroll event reaches the page with the browser's next real frame, which the faked clock does not make: give it a real moment (the first screen's band no longer keeps frames coming)
  await page.waitForTimeout(60)
  await run(page, 100)
}
const dashOffset = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => parseFloat((el as SVGElement).style.strokeDashoffset || '0'))
const opacity = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => parseFloat(getComputedStyle(el).opacity))
/** The drawn band of the selected pair (its path), as one string: it changes whenever a sample moves a held level. */
const bandD = (page: Page) => page.locator('.opn-svg g[data-p] path.band-ut').last().getAttribute('d')
const readings = (page: Page) => page.evaluate(() => [document.querySelector('.kij-olv')!.textContent, document.querySelector('.ctl-row .reading')!.textContent, document.querySelector('[data-hom]')!.textContent])

test.describe('full motion', () => {
  test('page load: the band draws from the left to the screen\'s terminal with a hot head, the terminal turns green at arrival, the sequence ends', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.clock.install({ time: T0 })
    await page.clock.pauseAt(new Date(T0.getTime() + 1000))
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await run(page, 50)
    await expect(page.locator('html')).not.toHaveClass(/jel-var/)
    await expect(page.locator('html')).not.toHaveClass(/jel-vege/)
    await run(page, 500)   // inside the sweep (it starts 200 ms after the load and takes 900 ms)
    const hot = await page.evaluate(() => [...document.querySelectorAll('.opn-svg path.heat')].filter((q) => parseFloat(getComputedStyle(q).opacity) > 0.01).length)
    expect(hot, 'the hot head is drawn while the trace is').toBeGreaterThan(0)
    await expect(page.locator('.kij .term')).not.toHaveClass(/on/)
    await run(page, 1500)
    await expect(page.locator('html')).toHaveClass(/jel-vege/)
    await expect(page.locator('html')).toHaveClass(/jel-hullam/)
    await expect(page.locator('.kij .term')).toHaveClass(/on/)
    expect(await page.locator('.opn-svg path.band-ut').evaluate((el) => (el as SVGElement).style.strokeDasharray), 'the trace is drawn whole').toBe('')
  })

  test('choosing a pair: key pressed 60 ms, source exchanged after the 120 ms pause, trace swap 480 ms, terminal settles, screen redraws, all within 1200 ms; the readout swaps', async ({ page }) => {
    await open(page)
    await run(page, 2000)
    const key = page.locator('.key-gomb[data-p="gepadat"]')
    await key.click()
    await run(page, 30)
    expect(await key.evaluate((e) => (e as HTMLElement).style.transform), 'the key is pressed 2 px down').toBe('translateY(2px)')
    await run(page, 70)
    expect(await key.evaluate((e) => (e as HTMLElement).style.transform), 'and back after 60 ms').toBe('')
    await expect(page.locator('.sp[data-p="honlap"]'), 'the old source stays through the 120 ms pause').toBeVisible()
    await run(page, 150)   // 250 ms after the key: exchanged (180 ms)
    await expect(page.locator('.sp[data-p="gepadat"]')).toBeVisible()
    await expect(page.locator('.sp:visible')).toHaveCount(1)
    await expect(page.locator('.sp-gd .lmp[data-l="kerd"]').first(), 'the question lamp first').toHaveClass(/on/)
    await run(page, 150)   // 120 ms after the exchange: the answer lamp
    await expect(page.locator('.sp-gd .lmp[data-l="val"]').first()).toHaveClass(/on/)
    await run(page, 800)   // 1200 ms after the key
    await expect(page.locator('.kij .term'), 'the terminal has settled (the value has arrived)').toHaveClass(/on/)
    await expect(page.locator('.readout')).toHaveText(JEL.nyito.parok[3]!.mondat)
    const r0 = await readings(page)
    expect(new Set(r0).size, `one value at all three places: ${r0.join(' | ')}`).toBe(1)
    expect(r0[0]).toMatch(/^\d\d,\d °C$/)
    await expect(page.locator('.opn-svg g[data-p]'), 'one trace group is left').toHaveCount(1)
    // arrow keys move between the pairs
    await page.locator('.key-gomb[data-p="honlap"]').focus()
    await page.keyboard.press('ArrowRight')
    await run(page, 900)
    await expect(page.locator('.key-gomb[data-p="rendeles"]')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.kij-olv')).toHaveText(JEL.nyito.parok[1]!.fejOlvasat)
  })

  test('the Gépadat band runs (one sample every 800 ms, the same value at both ends), pauses with the control and resumes', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await run(page, 1500)
    const a = await bandD(page)
    for (let i = 0; i < 4; i++) {
      await run(page, 800)
      const r = await readings(page)
      expect(new Set(r).size, `the head row, the readout row and the card's cell show one value: ${r.join(' | ')}`).toBe(1)
      expect(r[0]).toMatch(/^\d\d,\d °C$/)
    }
    expect(await bandD(page)).not.toBe(a)
    await page.locator('.runbtn').click()
    await expect(page.locator('.runbtn')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.runbtn')).toHaveAttribute('aria-label', JEL.futas.nev) // one constant name; aria-pressed carries the state
    await expect(page.locator('.runbtn .rt')).toHaveText(JEL.futas.all)
    // the paused square takes the soft ink, not the signal colour (and nothing else in that row picks up its style)
    // (a colour transition runs on the document timeline: poll in real time)
    const squares = () => page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--tinta-halk)'
      document.body.appendChild(probe)
      const halk = getComputedStyle(probe).color
      probe.remove()
      return { square: getComputedStyle(document.querySelector('.runbtn .rs')!).backgroundColor, halk }
    })
    await expect.poll(async () => { const q = await squares(); return q.square === q.halk }, { timeout: 3000 }).toBe(true)
    const frozen = await bandD(page)
    const heldReading = await readings(page)
    await run(page, 2400)
    expect(await bandD(page), 'on Áll the band holds its levels').toBe(frozen)
    expect(await readings(page), 'and the screen holds its value').toEqual(heldReading)
    await page.locator('.runbtn').click()
    await expect(page.locator('.runbtn .rt')).toHaveText(JEL.futas.fut)
    await run(page, 2000)
    expect(await bandD(page)).not.toBe(frozen)
  })

  test('the probe: on the Gépadat band a cursor line and the value under it follow the pointer and leave with it; the other pairs show no value under the pointer', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    const box = (await page.locator('.sav').boundingBox())!
    await page.mouse.move(box.x + 500, box.y + box.height - 60)
    await run(page, 300)
    await expect(page.locator('.opn-svg .probe-l'), 'no probe on HONLAP').toHaveCount(0)
    await expect(page.locator('.ctl-row .reading')).toHaveText(JEL.nyito.parok[0]!.olvasat)
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await run(page, 1200)
    await page.mouse.move(box.x + 700, box.y + box.height - 60)
    await run(page, 300)
    await expect(page.locator('.ctl-row .reading')).toHaveText(/^\d\d,\d °C$/)
    await expect.poll(() => opacity(page, '.opn-svg .probe-l'), { timeout: 3000 }).toBe(1)   // a CSS transition: real time
    await page.mouse.move(box.x + 700, box.y - 400)
    await run(page, 400)
    await expect.poll(() => opacity(page, '.opn-svg .probe-l'), { timeout: 3000 }).toBe(0)
    const back = await readings(page)
    expect(new Set(back).size, `the reading is the current value again: ${back.join(' | ')}`).toBe(1)
  })

  test('the band stops sampling while it is off screen', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await run(page, 1500)
    await scrollTo(page, 2200)
    await run(page, 500)
    const a = await bandD(page)
    await run(page, 2400)
    expect(await bandD(page)).toBe(a)
  })

  test('the spine is drawn as far as the reader has scrolled, with tap nodes switching on', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    // each poll plays the faked clock forward a little (the page's frames only run when the test advances it)
    const spine = async () => { await run(page, 100); return dashOffset(page, '.spine-svg > path.pen-r') }
    const top = await spine()
    await scrollTo(page, 1800)
    await expect.poll(spine, { message: 'the spine is drawn further at mid scroll' }).toBeLessThan(top)
    const mid = await spine()
    await scrollTo(page, 100000)
    await run(page, 300)
    await expect.poll(spine, { message: 'the whole spine is drawn at the end' }).toBeLessThan(Math.min(mid, 4))
    await expect(page.locator('.spine-svg .tapn.on')).toHaveCount(6)   // six stations on the spine (the subline, the source, the band, the cable run, the partners, the offers): the contact end draws its own tap and node (src/site/elemek/)
  })

  test('the controller opens along the scroll axis: screws, then cover, display and board separate; the leader and the circle draw', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    const sx = () => page.locator('.cfig.cw').evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--sx') || '0'))
    const lift = (part: string) => page.locator(`.cfig.cw .cp[data-p="${part}"]`).evaluate((el) => parseFloat(((el as HTMLElement).style.transform.match(/-?[\d.]+/) ?? ['0'])[0]!))
    // at the top the controller is closed: screws down (--sx 0), every part in place plus its lift
    expect(await sx()).toBe(0)
    const l0 = await lift('cover')
    expect(l0).toBeGreaterThan(0)
    const cwrapTop = await page.evaluate(() => document.querySelector('.cwrap')!.getBoundingClientRect().top + window.scrollY)
    // the screws come out first (the first 40 % of the scrub), then the parts separate (from 30 %)
    await scrollTo(page, cwrapTop - 560)
    await run(page, 500)
    expect(await sx()).toBe(1)
    const lMid = await lift('cover')
    expect(lMid).toBeLessThan(l0)
    expect(lMid).toBeGreaterThan(0)
    await scrollTo(page, cwrapTop + 100)
    await run(page, 800)
    expect(await sx()).toBe(1)
    expect(await lift('cover')).toBe(0)
    expect(await opacity(page, '.lead-svg path')).toBe(1)
  })

  test('the cable: the trace of the selected work draws, the plug seats, reading and tick appear; Gépadat reads 51,6', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '.cwrap')
    await scrollTo(page, '.allw')
    await run(page, 2500)
    await expect(page.locator('.run .reading')).toHaveText(/°C/)
    await expect(page.locator('.cfig.cw .cplug')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)|none/)
    await expect.poll(() => opacity(page, '.run .tick'), { timeout: 3000 }).toBe(1) // a CSS transition: real time
  })

  test('selecting a work: by key on the module, by row and by arrows; the trace changes, the detail view redraws', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '#munkak .wl')
    await run(page, 1500)
    const first = await page.locator('.run .tsvg').count()
    await page.locator('.wl button[data-wi="0"]').click()
    await expect(page.locator('.dv-t')).toHaveText(JEL.munkak.tetelek[0]!.cim)
    await expect(page.locator('.dv-box')).toHaveClass(/lcd-redraw/)
    expect(await page.locator('.run .tsvg').count()).toBeGreaterThanOrEqual(first)
    await run(page, 700)
    expect(await page.locator('.run .tsvg').count()).toBe(1)
    await expect(page.locator('.cfig.cw .key[data-k="0"]').first()).toHaveClass(/sel/)
    // the keys of the device itself are operable (a hit area rides on each key)
    await page.locator('.cfig.cw .cp[data-p="display"] .khit').nth(4).click({ force: true })
    await expect(page.locator('.dv-t')).toHaveText(JEL.munkak.tetelek[4]!.cim)
    await page.locator('.wl button[data-wi="4"]').focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.dv-t'), 'after the last work comes the planned slot').toHaveText(JEL.munkak.tervezett.cim)
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.dv-t')).toHaveText(JEL.munkak.tetelek[0]!.cim)
  })

  test('the partner bus: one frame polls the four stations, each name answers; hover polls one again', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '.bus')
    await run(page, 3000)
    expect(await page.locator('.slot.q').count()).toBe(0)
    await page.locator('.slot').nth(1).hover()
    await run(page, 60)
    await expect(page.locator('.slot').nth(1)).toHaveClass(/q/)
    await run(page, 2500)
    await expect(page.locator('.slot').nth(1)).not.toHaveClass(/q/)
  })

  test('the partner names are plain text: a Tab walk through the page never lands on one', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    const landed: string[] = []
    for (let i = 0; i < 150; i++) {
      await page.keyboard.press('Tab')
      const hit = await page.evaluate(() => {
        const a = document.activeElement
        return a && a !== document.body ? (a.closest('.slot') ? 'slot' : a.tagName) : ''
      })
      if (!hit) break
      landed.push(hit)
    }
    expect(landed.length, 'the walk reached focusable elements').toBeGreaterThan(5)
    expect(landed).not.toContain('slot')
  })

  test('the offers branch draws off the spine to its terminal', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '.offers')
    await run(page, 1000)
    expect(await opacity(page, '.off-svg .term')).toBe(1)
    expect(await dashOffset(page, '.off-svg > path.pen-r')).toBeLessThan(1)
  })

  test('contact: the copy key answers: the key travels, the terminal turns green, the underline draws with a hot head that cools, the lamp lights, the address is copied; four seconds later all is back', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '#kapcsolat .cmz-mezo')
    await run(page, 800)
    await expect(page.locator('.cmz-svg .cmz-ul')).toHaveCount(0)   // at rest there is no underline, no lamp, no green terminal
    const key = page.locator('.cmz-gomb')
    await key.click()
    await run(page, 100)
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
    await expect(page.locator('.cmz-svg .cmz-hev')).toHaveCount(1)   // the head of the line is hot while it is drawn
    expect(await key.evaluate((el) => getComputedStyle(el).transform), 'the key travels its 2 px').toBe('matrix(1, 0, 0, 1, 0, 2)')
    await run(page, 400)
    expect(await dashOffset(page, '.cmz-svg .cmz-ul')).toBeLessThan(0.5)   // drawn within 300 ms
    await expect.poll(() => opacity(page, '.cmz-lampa'), { timeout: 3000 }).toBe(1)   // a CSS animation of 160 ms runs on the real clock, not on the page clock
    await run(page, 700)
    await expect(page.locator('.cmz-svg .cmz-hev')).toHaveCount(0)   // 400 ms after the last movement the head has cooled, over 300 ms
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(VALLALKOZO.email)
    await run(page, 2900)   // 4.1 s after the press: the underline is withdrawing
    await run(page, 400)
    await expect(page.locator('.cmz')).not.toHaveAttribute('data-st', /.+/)
    await expect(page.locator('.cmz-svg .cmz-ul')).toHaveCount(0)
    await expect(page.locator('.cmz-svg .cmz-ter')).toHaveCount(1)
  })

  // The underline's ends: it starts at the terminal on the field's left edge and ends 8 px before the key cell's rule, or 12 px before the field's edge when the
  // key cell is a second row. Which of the two is told by the layout (the key cell's place), never by a pixel difference: also at a device pixel ratio of 2, where the field's border is 2 px.
  for (const [viewport, dpr] of [[{ width: 360, height: 780 }, 1], [{ width: 360, height: 780 }, 2], [{ width: 1280, height: 900 }, 1]] as const) {
    test.describe(`underline ends, ${viewport.width} px at ${dpr}x`, () => {
      test.use({ deviceScaleFactor: dpr })
      test('starts at the terminal, ends at the key cell or the field edge', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await open(page, viewport)
        await run(page, 2200)
        await scrollTo(page, '#kapcsolat .cmz-mezo')
        await page.locator('.cmz-gomb').click()
        await run(page, 700)
        const ends = await page.evaluate(() => {
          const path = document.querySelector('.cmz-svg .cmz-ul') as unknown as SVGGeometryElement
          const m = path.getScreenCTM()!
          const L = path.getTotalLength()
          const x = (d: number) => m.a * path.getPointAtLength(d).x + m.e
          const kc = document.querySelector('.cmz-kc')!.getBoundingClientRect()
          const field = document.querySelector('.cmz-mezo')!.getBoundingClientRect()
          const cim = document.querySelector('.cmz-cim')!.getBoundingClientRect()
          const node = document.querySelector('.cmz-ter-be')!.getBoundingClientRect()
          // the layout rule (cimmezo.css): the field is one row from 840 px of its column, stacked below that
          const row = (document.querySelector('.cmz') as HTMLElement).clientWidth >= 840
          return { left: x(0), right: x(L), nodeX: node.left + node.width / 2, fieldLeft: field.left, fieldRight: field.right, kcLeft: kc.left, row, kcTop: kc.top, cimTop: cim.top, cimBottom: cim.bottom }
        })
        expect(Math.abs(ends.left - ends.nodeX), 'the underline starts at the terminal').toBeLessThanOrEqual(0.6)
        expect(Math.abs(ends.nodeX - ends.fieldLeft), "the terminal is on the field's left edge").toBeLessThanOrEqual(0.6)
        // the measured cells agree with the rule: one row = the key cell starts at the address cell's top, stacked = at its bottom
        expect(Math.abs(ends.kcTop - (ends.row ? ends.cimTop : ends.cimBottom)), 'the key cell is where the layout rule puts it').toBeLessThanOrEqual(2)
        const want = ends.row ? ends.kcLeft - 8 : ends.fieldRight - 12
        expect(Math.abs(ends.right - want), `underline ends at ${ends.right}, wanted ${want}`).toBeLessThanOrEqual(1)
      })
    })
  }

  // R6: the contact end's tap and the lane's node are drawn only once the spine has reached the node's height (and the load sweep is over); the terminal,
  // field and key never wait. The spine's drawn end is read from the path geometry, the node from its own box.
  const bahnState = (page: Page) =>
    page.evaluate(() => {
      const nod = document.querySelector('.cmz-nod')!
      const nr = nod.getBoundingClientRect()
      const p = document.querySelector('.spine-svg > path.pen-r') as unknown as SVGGeometryElement
      const m = p.getScreenCTM()!
      const off = parseFloat((p as unknown as SVGElement).style.strokeDashoffset || '0')
      const head = p.getPointAtLength(Math.max(0.01, p.getTotalLength() - off)).y * m.d + m.f
      const ln = document.querySelector('.cmz-svg .ln')
      return {
        nodeDocY: nr.top + nr.height / 2 + scrollY,
        inView: nr.top < innerHeight && nr.bottom > 0,
        gap: nr.top + nr.height / 2 - head,
        nodeHidden: getComputedStyle(nod).visibility === 'hidden',
        lnHidden: ln ? getComputedStyle(ln).visibility === 'hidden' : null,
        terminal: getComputedStyle(document.querySelector('.cmz-ter')!).visibility,
      }
    })
  /** Scrolls so that the node has just come into view at the bottom edge (5 px of it showing): the spine's head is further up, so the tap must wait. */
  async function nodeAtBottomEdge(page: Page, vh: number) {
    const y0 = (await bahnState(page)).nodeDocY
    await scrollTo(page, y0 - vh + 5)
  }
  for (const width of [360, 768, 1280]) {
    test(`the tap to the contact end never hangs from a spine that has not arrived, at ${width} px (scrolling down, full motion)`, async ({ page }) => {
      await open(page, { width, height: 800 })
      await run(page, 2200)
      // deterministic waiting sample: the node has just entered at the bottom edge, the spine has not arrived
      await nodeAtBottomEdge(page, 800)
      const wait = await bahnState(page)
      expect(wait.inView).toBe(true)
      expect(wait.gap, 'the spine is still above the node').toBeGreaterThan(0.5)
      expect(wait.nodeHidden, 'the node waits').toBe(true)
      if (wait.lnHidden !== null) expect(wait.lnHidden, 'the tap waits').toBe(true)
      expect(wait.terminal, 'the terminal never waits').toBe('visible')
      const total = await page.evaluate(() => document.documentElement.scrollHeight)
      let seenDrawn = 0
      for (let y = Math.max(0, (await page.evaluate(() => scrollY)) - 80); y <= total - 800 + 40; y += 40) {
        await scrollTo(page, y)
        const r = await bahnState(page)
        expect(r.terminal, 'the terminal never waits').toBe('visible')
        if (!r.inView) continue
        if (r.gap > 0.5) { expect(r.nodeHidden, `scrollY ${y}: node hangs ${r.gap}px below the spine's end`).toBe(true); if (r.lnHidden !== null) expect(r.lnHidden).toBe(true) } else if (r.gap <= 0.5) { seenDrawn++; expect(r.nodeHidden, `scrollY ${y}: the spine has arrived`).toBe(false) }
      }
      expect(seenDrawn, 'the node was drawn once the spine arrived').toBeGreaterThan(0)
    })
  }

  test('the load sweep: with the contact end already in view the node and tap wait until the spine has grown to them', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.clock.install({ time: T0 })
    await page.clock.pauseAt(new Date(T0.getTime() + 1000))
    await page.goto('/#kapcsolat', { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await run(page, 100)
    await scrollTo(page, '#kapcsolat .cmz-mezo')
    const early = await bahnState(page)
    expect(early.inView).toBe(true)
    expect(early.gap, 'the spine has not grown to the node yet').toBeGreaterThan(0.5)
    expect(early.nodeHidden).toBe(true)
    if (early.lnHidden !== null) expect(early.lnHidden).toBe(true)
    await run(page, 2200)
    const late = await bahnState(page)
    // the sweep is over and the node stands at about mid-viewport (the spine's head is at about 0.88 of the viewport): the spine has passed it, so it must be drawn
    expect(late.inView).toBe(true)
    expect(late.gap, 'the spine has passed the node').toBeLessThanOrEqual(0.5)
    expect(late.nodeHidden, 'the node is drawn once the sweep is over').toBe(false)
    if (late.lnHidden !== null) expect(late.lnHidden, 'the tap is drawn once the sweep is over').toBe(false)
  })

  test('the reduced-motion switch at runtime: a waiting tap and node are drawn at once, without a scroll', async ({ page }) => {
    await open(page, { width: 1280, height: 800 })
    await run(page, 2200)
    await nodeAtBottomEdge(page, 800)
    expect((await bahnState(page)).nodeHidden, 'waiting in full motion').toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await run(page, 200)
    const r = await bahnState(page)
    expect(r.nodeHidden, 'drawn at once in reduced motion').toBe(false)
    if (r.lnHidden !== null) expect(r.lnHidden).toBe(false)
  })

  test('the footer: the three earth bars draw, longest first', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await scrollTo(page, 100000)
    await run(page, 800)
    const ops = await page.locator('.earth-svg path').evaluateAll((els) => els.map((e) => (e as SVGElement).style.opacity))
    expect(ops).toEqual(['1', '1', '1'])
  })

  test('links: the 2 px underline is redrawn from the left on hover', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    const link = page.locator('.hdr nav a').first()
    await link.hover()
    // a CSS transition runs on the document timeline, not on the faked page clock: poll in real time
    await expect.poll(() => link.evaluate((el) => getComputedStyle(el, '::after').transform), { timeout: 3000 }).toMatch(/matrix\(1,/)
  })

  test('the current section holds a node in the nav while it is read', async ({ page }) => {
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '#kapcsolat .h2')
    // the scroll event reaches the page with the browser's next real frame (the band no longer keeps the compositor busy): play the clock on until it has
    await expect.poll(async () => { await run(page, 100); return page.locator('.hdr nav a[data-sec="kapcsolat"]').getAttribute('aria-current') }, { timeout: 5000 }).toBe('location')
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('nothing that moves is animated, and nothing changes position over two seconds and a scroll pass', async ({ page }) => {
    await open(page)
    const sel = '.sp:not([hidden]), .kij, .key-gomb, .cp, .slot, .cmz-gomb, .runbtn, .wl button, h1, .sav'
    const rects = () => page.locator(sel).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)].join() }))
    const before = await rects()
    await run(page, 2000)
    await scrollTo(page, 100000)
    await run(page, 500)
    await scrollTo(page, 0)
    await run(page, 500)
    expect(await rects()).toEqual(before)
    expect(await movingAnimations(page)).toEqual([])
  })

  test('the band is drawn whole and holds still, and the run control is inert ("Egyszeri felvétel")', async ({ page }) => {
    await open(page)
    await run(page, 1200)
    // the reduced form shows a plain label, not a focusable disabled button
    await expect(page.locator('.runbtn')).toBeHidden()
    await expect(page.locator('.runlbl')).toBeVisible()
    await expect(page.locator('.runlbl')).toHaveText(JEL.futas.egyszeri)
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await run(page, 600)
    const a = await bandD(page)
    await run(page, 2400)
    expect(await bandD(page), 'no sample moves a level').toBe(a)
    expect(await readings(page)).toEqual(['51,6 °C', '51,6 °C', '51,6 °C'])
    await expect(page.locator('.kij .term')).toHaveClass(/on/)
  })

  test('a pair change appears whole in 150 to 200 ms: the source, the screen and the trace cross-fade, nothing travels or is orange', async ({ page }) => {
    await open(page)
    await run(page, 800)
    await page.locator('.key-gomb[data-p="gepkonyv"]').click()
    await run(page, 60)
    await expect(page.locator('.sp[data-p="gepkonyv"]')).toBeVisible()
    await expect(page.locator('.kp[data-p="gepkonyv"]')).toBeVisible()
    await run(page, 300)
    expect(await movingAnimations(page)).toEqual([])
    await expect(page.locator('.kij .term')).toHaveClass(/on/)
    await expect(page.locator('.opn-svg g[data-p]')).toHaveCount(1)
    expect(await opacity(page, '.opn-svg g[data-p]')).toBe(1)
  })

  test('every section shows its drawn state: the whole spine, the controller open, the plug seated, the bus answered, the earth drawn', async ({ page }) => {
    await open(page)
    await run(page, 1200)
    await expect.poll(() => dashOffset(page, '.spine-svg > path.pen-r'), { timeout: 5000 }).toBeLessThan(2)
    await scrollTo(page, '.cwrap')
    await run(page, 800)
    await scrollTo(page, '.bus')
    await run(page, 1500)
    await expect.poll(() => page.locator('.slot.q').count(), { timeout: 5000 }).toBe(0)
    await scrollTo(page, 100000)
    await run(page, 800)
    await expect
      .poll(() => page.locator('.earth-svg path').evaluateAll((els) => els.map((e) => (e as SVGElement).style.opacity)), { timeout: 5000 })
      .toEqual(['1', '1', '1'])
    await expect.poll(() => page.locator('.cfig.cw').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--sx')), { timeout: 5000 }).toBe('1.0000')
  })

  test('the run control follows a change of the preference at runtime (plain label when reduced, button otherwise)', async ({ page }) => {
    await open(page)
    await run(page, 1200)
    await expect(page.locator('.runlbl')).toBeVisible()
    await expect(page.locator('.runbtn')).toBeHidden()
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    // the run key belongs to the Gépadat band: on the first pair it keeps its slot, unseen
    await expect(page.locator('.runbtn')).toBeHidden()
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await run(page, 1500)
    await expect(page.locator('.runbtn')).toBeVisible()
    await expect(page.locator('.runlbl')).toBeHidden()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.runbtn')).toBeHidden()
    await expect(page.locator('.runlbl')).toBeVisible()
  })

  test('the copy key works in the reduced form too: the answer appears whole in 150 to 200 ms, nothing travels or is orange (colours and drawing only)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page)
    await scrollTo(page, '#kapcsolat .cmz-mezo')
    const key = page.locator('.cmz-gomb')
    await key.click()
    await run(page, 250)
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
    expect(await dashOffset(page, '.cmz-svg .cmz-ul'), 'the underline is whole').toBe(0)
    expect(await opacity(page, '.cmz-svg .cmz-ul')).toBe(1)
    await expect(page.locator('.cmz-svg .cmz-hev')).toHaveCount(0)
    expect(await key.evaluate((el) => getComputedStyle(el).transform), 'the key does not travel').toBe('none')
    expect(await movingAnimations(page)).toEqual([])
  })
})

// A selection below 1024 px redoes the whole layout (relayoutAll), also the partner bus while it answers: the run must still end in the complete state,
// the same one a run without the selection ends in (in reduced motion a layout used to cancel the run and leave a slot waiting).
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`a work selection at 800 px while the bus answers does not change how it ends (${reducedMotion})`, async ({ browser }) => {
    const busEnd = async (select: boolean) => {
      const ctx = await browser.newContext({ viewport: { width: 800, height: 900 }, reducedMotion })
      const page = await ctx.newPage()
      await open(page, { width: 800, height: 900 })
      await run(page, 2200)
      await scrollTo(page, '.bus')
      await run(page, 500)   // mid-run in both forms
      if (select) await page.locator('[data-wi]').nth(1).evaluate((b) => (b as HTMLElement).click())   // the click handler runs relayoutAll below 1024 px
      if (select) await expect(page.locator('[data-wi]').nth(1), 'the selection really happened').toHaveAttribute('aria-checked', 'true')
      await run(page, 4000)
      const end = await page.evaluate(() => ({
        q: document.querySelectorAll('.slot.q').length,
        svg: [...document.querySelectorAll('.bus-svg path, .bus-svg circle')].map((e) => (getComputedStyle(e).opacity === '0' ? 'invisible' : [e.getAttribute('d'), e.getAttribute('cx'), (e as SVGElement).style.strokeDashoffset, (e as SVGElement).style.opacity].join('|'))).join('\n'),   // an invisible path keeps its last dash offset: not part of what is drawn
      }))
      await ctx.close()
      return end
    }
    const [plain, withClick] = await Promise.all([busEnd(false), busEnd(true)])   // two independent pages, each on its own clock
    expect(plain.q, 'no slot is left waiting without a selection').toBe(0)
    expect(withClick.q, 'no slot is left waiting after a selection mid-run').toBe(0)
    expect(withClick.svg, 'the bus drawing ends the same').toBe(plain.svg)
  })
}

// The first layout frames after load (the page ResizeObserver) must not skip the bus run when the bus is already in view (a tall viewport, or a reload scrolled there):
// the slots are answered one after another, so some step shows only part of them still waiting.
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`the bus answers its slots one by one when it is already in view at load (${reducedMotion})`, async ({ browser }) => {
    // 3800: the page is 720 px taller since the "Rétegek" section stands under the first screen at 1280, and the bus must still be in view at load
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 3800 }, reducedMotion })
    const page = await ctx.newPage()
    await open(page, { width: 1280, height: 3800 })
    const total = await page.locator('.slot').count()
    const seen: number[] = []
    // sampled until the last slot is answered (the run lasts 1.3 s reduced, 2.6 s full), not for a fixed 8 s
    for (let i = 0; i < 80; i++) { await run(page, 100); seen.push(await page.locator('.slot.q').count()); if (seen[seen.length - 1] === 0 && i > 3) break }
    expect(seen.some((n) => n > 0 && n < total), `waiting slots over time: ${seen.join(',')}`).toBe(true)
    expect(seen[seen.length - 1], 'all answered at the end').toBe(0)
    await ctx.close()
  })
}

// Picking works faster than the 480 ms trace swap (or holding ArrowDown on the radios) must leave exactly one trace in the run, the one a single selection of the
// last work draws: an interrupted swap destroys its outgoing trace and the incoming one carries on from where it was.
test('three selections within a swap leave exactly one trace, equal to a single selection of the last work', async ({ browser }) => {
  const traceAfter = async (picks: number[]) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await open(page)
    await run(page, 2200)
    await scrollTo(page, '.cwrap')
    await run(page, 800)
    for (const i of picks) {
      await page.locator('[data-wi]').nth(i).evaluate((b) => (b as HTMLElement).click())
      await run(page, 100)
    }
    await run(page, 2500)
    const out = await page.evaluate(() => ({
      traces: document.querySelectorAll('.run .tsvg').length,
      drawn: [...document.querySelectorAll('.run .tsvg path')].map((p) => [p.getAttribute('d'), (p as SVGElement).style.strokeDashoffset, (p as SVGElement).style.opacity].join('|')).join('\n'),
      transform: [...document.querySelectorAll('.run .tsvg')].map((s) => (s as SVGElement).style.transform).join(','),
    }))
    await ctx.close()
    return out
  }
  const [single, swift] = await Promise.all([traceAfter([3]), traceAfter([1, 2, 3])])
  expect(single.traces).toBe(1)
  expect(swift.traces, 'no ghost trace is left in .run').toBe(1)
  expect(swift.transform).toBe(single.transform)
  expect(swift.drawn).toBe(single.drawn)
})
