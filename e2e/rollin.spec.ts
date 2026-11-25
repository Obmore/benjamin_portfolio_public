import { expect, test, type Page, type Request } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { waitForPageFonts } from './fonts'

// The Rollin block of /munkaim/: the photo, five selector keys and the dock scene (src/rollin/, started by src/site/munkaim.ts as the standalone script rollin-futtat-<hash>.js).
// No pixel baselines and no fixed sleeps: transitions are driven with the Playwright clock, everything else waits on state.

const SCRIPT = /\/assets\/rollin-futtat-[\w-]+\.js/
const CARD = '#munka-rollin'
const HOOK = `${CARD} [data-rollin-vez]`
const KEYS = `${CARD} .mb-gomb`
const STATUS = `${CARD} .mb-allapot`
const ANNOUNCER = `${CARD} .mb-bejelentes`
const DRAWING = `${CARD} [data-rollin-rajz]`
const CAPTION = 'Fénykép a rollindocking.com oldaláról.'
const STATES = {
  docked: 'A jármű dokkolva van',
  signal: 'A kérés eljut az állomáshoz.',
  open: 'A zár kinyílik.',
  leaving: 'A jármű elhagyja a dokkolót.',
  ride: 'A jármű úton van',
  return: 'A jármű visszakerül a dokkolóba.',
  locking: 'a zár bezárul.',
  charge: 'a töltés elindult.',
}

/** Pushes the block far below the first screen so that "near the viewport" is a scroll position, not a layout accident. */
async function pushCardDown(page: Page) {
  await page.route('**/munkaim/', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace('</head>', `<style>${CARD}{margin-top:4000px}</style></head>`)
    await route.fulfill({ response, body })
  })
}

function scriptRequests(page: Page) {
  const seen: Request[] = []
  page.on('request', (request) => {
    if (SCRIPT.test(request.url())) seen.push(request)
  })
  return seen
}

async function scrollCardTo(page: Page, distanceBelowViewport: number) {
  await page.evaluate((distance) => {
    const top = document.querySelector('#munka-rollin')!.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, top - window.innerHeight - distance)
  }, distanceBelowViewport)
  // Two frames: the IntersectionObserver callback has been delivered.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

/** Plays the clock forward in 50 ms steps until the status line shows the text; each step is far shorter than any transition. */
async function until(page: Page, text: string) {
  const status = page.locator(STATUS)
  for (let step = 0; step < 200; step += 1) {
    if (((await status.textContent()) ?? '').includes(text)) break
    await page.clock.runFor(50)
  }
  await expect(status).toContainText(text)
}

async function openWithClock(page: Page) {
  // The clock keeps running while the scene builds (resumable steps use timers on engines without scheduler.yield).
  await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') })
  await page.goto('/munkaim/')
  await page.locator(CARD).scrollIntoViewIfNeeded()
  await ready(page)
  // The fake clock keeps ticking in real time until it is paused, and on a loaded runner more than a second can pass
  // between reading it and the pauseAt call ("Cannot fast-forward to the past"). Re-read the clock and double the margin
  // on each attempt (1, 2, 4, 8 s: pauseAt fires timers due inside that window, so it stays small).
  for (let attempt = 0, margin = 1000; ; attempt += 1, margin *= 2) {
    const now = await page.evaluate(() => Date.now())
    try {
      await page.clock.pauseAt(now + margin)
      return
    } catch (error) {
      if (attempt >= 3 || !/fast-forward to the past/i.test(String(error))) throw error
    }
  }
}

/** The keys and the status line are in the page from the start; the scene is ready when the keys are enabled. */
const ready = (page: Page) => expect(page.locator(HOOK)).toHaveAttribute('data-allapot', 'kesz')
const checked = (page: Page) => page.locator(KEYS).evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-checked')))
const tabindexes = (page: Page) => page.locator(KEYS).evaluateAll((buttons) => buttons.map((b) => b.getAttribute('tabindex')))
/** The step keys follow the photo's key: Dokkolva 1, Nyitás 2, Úton 3, Töltés 4. */
/** 1200 ms of animation plus one 60 Hz frame of rounding for each of at most five stages: a stage ends on the first frame at or after its own time. */
const SLACK = 1200 + 5 * 17
const KEY = { photo: 0, docked: 1, open: 2, ride: 3, charge: 4 }

