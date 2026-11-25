import { expect, test, type Page } from '@playwright/test'
import { CNC1_HOMERSEKLET, HOM_MAX, HOM_MIN, fmt, homAblak, homIdo } from '../src/site/fooldal/jelalak'

// The first screen's states under fast, overlapping input (the keys, the load sweep, the motion preference taken at runtime) and the readings of the probe. The page's own clock is
// the test's: Playwright's fake clock drives every timer and frame of the sequence, so "within 180 ms of the key" is exact, not a race.
const T0 = new Date('2026-11-16T10:00:00Z')
/** Every reading the Gépadat pair can show: one of the demo's own 60 samples. */
const HOM_TEXTS = CNC1_HOMERSEKLET.map((v) => `${fmt(v)} °C`)

async function run(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 50) await page.clock.runFor(50)
}
/** Opens the home page on the fake clock; `settle` runs the load sequence to its end, otherwise it stops at the first frame after the keys came alive (the sweep is running). */
async function boot(page: Page, settle: boolean, width = 1280) {
  await page.setViewportSize({ width, height: 900 })
  await page.clock.install({ time: T0 })
  await page.clock.pauseAt(new Date(T0.getTime() + 1000))
  await page.goto('/', { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  if (settle) await run(page, 2400)
  else {
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.classList.contains('jel-kesz'))); i++) await page.clock.runFor(50)
    await expect(page.locator('html')).toHaveClass(/jel-kesz/)
  }
}
const key = (page: Page, p: string) => page.locator(`.key-gomb[data-p="${p}"]`)

/** The Gépadat band as the page draws it: its points, with the lane level, the fitted height and the slot grid read from the drawing itself (the window holds the whole hour at 1280 px, so its lowest and highest samples fix the scale). */
async function bandRead(page: Page) {
  const pts = await page.evaluate(() => {
    const d = document.querySelector('.opn-svg g[data-p="gepadat"] path.band-ut')!.getAttribute('d')!
    return [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((q) => [parseFloat(q[1]!), parseFloat(q[2]!)] as [number, number])
  })
  const body = pts.slice(2, -2)   // from the first sample to the end of the held stretch (the lead-in and the turn are not samples)
  const low = pts[0]![1]
  const amp = low - Math.min(...body.map((q) => q[1]))
  const xa = pts[1]![0]
  const x1 = pts[pts.length - 1]![0]
  const grid = homIdo(xa, x1, 220, 12)   // only the slot width is used: the window's N and p follow from the band's x range
  const yAtX = (x: number) => {
    let y = body[0]![1]
    for (let k = 1; k < body.length; k++) {
      const a = body[k - 1]!, b = body[k]!
      if (x < a[0]) break
      if (x >= b[0]) { y = b[1]; continue }
      y = b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])
      break
    }
    return y
  }
  const temp = (y: number) => Math.round((HOM_MIN + ((low - y) / amp) * (HOM_MAX - HOM_MIN)) * 10) / 10
  return { body, low, amp, xa, N: grid.N, p: grid.p, yAtX, temp }
}

