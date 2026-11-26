import { expect, test, type Page } from '@playwright/test'
import { KALAND } from '../src/content/kaland'
import type { Proba } from '../src/vilag/tipusok'

// The home page's entry to the 3D world (thread V7a, src/site/vilag-belepo-futtat.ts).
//
// Chromium on SwiftShader: the visitor's gate refuses a software renderer, so test 2 checks that refusal without the CI hook while tests 3 to 8 admit SwiftShader through
// `window.__vilagProba = { szoftveres: true }`. What this spec and a software frame prove: that the static HTML of `/` ships one hidden entry button, the gate and the warm-up
// rule govern visibility and prefetching, opening and closing the dialog restores focus and page state with a single `/vilag/` request, and every request stays same-origin.
// What a software frame cannot prove: GPU frame times, visual quality on hardware, mobile browsers, Safari or screen readers.
test.describe.configure({ timeout: 240_000 })

declare global {
  interface Window {
    __vilagProba?: Proba
  }
}

const belepo = (page: Page) => page.locator('[data-vilag-belepo]')
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Térbeli nézet' })

async function szoftveresEngedely(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vilagProba = { szoftveres: true }
  })
}

function vilagKerelmek(page: Page): string[] {
  const kerelmek: string[] = []
  page.on('request', (r) => {
    const { pathname } = new URL(r.url())
    if (pathname.startsWith('/vilag/')) kerelmek.push(pathname)
  })
  return kerelmek
}

/** Records every WebGL context a page asks for in `window.__gl` (before any script of the page runs). */
async function glFigyel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: string[] }
    w.__gl = []
    const eredeti = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, ...a: unknown[]) => unknown
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipus: string, ...a: unknown[]) {
      if (/webgl/.test(tipus)) w.__gl.push(tipus)
      return eredeti.call(this, tipus, ...a)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}
const glKerelmek = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __gl: string[] }).__gl)

test('1. the static HTML of / has one hidden data-vilag-belepo button with the entry label', async ({ page }) => {
  const valasz = await page.request.get('/')
  expect(valasz.ok()).toBe(true)
  const html = await valasz.text()
  const gombok = await page.evaluate((nyers) => {
    const doc = new DOMParser().parseFromString(nyers, 'text/html')
    return Array.from(doc.querySelectorAll('[data-vilag-belepo]')).map((el) => ({
      tag: el.tagName,
      belepo: el.getAttribute('data-vilag-belepo'),
      hidden: el.hasAttribute('hidden'),
      szoveg: el.textContent,
    }))
  }, html)
  expect(gombok).toEqual([
    {
      tag: 'BUTTON',
      belepo: '',
      hidden: true,
      szoveg: KALAND.belepes.gomb,
    },
  ])
})

test('2. refused on a software renderer without the hook: button stays hidden and nothing under /vilag/ is requested', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await page.addInitScript(() => {
    const eredeti = WebGL2RenderingContext.prototype.getParameter
    WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, p: GLenum): unknown {
      if (p === 0x9246) return 'Google SwiftShader'
      return eredeti.call(this, p)
    }
  })
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'elutasitva')
  await expect(gomb).toBeHidden()
  await page.waitForTimeout(3_000)
  expect(kerelmek).toEqual([])
})

test('3. refused on Save-Data with the hook: button stays hidden and nothing under /vilag/ is requested', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: true, effectiveType: '4g' }),
      configurable: true,
    })
  })
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'elutasitva')
  await expect(gomb).toBeHidden()
  await page.waitForTimeout(3_000)
  expect(kerelmek).toEqual([])
})

test('4. refused without WebGL2 with the hook: button stays hidden and nothing under /vilag/ is requested', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).WebGL2RenderingContext
  })
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'elutasitva')
  await expect(gomb).toBeHidden()
  await page.waitForTimeout(3_000)
  expect(kerelmek).toEqual([])
})

test('5. passed with the hook: button is visible, warm-up finishes with one /vilag/ request, no dialog yet and at most 2 GL contexts', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  await glFigyel(page)
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toBeVisible()
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'lathato')
  await expect(gomb).toHaveAttribute('data-vilag-bemelegites', 'kesz')
  expect(kerelmek).toHaveLength(1)
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  expect((await glKerelmek(page)).length).toBeLessThanOrEqual(2)
})

test('6. open and close with the hook: clicking opens the dialog with still one /vilag/ request, and Escape restores focus and #top', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toHaveAttribute('data-vilag-bemelegites', 'kesz')
  await gomb.click()
  const dlg = dialog(page)
  await expect(dlg).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.vilag-toltes')).toBeHidden({ timeout: 60_000 })
  expect(kerelmek).toHaveLength(1)
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(gomb).toBeFocused()
  expect(await page.evaluate(() => document.activeElement === document.querySelector('[data-vilag-belepo]'))).toBe(true)
  await expect(page.locator('#top')).not.toHaveAttribute('inert')
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
})

test('7. slow connection with the hook: warm-up is skipped with no /vilag/ request in 3 s, then click opens the dialog with one request', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: false, effectiveType: '3g' }),
      configurable: true,
    })
  })
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toBeVisible()
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'lathato')
  await expect(gomb).toHaveAttribute('data-vilag-bemelegites', 'kihagyva')
  await expect(gomb).toHaveAttribute('data-vilag-bemelegites-ok', 'slow-connection')
  await page.waitForTimeout(3_000)
  expect(kerelmek).toEqual([])
  await gomb.click()
  await expect(dialog(page)).toBeVisible({ timeout: 60_000 })
  expect(kerelmek).toHaveLength(1)
})

test('8. every request of the warm-up, open and close flow is same-origin', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const kulso: string[] = []
  const kerelmek = vilagKerelmek(page)
  page.on('request', (r) => {
    const u = new URL(r.url())
    if ((u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'blob:') && u.origin !== origin) {
      kulso.push(r.url())
    }
  })
  await szoftveresEngedely(page)
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toHaveAttribute('data-vilag-bemelegites', 'kesz')
  await gomb.click()
  const dlg = dialog(page)
  await expect(dlg).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.vilag-toltes')).toBeHidden({ timeout: 60_000 })
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  expect(kerelmek).toHaveLength(1)
  expect(kulso).toEqual([])
})
