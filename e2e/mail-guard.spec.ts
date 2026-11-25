import { expect, test } from '@playwright/test'

// The guard in e2e/support/mail-guard.ts is installed in every context (default page, browser.newContext, browser.newPage), so no spec can
// open the operating system's mail client. These specs also click a real mailto: anchor, safely: the page has its own recorder AFTER the guard
// that ALWAYS calls preventDefault itself, so even a broken guard cannot start a mail window.

type Guarded = { __mailGuard?: boolean; __seen?: boolean[] }

const PAGE = '/megrendeles/'
const ANCHOR = '<a id="m" href="mailto:nobody@example.invalid"><span id="inner">write</span></a>'

test('the default page carries the mail guard', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => (window as unknown as Guarded).__mailGuard)).toBe(true)
})

test('contexts and pages made by hand carry it too', async ({ browser }) => {
  const context = await browser.newContext()
  const fromContext = await context.newPage()
  await fromContext.goto('/')
  expect(await fromContext.evaluate(() => (window as unknown as Guarded).__mailGuard)).toBe(true)
  await context.close()
  const lone = await browser.newPage()
  await lone.goto('/')
  expect(await lone.evaluate(() => (window as unknown as Guarded).__mailGuard)).toBe(true)
  await lone.close()
})

test('a click on a mailto link, or inside it, is cancelled before the browser can act on it', async ({ page }) => {
  await page.goto(PAGE)
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML('beforeend', html)
    const w = window as unknown as Guarded
    w.__seen = []
    // Registered after the guard, bubbling, on window: records what the guard decided, then cancels the click itself as a safety net.
    window.addEventListener('click', (e) => {
      w.__seen!.push(e.defaultPrevented)
      e.preventDefault()
    })
  }, ANCHOR)
  await page.locator('#m').click()
  await page.locator('#inner').click()
  expect(await page.evaluate(() => (window as unknown as Guarded).__seen)).toEqual([true, true])
})

test('a page handler that stops the click cannot hide it from the guard', async ({ page }) => {
  await page.goto(PAGE)
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML('beforeend', html)
    const w = window as unknown as Guarded
    w.__seen = []
    // The handler stops propagation (so a bubbling guard on window would never run), reads the state, then cancels the click itself.
    document.getElementById('m')!.addEventListener('click', (e) => {
      e.stopPropagation()
      w.__seen!.push(e.defaultPrevented)
      e.preventDefault()
    })
  }, ANCHOR)
  await page.locator('#m').click()
  expect(await page.evaluate(() => (window as unknown as Guarded).__seen)).toEqual([true])
})

test('a link that is not a mailto link is left alone by the guard', async ({ page }) => {
  await page.goto(PAGE)
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<a id="other" href="#nowhere">x</a>')
    const w = window as unknown as Guarded
    w.__seen = []
    window.addEventListener('click', (e) => {
      w.__seen!.push(e.defaultPrevented)
      e.preventDefault()
    })
  })
  await page.locator('#other').click()
  expect(await page.evaluate(() => (window as unknown as Guarded).__seen)).toEqual([false])
})

test('a context without JavaScript is announced, not guarded (it logs a warning and only reads static pages)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  expect(await page.locator('a[href^="mailto:"]').count()).toBeGreaterThan(0) // present, never clicked
  await context.close()
})
