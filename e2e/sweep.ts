import { expect, test as base, type Page } from '@playwright/test'

// Helpers for the home page's width sweeps: one loaded page per worker is resized from width to width (and switched between light and dark) instead of a
// fresh page being loaded per width. The page's own layout (a ResizeObserver, then a frame, then the relayout) settles over a few frames, so a
// measurement is taken after those frames, or after two equal consecutive reads (`settled`).

/**
 * Every work has a picture since PR 7 (Rollin's station photo), but the home page's code for a work without one (its own trace in the detail view, the module screen's trace) is kept:
 * a page that serves the home HTML with Rollin's picture taken out keeps those paths under test. The page reads the works' data from the list items at load, so the HTML is rewritten
 * on the way in.
 */
export async function withoutRollinPicture(target: Page | import('@playwright/test').BrowserContext) {
  await target.route('**/', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace('data-kep="rollin-allomas.webp" data-alt="A Rollin töltőállomása öt dokkolt elektromos rollerrel."', 'data-kep="" data-alt=""')
    await route.fulfill({ response, body })
  })
}

async function loadedHome(browser: import('@playwright/test').Browser, reducedMotion: 'reduce' | 'no-preference', bare = false) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion })
  if (bare) await withoutRollinPicture(ctx)
  if (browser.browserType().name() === 'chromium') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])   // the contact end's copy (the other engines do not know these names)
  const page = await ctx.newPage()
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveClass(/jel-vege/)
  return { ctx, page }
}

/** `test` with worker-scoped, loaded home pages: `homeFull` (full motion), `homeReduced` (reduced motion) and `homeNoPicture` (reduced motion, Rollin without its picture: see withoutRollinPicture). */
export const test = base.extend<object, { homeFull: Page; homeReduced: Page; homeNoPicture: Page }>({
  homeFull: [async ({ browser }, use) => { const { ctx, page } = await loadedHome(browser, 'no-preference'); await use(page); await ctx.close() }, { scope: 'worker' }],
  homeReduced: [async ({ browser }, use) => { const { ctx, page } = await loadedHome(browser, 'reduce'); await use(page); await ctx.close() }, { scope: 'worker' }],
  homeNoPicture: [async ({ browser }, use) => { const { ctx, page } = await loadedHome(browser, 'reduce', true); await use(page); await ctx.close() }, { scope: 'worker' }],
})

export async function frames(page: Page, n: number) {
  await page.evaluate((count) => new Promise<void>((resolve) => { const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1))); step(count) }), n)
}

/** Resizes the page and waits for the relayout frames. */
export async function resizeTo(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height })
  await page.evaluate(() => window.scrollTo(0, 0))
  await frames(page, 4)
}

/** Switches the system colour scheme and waits until the page has followed it. */
export async function scheme(page: Page, colorScheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme })
  await expect(page.locator('html')).toHaveAttribute('data-tema', colorScheme === 'dark' ? 'sotet' : 'vilagos')
  await frames(page, 3)
}

/** Waits until no finite animation or transition is running any more (looping animations, which never end, do not count). */
export async function quiet(page: Page) {
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length), { timeout: 5000 }).toBe(0)
}

/** Waits until the page is quiet, then runs `measure` until two consecutive results are identical: the value of a settled layout. Throws, with the last two values, when it never settles. */
export async function settled<T>(page: Page, measure: () => Promise<T>, max = 12): Promise<T> {
  await quiet(page)
  let last = JSON.stringify(await measure())
  let now = last
  for (let i = 0; i < max; i++) {
    await frames(page, 2)
    now = JSON.stringify(await measure())
    if (now === last) return JSON.parse(now) as T
    last = now
  }
  throw new Error(`the layout did not settle in ${max} reads: last two values ${last} and ${now}`)
}
