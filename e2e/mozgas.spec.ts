import { expect, test } from '@playwright/test'
import { ALL_PATHS } from './pages'
import { movingAnimations } from './motion'

// Motion of the whole site: under reduced motion (the owner's own setting) nothing moves, and the layout stays stable while scrolling.

test.describe('reduced motion on every page', () => {
  for (const [width, height] of [[1280, 800], [360, 780]] as const) {
    for (const path of ALL_PATHS) {
      test(`${path} at ${width}: nothing moves under reduced motion, at load and after scrolling through the page`, async ({ browser }) => {
        const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height } })
        const page = await context.newPage()
        await page.goto(path)
        // Transitions and entry animations that start late (fonts, idle callbacks, observers) are caught by waiting before every look.
        await page.waitForTimeout(400)
        expect(await movingAnimations(page), `${path} at load`).toEqual([])
        const total = await page.evaluate(() => document.documentElement.scrollHeight)
        for (let y = 0; y < total; y += Math.round(height * 0.7)) {
          await page.mouse.wheel(0, Math.round(height * 0.7))
          await page.waitForTimeout(150)
          expect(await movingAnimations(page), `${path} at ${y}`).toEqual([])
        }
        await context.close()
      })
    }
  }
})

const NEWLINE_INDENT = String.fromCharCode(10) + '  '

test.describe('layout stability', () => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    // The home page's budget is the site's 0.1 (also checked in e2e/site.spec.ts); every other page keeps 0.05. The page settles before the scroll starts.
    for (const path of ALL_PATHS) {
      const budget = path === '/' ? 0.1 : 0.05
      test(`CLS below ${budget} while scrolling ${path} at ${viewport.width}`, async ({ browser, browserName }) => {
        test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only')
        const page = await browser.newPage({ viewport })
        await page.addInitScript(() => {
          Object.defineProperty(window, '__cls', { value: 0, writable: true, configurable: true })
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as unknown as { hadRecentInput?: boolean; value: number }
              if (!shift.hadRecentInput) (window as unknown as { __cls: number }).__cls += shift.value
              // Diagnostics only (read in the failure message): where and when each counted shift came from.
              if (shift.hadRecentInput) continue
              const describe = (node: Node | null | undefined) => {
                if (!node) return '?'
                const el = node instanceof Element ? node : node.parentElement
                const classes = el ? Array.from(el.classList).slice(0, 2).join('.') : ''
                const name = el ? el.tagName + (classes ? '.' + classes : '') : '?'
                return node instanceof Element ? name : '#text' + (classes ? '<' + classes : '')
              }
              const sources = ((entry as unknown as { sources?: { node?: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] }).sources ?? []).map(
                (source) => `${describe(source.node)} y${Math.round(source.previousRect.y)}/h${Math.round(source.previousRect.height)}->y${Math.round(source.currentRect.y)}/h${Math.round(source.currentRect.height)}`,
              )
              const w = window as unknown as { __clsEntries?: { value: number; t: number; scrollY: number; sources: string[] }[] }
              ;(w.__clsEntries ??= []).push({ value: Number(shift.value.toFixed(4)), t: Math.round(entry.startTime), scrollY: Math.round(window.scrollY), sources })
            }
          }).observe({ type: 'layout-shift', buffered: true })
        })
        await page.goto(path, { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(500)
        const total = await page.evaluate(() => document.documentElement.scrollHeight)
        for (let y = 0; y < total; y += Math.round(viewport.height * 0.6)) {
          await page.mouse.wheel(0, Math.round(viewport.height * 0.6))
          await page.waitForTimeout(60)
        }
        await page.waitForTimeout(1200)
        const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
        const entries = await page.evaluate(() => (window as unknown as { __clsEntries?: { value: number; t: number; scrollY: number; sources: string[] }[] }).__clsEntries ?? [])
        const detail = [...entries]
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
          .map((e) => `${e.value} @${e.t}ms scrollY=${e.scrollY} ${e.sources.join('; ')}`)
          .join(NEWLINE_INDENT)
        expect(cls, `CLS ${path} ${viewport.width}=${cls}; ${entries.length} shift(s), largest first:${NEWLINE_INDENT}${detail}`).toBeLessThan(budget)
        await page.close()
      })
    }
  }
})