test.describe('Rollin block: loading', () => {
  test('the script is requested only when the block nears the viewport; the keys are in the page, disabled, until then', async ({ page }) => {
    const scripts = scriptRequests(page)
    await pushCardDown(page)
    await page.goto('/munkaim/', { waitUntil: 'networkidle' })
    await expect(page.locator(HOOK)).toHaveAttribute('data-allapot', 'betolt')
    await expect(page.locator(KEYS).first()).toBeDisabled()
    await expect(page.locator(DRAWING)).toBeHidden()
    expect(scripts).toHaveLength(0)

    await scrollCardTo(page, 1200)
    expect(scripts, 'block 1200 px below the viewport: still lazy').toHaveLength(0)

    await scrollCardTo(page, 300)
    await ready(page)
    expect(scripts).toHaveLength(1)
    await expect(page.locator('svg.rd-render')).toHaveAttribute('data-motion', 'idle')
    expect(await page.locator('svg.rd-render > *').count()).toBeGreaterThan(20)
    // The block stayed below the viewport while the scene was built.
    expect(await page.locator(HOOK).evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(0)
    // The photo is still what shows: the drawing waits behind the first step key.
    await expect(page.locator(DRAWING)).toBeHidden()
  })

  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 320, height: 700 }]) {
    test(`nothing moves while the script loads and when the scene arrives (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number }
        w.__cls = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) w.__cls += entry.value
        }).observe({ type: 'layout-shift', buffered: true })
      })
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      await page.route(SCRIPT, async (route) => {
        await gate
        await route.continue()
      })
      await page.goto('/munkaim/', { waitUntil: 'domcontentloaded' })
      await page.locator(CARD).scrollIntoViewIfNeeded()
      const hook = page.locator(HOOK)
      await expect(hook).toHaveAttribute('data-allapot', 'betolt')
      await expect(page.locator(KEYS).first()).toBeDisabled()
      await expect(page.locator(ANNOUNCER)).not.toHaveAttribute('aria-live', /.*/)
      // The reference positions are taken with the web fonts in: a font swap re-wraps text and is not the scene's move.
      await waitForPageFonts(page, test.info())
      const boxes = async () => ({
        block: (await page.locator(CARD).boundingBox())!,
        picture: (await page.locator(`${CARD} .mb-ter`).boundingBox())!,
        keys: (await hook.boundingBox())!,
        below: await page.locator('#evek').evaluate((el) => el.getBoundingClientRect().top + window.scrollY),
      })
      const reserved = await boxes()
      release()
      await ready(page)
      await expect(page.locator(ANNOUNCER)).toHaveAttribute('aria-live', 'polite')
      await expect(page.locator(KEYS).first()).toBeEnabled()
      const final = await boxes()
      expect(Math.abs(final.block.height - reserved.block.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(final.picture.height - reserved.picture.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(final.keys.y - reserved.keys.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(final.below - reserved.below)).toBeLessThanOrEqual(1)
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.1)
    })
  }

  test('no long task over 50 ms while the scene is built', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the Long Tasks API is Chromium only')
    await page.addInitScript(() => {
      const w = window as unknown as { __long: { start: number; duration: number }[] }
      w.__long = []
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__long.push({ start: entry.startTime, duration: entry.duration })
      }).observe({ type: 'longtask' })
    })
    await pushCardDown(page)
    await page.goto('/munkaim/', { waitUntil: 'networkidle' })
    // The observer must be able to see a long task at all: a deliberate 120 ms task is reported. The wait is for that task itself (a long task of the page load
    // may already be in the list, and the measuring window must not open before the deliberate one has ended).
    await page.evaluate(() => {
      const w = window as unknown as { __probeStart?: number; __probeEnd?: number }
      setTimeout(() => {
        const start = performance.now()
        w.__probeStart = start
        while (performance.now() - start < 120);
        w.__probeEnd = performance.now()
      }, 0)
    })
    await expect.poll(() => page.evaluate(() => {
      const w = window as unknown as { __probeStart?: number; __probeEnd?: number; __long: { start: number; duration: number }[] }
      return w.__probeEnd !== undefined && w.__long.some((t) => t.start >= w.__probeStart! - 2 && t.start <= w.__probeEnd! && t.duration >= 100)
    }), { message: 'the deliberate 120 ms task is reported as a long task' }).toBe(true)
    const from = await page.evaluate(() => {
      const t = Math.max(performance.now(), (window as unknown as { __probeEnd: number }).__probeEnd)
      document.querySelector('#munka-rollin')!.scrollIntoView()
      return t
    })
    await ready(page)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const tasks = (await page.evaluate(() => (window as unknown as { __long: { start: number; duration: number }[] }).__long)).filter((t) => t.start >= from)
    test.info().annotations.push({ type: 'long tasks', description: JSON.stringify(tasks) })
    expect(tasks, `long tasks while building: ${JSON.stringify(tasks)}`).toEqual([])
  })

  test('with the Save-Data preference the script is never requested and the keys and the status line are removed', async ({ page }) => {
    const scripts = scriptRequests(page)
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }))
    await page.goto('/munkaim/', { waitUntil: 'networkidle' })
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(scripts).toHaveLength(0)
    await expect(page.locator(HOOK)).toHaveCount(0)
    await expect(page.locator(DRAWING)).toHaveCount(0)
    await expect(page.locator(`${CARD} .mb-ter img`)).toBeVisible()
    await expect(page.locator(CARD)).toContainText('Rollin Technologies')
  })

  test('if the script cannot be loaded the keys and the status line go and the photo stays', async ({ page }) => {
    await page.route(SCRIPT, (route) => route.abort())
    const failed = page.waitForEvent('requestfailed', (request) => SCRIPT.test(request.url()))
    await page.goto('/munkaim/', { waitUntil: 'networkidle' })
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await failed
    await expect(page.locator(HOOK)).toHaveCount(0)
    await expect(page.locator(DRAWING)).toHaveCount(0)
    await expect(page.locator(`${CARD} .mb-ter img`)).toBeVisible()
    await expect(page.locator(CARD)).toContainText('Elektromos rollerek és kerékpárok szállodai bérlését')
  })
})

test.describe('Rollin block: without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the photo and the text stay, no keys and no status line show', async ({ page }) => {
    await page.goto('/munkaim/')
    await expect(page.locator(CARD)).toContainText('Rollin Technologies')
    await expect(page.locator(CARD)).toContainText('A recepció a szoftverből indíthatja a nyitást.')
    await expect(page.locator(`${CARD} .mb-ter img`)).toBeVisible()
    await expect(page.locator(HOOK)).toBeHidden()
    await expect(page.locator(DRAWING)).toBeHidden()
  })
})

test.describe('Rollin block: the keys and the picture area', () => {
  test('one single-choice group: the photo key first and selected, the status line shows the caption, no other box moves', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    await expect(keys).toHaveText(['Fénykép', 'Dokkolva', 'Nyitás', 'Úton', 'Töltés'])
    await expect(page.getByRole('radiogroup', { name: 'Egy bérlés a dokkolóban' })).toBeVisible()
    expect(await checked(page)).toEqual(['true', 'false', 'false', 'false', 'false'])
    await expect(page.locator(STATUS)).toHaveText(CAPTION)
    await expect(page.locator(DRAWING)).toBeHidden()
    // At load the live region has not been written: nothing is announced unprompted.
    await expect(page.locator(ANNOUNCER)).toHaveText('')

    const picture = page.locator(`${CARD} .mb-ter`)
    const boxes = async () => [await picture.boundingBox(), await page.locator(HOOK).boundingBox(), await page.locator(`${CARD} .mb-szov`).boundingBox()]
    const before = await boxes()
    await keys.nth(KEY.docked).click()
    await expect(page.locator(DRAWING)).toBeVisible()
    expect(await boxes()).toEqual(before)
    // The photo is hidden from assistive technology while the drawing shows, and the drawing is described in its place.
    await expect(picture.locator('img')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.getByRole('img', { name: /négy dokkolóhelyet és egy elektromos rollert/ })).toBeVisible()
    await expect(page.locator('svg.rd-render')).toHaveAttribute('aria-hidden', 'true')

    await keys.nth(KEY.photo).click()
    await expect(page.locator(DRAWING)).toBeHidden()
    await expect(picture.locator('img')).not.toHaveAttribute('aria-hidden', /.*/)
    await expect(page.locator(STATUS)).toHaveText(CAPTION)
    expect(await checked(page)).toEqual(['true', 'false', 'false', 'false', 'false'])
    expect(await boxes()).toEqual(before)
  })

  test('the drawing arrives in 12 hard steps (240 ms) and, under reduced motion, in a short cross-fade', async ({ page, browser }) => {
    await openWithClock(page)
    await page.locator(KEYS).nth(KEY.docked).click()
    expect(await page.locator(DRAWING).evaluate((el) => getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration + ' ' + getComputedStyle(el).animationTimingFunction)).toMatch(/^mb-nyit 0\.24s steps\(12(, (jump-end|end))?\)$/)
    const reduced = await browser.newContext({ reducedMotion: 'reduce' })
    const quiet = await reduced.newPage()
    await quiet.goto('/munkaim/')
    await quiet.locator(CARD).scrollIntoViewIfNeeded()
    await ready(quiet)
    await quiet.locator(KEYS).nth(KEY.docked).click()
    expect(await quiet.locator(DRAWING).evaluate((el) => getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration)).toBe('mb-be 0.18s')
    await reduced.close()
  })

  test('the arrows move the focus only; Enter presses; the row is one tab stop that follows the focus', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    expect(await tabindexes(page)).toEqual(['0', '-1', '-1', '-1', '-1'])
    await keys.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(keys.nth(1)).toBeFocused()
    expect(await tabindexes(page)).toEqual(['-1', '0', '-1', '-1', '-1'])
    expect(await checked(page), 'the arrow does not select').toEqual(['true', 'false', 'false', 'false', 'false'])
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(keys.nth(4)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(keys.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(keys.nth(2)).toBeFocused()
    // Tab leaves the row; the one tab stop goes back to the selected key.
    await page.keyboard.press('Tab')
    await expect(page.locator(`${CARD} a.mb-cta`)).toBeFocused()
    expect(await tabindexes(page)).toEqual(['0', '-1', '-1', '-1', '-1'])
    await page.keyboard.press('Shift+Tab')
    await expect(keys.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    await expect(page.locator(STATUS)).toContainText(STATES.docked)
    expect(await checked(page)).toEqual(['false', 'true', 'false', 'false', 'false'])
  })
})

test.describe('Rollin block: rental cycle', () => {
  test('the steps update the status line, aria-checked and the drawing; keyboard works', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    const status = page.locator(STATUS)
    const svg = page.locator('svg.rd-render')
    const photoDrawing = await svg.innerHTML()

    await keys.nth(KEY.docked).click()
    await expect(status).toContainText(STATES.docked)
    expect(await checked(page)).toEqual(['false', 'true', 'false', 'false', 'false'])
    const dockedDrawing = await svg.innerHTML()
    expect(dockedDrawing, 'the first frame and a redrawn "docked" frame are the same artwork').toBe(photoDrawing)

    await keys.nth(KEY.open).focus()
    await page.keyboard.press('Enter')
    await expect(status).toContainText(STATES.signal)
    await expect(svg).toHaveAttribute('data-motion', 'active')
    expect(await checked(page)).toEqual(['false', 'false', 'true', 'false', 'false'])
    await expect(keys.first()).toHaveAttribute('aria-disabled', 'true')
    await until(page, STATES.open)
    await until(page, STATES.leaving)
    expect(await checked(page)).toEqual(['false', 'false', 'false', 'true', 'false'])
    await until(page, STATES.ride)
    await expect(svg).toHaveAttribute('data-motion', 'idle')
    await expect(keys.first()).toHaveAttribute('aria-disabled', 'false')
    expect(await svg.innerHTML()).not.toBe(dockedDrawing)

    await keys.nth(KEY.charge).click()
    await until(page, STATES.return)
    await until(page, STATES.locking)
    expect(await checked(page)).toEqual(['false', 'false', 'false', 'false', 'true'])
    await until(page, STATES.charge)
    await expect(svg).toHaveAttribute('data-motion', 'idle')

    await keys.nth(KEY.docked).click()
    await expect(status).toContainText(STATES.docked)
    expect(await checked(page)).toEqual(['false', 'true', 'false', 'false', 'false'])
    expect(await svg.innerHTML()).toBe(dockedDrawing)
  })

  test('each key\'s whole sequence ends within 1200 ms', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    const status = page.locator(STATUS)
    // From docked: Nyitás runs the request, the latch and the leaving (1650 ms of own time), Töltés runs the whole cycle (2850 ms).
    await keys.nth(KEY.docked).click()
    await keys.nth(KEY.open).click()
    await page.clock.runFor(SLACK)
    await expect(status).toContainText(STATES.ride)
    await keys.nth(KEY.docked).click()
    await expect(status).toContainText(STATES.docked)
    await keys.nth(KEY.charge).click()
    await page.clock.runFor(SLACK)
    await expect(status).toContainText(STATES.charge)
    // From the ride, Töltés is the return and the locking: 1200 ms of own time, so unscaled.
    await keys.nth(KEY.open).click()
    await page.clock.runFor(SLACK)
    await expect(status).toContainText(STATES.ride)
    await keys.nth(KEY.charge).click()
    await page.clock.runFor(SLACK)
    await expect(status).toContainText(STATES.charge)
  })

  test('the first frame of the resumable build equals a plain updateRenderGraph() frame of the same state', async ({ page }) => {
    await page.goto('/munkaim/')
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await ready(page)
    const svg = page.locator('svg.rd-render')
    const first = await svg.innerHTML()
    expect(first.length).toBeGreaterThan(1000)
    // Pressing Dokkolva redraws the same state through Illustration#updateRenderGraph().
    await page.locator(KEYS).nth(KEY.docked).click()
    await expect(page.locator(STATUS)).toContainText(STATES.docked)
    await expect(svg).toHaveAttribute('data-motion', 'idle')
    expect(await svg.innerHTML()).toBe(first)
    // A different state differs, so the comparison can tell.
    await page.locator(KEYS).nth(KEY.charge).click()
    await expect(page.locator(STATUS)).toContainText(STATES.charge, { timeout: 10_000 })
    expect(await svg.innerHTML()).not.toBe(first)
  })

  test('the drawing is painted with the page\'s tokens and follows the theme with no script', async ({ page }) => {
    await page.goto('/munkaim/')
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await ready(page)
    await page.locator(KEYS).nth(KEY.docked).click()
    const paint = () => page.evaluate(() => {
      const fills = new Set<string>()
      const strokes = new Set<string>()
      for (const el of document.querySelectorAll('svg.rd-render path')) {
        const s = getComputedStyle(el)
        if (el.hasAttribute('fill') && s.fill !== 'none') fills.add(s.fill)
        if (s.stroke !== 'none') strokes.add(s.stroke)
      }
      const root = getComputedStyle(document.documentElement)
      return { fills: [...fills], strokes: [...strokes], attrs: [...document.querySelectorAll('svg.rd-render [fill], svg.rd-render [stroke]')].map((el) => (el.getAttribute('fill') ?? '') + (el.getAttribute('stroke') ?? '')), root: root.getPropertyValue('--tinta') }
    })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.evaluate(() => (document.documentElement.dataset.tema = 'vilagos'))
    const light = await paint()
    await page.evaluate(() => (document.documentElement.dataset.tema = 'sotet'))
    // the theme change is a short colour transition: wait for the dark values
    await expect.poll(async () => (await paint()).fills.join('|'), { message: 'the fills follow the theme' }).not.toBe(light.fills.join('|'))
    await expect.poll(async () => (await paint()).strokes.join('|'), { message: 'the strokes follow the theme' }).not.toBe(light.strokes.join('|'))
    expect(light.fills.length).toBeGreaterThan(2)
    // No colour literal in the drawing: every paint attribute is a var() of a token.
    for (const attr of light.attrs.join(' ').match(/(?:#[0-9a-f]{3,8}|rgb\([^)]*\)|var\([^)]*\))/gi) ?? []) expect(attr).toMatch(/^var\(--(tinta|lap|oldal|jel|be)\)$/)
  })

  test('a step pressed during a running sequence is remembered and followed afterwards', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    await keys.nth(KEY.open).click()
    await expect(page.locator(STATUS)).toContainText(STATES.signal)
    await keys.nth(KEY.charge).dispatchEvent('click')
    await until(page, STATES.charge)
    expect(await checked(page)).toEqual(['false', 'false', 'false', 'false', 'true'])
  })

  test('the photo key during a running sequence takes effect at once and the drawing jumps to its end pose', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    await keys.nth(KEY.open).click()
    await expect(page.locator(STATUS)).toContainText(STATES.signal)
    await keys.nth(KEY.photo).dispatchEvent('click')
    await expect(page.locator(DRAWING)).toBeHidden()
    await expect(page.locator(STATUS)).toHaveText(CAPTION)
    expect(await checked(page)).toEqual(['true', 'false', 'false', 'false', 'false'])
    await expect(page.locator('svg.rd-render')).toHaveAttribute('data-motion', 'idle')
    // Back to the drawing: the sequence's end pose is what shows (the ride), and Úton is its key.
    await keys.nth(KEY.ride).click()
    await expect(page.locator(STATUS)).toContainText(STATES.ride)
    expect(await checked(page)).toEqual(['false', 'false', 'false', 'true', 'false'])
  })

  test('the live region gets only the first and the final status of a run, and nothing for the reset', async ({ page }) => {
    await openWithClock(page)
    const keys = page.locator(KEYS)
    const announced = page.locator(ANNOUNCER)
    await expect(announced).toHaveAttribute('role', 'status')
    await keys.nth(KEY.docked).click()
    await expect(announced).toContainText(STATES.docked)
    await keys.nth(KEY.open).click()
    await expect(announced).toContainText(STATES.signal)
    await until(page, STATES.leaving)
    await expect(announced, 'intermediate stages are not announced').toContainText(STATES.signal)
    await until(page, STATES.ride)
    await expect(announced).toContainText(STATES.ride)
    await keys.nth(KEY.charge).click()
    await until(page, STATES.locking)
    await expect(announced).toContainText(STATES.return)
    await until(page, STATES.charge)
    await expect(announced).toContainText(STATES.charge)
    // Charge -> Nyitás: the intermediate "docked" status is not written, the first stage of the new run is.
    await keys.nth(KEY.open).click()
    await expect(announced).toContainText(STATES.signal)
    await expect(announced).not.toContainText(STATES.docked)
    await until(page, STATES.ride)
    await keys.nth(KEY.photo).click()
    await expect(announced).toContainText(CAPTION)
  })

  test('a running transition jumps to its end pose when the page is hidden', async ({ page }) => {
    await openWithClock(page)
    await page.locator(KEYS).nth(KEY.open).click()
    await expect(page.locator(STATUS)).toContainText(STATES.signal)
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await expect(page.locator(STATUS)).toContainText(STATES.ride)
    await expect(page.locator('svg.rd-render')).toHaveAttribute('data-motion', 'idle')
  })

  test('no animation frame is requested while the scene is idle', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') })
    await page.addInitScript(() => {
      const w = window as unknown as { __raf: number }
      w.__raf = 0
      const original = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (callback) => {
        w.__raf += 1
        return original(callback)
      }
    })
    await page.goto('/munkaim/')
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await ready(page)
    const now = await page.evaluate(() => Date.now())
    await page.clock.pauseAt(now + 1000)
    const count = () => page.evaluate(() => (window as unknown as { __raf: number }).__raf)
    const start = await count()
    await page.clock.runFor(5000)
    expect(await count(), 'idle: no frames').toBe(start)
    await page.locator(KEYS).nth(KEY.open).click()
    await page.clock.runFor(100)
    expect(await count()).toBeGreaterThan(start)
    await until(page, STATES.ride)
    const done = await count()
    await page.clock.runFor(5000)
    expect(await count(), 'after the transition: no frames').toBe(done)
  })
})

test.describe('Rollin block: reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('state changes are instant and use no animation frames', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __raf: number }
      w.__raf = 0
      const original = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (callback) => {
        w.__raf += 1
        return original(callback)
      }
    })
    await page.goto('/munkaim/')
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await ready(page)
    const start = await page.evaluate(() => (window as unknown as { __raf: number }).__raf)
    const status = page.locator(STATUS)
    await page.locator(KEYS).nth(KEY.open).click()
    await expect(status).toContainText(STATES.ride)
    await expect(page.locator('svg.rd-render')).toHaveAttribute('data-motion', 'idle')
    await page.locator(KEYS).nth(KEY.charge).click()
    await expect(status).toContainText(STATES.charge)
    expect(await checked(page)).toEqual(['false', 'false', 'false', 'false', 'true'])
    expect(await page.evaluate(() => (window as unknown as { __raf: number }).__raf)).toBe(start)
  })
})

test.describe('Rollin block: layout and accessibility', () => {
  for (const width of [320, 360, 390, 727, 1280]) {
    test(`no horizontal scroll at ${width}px, every key label whole, one row from 360 and 3 + 2 below`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/munkaim/')
      await page.locator(CARD).scrollIntoViewIfNeeded()
      await ready(page)
      await waitForPageFonts(page, test.info())
      for (const index of [-1, KEY.charge]) {
        if (index >= 0) await page.locator(KEYS).nth(index).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
        const box = (await page.locator(HOOK).boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }
      const keys = await page.locator(KEYS).evaluateAll((buttons) => buttons.map((b) => ({ top: Math.round(b.getBoundingClientRect().top), whole: b.scrollWidth <= b.clientWidth + 1, height: b.getBoundingClientRect().height })))
      expect(keys.every((k) => k.whole), `a key label is cut off: ${JSON.stringify(keys)}`).toBe(true)
      expect(keys.every((k) => k.height >= 44), 'keys are at least 44 px high').toBe(true)
      const rows = new Set(keys.map((k) => k.top)).size
      expect(rows, `rows at ${width}px: ${JSON.stringify(keys)}`).toBe(width < 360 ? 2 : 1)
      if (width < 360) expect(keys.map((k) => k.top).filter((t) => t === keys[0]!.top)).toHaveLength(3)
    })
  }

  test('the status line is reserved for its longest string: it never changes the block\'s height', async ({ page }) => {
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/munkaim/')
      await page.locator(CARD).scrollIntoViewIfNeeded()
      await ready(page)
      await waitForPageFonts(page, test.info())
      const heights = new Set<number>()
      for (const index of [KEY.photo, KEY.docked, KEY.ride, KEY.charge]) {
        await page.locator(KEYS).nth(index).click()
        await expect(page.locator(KEYS).nth(index)).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 })
        heights.add(await page.locator(CARD).evaluate((el) => Math.round(el.getBoundingClientRect().height)))
      }
      expect([...heights], `block heights at ${width}px`).toHaveLength(1)
    }
  })

  test('axe finds nothing with the scene loaded, at rest and after a step', async ({ page }) => {
    await page.goto('/munkaim/')
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await ready(page)
    let axe = await new AxeBuilder({ page }).include(CARD).analyze()
    expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])
    await page.locator(KEYS).nth(KEY.open).click()
    // Let the sequence come to rest first: axe must not run on an SVG that Zdog rewrites every frame.
    await expect(page.locator(STATUS)).toContainText(STATES.ride, { timeout: 10_000 })
    await expect(page.locator('svg.rd-render')).toHaveAttribute('data-motion', 'idle')
    await expect(page.locator(KEYS).first()).toHaveAttribute('aria-disabled', 'false')
    axe = await new AxeBuilder({ page }).include(CARD).analyze()
    expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])
  })
})
