import { expect, test } from '@playwright/test'
import { ALL_PATHS } from './pages'

// Page turn: cross-document View Transitions (CSS only: src/site/lapcsere.css, imported by the shared layer src/site/keret.css, which also names the header group).
// The home page's header has only anchors: the page turn is tried through the footer link to a legal page.
const LINK = 'footer a[href="/impresszum/"]'

type Probe = { reveal: boolean | null; swap: boolean | null }
const probe = () => {
  const w = window as unknown as { __vt: Probe }
  w.__vt = { reveal: null, swap: null }
  addEventListener('pagereveal', (e) => { w.__vt.reveal = !!(e as unknown as { viewTransition: unknown }).viewTransition })
  addEventListener('pageswap', (e) => { w.__vt.swap = !!(e as unknown as { viewTransition: unknown }).viewTransition })
}
const hasVt = (page: import('@playwright/test').Page) => page.evaluate(() => 'PageRevealEvent' in window)

// Chromium occasionally skips a cross-document transition on the slow Windows CI runner: pagereveal fires with
// viewTransition null when the new page is not ready within its timeout (CI evidence: fragment test on PR #74, and
// the dedicated test on PR #72 run 42197496257, `reveal` false after 9.5 s). It never reproduced locally, not up to
// 40x CPU throttle with parallel load, and the CSS is the same on every attempt. So a navigation gets up to 3 fresh
// attempts and the first one that runs a transition ends the test; a skipped attempt is annotated. `attempt` must
// still check landing on every try and return true only when a transition ran. A systematic skip fails all 3 attempts
// and so still fails the test.
const ATTEMPTS = 3
async function withVtRetries(what: string, attempt: (n: number) => Promise<boolean>) {
  for (let n = 1; n <= ATTEMPTS; n++) {
    if (await attempt(n)) return
    test.info().annotations.push({ type: 'vt-skipped', description: `attempt ${n}: no view transition (reveal/swap)` })
  }
  throw new Error(`${what} skipped the view transition on all ${ATTEMPTS} attempts`)
}

test.describe('no-preference', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('navigation between site pages runs a view transition (reveal and swap)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
    test.setTimeout(60_000) // up to 3 navigation attempts
    await page.addInitScript(probe)
    await withVtRetries('the header navigation', async () => {
      await page.goto('/', { waitUntil: 'networkidle' })
      test.skip(!(await hasVt(page)), 'engine lacks PageRevealEvent')
      // pageswap fires on the old page just before it unloads: keep its answer in sessionStorage.
      await page.evaluate(() => {
        sessionStorage.removeItem('vt-swap')
        addEventListener('pageswap', (e) => {
          sessionStorage.setItem('vt-swap', String(!!(e as unknown as { viewTransition: unknown }).viewTransition))
        })
      })
      await page.locator(LINK).first().click()
      await page.waitForURL('**/impresszum/')
      await expect.poll(() => page.evaluate(() => (window as unknown as { __vt: Probe }).__vt.reveal), { timeout: 15_000 }).not.toBeNull()
      const reveal = await page.evaluate(() => (window as unknown as { __vt: Probe }).__vt.reveal)
      const swap = await page.evaluate(() => sessionStorage.getItem('vt-swap'))
      await expect(page.locator('main h1').first()).toBeVisible()
      return reveal === true && swap === 'true'
    })
  })

  test('an anchor link to another page still lands on its target after the transition', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
    test.setTimeout(60_000) // up to 3 navigation attempts
    await page.addInitScript(probe)
    await withVtRetries('the fragment navigation', async () => {
      await page.goto('/munkaim/', { waitUntil: 'networkidle' })
      // Works page -> a package panel on the pricing page (a real in-content link with a fragment; the home page has no such link).
      await page.locator('a[href="/megrendeles/#szolgaltatas-gepkonyv"]').first().click()
      await page.waitForURL('**/megrendeles/#szolgaltatas-gepkonyv')
      await expect.poll(() => page.evaluate(() => (window as unknown as { __vt: Probe }).__vt.reveal), { timeout: 15_000 }).not.toBeNull()
      const ran = await page.evaluate(() => (window as unknown as { __vt: Probe }).__vt.reveal)
      await expect(page.locator('#szolgaltatas-gepkonyv')).toBeInViewport()
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      return !!ran
    })
  })

  test('every page has unique view-transition names and the header keeps its own', async ({ page }) => {
    for (const url of ALL_PATHS) {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      const names = await page.evaluate(() =>
        [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).viewTransitionName).filter((n) => n && n !== 'none'))
      expect(new Set(names).size, `${url}: ${names.join(',')}`).toBe(names.length)
    }
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Engines without the property (Firefox, WebKit) skip the name assertion.
    if (await page.evaluate(() => CSS.supports('view-transition-name', 'x'))) {
      expect(await page.locator('header.fejlec').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('fejlec')
    }
  })

  // Firefox has no cross-document view transitions: navigation must simply work (also covers WebKit locally).
  test('header navigation lands on the next page and renders it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.locator(LINK).first().click()
    await page.waitForURL('**/impresszum/')
    await expect(page.locator('main h1').first()).toBeVisible()
  })
})

