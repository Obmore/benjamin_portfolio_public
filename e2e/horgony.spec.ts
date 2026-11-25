import { expect, test, type Page } from '@playwright/test'

// Shared-link alignment on the pages of the shared layer (src/site/keret.css, keret.ts).
// The jump to a fragment at page load is instant there (smooth scrolling starts only after the load, with `data-sima` on <html>), so it is over before the late web-font
// swap and src/site/horgony.ts re-aligns the target from a settled place. /aszf/ has the longest document: #adatfeldolgozasi-melleklet is its deepest heading
// (thousands of px down), #elso-resz a short jump.
const PATH = '/aszf/'
const DEEP = 'adatfeldolgozasi-melleklet'
const NEAR = 'elso-resz'

// Holds every web-font response until the test opens the gate.
const holdFonts = async (page: Page) => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/fonts/*.woff2', async (route) => {
    await gate
    await route.continue()
  })
  return { open: () => release() }
}
// Holds the alignment script (src/site/horgony-futtat.ts) until the test opens the gate: the target is then aligned before horgony.ts starts.
const holdScript = async (page: Page) => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/assets/horgony-futtat*.js', async (route) => {
    await gate
    await route.continue()
  })
  return { open: () => release() }
}
const offset = (page: Page, id: string) => page.locator(`#${id}`).evaluate((e) => e.getBoundingClientRect().top - (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) - (parseFloat(getComputedStyle(e).scrollMarginTop) || 0))
const landed = (page: Page, id: string) => expect.poll(async () => Math.abs(await offset(page, id)), { timeout: 15000, message: 'fragment scroll has landed' }).toBeLessThanOrEqual(2)
const fontsIn = (page: Page) => page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.status === 'loaded' && !f.family.includes('Fallback')), undefined, { timeout: 15000 })
const frames = (page: Page) => page.evaluate(() => new Promise<void>((done) => document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))))
// The alignment script is added after the first paint: its resource is fetched, then two frames give it time to run and register its listeners
// (there is no sign of the run in the page that exists without new product code).
const horgonyBent = async (page: Page) => {
  await page.waitForFunction(() => (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).some((r) => r.name.includes('/assets/horgony-futtat') && r.responseEnd > 0))
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}
// Every scroll has settled: scrollY is the same over three samples, then a few frames more (the script's post-font check runs a frame after the swap).
const quiet = async (page: Page) => {
  let last = [NaN, NaN]
  await expect.poll(async () => { const y = await page.evaluate(() => window.scrollY); const same = y === last[0] && y === last[1]; last = [last[1], y]; return same }, { timeout: 10000, intervals: [200] }).toBe(true)
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => done()))))))
}
// Counts the scrolls the page's own scripts make (the way the late-font tests of megrendeles.spec.ts do). The test's own scroll uses __realScrollBy, saved before the wrapping.
const countScrolls = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { __scrolls: number; __realScrollBy: (o: ScrollToOptions) => void }
  w.__scrolls = 0
  w.__realScrollBy = window.scrollBy.bind(window)
  for (const [obj, name] of [[Element.prototype, 'scrollIntoView'], [window, 'scrollTo'], [window, 'scrollBy'], [window, 'scroll']] as const) {
    const holder = obj as unknown as Record<string, unknown>
    const original = holder[name] as (...args: unknown[]) => unknown
    holder[name] = function (this: unknown, ...args: unknown[]) { w.__scrolls++; return original.apply(this, args) }
  }
  // scrollTop / scrollLeft assignments on the scrolling roots (documentElement, body) are scrolls too.
  for (const name of ['scrollTop', 'scrollLeft'] as const) {
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, name)
    if (!desc?.set) continue
    const set = desc.set
    Object.defineProperty(Element.prototype, name, { ...desc, set(this: Element, v: number) { if (this === document.documentElement || this === document.body) w.__scrolls++; set.call(this, v) } })
  }
})
const scrolls = (page: Page) => page.evaluate(() => (window as unknown as { __scrolls: number }).__scrolls)
// Records every scrollY the page shows at a scroll event or a frame, from the start of the document.
const recordScroll = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { __ys: number[] }
  w.__ys = []
  const note = () => { const y = Math.round(window.scrollY); if (w.__ys[w.__ys.length - 1] !== y) w.__ys.push(y) }
  window.addEventListener('scroll', note, { passive: true })
  const loop = () => { note(); requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
})
const positions = (page: Page) => page.evaluate(() => (window as unknown as { __ys: number[] }).__ys)

// (a) The page-load jump to a fragment is instant: between the top and the landing no intermediate position is ever shown.
test('(a) the page-load jump to a fragment is instant on a new-layer page', async ({ page }) => {
  const fonts = await holdFonts(page)
  await recordScroll(page)
  await page.goto(`${PATH}#${DEEP}`, { waitUntil: 'domcontentloaded' })
  await landed(page, DEEP)
  await quiet(page)
  const end = await page.evaluate(() => window.scrollY)
  expect(end).toBeGreaterThan(1000)
  expect((await positions(page)).filter((y) => y !== 0 && y !== Math.round(end))).toEqual([])
  fonts.open()
  await fontsIn(page)
})

// (b) After the load an in-page anchor click scrolls smoothly (intermediate positions are shown); under reduced motion it jumps.
for (const reduced of [false, true]) {
  test(`(b) after the load an in-page anchor click ${reduced ? 'jumps under reduced motion' : 'scrolls smoothly'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await page.goto(PATH, { waitUntil: 'load' })
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-sima'))
    await page.evaluate(() => {
      const a = document.createElement('a')
      a.href = '#adatfeldolgozasi-melleklet'
      a.id = 'proba-horgony'
      a.textContent = 'x'
      a.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;padding:8px;background:#fff'
      document.body.append(a)
    })
    // The recorder of the init-script kind only runs on a later document: it is set up by hand for this one.
    await page.evaluate(() => {
      const w = window as unknown as { __ys: number[] }
      w.__ys = []
      const note = () => { const y = Math.round(window.scrollY); if (w.__ys[w.__ys.length - 1] !== y) w.__ys.push(y) }
      window.addEventListener('scroll', note, { passive: true })
      const loop = () => { note(); requestAnimationFrame(loop) }
      requestAnimationFrame(loop)
    })
    await page.locator('#proba-horgony').click()
    await landed(page, DEEP)
    await quiet(page)
    const end = await page.evaluate(() => window.scrollY)
    const between = (await positions(page)).filter((y) => y > 0 && y < Math.round(end))
    if (reduced) expect(between).toEqual([])
    else expect(between.length).toBeGreaterThan(0)
  })
}

// (c) The late-font re-align lands the target under the header after the instant jump: fonts released as soon as the page has jumped, at phone and desktop width, for a deep and a near target.
for (const width of [1280, 360]) {
  for (const id of [DEEP, NEAR]) {
    test.describe(`(c) at ${width} px, #${id}`, () => {
      test.use({ viewport: { width, height: 800 } })
      test('the target is re-aligned after the late fonts', async ({ page }) => {
        const fonts = await holdFonts(page)
        await page.goto(`${PATH}#${id}`, { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => window.scrollY > 0, undefined, { timeout: 15000 })
        await horgonyBent(page)
        fonts.open()
        await fontsIn(page)
        await frames(page)
        await expect.poll(async () => Math.abs(await offset(page, id)), { timeout: 10000 }).toBeLessThanOrEqual(2)
        await quiet(page)
        expect(Math.abs(await offset(page, id))).toBeLessThanOrEqual(2)
      })
    })
  }
}

// (d) The target is aligned before horgony.ts starts (the alignment script is held until the jump has landed: Firefox finishes its jump first anyway). A scroll by script, with no
// input event, at the load event or a frame or two later falls inside the script's settling window and must still read as "moved": not snapped back.
// Engine-neutral: the page script must not scroll at all afterwards (the counter sees scrollIntoView, scrollTo, scrollBy, scroll and the scrollTop/scrollLeft setters).
for (const after of [0, 1, 2]) {
  test(`(d) a scroll by script ${after} frame(s) after the load event is not snapped back`, async ({ page }) => {
    const fonts = await holdFonts(page)
    const script = await holdScript(page)
    await countScrolls(page)
    await page.addInitScript((n) => {
      addEventListener('load', () => {
        let i = 0
        const step = () => { if (i++ < n) requestAnimationFrame(step); else (window as unknown as { __realScrollBy: (o: ScrollToOptions) => void }).__realScrollBy({ top: -600, behavior: 'instant' }) }
        step()
      })
    }, after)
    await page.goto(`${PATH}#${DEEP}`, { waitUntil: 'domcontentloaded' })
    await landed(page, DEEP)
    // The jump has landed and the script has not been fetched: this pins "aligned before horgony.ts started". (readyState is "interactive" here, never "complete": the held
    // fonts keep the load event back, so that is not what can be pinned.)
    expect(await page.evaluate(() => (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).some((r) => r.name.includes('/assets/horgony-futtat') && r.responseEnd > 0))).toBe(false)
    script.open()
    await horgonyBent(page)
    fonts.open()
    await fontsIn(page)
    await frames(page)
    await quiet(page)
    // No offset assertion: WebKit re-applies the fragment scroll after the load event and so undoes a scroll made at the load event itself (verified: the page script made none).
    expect(await scrolls(page)).toBe(0)
  })
}

test('a pointer press before the late fonts is the visitor\'s: the page script does not scroll afterwards', async ({ page }) => {
  const fonts = await holdFonts(page)
  await countScrolls(page)
  await page.goto(`${PATH}#${DEEP}`, { waitUntil: 'domcontentloaded' })
  await landed(page, DEEP)
  await horgonyBent(page)
  // The press lands in the left margin at the page edge, on no link and no control; a pointer press counts as the visitor's like a wheel, touch or key.
  await page.mouse.move(2, 300)
  await page.mouse.down()
  await page.mouse.up()
  fonts.open()
  await fontsIn(page)
  await frames(page)
  await quiet(page)
  expect(await scrolls(page)).toBe(0)
})
