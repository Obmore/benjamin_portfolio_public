import { chromium } from '@playwright/test'

// No spec may ever open the operating system's mail client (on a Windows desktop a click on a mailto: link starts a real Outlook draft).
// Every browser context that any project launches is guarded, from playwright.config.ts (workers load the config too), so every spec is covered
// without importing anything, including `browser.newContext()` / `browser.newPage()` calls and the files other workers own.
//
// Two lines of defence inside the page (init script, so only where JavaScript runs):
//  1. a CAPTURE-phase window listener sees every click first. It must not call preventDefault right there: e2e/meres.spec.ts clicks the
//     mailto "hivas" button and reads `defaultPrevented` from a document bubbling listener, expecting the page to have left it alone. So it
//     wraps stopPropagation / stopImmediatePropagation on that one event: a page handler that stops the event is cancelled at that moment,
//     before the bubbling listener could be skipped;
//  2. a BUBBLING window listener (the last stop of a normal click) cancels the default action of a click on, or inside, an
//     `a[href^="mailto:"]`. Mouse clicks, Enter on a focused link and synthetic clicks alike.
// A test that really needs the navigation sets `window.__allowMailto = true`; none does.
//
// Loud failure: any frame navigation to a mailto: URL, or a Navigation API `navigate` event for one, throws / is logged as an error that fails
// the test run; a context created with `javaScriptEnabled: false` cannot carry the init script, so it logs a warning (no spec clicks anything
// that opens mail in such a context: they only read the static pages) and still fails on a mailto: frame navigation.

const GUARD = `(() => {
  const isMail = (event) => {
    const target = event.target
    const link = target && target.closest ? target.closest('a[href]') : null
    return !!link && /^mailto:/i.test(link.getAttribute('href') || '') && !window.__allowMailto
  }
  window.__mailGuard = true
  window.addEventListener('click', (event) => {
    if (!isMail(event)) return
    for (const name of ['stopPropagation', 'stopImmediatePropagation']) {
      const original = event[name]
      event[name] = function () {
        event.preventDefault()
        return original.apply(this, arguments)
      }
    }
  }, true)
  window.addEventListener('click', (event) => {
    if (isMail(event)) event.preventDefault()
  })
  if (window.navigation && window.navigation.addEventListener) {
    window.navigation.addEventListener('navigate', (event) => {
      if (/^mailto:/i.test(event.destination.url) && !window.__allowMailto) {
        console.error('MAILTO NAVIGATION ATTEMPTED: ' + event.destination.url)
        if (event.cancelable) event.preventDefault()
      }
    })
  }
})()`

type Hooked = {
  addInitScript: (s: string) => Promise<void>
  on: (event: string, handler: (arg: unknown) => void) => void
}

const proto = Object.getPrototypeOf(chromium) as { launch: (...args: unknown[]) => Promise<unknown>; __mailGuard?: boolean }

function watchNavigation(context: Hooked) {
  context.on('page', (page) => {
    ;(page as unknown as Hooked).on('framenavigated', (frame) => {
      const url = String((frame as { url: () => string }).url())
      if (/^mailto:/i.test(url)) throw new Error(`A spec navigated to ${url}: that opens the operating system's mail client`)
    })
  })
}

if (!proto.__mailGuard) {
  proto.__mailGuard = true
  const launch = proto.launch
  proto.launch = async function (this: unknown, ...args: unknown[]) {
    const browser = (await launch.apply(this, args)) as { newContext: (...a: unknown[]) => Promise<Hooked> }
    const newContext = browser.newContext.bind(browser)
    browser.newContext = async (...a: unknown[]) => {
      const context = await newContext(...a)
      const options = (a[0] ?? {}) as { javaScriptEnabled?: boolean }
      if (options.javaScriptEnabled === false) {
        console.warn('mail-guard: a context without JavaScript cannot carry the click guard; clicking a mailto: link there would open the mail client')
      } else {
        await context.addInitScript(GUARD)
      }
      watchNavigation(context)
      return context
    }
    return browser
  }
}