/** Everything that says which pair the first screen is in, and whether it is at rest. */
function state(page: Page) {
  return page.evaluate(() => {
    const keys = [...document.querySelectorAll<HTMLElement>('.key-gomb')]
    const term = document.querySelector<HTMLElement>('.term')!
    const paths = [...document.querySelectorAll<SVGPathElement>('.opn-svg > g path.band-ut')]
    return {
      par: document.querySelector('.opening')!.getAttribute('data-par'),
      checked: keys.filter((k) => k.getAttribute('aria-checked') === 'true').map((k) => k.dataset.p),
      stuck: keys.filter((k) => k.style.transform !== '').map((k) => k.dataset.p),
      shown: [...document.querySelectorAll<HTMLElement>('.sp')].filter((s) => !s.hidden).map((s) => s.dataset.p),
      groups: [...document.querySelectorAll('.opn-svg > g')].map((g) => g.getAttribute('data-p')),
      pathTransform: paths.map((p) => p.style.transform),
      dashed: paths.map((p) => p.style.strokeDasharray),
      ticks: [...document.querySelectorAll<SVGPathElement>('.opn-svg > g path.tk')].map((p) => p.style.opacity),
      termOn: term.classList.contains('on'),
      termTransform: term.style.transform,
      termBg: getComputedStyle(term).backgroundColor,
      vege: document.documentElement.classList.contains('jel-vege'),
      focus: (document.activeElement as HTMLElement | null)?.dataset?.p ?? null,
    }
  })
}
/** The pair is whole: one trace group of its own, nothing scaled, dashed or hidden, the terminal lit at its size. */
function expectAtRest(s: Awaited<ReturnType<typeof state>>, par: string, where: string) {
  expect(s.par, `${where}: the screen's pair`).toBe(par)
  expect(s.checked, `${where}: the one checked key`).toEqual([par])
  expect(s.shown, `${where}: the one source shown`).toEqual([par])
  expect(s.groups, `${where}: one trace group, the pair's own`).toEqual([par])
  expect(s.stuck, `${where}: no key left pressed`).toEqual([])
  expect(s.pathTransform.every((t) => t === '' || t === 'none'), `${where}: the trace is not scaled (${s.pathTransform})`).toBe(true)
  expect(s.dashed.every((d) => d === ''), `${where}: the trace is not cut by a dash (${s.dashed})`).toBe(true)
  expect(s.ticks.every((o) => o === '' || o === '1'), `${where}: the ticks are shown (${s.ticks})`).toBe(true)
  expect(s.termOn, `${where}: the terminal is on`).toBe(true)
  expect(s.termTransform, `${where}: the terminal is at its size`).toBe('')
}

test.describe('the keys under fast input', () => {
  test('B then the active pair A within 180 ms: the queued swap to B is dropped, A stays whole', async ({ page }) => {
    await boot(page, true)
    await key(page, 'rendeles').click()
    await run(page, 50)
    await key(page, 'honlap').click()
    await run(page, 2000)
    expectAtRest(await state(page), 'honlap', 'B then A')
  })

  test('a pair switch in the middle of the arrival: the new pair ends whole, nothing of the old one is left', async ({ page }) => {
    await boot(page, true)
    await key(page, 'rendeles').click()
    await run(page, 350)   // the swap has happened (180 ms) and the trace is rising
    await key(page, 'gepadat').click()
    await run(page, 2000)
    expectAtRest(await state(page), 'gepadat', 'switch mid-arrival')
    await key(page, 'gepkonyv').click()
    await run(page, 300)
    await key(page, 'honlap').click()   // back to the pair of the first key's start while the last arrival runs
    await run(page, 2000)
    expectAtRest(await state(page), 'honlap', 'second switch mid-arrival')
  })

  test('two keys within 60 ms leave no key pressed', async ({ page }) => {
    await boot(page, true)
    await key(page, 'rendeles').click()
    await run(page, 30)
    await key(page, 'gepkonyv').click()
    await run(page, 1500)
    const s = await state(page)
    expect(s.stuck, 'no key is left 2 px down').toEqual([])
    expectAtRest(s, 'gepkonyv', 'two quick keys')
  })

  test('holding an arrow key through the four pairs and back to the first ends on the first, focus and screen together', async ({ page }) => {
    await boot(page, true)
    await key(page, 'honlap').focus()
    await page.keyboard.down('ArrowRight')
    for (let i = 0; i < 4; i++) { await page.keyboard.down('ArrowRight'); await run(page, 50) }   // the first down is the press, the later ones are the auto-repeat
    await page.keyboard.up('ArrowRight')
    await run(page, 2000)
    const s = await state(page)
    // five downs from the first pair: B, C, D, A, B
    expectAtRest(s, 'rendeles', 'five arrow downs')
    expect(s.focus, 'the focus is on the key of the shown pair').toBe('rendeles')
  })

  test('four arrow presses from the first pair are a full turn: the first pair again, not the last one the swaps were queued for', async ({ page }) => {
    await boot(page, true)
    await key(page, 'honlap').focus()
    for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowRight'); await run(page, 50) }
    await run(page, 2000)
    const s = await state(page)
    expectAtRest(s, 'honlap', 'a full turn of arrows')
    expect(s.focus).toBe('honlap')
  })
})