test.describe('reduce', () => {
  test.use({ reducedMotion: 'reduce' })

  test('navigation between site pages skips the view transition', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
    await page.addInitScript(probe)
    await page.goto('/', { waitUntil: 'networkidle' })
    test.skip(!(await hasVt(page)), 'engine lacks PageRevealEvent')
    await page.locator(LINK).first().click()
    await page.waitForURL('**/impresszum/')
    await expect.poll(() => page.evaluate(() => (window as unknown as { __vt: Probe }).__vt.reveal)).toBe(false)
  })
})

// A click from a site page to a legal page (and back) must not log a page error. Before the legal pages opted in, the
// site page's opt-in made Chromium log, on the legal page, "InvalidStateError: Transition was aborted because of
// invalid state. ViewTransition opt-in disabled" (seen in Playwright's Chromium 153 and in Brave on Chromium 157,
// 2026-11-11). Only "no error" is asserted: a transition may be skipped on a slow runner, so "a transition ran" is
// deliberately not checked here (the deterministic check of the opt-in itself is the next describe block). One test
// per target keeps each within the default test timeout.
test.describe('legal pages, no-preference', () => {
  test.use({ reducedMotion: 'no-preference' })

  function watchErrors(page: import('@playwright/test').Page) {
    const problems: string[] = []
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
    page.on('console', (message) => { if (message.type() === 'error') problems.push(`console.error: ${message.text()}`) })
    return problems
  }

  async function clickAndSettle(page: import('@playwright/test').Page, link: import('@playwright/test').Locator, url: string) {
    await link.first().click()
    // The exact target (path and hash): a glob such as '**/' would match any URL ending in a slash, so the back leg
    // would return at once on the page it is leaving.
    const target = new URL(url, 'http://target.invalid')
    await page.waitForURL((current) => current.pathname === target.pathname && current.hash === target.hash)
    expect(new URL(page.url()).pathname).toBe(target.pathname)
    await expect(page.locator('h1').first()).toBeVisible()
    // The error surfaces while the new page is revealed: give the transition (320 ms) time to start and end.
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 800)))))
  }

  // Site page -> a legal page through the footer link, then back to a site page through the legal page's own link.
  for (const url of ['/aszf/', '/adatkezeles/', '/impresszum/']) {
    test(`footer link from the home page to ${url} and back logs no page error or console error`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
      const problems = watchErrors(page)
      await page.goto('/', { waitUntil: 'networkidle' })
      await clickAndSettle(page, page.locator(`footer a[href="${url}"]`), url)
      await clickAndSettle(page, page.locator('header a.mklink'), '/')
      expect(problems).toEqual([])
    })
  }

  test('the guarantee line link from a package panel on /megrendeles/ to the terms and back logs no page error or console error', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
    const problems = watchErrors(page)
    await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
    await clickAndSettle(page, page.locator('#szolgaltatas-termekleiras a.adl-link[href="/aszf/#elso-resz"]'), '/aszf/#elso-resz')
    await clickAndSettle(page, page.locator('header a.mklink'), '/')
    expect(problems).toEqual([])
  })

  // Site page -> a demo (separate static app from public/demos/) through the real link, then back through the return strip.
  for (const [from, demo, link, back, backUrl] of [
    ['/megrendeles/', '/demos/kezikonyv/', '.cs-sorlink a[href="/demos/kezikonyv/"]:visible', 'a.vissza[href="/megrendeles/#szolgaltatas-gepkonyv"]', '/megrendeles/#szolgaltatas-gepkonyv'],
    ['/megrendeles/', '/demos/lapszabaszat/', '.cs-sorlink a[href="/demos/lapszabaszat/"]:visible', 'a.vissza[href="/megrendeles/#szolgaltatas-lapszabaszat"]', '/megrendeles/#szolgaltatas-lapszabaszat'],
    ['/munkaim/', '/demos/adatgyujto/', '.mb-szov a.mb-cta[href="/demos/adatgyujto/"]:visible', 'a.vissza[href="/megrendeles/#szolgaltatas-adatok"]', '/megrendeles/#szolgaltatas-adatok'],
  ] as const) {
    test(`the link from ${from} to ${demo} and back logs no page error or console error`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
      const problems = watchErrors(page)
      await page.goto(from, { waitUntil: 'networkidle' })
      await clickAndSettle(page, page.locator(link), demo)
      // The way back is the return strip (a shadow root, first in the page): the locator reaches into it.
      await clickAndSettle(page, page.locator(back), backUrl)
      expect(problems).toEqual([])
    })
  }

  test('the English imprint, reached from the Hungarian one, and back to the site log no page error or console error', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
    const problems = watchErrors(page)
    await page.goto('/impresszum/', { waitUntil: 'networkidle' })
    await clickAndSettle(page, page.locator('.ph-nyelv a[href="/en/imprint/"]'), '/en/imprint/')
    await clickAndSettle(page, page.locator('header a.mklink'), '/')
    expect(problems).toEqual([])
  })
})