test.describe('the load sweep and the motion preference', () => {
  test('a key during the load sweep ends the load: html.jel-vege, the terminal on, then the key\'s own arrival', async ({ page }) => {
    await boot(page, false)
    expect((await state(page)).vege, 'the sweep is still running').toBe(false)
    await key(page, 'gepadat').click()
    await run(page, 2500)
    const s = await state(page)
    expect(s.vege, 'the load sequence has an end').toBe(true)
    expectAtRest(s, 'gepadat', 'key during the sweep')
  })

  test('the motion preference changing to reduced during the sweep: the complete form, html.jel-vege', async ({ page }) => {
    await boot(page, false)
    expect((await state(page)).vege).toBe(false)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await run(page, 1500)
    const s = await state(page)
    expect(s.vege, 'the load sequence has an end').toBe(true)
    expect(s.termOn, 'the terminal is on').toBe(true)
    expect(s.dashed.every((d) => d === ''), 'the trace is whole').toBe(true)
    await expect(page.locator('.runlbl')).toBeVisible()
    await expect(page.locator('.runbtn')).toBeHidden()
  })

  test('the preference toggled at rest and in the middle of an arrival: always whole and back to the live form', async ({ page }) => {
    await boot(page, true)
    await key(page, 'rendeles').click()
    await run(page, 300)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await run(page, 600)
    expectAtRest(await state(page), 'rendeles', 'reduced in the middle of an arrival (the pair that had swapped in, whole)')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await run(page, 600)
    await expect(page.locator('.runbtn'), 'the run key is for the Gépadat band only: not seen on Rendelés').toBeHidden()
    await key(page, 'gepadat').click()
    await run(page, 1500)
    await expect(page.locator('.runbtn')).toBeVisible()
    expectAtRest(await state(page), 'gepadat', 'live again')
  })

  test('the terminal\'s fill has no transition of its own: lit, its colour is the "on" colour at once (the fake clock cannot run a CSS transition, so the absence is what is asserted)', async ({ page }) => {
    await boot(page, true)
    await key(page, 'gepadat').click()
    await run(page, 1200)
    const m = await page.evaluate(() => {
      const term = document.querySelector('.term')!
      const probe = document.createElement('i')
      probe.style.color = 'var(--be)'
      document.body.appendChild(probe)
      const be = getComputedStyle(probe).color
      probe.remove()
      const cs = getComputedStyle(term)
      return { be, bg: cs.backgroundColor, on: term.classList.contains('on'), durations: cs.transitionDuration.split(',').map((d) => parseFloat(d)), props: cs.transitionProperty, anims: term.getAnimations().length }
    })
    expect(m.on, 'the terminal is lit').toBe(true)
    expect(m.durations.every((d) => d === 0), `no transition runs on the terminal: ${m.durations} (${m.props})`).toBe(true)
    expect(m.anims, 'no animation on the terminal').toBe(0)
    expect(m.bg, 'the terminal is filled with the "on" colour').toBe(m.be)
  })
})

test.describe('one state in one place', () => {
  test('data-run sits on the first screen\'s root next to data-par and follows the run key', async ({ page }) => {
    await boot(page, true)
    const root = page.locator('.opening')
    await expect(root).toHaveAttribute('data-par', 'honlap')
    await expect(root).toHaveAttribute('data-run', 'run')
    // the run key belongs to the Gépadat band, the only one that moves: on the other pairs it keeps its slot but is not seen and cannot be reached
    await expect(page.locator('.runbtn')).toBeHidden()
    const slot = await page.locator('.runbtn').boundingBox()
    await key(page, 'gepadat').click()
    await run(page, 1500)
    await expect(page.locator('.runbtn')).toBeVisible()
    expect(await page.locator('.runbtn').boundingBox(), 'the key sits in the slot that was reserved: no layout shift').toEqual(slot)
    await page.locator('.runbtn').click()
    await expect(root).toHaveAttribute('data-run', 'stop')
    await expect(page.locator('.runbtn')).toHaveAttribute('aria-pressed', 'false')
    await page.locator('.runbtn').click()
    await expect(root).toHaveAttribute('data-run', 'run')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(root).toHaveAttribute('data-run', 'stop')
  })

  test('the arrival reads its pause from the root\'s --t-pause: a longer pause holds the old pair on the screen longer', async ({ page }) => {
    await boot(page, true)
    await page.evaluate(() => (document.querySelector('.opening') as HTMLElement).style.setProperty('--t-pause', '600ms'))
    await key(page, 'gepadat').click()
    await run(page, 400)
    await expect(page.locator('.opening'), 'the swap is still waiting at 400 ms').toHaveAttribute('data-par', 'honlap')
    await run(page, 350)
    await expect(page.locator('.opening'), 'the swap came after 60 + 600 ms').toHaveAttribute('data-par', 'gepadat')
  })
})