// Deterministic: Chromium skips a transition on a slow runner, so the click tests above could pass even if a legal page
// lost its opt-in. This checks the opt-in itself: an `@view-transition { navigation: auto }` rule. The answer has three
// values, so that "the rule is there but switched off by the media condition" (reduced motion) is told apart from "the
// rule is missing": 'applies', 'present, not applying' or 'absent'. All sheets are same-origin; an error fails the test.
// The rule must also come from an inline <style> in <head> that precedes the first stylesheet link: in an external
// stylesheet that arrives late, Chromium aborts the inbound transition with the same error (PR #92 CI), so the rule
// being "there" is not enough. All pages are checked: both sides of a navigation must opt in early.
// The three demos are copied from public/ and get the opt-in by a build hook; each has a stylesheet link, so "before the
// first stylesheet link" is a real condition there. 404.html and the redirect stubs (src/content/atiranyitasok.ts) do not opt in (nothing links to them).
const DEMOS = ['/demos/kezikonyv/', '/demos/lapszabaszat/', '/demos/adatgyujto/']
const PAGES = [...new Set([...ALL_PATHS, ...DEMOS])]
type OptIn = 'applies' | 'present, not applying' | 'absent'
type OptInResult = { state: OptIn; inlineInHeadBeforeLinks: boolean }
const optInState = (page: import('@playwright/test').Page) => page.evaluate((): OptInResult => {
  let state: OptIn = 'absent'
  let inlineInHeadBeforeLinks = false
  const firstLink = document.querySelector('link[rel~="stylesheet"]')
  const walk = (rules: CSSRuleList, active: boolean, owner: Node | null) => {
    for (const rule of Array.from(rules)) {
      if (/^@view-transition\b/.test(rule.cssText) && /navigation:\s*auto/.test(rule.cssText)) {
        if (active) {
          state = 'applies'
          inlineInHeadBeforeLinks = owner instanceof HTMLStyleElement && owner.parentElement === document.head
            && (!firstLink || !!(owner.compareDocumentPosition(firstLink) & Node.DOCUMENT_POSITION_FOLLOWING))
        } else if (state === 'absent') state = 'present, not applying'
      } else if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, active && matchMedia(rule.conditionText).matches, owner)
      } else if ((rule as CSSImportRule).styleSheet) {
        walk((rule as CSSImportRule).styleSheet!.cssRules, active, owner)
      } else if ((rule as CSSGroupingRule).cssRules) {
        walk((rule as CSSGroupingRule).cssRules, active, owner)
      }
    }
  }
  for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules, true, sheet.ownerNode)
  return { state, inlineInHeadBeforeLinks }
})

for (const [motion, expected] of [['no-preference', 'applies'], ['reduce', 'present, not applying']] as const) {
  test.describe(`page opt-in rule, ${motion}`, () => {
    test.use({ reducedMotion: motion })
    for (const url of PAGES) {
      test(`${url}: the @view-transition navigation: auto rule is "${expected}"${motion === 'no-preference' ? ', inline in <head> before the stylesheets' : ''}`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'cross-document view transitions are verified in Chromium only')
        // 'load', not 'domcontentloaded': a page without script does not wait for its stylesheet before DOMContentLoaded.
        await page.goto(url, { waitUntil: 'load' })
        const result = await optInState(page)
        expect(result.state).toBe(expected)
        if (motion === 'no-preference') expect(result.inlineInHeadBeforeLinks, 'the applying rule is in an inline <style> in <head>, before the first stylesheet link').toBe(true)
      })
    }
  })
}