test.describe('only true figures on the first screen', () => {
  test('the head and the reading of each pair: addresses and the demo\'s own values, no drawn figure', async ({ page }) => {
    await boot(page, true)
    const read = () => page.evaluate(() => ({ head: document.querySelector('.kij-olv')!.textContent, reading: document.querySelector('.ctl-row .reading')!.textContent }))
    expect(await read(), 'Honlap: the live address (from its link, without the scheme so that it fits the head row of the screen), no reading (the speech trace has no time base)').toEqual({ head: 'lelekesnyelv.hu', reading: '' })
    await key(page, 'rendeles').click()
    await run(page, 1500)
    expect(await read()).toEqual({ head: '/demos/lapszabaszat/', reading: '' })
    await key(page, 'gepkonyv').click()
    await run(page, 1500)
    expect(await read(), 'the QR code has 29 modules in a row').toEqual({ head: '29 bit', reading: '29 bit' })
    await key(page, 'gepadat').click()
    await run(page, 1500)
    const g = await read()
    expect(HOM_TEXTS, 'CNC-1\'s reading is a value the demo holds (the live head is one of its 60 samples)').toContain(g.head)
    expect(g.reading).toBe(g.head)
  })

  test('the Gépadat trace is the demo\'s hour on a fitted scale: the lowest sample on the lane level, the highest at the top, one vertical step at its start', async ({ page }) => {
    await boot(page, true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await key(page, 'gepadat').click()
    await run(page, 800)
    const m = await page.evaluate(() => {
      const g = document.querySelector('.opn-svg g[data-p="gepadat"]')!
      const d = g.querySelector('path.band-ut')!.getAttribute('d')!
      const pts = [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((q) => [parseFloat(q[1]!), parseFloat(q[2]!)] as const)
      const body = pts.slice(2, -2).map((p) => p[1])
      return { low: pts[0]![1], lead: pts[1]!, first: pts[2]!, max: Math.max(...body), min: Math.min(...body), top: document.querySelector('[data-skala="max"]')!.textContent, bottom: document.querySelector('[data-skala="min"]')!.textContent }
    })
    expect(m.max, 'the hour\'s lowest sample (50,7) is on the lane level').toBeCloseTo(m.low, 0)
    expect(m.low - m.min, 'the highest sample (53,1) stands a full fitted height above it, not a few pixels').toBeGreaterThanOrEqual(70)
    expect(m.first[0], 'the lead-in meets the first sample with one vertical step: same x').toBe(m.lead[0])
    expect(m.first[1], 'and the step goes to the first sample (51,5), above the lane level').toBeLessThan(m.low)
    expect([m.top, m.bottom], 'the card states the scale: the hour\'s highest and lowest sample').toEqual([`${fmt(Math.max(...CNC1_HOMERSEKLET))} °C`, `${fmt(Math.min(...CNC1_HOMERSEKLET))} °C`])
    expect([m.top, m.bottom]).toEqual(['53,1 °C', '50,7 °C'])
  })

  for (const width of [1280, 360]) test(`the Gépadat band is one continuous hour at ${width} px: read back at the samples' x positions it is the window's values in order, at rest and after live samples, and a vertical step stands only where two consecutive samples differ`, async ({ page }) => {
    await boot(page, true, width)
    await key(page, 'gepadat').click()
    await run(page, 700)   // arrived, no sample yet
    let done = 0
    for (const samples of [0, 1, 2, 17, 34, 61]) {
      for (; done < samples; done++) await page.clock.runFor(800)
      const b = await bandRead(page)
      const win = homAblak((CNC1_HOMERSEKLET.length - 1 + samples) % CNC1_HOMERSEKLET.length, b.N)
      // a narrow band holds only part of the hour, so its highest sample is below 53,1: the scale (px per degree) follows from the window's own highest sample standing b.amp above the lane level
      const amp = (b.amp * (HOM_MAX - HOM_MIN)) / (Math.max(...win) - HOM_MIN)
      const temp = (y: number) => Math.round((HOM_MIN + ((b.low - y) / amp) * (HOM_MAX - HOM_MIN)) * 10) / 10
      const read = win.map((_, j) => temp(b.yAtX(b.xa + (j + 0.5) * b.p)))
      expect(read, `after ${samples} samples the band is the window ending at the current sample, oldest first`).toEqual(win)
      // every vertical edge of the drawing (but the lead-in at the lane) sits on a slot boundary and is exactly as tall as the two samples around it differ
      for (let k = 1; k < b.body.length; k++) {
        const a = b.body[k - 1]!, c = b.body[k]!
        if (Math.abs(a[0] - c[0]) > 0.06 || Math.abs(a[1] - c[1]) < 0.06 || Math.abs(c[0] - b.xa) < 0.06) continue
        const j = Math.round((c[0] - b.xa) / b.p)
        expect(Math.abs(c[0] - (b.xa + j * b.p)), `the step at x ${c[0]} is on a slot boundary`).toBeLessThan(0.2)
        expect(Math.abs(a[1] - c[1]), `the step into sample ${j} is the two samples' difference, not more (after ${samples} samples)`).toBeCloseTo((Math.abs(win[j]! - win[j - 1]!) * amp) / (HOM_MAX - HOM_MIN), 0)
      }
    }
  })

  for (const [par, width] of [['rendeles', 1280], ['gepkonyv', 1280], ['rendeles', 360], ['gepkonyv', 360]] as const) test(`the ${par} held levels carry no noise at ${width} px: steps between the trace's own levels (at most two), the same at rest and after the clock ticked`, async ({ page }) => {
    await boot(page, true, width)
    await key(page, par).click()
    await run(page, 1200)
    const held = () => page.evaluate((p) => {
      const d = document.querySelector(`.opn-svg g[data-p="${p}"] path.band-ut`)!.getAttribute('d')!
      const pts = [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((q) => [parseFloat(q[1]!), parseFloat(q[2]!)] as const)
      const x1 = pts[pts.length - 1]![0]
      return { low: pts[0]![1], ys: pts.filter((q) => q[0] > x1 - 150 && q[0] < x1 - 5).map((q) => q[1]) }
    }, par)
    const rest = await held()
    expect(rest.ys.length, 'the held stretch has points').toBeGreaterThan(4)
    for (const ticks of [0, 3, 6]) {
      for (let k = 0; k < (ticks ? 3 : 0); k++) await page.clock.runFor(800)
      const h = await held()
      expect([...new Set(h.ys)].length, `after ${ticks} ticks the held levels take at most two values (a noisy level would make nearly every slot its own)`).toBeLessThanOrEqual(2)
      expect(h.ys, 'and they are the levels at rest, tick after tick').toEqual(rest.ys)
    }
  })

  test('the Gépadat reading at rest is 51,6 in the head, the readout and the cell, and a live sample is the demo\'s next value, cyclically', async ({ page }) => {
    await boot(page, true)
    const three = () => page.evaluate(() => [document.querySelector('.kij-olv')!.textContent, document.querySelector('.ctl-row .reading')!.textContent, document.querySelector('[data-hom]')!.textContent])
    await key(page, 'gepadat').click()
    await run(page, 700)   // arrived, no sample yet
    expect(await three(), 'at rest').toEqual(['51,6 °C', '51,6 °C', '51,6 °C'])
    for (let k = 0; k < 62; k++) {
      await page.clock.runFor(800)
      const v = await three()
      expect(v, `sample ${k}: head, readout and cell are the demo's value at index ${k % 60}`).toEqual(Array(3).fill(`${fmt(CNC1_HOMERSEKLET[k % 60]!)} °C`))
    }
  })
})

test.describe('the probe and the head of the Gépadat pair', () => {
  /** The pointer on the band at a distance `dx` from the lane (positive) or `fromRight` px left of the terminal. */
  async function pointer(page: Page, where: { dx: number } | { fromRight: number }) {
    const p = await page.evaluate(() => {
      const sav = document.querySelector('.sav')!.getBoundingClientRect()
      const lane = document.querySelector('.hdr .lane')!.getBoundingClientRect()
      const term = document.querySelector('.term')!.getBoundingClientRect()
      return { y: sav.bottom - 10, lane: lane.left + lane.width / 2, term: term.left + term.width / 2 }
    })
    const x = 'dx' in where ? p.lane + where.dx : p.term - where.fromRight
    await page.mouse.move(x - 3, p.y)
    await page.mouse.move(x, p.y)
  }
  const values = (page: Page) => page.evaluate(() => ({ head: document.querySelector('.kij-olv')!.textContent, reading: document.querySelector('.ctl-row .reading')!.textContent }))

  test('a sample does not overwrite the reading under the pointer: it is the value of the sample that stands under the pointer in the moving window', async ({ page }) => {
    await boot(page, true)
    await key(page, 'gepadat').click()
    await run(page, 1500)
    await pointer(page, { dx: 40 })
    const cx = await page.evaluate(() => parseFloat(document.querySelector('.opn-svg .probe-d')!.getAttribute('cx')!))
    const heads = new Set<string | null>()
    let moved = false
    for (let i = 0; i < 8; i++) {
      await run(page, 800) // one sample
      const v = await values(page)
      heads.add(v.head)
      // the window has shifted by one sample: the pointer, resting, reads the sample now under it, never the head's own number
      const b = await bandRead(page)
      expect(v.reading, `sample ${i}: the reading is the value of the sample drawn under the pointer`).toBe(`${fmt(b.temp(b.yAtX(cx)))} °C`)
      if (v.reading !== v.head) moved = true
    }
    expect(moved, "the reading is not overwritten by the live head: it differed from the head at least once").toBe(true)
  })

  test('the head and the probe use one scale: a pointer resting at the end of the trace reads the head\'s value, sample after sample', async ({ page }) => {
    await boot(page, true)
    await key(page, 'gepadat').click()
    await run(page, 1500)
    await pointer(page, { fromRight: 2 })   // it stays there: the probe follows the moving trace by itself
    for (let i = 0; i < 8; i++) {
      await run(page, 800)
      const v = await values(page)
      expect(v.reading, `sample ${i}: the probe at the end of the trace and the head`).toBe(v.head)
    }
  })

  test('the probe only reads the demo\'s own values: snapped to a sample, its dot on the drawn trace, wherever the pointer rests on the band', async ({ page }) => {
    await boot(page, true)
    await key(page, 'gepadat').click()
    await run(page, 1500)
    for (const dx of [30, 123, 311, 480, 640, 800]) {
      await pointer(page, { dx })
      const m = await page.evaluate(() => {
        const dot = document.querySelector('.opn-svg .probe-d')!
        return { cx: parseFloat(dot.getAttribute('cx')!), cy: parseFloat(dot.getAttribute('cy')!), reading: document.querySelector('.ctl-row .reading')!.textContent }
      })
      expect(HOM_TEXTS, `at dx ${dx}: the reading is one of the demo's samples (no interpolated value)`).toContain(m.reading)
      const b = await bandRead(page)
      expect(Math.abs(b.yAtX(m.cx) - m.cy), `at dx ${dx}: the dot is on the drawn trace`).toBeLessThan(0.6)
      expect(`${fmt(b.temp(m.cy))} °C`, `at dx ${dx}: the reading is the value at the dot`).toBe(m.reading)
      expect(Math.abs((((m.cx - b.xa) / b.p) % 1) - 0.5), `at dx ${dx}: the dot stands in the middle of a sample's slot`).toBeLessThan(0.02)
    }
  })

  test('the probe\'s marks are gone after a pair switch', async ({ page }) => {
    await boot(page, true)
    await key(page, 'gepadat').click()
    await run(page, 1500)
    await pointer(page, { dx: 120 })
    const on = await page.evaluate(() => [...document.querySelectorAll<SVGElement>('.opn-svg .probe-l, .opn-svg .probe-d')].map((e) => e.style.opacity))
    expect(on, 'the marks are drawn while the pointer is on the band').toEqual(['1', '1'])
    await key(page, 'gepadat').focus()
    await page.keyboard.press('ArrowRight')   // by keyboard: the pointer stays on the band, so no pointerleave hides the marks for us
    await run(page, 1500)
    const off = await page.evaluate(() => [...document.querySelectorAll<SVGElement>('.opn-svg .probe-l, .opn-svg .probe-d')].map((e) => e.style.opacity))
    expect(off, 'the marks do not stay on the speech band').toEqual(['0', '0'])
    expect((await state(page)).par).toBe('honlap')
  })
})
